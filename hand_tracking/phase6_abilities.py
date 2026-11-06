"""
FOODIVERSE Phase 6 — Creature abilities.

Move each creature to its challenge and activate its power:
- Ember Dragon  -> melt the frozen gate
- Grove Guardian -> grow the barren grove
- Mint Current  -> freeze a water path

Controls:
  q - quit
  r - reset
  1/2/3 - select creature (optional shortcut)
  a / space - activate ability when near a valid target
"""

from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np

from creatures import draw_creature
from hand_tracker import HandState, compute_hand_state, draw_overlay

try:
    import winsound
except ImportError:
    winsound = None

GRAB_RADIUS = 80
ABILITY_RADIUS = 150

# Virtual-key codes for reliable activate even if focus is quirky.
VK_A = 0x41
VK_SPACE = 0x20


def _key_down(vk_code: int) -> bool:
    try:
        import ctypes
        return bool(ctypes.windll.user32.GetAsyncKeyState(vk_code) & 0x8000)
    except Exception:
        return False


@dataclass
class Challenge:
    challenge_id: str
    label: str
    needs: str  # creature key
    x: float
    y: float
    solved: bool = False


@dataclass
class CreatureAgent:
    key: str
    name: str
    color: Tuple[int, int, int]
    home_x: float
    home_y: float
    x: float = 0.0
    y: float = 0.0
    held: bool = False
    near: bool = False
    used: bool = False

    def __post_init__(self) -> None:
        self.x = self.home_x
        self.y = self.home_y


@dataclass
class AbilityWorld:
    w: int
    h: int
    creatures: List[CreatureAgent] = field(default_factory=list)
    challenges: List[Challenge] = field(default_factory=list)
    held: Optional[CreatureAgent] = None
    selected: Optional[str] = None
    message: str = "Pinch a creature, drag onto its challenge, then RELEASE"
    message_color: Tuple[int, int, int] = (200, 200, 210)
    anim_t: float = 0.0
    flash_t: float = 0.0
    complete: bool = False
    fx: List[dict] = field(default_factory=list)
    _ability_cooldown: float = 0.0
    _a_was_down: bool = False

    def __post_init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.held = None
        self.selected = None
        self.complete = False
        self.flash_t = 0.0
        self._ability_cooldown = 0.0
        self._a_was_down = False
        self.fx.clear()
        self.message = "Pinch a creature, drag onto its challenge, then RELEASE"
        self.message_color = (200, 200, 210)

        tray_y = self.h * 0.88
        xs = np.linspace(self.w * 0.20, self.w * 0.80, 3)
        self.creatures = [
            CreatureAgent("ember", "Ember Dragon", (40, 120, 255), float(xs[0]), float(tray_y)),
            CreatureAgent("grove", "Grove Guardian", (80, 200, 100), float(xs[1]), float(tray_y)),
            CreatureAgent("mint", "Mint Current", (200, 230, 140), float(xs[2]), float(tray_y)),
        ]
        self.challenges = [
            Challenge("ice_gate", "Frozen Gate", "ember", self.w * 0.50, self.h * 0.48),
            Challenge("barren", "Barren Soil", "grove", self.w * 0.22, self.h * 0.55),
            Challenge("water", "Open Water", "mint", self.w * 0.78, self.h * 0.58),
        ]

    @property
    def solved_count(self) -> int:
        return sum(1 for c in self.challenges if c.solved)

    def update(self, hand: HandState, dt: float) -> None:
        self.anim_t += dt
        if self.flash_t > 0:
            self.flash_t = max(0.0, self.flash_t - dt)
        if self._ability_cooldown > 0:
            self._ability_cooldown = max(0.0, self._ability_cooldown - dt)
        self.fx = [f for f in self.fx if f["t"] > 0]
        for f in self.fx:
            f["t"] -= dt

        gx = hand.x * self.w
        gy = hand.y * self.h
        pinching = hand.detected and hand.is_pinching

        for creature in self.creatures:
            creature.near = (
                hand.detected
                and not creature.held
                and math.hypot(gx - creature.x, gy - creature.y) < GRAB_RADIUS
            )

        if pinching:
            if self.held is None:
                candidates = [c for c in self.creatures if c.near]
                if candidates:
                    self.held = min(candidates, key=lambda c: math.hypot(gx - c.x, gy - c.y))
                    self.held.held = True
                    self.selected = self.held.key
            if self.held is not None:
                self.held.x = gx
                self.held.y = gy
                # Magnet toward matching unsolved challenge while dragging.
                target = self._nearest_match(self.held)
                if target is not None and math.hypot(self.held.x - target.x, self.held.y - target.y) < ABILITY_RADIUS:
                    self.held.x = 0.75 * self.held.x + 0.25 * target.x
                    self.held.y = 0.75 * self.held.y + 0.25 * target.y
        else:
            if self.held is not None:
                # Primary activate: release pinch while over the right challenge.
                released = self.held
                released.held = False
                self.held = None
                self.selected = released.key
                if self._nearest_match(released) is not None:
                    self.activate_ability(force_creature=released)

        # Backup activate: A / Space edge trigger via Win32 (works without window focus quirks).
        a_down = _key_down(VK_A) or _key_down(VK_SPACE)
        if a_down and not self._a_was_down:
            self.activate_ability()
        self._a_was_down = a_down

        target = self._target_for_selected()
        if target is not None and self.selected:
            action = "RELEASE to activate" if self.held is not None else "press A / Space"
            self.message = f"{self._selected_name()} on {target.label} — {action}"
            self.message_color = (80, 255, 160)
        elif self.selected:
            self.message = f"{self._selected_name()} selected — drag onto matching challenge"
            self.message_color = (200, 200, 210)

    def activate_ability(self, force_creature: Optional[CreatureAgent] = None) -> None:
        if self.complete or self._ability_cooldown > 0:
            return
        creature = force_creature or self._selected_creature()
        if creature is None:
            self.message = "Pinch a creature first (or press 1/2/3)"
            self.message_color = (160, 160, 200)
            return

        target = self._nearest_match(creature)
        if target is None:
            self.message = f"Move {creature.name} onto its matching challenge, then release"
            self.message_color = (100, 160, 255)
            return

        target.solved = True
        creature.used = True
        creature.x = target.x
        creature.y = target.y
        self.selected = creature.key
        self._ability_cooldown = 0.35
        self.fx.append({"kind": creature.key, "x": target.x, "y": target.y, "t": 1.2})
        self._chime(880)
        self.message = f"{creature.name} used {self._ability_name(creature.key)}!"
        self.message_color = creature.color

        if self.solved_count >= 3 and not self.complete:
            self.complete = True
            self.flash_t = 2.8
            self.message = "ALL ABILITIES SUCCEEDED — Cookie Kingdom is safe!"
            self.message_color = (80, 255, 180)
            self._chime(1175)

    def _nearest_match(self, creature: CreatureAgent) -> Optional[Challenge]:
        best = None
        best_d = ABILITY_RADIUS
        for challenge in self.challenges:
            if challenge.solved or challenge.needs != creature.key:
                continue
            d = math.hypot(creature.x - challenge.x, creature.y - challenge.y)
            if d < best_d:
                best_d = d
                best = challenge
        return best

    def select_by_index(self, index: int) -> None:
        if 0 <= index < len(self.creatures):
            self.selected = self.creatures[index].key
            self.message = f"Selected {self.creatures[index].name}"
            self.message_color = self.creatures[index].color

    def _selected_creature(self) -> Optional[CreatureAgent]:
        if self.held is not None:
            return self.held
        if self.selected is None:
            return None
        return next((c for c in self.creatures if c.key == self.selected), None)

    def _selected_name(self) -> str:
        c = self._selected_creature()
        return c.name if c else "Creature"

    def _target_for_selected(self) -> Optional[Challenge]:
        creature = self._selected_creature()
        if creature is None:
            return None
        return self._nearest_match(creature)

    def _ability_name(self, key: str) -> str:
        return {
            "ember": "Melt",
            "grove": "Grow",
            "mint": "Freeze Path",
        }.get(key, "Ability")

    def _chime(self, freq: int) -> None:
        if winsound is None:
            return
        try:
            winsound.Beep(freq, 100)
        except Exception:
            pass

    def draw(self, frame: np.ndarray) -> None:
        self._draw_kingdom(frame)
        self._draw_challenges(frame)
        self._draw_fx(frame)

        for creature in self.creatures:
            draw_creature(frame, creature.name, (int(creature.x), int(creature.y)), scale=0.7, t=self.anim_t)
            label = creature.name
            if creature.near or creature.held:
                cv2.circle(frame, (int(creature.x), int(creature.y)), GRAB_RADIUS, (80, 255, 160), 1)
                label = "HOLD" if creature.held else "PINCH"
            if self.selected == creature.key:
                cv2.circle(frame, (int(creature.x), int(creature.y)), 58, creature.color, 2)
            cv2.putText(
                frame,
                label,
                (int(creature.x) - 55, int(creature.y) + 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                creature.color,
                1,
                cv2.LINE_AA,
            )

        # HUD
        cv2.rectangle(frame, (8, 8), (520, 110), (20, 20, 30), -1)
        cv2.putText(frame, "CREATURE ABILITIES — Phase 6", (16, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 220, 120), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Challenges solved: {self.solved_count}/3", (16, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 220), 1, cv2.LINE_AA)
        cv2.putText(frame, "Drag onto challenge + RELEASE (or A/Space)  |  1/2/3 select  |  r reset  q quit",
                    (16, 84), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (150, 150, 170), 1, cv2.LINE_AA)

        # Ability legend
        rx = self.w - 300
        cv2.rectangle(frame, (rx, 8), (self.w - 8, 120), (20, 20, 30), -1)
        cv2.putText(frame, "ABILITIES", (rx + 12, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 220, 120), 1, cv2.LINE_AA)
        cv2.putText(frame, "Ember: melt frozen gate", (rx + 12, 56),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (40, 120, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, "Grove: grow barren soil", (rx + 12, 78),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (80, 200, 100), 1, cv2.LINE_AA)
        cv2.putText(frame, "Mint: freeze water path", (rx + 12, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 230, 140), 1, cv2.LINE_AA)

        cv2.rectangle(frame, (8, self.h - 52), (self.w - 8, self.h - 8), (20, 20, 30), -1)
        cv2.putText(frame, self.message, (16, self.h - 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.message_color, 1, cv2.LINE_AA)

        if self.flash_t > 0 and self.complete:
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (self.w, self.h), (30, 80, 40), -1)
            cv2.addWeighted(overlay, 0.18 * min(1.0, self.flash_t), frame, 0.82, 0, frame)

    def _draw_kingdom(self, frame: np.ndarray) -> None:
        w, h = self.w, self.h
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, int(h * 0.30)), (w, int(h * 0.78)), (40, 30, 45), -1)
        cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)

        # Cookie lands
        left = np.array([[int(w * 0.05), int(h * 0.72)], [int(w * 0.42), int(h * 0.72)],
                         [int(w * 0.40), int(h * 0.42)], [int(w * 0.08), int(h * 0.45)]], np.int32)
        right = np.array([[int(w * 0.58), int(h * 0.42)], [int(w * 0.95), int(h * 0.45)],
                          [int(w * 0.95), int(h * 0.72)], [int(w * 0.60), int(h * 0.72)]], np.int32)
        cv2.fillPoly(frame, [left, right], (65, 125, 185))

        # Bridge always present in this phase (built in Phase 5)
        cv2.rectangle(frame, (int(w * 0.40), int(h * 0.50)), (int(w * 0.60), int(h * 0.58)), (85, 155, 230), -1)

        # Tray
        cv2.rectangle(frame, (int(w * 0.08), int(h * 0.80)), (int(w * 0.92), int(h * 0.96)), (35, 30, 40), -1)
        cv2.putText(frame, "Creature tray", (int(w * 0.08) + 8, int(h * 0.80) + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 170), 1, cv2.LINE_AA)

    def _draw_challenges(self, frame: np.ndarray) -> None:
        for challenge in self.challenges:
            x, y = int(challenge.x), int(challenge.y)
            if challenge.challenge_id == "ice_gate":
                if not challenge.solved:
                    cv2.rectangle(frame, (x - 55, y - 45), (x + 55, y + 45), (220, 230, 255), -1)
                    cv2.rectangle(frame, (x - 55, y - 45), (x + 55, y + 45), (180, 200, 240), 2)
                    cv2.putText(frame, "ICE", (x - 18, y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 130, 180), 2)
                else:
                    # Melted drip residue
                    cv2.rectangle(frame, (x - 55, y + 20), (x + 55, y + 45), (180, 200, 230), -1)
                    cv2.putText(frame, "MELTED", (x - 40, y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 120, 255), 2)
            elif challenge.challenge_id == "barren":
                if not challenge.solved:
                    cv2.ellipse(frame, (x, y + 20), (55, 22), 0, 0, 360, (60, 80, 90), -1)
                    cv2.putText(frame, "BARREN", (x - 38, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (140, 150, 160), 1)
                else:
                    for i, (ox, oy) in enumerate(((-18, 0), (0, -12), (20, 2))):
                        cv2.circle(frame, (x + ox, y + oy), 16, (60, 180 + i * 15, 80), -1)
                    cv2.putText(frame, "GROWN", (x - 35, y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 200, 100), 2)
            else:  # water
                if not challenge.solved:
                    cv2.ellipse(frame, (x, y), (60, 28), 0, 0, 360, (160, 120, 60), -1)
                    cv2.putText(frame, "WATER", (x - 35, y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (230, 210, 160), 1)
                else:
                    cv2.ellipse(frame, (x, y), (60, 28), 0, 0, 360, (230, 240, 255), -1)
                    cv2.ellipse(frame, (x, y), (60, 28), 0, 0, 360, (200, 230, 255), 2)
                    cv2.putText(frame, "FROZEN PATH", (x - 55, y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 230, 140), 1)

            # Match ring when relevant creature is near
            creature = self._selected_creature()
            if (
                creature is not None
                and not challenge.solved
                and challenge.needs == creature.key
                and math.hypot(creature.x - challenge.x, creature.y - challenge.y) < ABILITY_RADIUS
            ):
                pulse = 0.5 + 0.5 * math.sin(self.anim_t * 6)
                cv2.circle(frame, (x, y), int(ABILITY_RADIUS * (0.85 + 0.1 * pulse)), creature.color, 2)

    def _draw_fx(self, frame: np.ndarray) -> None:
        for f in self.fx:
            x, y = int(f["x"]), int(f["y"])
            life = max(0.0, min(1.0, f["t"]))
            if f["kind"] == "ember":
                cv2.circle(frame, (x, y), int(20 + (1 - life) * 40), (40, 140, 255), 2)
                cv2.circle(frame, (x, y - 10), int(8 + (1 - life) * 12), (0, 200, 255), -1)
            elif f["kind"] == "grove":
                cv2.circle(frame, (x, y), int(18 + (1 - life) * 30), (80, 220, 120), 2)
            else:
                cv2.circle(frame, (x, y), int(18 + (1 - life) * 35), (220, 240, 180), 2)


def run(camera_index: int = 0) -> None:
    hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        model_complexity=1,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.5,
    )
    connections = mp.solutions.hands.HAND_CONNECTIONS
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open webcam (index {camera_index}).")
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    ok, frame = cap.read()
    if not ok:
        raise RuntimeError("Failed to read first webcam frame.")
    frame = cv2.flip(frame, 1)
    h, w = frame.shape[:2]
    world = AbilityWorld(w, h)

    print("FOODIVERSE Phase 6 - Creature abilities")
    print("Ember melts ice | Grove grows forest | Mint freezes water")
    print("Drag creature onto its challenge, then RELEASE pinch to activate.")
    print("Backup: press A or Space while near the challenge.")

    prev = time.time()
    window = "FOODIVERSE - Creature Abilities (Phase 6)"

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame = cv2.flip(frame, 1)
            now = time.time()
            dt = max(0.001, min(0.05, now - prev))
            prev = now

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)
            state = HandState()
            landmark_list = None
            if result.multi_hand_landmarks:
                landmark_list = result.multi_hand_landmarks[0]
                score = 1.0
                if result.multi_handedness:
                    score = result.multi_handedness[0].classification[0].score
                state = compute_hand_state(landmark_list.landmark, score)

            world.update(state, dt)
            world.draw(frame)
            draw_overlay(frame, state, landmark_list, connections)
            cv2.imshow(window, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("r"):
                world.reset()
            if key in (ord("a"), ord(" ")):
                world.activate_ability()
            if key == ord("1"):
                world.select_by_index(0)
            if key == ord("2"):
                world.select_by_index(1)
            if key == ord("3"):
                world.select_by_index(2)
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
