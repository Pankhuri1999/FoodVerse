"""
FOODIVERSE Phase 7 — Save the Cookie Kingdom (full rescue mission).

Stages:
  1. Distress signal / explore
  2. Collect Cosmic Fruit + Star-Pepper into the bowl
  3. Heat + stir to create Ember Dragon
  4. Build the Cookie Bridge across the gap
  5. Use Ember's melt ability on the frozen gate
  6. Kingdom restored

Controls:
  q - quit
  r - restart mission
  h - heat bowl (cook stage)
  n - neutral temp
  s - hold to stir (backup)
  e - hold to carry Ember Dragon (ability stage backup)
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

GRAB = 80
EMBER_GRAB = 150  # dragon art is large — needs a bigger pinch target
STIR_FILL = 320.0
VK_S = 0x53
VK_E = 0x45


def _key_held(vk: int) -> bool:
    try:
        import ctypes
        return bool(ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000)
    except Exception:
        return False


STAGES = (
    "intro",
    "collect",
    "cook",
    "build",
    "ability",
    "restored",
)

STAGE_TITLE = {
    "intro": "1/6 Distress Signal",
    "collect": "2/6 Collect Ingredients",
    "cook": "3/6 Cook Ember Dragon",
    "build": "4/6 Build Cookie Bridge",
    "ability": "5/6 Melt the Frozen Gate",
    "restored": "6/6 Kingdom Restored",
}


@dataclass
class Item:
    name: str
    color: Tuple[int, int, int]
    shape: str
    x: float
    y: float
    home: Tuple[float, float]
    in_bowl: bool = False
    consumed: bool = False
    held: bool = False
    near: bool = False
    radius: int = 34


@dataclass
class BridgePiece:
    x: float
    y: float
    home: Tuple[float, float]
    placed: bool = False
    held: bool = False
    near: bool = False


@dataclass
class Mission:
    w: int
    h: int
    stage: str = "intro"
    message: str = ""
    message_color: Tuple[int, int, int] = (200, 200, 210)
    anim_t: float = 0.0
    stage_t: float = 0.0
    temperature: str = "neutral"
    stir: float = 0.0
    stirring: bool = False
    keyboard_stir: bool = False
    _last_stir: Optional[Tuple[float, float]] = None
    held_item: Optional[Item] = None
    held_bridge: Optional[BridgePiece] = None
    items: List[Item] = field(default_factory=list)
    bowl_contents: List[str] = field(default_factory=list)
    bridge: Optional[BridgePiece] = None
    bridge_socket: Tuple[float, float] = (0.0, 0.0)
    ice_pos: Tuple[float, float] = (0.0, 0.0)
    ember_perch: Tuple[float, float] = (0.0, 0.0)
    ember_x: float = 0.0
    ember_y: float = 0.0
    ember_held: bool = False
    ember_near: bool = False
    ember_ready: bool = False
    ember_following: bool = False
    ember_docked: bool = False
    ice_melted: bool = False
    ice_hover_t: float = 0.0
    last_hand: Optional[Tuple[float, float]] = None
    hand_seen_t: float = 0.0
    bowl: Tuple[float, float, float, float] = (0, 0, 140, 70)  # cx,cy,rx,ry

    def __post_init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.stage = "intro"
        self.stage_t = 0.0
        self.temperature = "neutral"
        self.stir = 0.0
        self.stirring = False
        self._last_stir = None
        self.held_item = None
        self.held_bridge = None
        self.bowl_contents.clear()
        self.ember_ready = False
        self.ember_held = False
        self.ember_following = False
        self.ember_docked = False
        self.ice_melted = False
        self.ice_hover_t = 0.0
        self.last_hand = None
        self.hand_seen_t = 0.0
        self.message = "Cookie Kingdom needs help! Pinch anywhere or wait..."
        self.message_color = (255, 220, 120)

        self.bowl = (self.w * 0.72, self.h * 0.42, 120.0, 60.0)
        self.bridge_socket = (self.w * 0.42, self.h * 0.58)
        # Ice sits on the bridge path; landing pad is where you leave Ember.
        self.ice_pos = (self.w * 0.43, self.h * 0.50)
        self.ember_perch = (self.w * 0.16, self.h * 0.42)
        self.ember_x, self.ember_y = self.ember_perch

        fruit = (self.w * 0.18, self.h * 0.28)
        pepper = (self.w * 0.34, self.h * 0.28)
        self.items = [
            Item("Cosmic Fruit", (90, 90, 255), "circle", fruit[0], fruit[1], fruit),
            Item("Star-Pepper", (40, 40, 255), "star", pepper[0], pepper[1], pepper),
        ]
        home = (self.w * 0.18, self.h * 0.55)
        self.bridge = BridgePiece(home[0], home[1], home)

    def set_stage(self, stage: str, message: str, color: Tuple[int, int, int] = (200, 200, 210)) -> None:
        self.stage = stage
        self.stage_t = 0.0
        self.message = message
        self.message_color = color
        self.stir = 0.0
        self._last_stir = None
        print(f"[MISSION] {STAGE_TITLE.get(stage, stage)} — {message}")
        self._chime(700)

    def update(self, hand: HandState, dt: float) -> None:
        self.anim_t += dt
        self.stage_t += dt
        gx, gy = hand.x * self.w, hand.y * self.h
        pinching = hand.detected and hand.is_pinching

        if hand.detected:
            self.last_hand = (gx, gy)
            self.hand_seen_t = 0.35
        else:
            self.hand_seen_t = max(0.0, self.hand_seen_t - dt)

        # Ember only follows while actively carried (pinch-picked in ability stage).
        if (
            self.ember_ready
            and self.ember_following
            and not self.ember_docked
            and self.stage == "ability"
            and self.last_hand is not None
            and self.hand_seen_t > 0
        ):
            self._follow_ember(self.last_hand[0], self.last_hand[1])
        elif self.ember_ready and self.stage == "build" and not self.ember_following:
            # Idle perch bob — stays put while you place the bridge.
            bob = 6.0 * math.sin(self.anim_t * 2.4)
            self.ember_x = self.ember_perch[0]
            self.ember_y = self.ember_perch[1] + bob

        if self.stage == "intro":
            if self.stage_t > 3.5 or pinching:
                self.set_stage(
                    "collect",
                    "Pinch Cosmic Fruit and Star-Pepper into the bowl",
                    (120, 200, 255),
                )
            return

        if self.stage == "collect":
            self._update_collect(hand, gx, gy, pinching)
            if set(self.bowl_contents) >= {"Cosmic Fruit", "Star-Pepper"}:
                self.set_stage(
                    "cook",
                    "Press H to HEAT, then wave OPEN hand over the bowl to stir",
                    (60, 140, 255),
                )
            return

        if self.stage == "cook":
            self._update_cook(hand, gx, gy, dt)
            return

        if self.stage == "build":
            self._update_build(gx, gy, pinching)
            return

        if self.stage == "ability":
            self._update_ability(hand.detected, gx, gy, pinching, dt)
            return

        # restored: celebrate

    def _follow_ember(self, gx: float, gy: float) -> None:
        # Smooth follow so motion is obvious and stable.
        self.ember_held = True
        self.ember_near = True
        self.ember_x = 0.55 * self.ember_x + 0.45 * gx
        self.ember_y = 0.55 * self.ember_y + 0.45 * gy

    def skip_to_ability(self) -> None:
        """Debug/helper: jump to Ember + bridge ready + ability stage."""
        self.ember_ready = True
        self.ember_following = False
        self.ember_docked = False
        self.ember_x, self.ember_y = self.ember_perch
        if self.bridge is not None:
            self.bridge.placed = True
            self.bridge.x, self.bridge.y = self.bridge_socket
        self.ice_melted = False
        self.ice_hover_t = 0.0
        self.set_stage(
            "ability",
            "PINCH Ember, then DROP him on the glowing pad at the ICE GATE",
            (80, 220, 255),
        )

    def _update_collect(self, hand: HandState, gx: float, gy: float, pinching: bool) -> None:
        for item in self.items:
            if item.in_bowl or item.consumed:
                item.near = False
                continue
            item.near = hand.detected and math.hypot(gx - item.x, gy - item.y) < GRAB

        if pinching:
            if self.held_item is None:
                cands = [i for i in self.items if i.near]
                if cands:
                    self.held_item = min(cands, key=lambda i: math.hypot(gx - i.x, gy - i.y))
                    self.held_item.held = True
            if self.held_item is not None:
                self.held_item.x, self.held_item.y = gx, gy
        elif self.held_item is not None:
            item = self.held_item
            item.held = False
            if self._in_bowl(item.x, item.y):
                item.in_bowl = True
                item.x, item.y = self.bowl[0], self.bowl[1]
                if item.name not in self.bowl_contents:
                    self.bowl_contents.append(item.name)
                    self.message = f"{item.name} added ({len(self.bowl_contents)}/2)"
                    self._chime(820)
            else:
                item.x, item.y = item.home
            self.held_item = None

    def _update_cook(self, hand: HandState, gx: float, gy: float, dt: float) -> None:
        self.stirring = False
        if self.temperature != "hot":
            self.message = "Press H to HEAT the bowl, then stir"
            return

        if self.keyboard_stir or (hand.detected and not hand.is_pinching and self._near_bowl(gx, gy)):
            self.stirring = True
            if self.keyboard_stir:
                self.stir = float(np.clip(self.stir + 0.55 * dt, 0.0, 1.0))
            else:
                if self._last_stir is not None:
                    dist = math.hypot(gx - self._last_stir[0], gy - self._last_stir[1])
                    self.stir = float(np.clip(self.stir + dist / STIR_FILL, 0.0, 1.0))
                self._last_stir = (gx, gy)
            self.message = "Stirring… keep waving!" if self.stir < 0.45 else "Almost done…"
        else:
            self._last_stir = None
            self.message = "HEAT is on — wave OPEN hand over bowl (or hold S)"

        if self.stir >= 0.45 and self.temperature == "hot":
            for item in self.items:
                if item.in_bowl:
                    item.consumed = True
                    item.in_bowl = False
            self.bowl_contents.clear()
            self.ember_ready = True
            self.ember_following = False
            self.ember_docked = False
            self.ember_x, self.ember_y = self.ember_perch
            self.set_stage(
                "build",
                "Ember waits on the left — pinch Cookie Bridge onto the GAP",
                (40, 120, 255),
            )
            self._chime(1000)

    def _update_build(self, gx: float, gy: float, pinching: bool) -> None:
        assert self.bridge is not None
        b = self.bridge
        if b.placed:
            return
        b.near = math.hypot(gx - b.x, gy - b.y) < GRAB
        if pinching:
            if self.held_bridge is None and b.near:
                self.held_bridge = b
                b.held = True
            if self.held_bridge is not None:
                b.x, b.y = gx, gy
                sx, sy = self.bridge_socket
                if math.hypot(b.x - sx, b.y - sy) < 110:
                    b.x = 0.7 * b.x + 0.3 * sx
                    b.y = 0.7 * b.y + 0.3 * sy
        elif self.held_bridge is not None:
            b.held = False
            self.held_bridge = None
            sx, sy = self.bridge_socket
            if math.hypot(b.x - sx, b.y - sy) < 80:
                b.x, b.y = sx, sy
                b.placed = True
                self.ember_held = False
                self.ember_following = False
                self.set_stage(
                    "ability",
                    "PINCH Ember (left), fly to the glowing pad, OPEN hand to DROP",
                    (80, 220, 255),
                )
                self._chime(900)
            else:
                b.x, b.y = b.home
                self.message = "Snap the bridge into the glowing GAP slot"

    def _update_ability(self, detected: bool, gx: float, gy: float, pinching: bool, dt: float) -> None:
        """Pick up Ember with pinch, drop him on the ICE GATE landing pad to melt."""
        ice = self.ice_pos
        on_pad = math.hypot(self.ember_x - ice[0], self.ember_y - ice[1]) < 110
        near_ember = detected and math.hypot(gx - self.ember_x, gy - self.ember_y) < GRAB + 30
        self.ember_near = near_ember

        if self.ember_docked:
            if not self.ice_melted:
                self._finish_melt()
            return

        # Pick up: pinch near Ember.
        if pinching and near_ember and not self.ember_following:
            self.ember_following = True
            self.ember_held = True
            self.message = "Carrying Ember — move to the glowing DROP pad"
            self.message_color = (80, 255, 160)
            self._chime(880)
            return

        # Keyboard assist: E picks up / drops when over pad.
        if _key_held(VK_E) and not self.ember_following:
            self.ember_following = True
            self.ember_held = True
            self.message = "Carrying Ember (E) — move to DROP pad, open hand / E again"
            self.message_color = (80, 255, 160)
            return

        if not self.ember_following:
            self.ice_hover_t = 0.0
            bob = 5.0 * math.sin(self.anim_t * 2.2)
            self.ember_x = self.ember_perch[0]
            self.ember_y = self.ember_perch[1] + bob
            if self.hand_seen_t <= 0:
                self.message = "Show your hand, then PINCH Ember on the left perch"
            else:
                self.message = "PINCH Ember — then fly him to the ICE GATE pad"
            self.message_color = (120, 200, 255)
            return

        # Carrying: open hand (or E) over pad → dock & melt. Auto-land if held on pad briefly.
        if on_pad:
            self.ice_hover_t += dt
            self.message = "OPEN hand (or E) to DROP Ember — or hold 0.6s"
            self.message_color = (80, 255, 160)
            if (detected and not pinching) or _key_held(VK_E) or self.ice_hover_t >= 0.6:
                self.ember_following = False
                self.ember_held = False
                self.ember_docked = True
                self.ember_x, self.ember_y = ice[0], ice[1] - 36
                self.message = "Ember landed — melting the gate…"
                self.message_color = (80, 255, 180)
                self._chime(1100)
        else:
            self.ice_hover_t = 0.0
            self.message = "Fly Ember to the glowing white pad — DROP him there"
            self.message_color = (120, 200, 255)

    def _finish_melt(self) -> None:
        ice = self.ice_pos
        self.ember_x, self.ember_y = ice[0], ice[1] - 36
        self.ice_melted = True
        self.set_stage(
            "restored",
            "FROZEN GATE MELTED — Cookie Kingdom is saved!",
            (80, 255, 180),
        )
        self._chime(1200)

    def _in_bowl(self, x: float, y: float) -> bool:
        cx, cy, rx, ry = self.bowl
        return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0

    def _near_bowl(self, x: float, y: float) -> bool:
        cx, cy, rx, ry = self.bowl
        return math.hypot(x - cx, y - cy) < rx * 1.85

    def _chime(self, freq: int) -> None:
        if winsound is None:
            return
        try:
            winsound.Beep(freq, 90)
        except Exception:
            pass

    def draw(self, frame: np.ndarray) -> None:
        self._draw_world(frame)
        self._draw_bowl(frame)

        if self.stage in ("collect", "cook"):
            for item in self.items:
                if not item.in_bowl and not item.consumed:
                    self._draw_item(frame, item)
            for i, name in enumerate(self.bowl_contents):
                item = next((it for it in self.items if it.name == name), None)
                color = item.color if item else (200, 200, 200)
                cv2.circle(frame, (int(self.bowl[0] - 30 + i * 40), int(self.bowl[1] + 8)), 12, color, -1)

        if self.stage == "cook":
            self._draw_cook_hud(frame)

        if self.stage in ("build", "ability", "restored") and self.bridge is not None:
            if not self.bridge.placed:
                sx, sy = int(self.bridge_socket[0]), int(self.bridge_socket[1])
                pulse = 0.5 + 0.5 * math.sin(self.anim_t * 4)
                cv2.circle(frame, (sx, sy), 42, (int(100 + 80 * pulse), 200, 255), 2)
                cv2.putText(frame, "GAP", (sx - 18, sy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (140, 200, 255), 1)
            self._draw_bridge_piece(frame, self.bridge)

        # Ice gate from build onward — drawn under Ember so the dragon can sit on it.
        if self.stage in ("build", "ability", "restored") or (
            self.bridge is not None and self.bridge.placed
        ):
            self._draw_ice_gate(frame)

        if self.ember_ready:
            self._draw_ember(frame)

        if self.stage == "restored":
            self._draw_citizens(frame)

        # Top HUD
        cv2.rectangle(frame, (8, 8), (560, 78), (20, 20, 30), -1)
        cv2.putText(frame, "MISSION — Phase 7: Save the Cookie Kingdom", (16, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 220, 120), 1, cv2.LINE_AA)
        cv2.putText(frame, STAGE_TITLE[self.stage], (16, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 220, 255), 1, cv2.LINE_AA)

        cv2.rectangle(frame, (8, self.h - 54), (self.w - 8, self.h - 8), (20, 20, 30), -1)
        cv2.putText(frame, self.message + "   | r restart  q quit", (16, self.h - 22),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, self.message_color, 1, cv2.LINE_AA)

    def _draw_world(self, frame: np.ndarray) -> None:
        w, h = self.w, self.h
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, int(h * 0.35)), (w, int(h * 0.78)), (35, 25, 40), -1)
        cv2.addWeighted(overlay, 0.28, frame, 0.72, 0, frame)

        left = np.array([[int(w * 0.04), int(h * 0.72)], [int(w * 0.36), int(h * 0.72)],
                         [int(w * 0.34), int(h * 0.48)], [int(w * 0.06), int(h * 0.50)]], np.int32)
        right = np.array([[int(w * 0.52), int(h * 0.48)], [int(w * 0.96), int(h * 0.50)],
                          [int(w * 0.96), int(h * 0.72)], [int(w * 0.50), int(h * 0.72)]], np.int32)
        land = (70, 150, 210) if self.stage == "restored" else (60, 120, 180)
        cv2.fillPoly(frame, [left, right], land)

        if self.bridge is not None and self.bridge.placed:
            cv2.rectangle(frame, (int(w * 0.34), int(h * 0.54)), (int(w * 0.52), int(h * 0.62)), (85, 155, 230), -1)
        elif self.stage in ("intro", "collect", "cook", "build"):
            cv2.rectangle(frame, (int(w * 0.36), int(h * 0.52)), (int(w * 0.50), int(h * 0.70)), (15, 10, 20), -1)

    def _draw_bowl(self, frame: np.ndarray) -> None:
        if self.stage not in ("collect", "cook", "intro"):
            return
        cx, cy, rx, ry = self.bowl
        cv2.ellipse(frame, (int(cx), int(cy + 14)), (int(rx), int(ry + 22)), 0, 0, 180, (70, 55, 45), -1)
        rim = (40, 100, 255) if self.temperature == "hot" else (120, 95, 70)
        cv2.ellipse(frame, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, rim, 3)
        cv2.ellipse(frame, (int(cx), int(cy)), (int(rx - 10), int(ry - 8)), 0, 0, 360, (35, 28, 24), -1)
        cv2.putText(frame, "Mixing Bowl", (int(cx - 55), int(cy + ry + 28)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 190, 170), 1, cv2.LINE_AA)

    def _draw_cook_hud(self, frame: np.ndarray) -> None:
        cv2.rectangle(frame, (8, 90), (320, 160), (20, 20, 30), -1)
        temp = "HOT" if self.temperature == "hot" else "NEUTRAL"
        cv2.putText(frame, f"TEMP: {temp}", (16, 114),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                    (60, 120, 255) if self.temperature == "hot" else (180, 180, 190), 1, cv2.LINE_AA)
        label = "STIRRING!" if self.stirring else "STIR"
        cv2.putText(frame, label, (16, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    (80, 255, 160) if self.stirring else (180, 180, 200), 1, cv2.LINE_AA)
        cv2.rectangle(frame, (90, 128), (290, 142), (60, 60, 70), -1)
        cv2.rectangle(frame, (90, 128), (90 + int(200 * self.stir), 142), (100, 180, 255), -1)

    def _draw_item(self, frame: np.ndarray, item: Item) -> None:
        cx, cy = int(item.x), int(item.y)
        glow = (80, 255, 160) if item.held else ((0, 220, 255) if item.near else (200, 190, 170))
        if item.near or item.held:
            cv2.circle(frame, (cx, cy), GRAB, glow, 1)
        if item.shape == "star":
            pts = []
            for i in range(10):
                ang = math.radians(-90 + i * 36)
                r = item.radius if i % 2 == 0 else item.radius * 0.45
                pts.append([int(cx + r * math.cos(ang)), int(cy + r * math.sin(ang))])
            cv2.fillPoly(frame, [np.array(pts, np.int32)], item.color)
        else:
            cv2.circle(frame, (cx, cy), item.radius, item.color, -1)
            cv2.circle(frame, (cx - 7, cy - 7), 6, (230, 230, 255), -1)
        cv2.putText(frame, "HOLD" if item.held else item.name, (cx - 45, cy + 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, glow, 1, cv2.LINE_AA)

    def _draw_bridge_piece(self, frame: np.ndarray, b: BridgePiece) -> None:
        cx, cy = int(b.x), int(b.y)
        color = (80, 150, 230)
        glow = (80, 255, 160) if b.held else ((0, 220, 255) if b.near else (200, 190, 170))
        if (b.near or b.held) and not b.placed:
            cv2.circle(frame, (cx, cy), GRAB, glow, 1)
        cv2.rectangle(frame, (cx - 45, cy - 12), (cx + 45, cy + 12), color, -1)
        for i in range(-1, 2):
            cv2.line(frame, (cx + i * 22, cy - 12), (cx + i * 22, cy + 12), (40, 90, 140), 2)
        if not b.placed:
            cv2.putText(frame, "Cookie Bridge", (cx - 50, cy + 36),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, glow, 1, cv2.LINE_AA)

    def _draw_soft_glow(self, frame: np.ndarray, cx: int, cy: int, radius: int, color: Tuple[int, int, int], alpha: float = 0.35) -> None:
        overlay = frame.copy()
        cv2.circle(overlay, (cx, cy), radius, color, -1)
        cv2.addWeighted(overlay, alpha, frame, 1.0 - alpha, 0, frame)

    def _draw_sparkles(self, frame: np.ndarray, cx: int, cy: int, spread: int = 70) -> None:
        for i in range(8):
            ang = self.anim_t * 1.8 + i * 0.85
            r = spread * (0.35 + 0.55 * abs(math.sin(self.anim_t * 2.2 + i)))
            px = int(cx + r * math.cos(ang))
            py = int(cy + r * math.sin(ang * 0.9) - 10)
            size = 2 + (i % 3)
            cv2.circle(frame, (px, py), size, (255, 255, 255), -1)

    def _draw_ember(self, frame: np.ndarray) -> None:
        ex, ey = int(self.ember_x), int(self.ember_y)
        # Soft magical halo + sparkles (inspired by floating plate glow).
        self._draw_soft_glow(frame, ex, ey, 78, (40, 160, 255), 0.28)
        self._draw_soft_glow(frame, ex, ey, 48, (80, 220, 255), 0.22)
        self._draw_sparkles(frame, ex, ey, 62)
        draw_creature(frame, "Ember Dragon", (ex, ey), 0.85, self.anim_t)

        if self.stage == "build":
            cv2.putText(frame, "WAITING", (ex - 38, ey + 78),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 220, 255), 1, cv2.LINE_AA)
            # Perch ring under Ember.
            px, py = int(self.ember_perch[0]), int(self.ember_perch[1] + 42)
            cv2.ellipse(frame, (px, py), (38, 12), 0, 0, 360, (220, 240, 255), 2)
        elif self.stage == "ability" and not self.ember_docked:
            if self.ember_following:
                cv2.putText(frame, "CARRYING — drop on pad", (ex - 70, ey + 82),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 255, 160), 1, cv2.LINE_AA)
            else:
                glow = (0, 220, 255) if self.ember_near else (200, 210, 230)
                cv2.circle(frame, (ex, ey), GRAB + 20, glow, 2)
                cv2.putText(frame, "PINCH to pick up", (ex - 55, ey + 82),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, glow, 1, cv2.LINE_AA)

    def _draw_ice_gate(self, frame: np.ndarray) -> None:
        x, y = int(self.ice_pos[0]), int(self.ice_pos[1])
        if not self.ice_melted:
            pulse = 0.5 + 0.5 * math.sin(self.anim_t * 4)
            self._draw_soft_glow(frame, x, y, 110, (255, 210, 120), 0.22)

            # Frosty ice slab
            cv2.rectangle(frame, (x - 72, y - 48), (x + 72, y + 40), (255, 235, 190), -1)
            cv2.rectangle(frame, (x - 72, y - 48), (x + 72, y + 40), (255, 190, 40), 3)
            for i in range(3):
                cv2.line(frame, (x - 55 + i * 40, y - 40), (x - 40 + i * 40, y + 30), (240, 210, 150), 1)

            cv2.putText(frame, "ICE GATE", (x - 52, y - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (50, 90, 150), 2, cv2.LINE_AA)

            # Landing pad — clear drop target (like AR plate shadows).
            pad_y = y + 58
            pad_r = int(42 + 6 * pulse)
            if self.stage == "ability":
                self._draw_soft_glow(frame, x, pad_y, pad_r + 18, (255, 255, 255), 0.25)
                cv2.ellipse(frame, (x, pad_y), (pad_r, int(pad_r * 0.38)), 0, 0, 360, (255, 255, 255), 3)
                cv2.ellipse(frame, (x, pad_y), (int(pad_r * 0.55), int(pad_r * 0.2)), 0, 0, 360, (120, 255, 200), 2)
                self._draw_sparkles(frame, x, pad_y - 8, 50)
                label = "DROP EMBER HERE" if self.ember_following else "LEAVE EMBER HERE"
                cv2.putText(frame, label, (x - 78, pad_y + 36),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)
            else:
                cv2.putText(frame, "blocked — place bridge first", (x - 95, y + 22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (40, 90, 140), 1, cv2.LINE_AA)
        else:
            self._draw_soft_glow(frame, x, y, 90, (80, 200, 255), 0.3)
            self._draw_sparkles(frame, x, y, 80)
            cv2.putText(frame, "MELTED", (x - 48, y + 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (40, 120, 255), 3, cv2.LINE_AA)

    def _draw_citizens(self, frame: np.ndarray) -> None:
        for i, xf in enumerate((0.18, 0.30, 0.58, 0.72, 0.85)):
            cx = int(self.w * xf)
            cy = int(self.h * 0.56 - 4 * abs(math.sin(self.anim_t * 5 + i)))
            cv2.circle(frame, (cx, cy), 9, (100, 180, 255), -1)
            cv2.circle(frame, (cx - 2, cy - 1), 2, (20, 20, 30), -1)
            cv2.circle(frame, (cx + 3, cy - 1), 2, (20, 20, 30), -1)


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
        raise RuntimeError("Failed to read webcam frame.")
    frame = cv2.flip(frame, 1)
    h, w = frame.shape[:2]
    mission = Mission(w, h)

    print("FOODIVERSE Phase 7 - Save the Cookie Kingdom")
    print("Follow the on-screen stage guide. R restarts. Q quits.")

    prev = time.time()
    window = "FOODIVERSE - Mission (Phase 7)"

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

            mission.keyboard_stir = _key_held(VK_S)
            mission.update(state, dt)
            mission.draw(frame)
            draw_overlay(frame, state, landmark_list, connections)
            cv2.imshow(window, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("r"):
                mission.reset()
            if key == ord("h") and mission.stage == "cook":
                mission.temperature = "hot"
                mission.message = "Bowl HEATED — wave open hand over bowl"
                mission.message_color = (60, 120, 255)
            if key == ord("n") and mission.stage == "cook":
                mission.temperature = "neutral"
            # Jump straight to Ember-follow + ice gate (for testing / if stuck).
            if key == ord("5"):
                mission.skip_to_ability()
                print("Skipped to ability stage")
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
