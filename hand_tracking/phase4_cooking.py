"""
FOODIVERSE Phase 4 — Cooking & recipe discovery.

Build on the Cosmic Kitchen:
- Drop ingredient pairs into the bowl
- Heat (H) / Cool (C) the bowl
- Stir by waving an OPEN hand over the bowl (or hold S)
- Discover recipes (Ember Spark, Grove Bloom, Mint Current)

Controls:
  q - quit
  g - toggle gravity
  h - heat bowl
  c - cool bowl
  n - set bowl to neutral
  s - hold to stir (backup)
  r - reset kitchen + cooking state
  b - empty bowl only (keep ingredients on counter)
"""

from __future__ import annotations

import math
import os
import time
from typing import List, Optional, Tuple

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np

from creatures import draw_creature
from hand_tracker import HandState, compute_hand_state, draw_overlay
from phase3_kitchen import CosmicKitchen
from recipes import RECIPES, Recipe, hint_for_contents, match_recipe

try:
    import winsound
except ImportError:
    winsound = None


def _key_held(vk_code: int) -> bool:
    """True while a Windows virtual-key is held (for continuous stir backup)."""
    try:
        import ctypes
        return bool(ctypes.windll.user32.GetAsyncKeyState(vk_code) & 0x8000)
    except Exception:
        return False


VK_S = 0x53


class CookingKitchen(CosmicKitchen):
    def __init__(self, width: int, height: int):
        # Parent __init__ calls reset(); cooking fields must exist first.
        self.temperature = "neutral"  # neutral | hot | cold
        self.stir = 0.0
        self._last_stir_pos: Optional[Tuple[float, float]] = None
        self.stirring_now = False
        self.keyboard_stir = False
        self.discovered: List[str] = []
        self.active_recipe: Optional[Recipe] = None
        self.flash_t = 0.0
        self.form_t = 0.0  # seconds since creature started forming
        self.creature_alive = False
        self.message = "Drop a recipe pair into the bowl"
        self.message_color = (200, 200, 210)
        self._cooked = False
        self._anim_clock = 0.0
        super().__init__(width, height)

    def reset(self) -> None:
        super().reset()
        self.temperature = "neutral"
        self.stir = 0.0
        self._last_stir_pos = None
        self.stirring_now = False
        self.keyboard_stir = False
        self.active_recipe = None
        self.flash_t = 0.0
        self.form_t = 0.0
        self.creature_alive = False
        self._cooked = False
        self.message = "Drop a recipe pair into the bowl"
        self.message_color = (200, 200, 210)

    def empty_bowl(self) -> None:
        """Return bowl contents to the counter."""
        for item in self.items:
            if item.in_bowl:
                item.in_bowl = False
                item.held = False
                item.vx = 0.0
                item.vy = 0.0
        # Re-layout returned items
        returned = [i for i in self.items if not i.in_bowl]
        for i, item in enumerate(returned):
            col = i % 3
            row = i // 3
            item.x = self.w * (0.22 + col * 0.28)
            item.y = self.h * (0.28 + row * 0.16)
        self.bowl.contents.clear()
        self.stir = 0.0
        self._last_stir_pos = None
        self.stirring_now = False
        self.active_recipe = None
        self.creature_alive = False
        self.form_t = 0.0
        self.flash_t = 0.0
        self._cooked = False
        self.message = "Bowl emptied - try another recipe"
        self.message_color = (180, 200, 220)

    def set_temperature(self, temp: str) -> None:
        self.temperature = temp
        if temp == "hot":
            self.message = "Bowl HEATED — sparks possible"
            self.message_color = (60, 120, 255)
        elif temp == "cold":
            self.message = "Bowl COOLED — frost possible"
            self.message_color = (220, 220, 120)
        else:
            self.message = "Bowl temperature: neutral"
            self.message_color = (200, 200, 210)

    def update(self, hand: HandState, dt: float) -> None:
        super().update(hand, dt)
        self._anim_clock += dt
        if self.flash_t > 0:
            self.flash_t = max(0.0, self.flash_t - dt)
        if self.creature_alive:
            self.form_t += dt

        contents = set(self.bowl.contents)
        self.message = hint_for_contents(contents) if not self._cooked else self.message
        if not self._cooked:
            self.message_color = (200, 200, 210)

        # Stir: OPEN hand waving over the bowl (no pinch), or hold S.
        # Path-length based — much more reliable than requiring full circles.
        self.stirring_now = False
        if not self._cooked and len(contents) >= 2 and self.held is None:
            if self.keyboard_stir:
                self.stir = float(np.clip(self.stir + 0.55 * dt, 0.0, 1.0))
                self.stirring_now = True
                self._last_stir_pos = None
            elif hand.detected and not hand.is_pinching:
                gx = hand.x * self.w
                gy = hand.y * self.h
                in_zone = math.hypot(gx - self.bowl.cx, gy - self.bowl.cy) < self.bowl.rx * 1.8
                if in_zone:
                    self.stirring_now = True
                    if self._last_stir_pos is not None:
                        dist = math.hypot(gx - self._last_stir_pos[0], gy - self._last_stir_pos[1])
                        # ~350px of hand travel fills the bar.
                        self.stir = float(np.clip(self.stir + dist / 350.0, 0.0, 1.0))
                    self._last_stir_pos = (gx, gy)
                else:
                    self._last_stir_pos = None
            else:
                self._last_stir_pos = None
        else:
            self._last_stir_pos = None

        if self._cooked:
            return

        recipe = match_recipe(contents, self.temperature, self.stir)
        if recipe is not None:
            self._discover(recipe)

    def _discover(self, recipe: Recipe) -> None:
        self._cooked = True
        self.active_recipe = recipe
        self.flash_t = 1.4
        self.form_t = 0.0
        self.creature_alive = True
        if recipe.id not in self.discovered:
            self.discovered.append(recipe.id)
        self.message = f"{recipe.creature} formed!  (B for next recipe / R reset)"
        self.message_color = recipe.discovery_color
        print(f"DISCOVERED: {recipe.name} -> {recipe.creature}")
        if winsound is not None:
            try:
                winsound.Beep(880, 120)
                winsound.Beep(1175, 180)
            except Exception:
                pass
        for item in self.items:
            if item.in_bowl:
                item.in_bowl = False
                item.consumed = True
        self.bowl.contents.clear()
        self.stir = 0.0

    def draw(self, frame: np.ndarray) -> None:
        super().draw(frame)

        # Override Phase 3 title strip with cooking HUD.
        cv2.rectangle(frame, (8, 130), (420, 270), (20, 20, 30), -1)
        cv2.putText(frame, "COOKING — Phase 4", (16, 152),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 220, 120), 1, cv2.LINE_AA)

        temp_label = {
            "hot": "TEMP: HOT",
            "cold": "TEMP: COLD",
            "neutral": "TEMP: NEUTRAL",
        }[self.temperature]
        temp_color = {
            "hot": (60, 120, 255),
            "cold": (220, 220, 120),
            "neutral": (180, 180, 190),
        }[self.temperature]
        cv2.putText(frame, temp_label, (16, 178),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, temp_color, 1, cv2.LINE_AA)

        # Stir bar
        stir_label = "STIRRING!" if self.stirring_now else "STIR"
        stir_label_color = (80, 255, 160) if self.stirring_now else (180, 180, 200)
        cv2.putText(frame, stir_label, (16, 204),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, stir_label_color, 1, cv2.LINE_AA)
        x0, y0, bw, bh = 100, 192, 200, 14
        cv2.rectangle(frame, (x0, y0), (x0 + bw, y0 + bh), (60, 60, 70), -1)
        fill = int(bw * self.stir)
        bar_color = (80, 255, 160) if self.stir >= 0.45 else (100, 180, 255)
        cv2.rectangle(frame, (x0, y0), (x0 + fill, y0 + bh), bar_color, -1)

        mode = "GRAVITY ON" if self.gravity_on else "ZERO-G"
        cv2.putText(frame, mode, (16, 230),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 200, 160), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Discovered {len(self.discovered)}/3", (140, 230),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 220), 1, cv2.LINE_AA)
        cv2.putText(frame, "OPEN hand wave over bowl to stir (or hold S) | h/c/n temp | b/r | q",
                    (16, 254), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 140, 160), 1, cv2.LINE_AA)

        # Stir zone ring around bowl when ready to cook.
        if not self._cooked and len(self.bowl.contents) >= 2:
            zone_color = (80, 255, 160) if self.stirring_now else (100, 160, 220)
            cv2.ellipse(
                frame,
                (int(self.bowl.cx), int(self.bowl.cy)),
                (int(self.bowl.rx * 1.8), int(self.bowl.ry * 1.8)),
                0, 0, 360, zone_color, 2,
            )

        # Recipe legend (right side)
        rx = self.w - 310
        cv2.rectangle(frame, (rx, 130), (self.w - 8, 130 + 28 + 52 * len(RECIPES)), (20, 20, 30), -1)
        cv2.putText(frame, "RECIPES", (rx + 12, 152),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 220, 120), 1, cv2.LINE_AA)
        for i, recipe in enumerate(RECIPES):
            yy = 178 + i * 52
            unlocked = recipe.id in self.discovered
            color = recipe.discovery_color if unlocked else (140, 140, 150)
            title = recipe.name if unlocked else "???"
            cv2.putText(frame, title, (rx + 12, yy),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, color, 1, cv2.LINE_AA)
            cv2.putText(frame, recipe.hint, (rx + 12, yy + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 160, 170), 1, cv2.LINE_AA)

        # Coaching message
        cv2.rectangle(frame, (8, self.h - 58), (self.w - 8, self.h - 8), (20, 20, 30), -1)
        cv2.putText(frame, self.message, (16, self.h - 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, self.message_color, 1, cv2.LINE_AA)

        # Creature transformation + lingering formed creature
        if self.active_recipe and self.creature_alive:
            cx = int(self.bowl.cx)
            cy = int(self.bowl.cy - 90)
            # Grow from the bowl over ~0.8s, then idle.
            grow = float(np.clip(self.form_t / 0.8, 0.0, 1.0))
            scale = 0.25 + 0.95 * grow

            if self.flash_t > 0:
                overlay = frame.copy()
                cv2.circle(
                    overlay,
                    (cx, int(self.bowl.cy)),
                    int(30 + (1.2 - self.flash_t) * 40),
                    self.active_recipe.discovery_color,
                    2,
                )
                cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)

            draw_creature(
                frame,
                self.active_recipe.creature,
                (cx, cy),
                scale=scale,
                t=self._anim_clock,
            )
            cv2.putText(
                frame,
                self.active_recipe.creature.upper(),
                (cx - 90, cy - int(85 * scale)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.65,
                self.active_recipe.discovery_color,
                2,
                cv2.LINE_AA,
            )

        # Temperature tint on bowl rim
        if self.temperature == "hot":
            cv2.ellipse(frame, (int(self.bowl.cx), int(self.bowl.cy)),
                        (int(self.bowl.rx), int(self.bowl.ry)), 0, 0, 360, (40, 90, 255), 3)
        elif self.temperature == "cold":
            cv2.ellipse(frame, (int(self.bowl.cx), int(self.bowl.cy)),
                        (int(self.bowl.rx), int(self.bowl.ry)), 0, 0, 360, (220, 220, 100), 3)


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
    kitchen = CookingKitchen(w, h)

    print("FOODIVERSE Phase 4 - Cooking")
    print("Recipes:")
    for recipe in RECIPES:
        print(f"  - {recipe.hint}  =>  {recipe.name} ({recipe.creature})")
    print("Stir: wave OPEN hand over the bowl (do not pinch), or hold S.")
    print("H heat / C cool / N neutral.")

    prev = time.time()
    window = "FOODIVERSE - Cooking (Phase 4)"

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

            kitchen.update(state, dt)
            kitchen.draw(frame)
            draw_overlay(frame, state, landmark_list, connections)

            cv2.imshow(window, frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("g"):
                kitchen.toggle_gravity()
            if key == ord("h"):
                kitchen.set_temperature("hot")
            if key == ord("c"):
                kitchen.set_temperature("cold")
            if key == ord("n"):
                kitchen.set_temperature("neutral")
            kitchen.keyboard_stir = _key_held(VK_S)
            if key == ord("r"):
                kitchen.reset()
                print("Kitchen reset")
            if key == ord("b"):
                kitchen.empty_bowl()
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
