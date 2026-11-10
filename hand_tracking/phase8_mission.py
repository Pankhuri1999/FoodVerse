"""
FOODIVERSE Phase 8 — Full Cookie Kingdom Restoration.

Complete rescue with all three creatures:
  Ember melts ice → Grove grows forest → Mint freezes a water path → kingdom thrives.

Also the desktop polish pass before Meta Quest (see docs/PHASE8.md).

Controls:
  q quit | r restart
  h heat | c cool | s stir
  e pick up / drop active creature
  5 skip to Ember melt | 6 Grove grow | 7 Mint freeze
"""

from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np

from creatures import draw_creature
from hand_tracker import HandState, compute_hand_state, draw_overlay
from visual_theme import (
    CYAN, GOLD, MINT, NAVY, VIOLET, WHITE, ascii_text, filled_round, round_panel, ui_scale,
)

try:
    import winsound
except ImportError:
    winsound = None

GRAB = 80
STIR_FILL = 300.0
VK_S, VK_E = 0x53, 0x45

STAGE_TITLE = {
    "intro": "1/10 Distress",
    "collect_ember": "2/10 Collect Ember ingredients",
    "cook_ember": "3/10 Cook Ember Dragon",
    "build": "4/10 Build Cookie Bridge",
    "melt": "5/10 Melt Ice Gate (Ember)",
    "collect_grove": "6/10 Collect Grove ingredients",
    "cook_grove": "7/10 Cook Grove Guardian",
    "grow": "8/10 Grow the Barren Grove",
    "collect_mint": "9/10 Collect Mint ingredients",
    "cook_mint": "9b/10 Cook Mint Current",
    "freeze": "9c/10 Freeze the Water Path",
    "restored": "10/10 Kingdom Restored",
}


def _key_held(vk: int) -> bool:
    try:
        import ctypes
        return bool(ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000)
    except Exception:
        return False


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
    radius: int = 32


@dataclass
class BridgePiece:
    x: float
    y: float
    home: Tuple[float, float]
    placed: bool = False
    held: bool = False
    near: bool = False


@dataclass
class Buddy:
    key: str
    name: str
    perch: Tuple[float, float]
    x: float = 0.0
    y: float = 0.0
    ready: bool = False
    following: bool = False
    docked: bool = False
    near: bool = False

    def park(self) -> None:
        self.x, self.y = self.perch
        self.following = False
        self.docked = False


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
    bowl: Tuple[float, float, float, float] = (0, 0, 120, 60)
    ice_pos: Tuple[float, float] = (0.0, 0.0)
    barren_pos: Tuple[float, float] = (0.0, 0.0)
    water_pos: Tuple[float, float] = (0.0, 0.0)
    ice_melted: bool = False
    grove_grown: bool = False
    water_frozen: bool = False
    hover_t: float = 0.0
    buddies: Dict[str, Buddy] = field(default_factory=dict)
    active_buddy: str = "ember"
    last_hand: Optional[Tuple[float, float]] = None
    hand_seen_t: float = 0.0

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
        self.ice_melted = False
        self.grove_grown = False
        self.water_frozen = False
        self.hover_t = 0.0
        self.active_buddy = "ember"
        self.last_hand = None
        self.hand_seen_t = 0.0
        self.message = "Full restoration mission — pinch or wait to begin"
        self.message_color = (255, 220, 120)

        self.bowl = (
            self.w * 0.50,
            self.h * 0.50,
            max(96.0, self.w * 0.09),
            max(48.0, self.h * 0.072),
        )
        self.bridge_socket = (self.w * 0.50, self.h * 0.64)
        self.ice_pos = (self.w * 0.38, self.h * 0.62)
        self.barren_pos = (self.w * 0.30, self.h * 0.56)
        self.water_pos = (self.w * 0.66, self.h * 0.58)

        self.buddies = {
            "ember": Buddy("ember", "Ember Dragon", (self.w * 0.34, self.h * 0.34)),
            "grove": Buddy("grove", "Grove Guardian", (self.w * 0.34, self.h * 0.34)),
            "mint": Buddy("mint", "Mint Current", (self.w * 0.34, self.h * 0.34)),
        }
        for b in self.buddies.values():
            b.park()

        self._spawn_pair(
            ("Cosmic Fruit", (90, 90, 255), "circle"),
            ("Star-Pepper", (40, 40, 255), "star"),
        )
        home = (self.w * 0.30, self.h * 0.48)
        self.bridge = BridgePiece(home[0], home[1], home)

    def _spawn_pair(self, a: Tuple[str, Tuple[int, int, int], str], b: Tuple[str, Tuple[int, int, int], str]) -> None:
        p1 = (self.w * 0.17, self.h * 0.42)
        p2 = (self.w * 0.17, self.h * 0.62)
        self.items = [
            Item(a[0], a[1], a[2], p1[0], p1[1], p1),
            Item(b[0], b[1], b[2], p2[0], p2[1], p2),
        ]
        self.bowl_contents.clear()
        self.held_item = None
        self.temperature = "neutral"
        self.stir = 0.0

    def set_stage(self, stage: str, message: str, color: Tuple[int, int, int] = (200, 200, 210)) -> None:
        self.stage = stage
        self.stage_t = 0.0
        self.message = message
        self.message_color = color
        self.stir = 0.0
        self._last_stir = None
        self.hover_t = 0.0
        print(f"[P8] {STAGE_TITLE.get(stage, stage)} — {message}")
        self._chime(700)

    # --- skips ---
    def skip_to_melt(self) -> None:
        self.buddies["ember"].ready = True
        self.buddies["ember"].park()
        if self.bridge:
            self.bridge.placed = True
            self.bridge.x, self.bridge.y = self.bridge_socket
        self.active_buddy = "ember"
        self.set_stage("melt", "PINCH Ember → DROP on ICE GATE pad", (80, 220, 255))

    def skip_to_grow(self) -> None:
        self.skip_to_melt()
        self.ice_melted = True
        self.buddies["ember"].docked = True
        self.buddies["grove"].ready = True
        self.buddies["grove"].park()
        self.active_buddy = "grove"
        self.set_stage("grow", "PINCH Grove → DROP on BARREN SOIL pad", (80, 220, 120))

    def skip_to_freeze(self) -> None:
        self.skip_to_grow()
        self.grove_grown = True
        self.buddies["grove"].docked = True
        self.buddies["mint"].ready = True
        self.buddies["mint"].park()
        self.active_buddy = "mint"
        self.set_stage("freeze", "PINCH Mint → DROP on WATER PATH pad", (220, 220, 120))

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

        buddy = self.buddies.get(self.active_buddy)
        if buddy and buddy.ready and buddy.following and not buddy.docked and self.last_hand and self.hand_seen_t > 0:
            buddy.x = 0.55 * buddy.x + 0.45 * self.last_hand[0]
            buddy.y = 0.55 * buddy.y + 0.45 * self.last_hand[1]
        elif buddy and buddy.ready and not buddy.following and not buddy.docked:
            bob = 5.0 * math.sin(self.anim_t * 2.3)
            buddy.x = buddy.perch[0]
            buddy.y = buddy.perch[1] + bob

        if self.stage == "intro":
            if self.stage_t > 3.0 or pinching:
                self.set_stage("collect_ember", "Pinch Cosmic Fruit + Star-Pepper into the bowl", (120, 200, 255))
            return

        if self.stage == "collect_ember":
            self._update_collect(hand, gx, gy, pinching)
            if set(self.bowl_contents) >= {"Cosmic Fruit", "Star-Pepper"}:
                self.set_stage("cook_ember", "Press H to HEAT, then wave OPEN hand (or hold S)", (60, 140, 255))
            return

        if self.stage == "cook_ember":
            self._update_cook(hand, gx, gy, dt, need_temp="hot", on_done=self._after_ember_cook)
            return

        if self.stage == "build":
            self._update_build(gx, gy, pinching)
            return

        if self.stage == "melt":
            self._update_drop_challenge(
                gx, gy, pinching, hand.detected, dt,
                target=self.ice_pos, radius=110,
                on_land=self._after_melt,
            )
            return

        if self.stage == "collect_grove":
            self._update_collect(hand, gx, gy, pinching)
            if set(self.bowl_contents) >= {"Space Leaves", "Crystal Sugar"}:
                self.set_stage("cook_grove", "Wave OPEN hand over bowl (any temp) or hold S", (80, 200, 100))
            return

        if self.stage == "cook_grove":
            self._update_cook(hand, gx, gy, dt, need_temp="any", on_done=self._after_grove_cook)
            return

        if self.stage == "grow":
            self._update_drop_challenge(
                gx, gy, pinching, hand.detected, dt,
                target=self.barren_pos, radius=110,
                on_land=self._after_grow,
            )
            return

        if self.stage == "collect_mint":
            self._update_collect(hand, gx, gy, pinching)
            if set(self.bowl_contents) >= {"Chocolate", "Mint Crystal"}:
                self.set_stage("cook_mint", "Press C to COOL, then wave OPEN hand (or hold S)", (220, 220, 120))
            return

        if self.stage == "cook_mint":
            self._update_cook(hand, gx, gy, dt, need_temp="cold", on_done=self._after_mint_cook)
            return

        if self.stage == "freeze":
            self._update_drop_challenge(
                gx, gy, pinching, hand.detected, dt,
                target=self.water_pos, radius=110,
                on_land=self._after_freeze,
            )
            return

    def _after_ember_cook(self) -> None:
        self.buddies["ember"].ready = True
        self.buddies["ember"].park()
        self.active_buddy = "ember"
        self.set_stage("build", "Ember waits left — pinch Cookie Bridge onto the GAP", (40, 120, 255))

    def _after_melt(self) -> None:
        self.ice_melted = True
        self._spawn_pair(
            ("Space Leaves", (80, 200, 100), "circle"),
            ("Crystal Sugar", (220, 240, 255), "star"),
        )
        self.set_stage("collect_grove", "Ice melted! Pinch Space Leaves + Crystal Sugar", (80, 220, 140))

    def _after_grove_cook(self) -> None:
        self.buddies["grove"].ready = True
        self.buddies["grove"].park()
        self.active_buddy = "grove"
        self.set_stage("grow", "PINCH Grove Guardian → DROP on BARREN SOIL", (80, 220, 120))

    def _after_grow(self) -> None:
        self.grove_grown = True
        self._spawn_pair(
            ("Chocolate", (40, 60, 120), "circle"),
            ("Mint Crystal", (200, 255, 180), "star"),
        )
        self.set_stage("collect_mint", "Forest grown! Pinch Chocolate + Mint Crystal", (200, 230, 140))

    def _after_mint_cook(self) -> None:
        self.buddies["mint"].ready = True
        self.buddies["mint"].park()
        self.active_buddy = "mint"
        self.set_stage("freeze", "PINCH Mint Current → DROP on WATER PATH", (220, 220, 120))

    def _after_freeze(self) -> None:
        self.water_frozen = True
        self.set_stage("restored", "Cookie Kingdom fully restored — feast!", (80, 255, 180))

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

    def _update_cook(self, hand: HandState, gx: float, gy: float, dt: float, need_temp: str, on_done) -> None:
        self.stirring = False
        if need_temp == "hot" and self.temperature != "hot":
            self.message = "Press H to HEAT the bowl, then stir"
            return
        if need_temp == "cold" and self.temperature != "cold":
            self.message = "Press C to COOL the bowl, then stir"
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
            self.message = "Stirring…" if self.stir < 0.45 else "Almost done…"
        else:
            self._last_stir = None
            self.message = "Wave OPEN hand over bowl (or hold S)"

        if self.stir >= 0.45:
            for item in self.items:
                if item.in_bowl:
                    item.consumed = True
                    item.in_bowl = False
            self.bowl_contents.clear()
            on_done()
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
                self.set_stage("melt", "PINCH Ember → DROP on ICE GATE glowing pad", (80, 220, 255))
                self._chime(900)
            else:
                b.x, b.y = b.home
                self.message = "Snap the bridge into the glowing GAP"

    def _update_drop_challenge(
        self,
        gx: float,
        gy: float,
        pinching: bool,
        detected: bool,
        dt: float,
        target: Tuple[float, float],
        radius: float,
        on_land,
    ) -> None:
        buddy = self.buddies[self.active_buddy]
        on_pad = math.hypot(buddy.x - target[0], buddy.y - target[1]) < radius
        near = detected and math.hypot(gx - buddy.x, gy - buddy.y) < GRAB + 30
        buddy.near = near

        if buddy.docked:
            return

        if pinching and near and not buddy.following:
            buddy.following = True
            self.message = f"Carrying {buddy.name} — fly to the glowing pad"
            self.message_color = (80, 255, 160)
            self._chime(880)
            return

        if _key_held(VK_E) and not buddy.following:
            buddy.following = True
            self.message = f"Carrying {buddy.name} (E) — move to pad"
            self.message_color = (80, 255, 160)
            return

        if not buddy.following:
            self.hover_t = 0.0
            self.message = f"PINCH {buddy.name} on the left perch"
            self.message_color = (120, 200, 255)
            return

        if on_pad:
            self.hover_t += dt
            self.message = "OPEN hand (or E) to DROP — or hold 0.6s"
            self.message_color = (80, 255, 160)
            if (detected and not pinching) or _key_held(VK_E) or self.hover_t >= 0.6:
                buddy.following = False
                buddy.docked = True
                buddy.x, buddy.y = target[0], target[1] - 36
                self.message = f"{buddy.name} landed!"
                self.message_color = (80, 255, 180)
                self._chime(1100)
                on_land()
        else:
            self.hover_t = 0.0
            self.message = f"Fly {buddy.name} to the glowing DROP pad"
            self.message_color = (120, 200, 255)

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
            winsound.Beep(freq, 80)
        except Exception:
            pass

    # --- drawing ---
    def draw(self, frame: np.ndarray) -> None:
        self._draw_world(frame)
        if self.stage in ("collect_ember", "cook_ember", "collect_grove", "cook_grove",
                          "collect_mint", "cook_mint", "intro"):
            self._draw_bowl(frame)

        if self.stage.startswith("collect") or self.stage.startswith("cook"):
            for item in self.items:
                if not item.in_bowl and not item.consumed:
                    self._draw_item(frame, item)
            for i, name in enumerate(self.bowl_contents):
                item = next((it for it in self.items if it.name == name), None)
                color = item.color if item else (200, 200, 200)
                cv2.circle(frame, (int(self.bowl[0] - 30 + i * 40), int(self.bowl[1] + 8)), 12, color, -1)

        if self.stage in ("build", "melt", "grow", "freeze", "restored",
                          "collect_grove", "cook_grove", "collect_mint", "cook_mint") and self.bridge:
            if not self.bridge.placed and self.stage == "build":
                sx, sy = int(self.bridge_socket[0]), int(self.bridge_socket[1])
                pulse = 0.5 + 0.5 * math.sin(self.anim_t * 4)
                cv2.circle(frame, (sx, sy), 42, CYAN, 2, cv2.LINE_AA)
                cv2.circle(frame, (sx, sy), int(28 + 6 * pulse), VIOLET, 1, cv2.LINE_AA)
                cv2.putText(frame, "GAP", (sx - 18, sy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, WHITE, 1, cv2.LINE_AA)
            self._draw_bridge_piece(frame, self.bridge)

        # Challenge targets
        if self.stage in ("build", "melt") or (self.ice_melted and self.stage != "intro"):
            self._draw_challenge(
                frame, self.ice_pos, "ICE GATE",
                melted=self.ice_melted,
                active=self.stage == "melt",
                carrying=self.buddies["ember"].following,
            )
        if self.stage in ("grow", "collect_grove", "cook_grove") or self.grove_grown:
            self._draw_challenge(
                frame, self.barren_pos, "BARREN SOIL" if not self.grove_grown else "GROVE",
                melted=self.grove_grown,
                active=self.stage == "grow",
                carrying=self.buddies["grove"].following,
                cold=False,
                green=True,
            )
        if self.stage in ("freeze", "collect_mint", "cook_mint") or self.water_frozen:
            self._draw_challenge(
                frame, self.water_pos, "WATER PATH" if not self.water_frozen else "FROZEN PATH",
                melted=self.water_frozen,
                active=self.stage == "freeze",
                carrying=self.buddies["mint"].following,
                cold=True,
            )

        for key, buddy in self.buddies.items():
            if buddy.ready:
                self._draw_buddy(frame, buddy, active=(key == self.active_buddy and self.stage in ("melt", "grow", "freeze", "build")))

        if self.stage == "restored":
            self._draw_citizens(frame)
            self._draw_soft_glow(frame, self.w // 2, int(self.h * 0.55), 200, (80, 200, 255), 0.2)

        self._draw_hud(frame)

    def _recipe_card(self) -> Tuple[str, str, str]:
        if self.stage in ("intro", "collect_ember", "cook_ember"):
            return "EMBER", "Fruit + Pepper", "H heat, then stir"
        if self.stage in ("collect_grove", "cook_grove"):
            return "GROVE", "Leaves + Sugar", "Stir to grow"
        if self.stage in ("collect_mint", "cook_mint"):
            return "MINT", "Chocolate + Mint", "C cool, then stir"
        if self.stage in ("build", "melt"):
            return "BRIDGE", "Ice gate ahead", "Pinch, then drop"
        if self.stage == "grow":
            return "GROVE", "Barren soil", "Drop the guardian"
        if self.stage == "freeze":
            return "MINT", "Water path", "Drop to freeze"
        return "FEAST", "Kingdom open", "Mission complete"

    def _draw_hud(self, frame: np.ndarray) -> None:
        """Mission across the top, pantry on the left, recipe on the right, status along the console."""
        w, h = self.w, self.h
        title_size = max(0.42, min(0.55, ui_scale(w)))
        top_h = 58
        round_panel(frame, 12, 10, min(430, w // 2 - 24), top_h, 16)
        cv2.putText(frame, "FOODIVERSE", (26, 34),
                    cv2.FONT_HERSHEY_SIMPLEX, title_size, GOLD, 1, cv2.LINE_AA)
        cv2.putText(frame, ascii_text(STAGE_TITLE.get(self.stage, self.stage)), (26, 54),
                    cv2.FONT_HERSHEY_SIMPLEX, title_size * 0.72, CYAN, 1, cv2.LINE_AA)

        status_w = min(250, w // 3)
        round_panel(frame, w - status_w - 12, 10, status_w, top_h, 16)
        cv2.circle(frame, (w - status_w + 10, 32), 4, MINT, -1, cv2.LINE_AA)
        cv2.putText(frame, "CANOPY  LIVE", (w - status_w + 22, 36),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, WHITE, 1, cv2.LINE_AA)
        cv2.putText(frame, "GRAVITY  ZERO-G", (w - status_w + 22, 54),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, CYAN, 1, cv2.LINE_AA)

        self._draw_side_cards(frame)
        self._draw_console_bar(frame, title_size)

    def _draw_side_cards(self, frame: np.ndarray) -> None:
        """Left pantry stays above the ingredient platforms. Recipe stays right of the mixer."""
        cooking = self.stage in (
            "intro", "collect_ember", "cook_ember", "collect_grove", "cook_grove",
            "collect_mint", "cook_mint",
        )
        top = 76
        if cooking and self.items:
            first = min(item.home[1] for item in self.items)
            pantry_bottom = int(first - GRAB - 18)
            pantry_h = pantry_bottom - top
            pantry_w = min(230, max(120, int(self.w * 0.20)))
            if pantry_h >= 58:
                round_panel(frame, 14, top, pantry_w, pantry_h, 14)
                cv2.putText(frame, "PANTRY", (28, top + 22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, GOLD, 1, cv2.LINE_AA)
                y = top + 44
                for item in self.items[:2]:
                    if y > top + pantry_h - 10:
                        break
                    state = "HOLD" if item.held else ("IN MIXER" if item.in_bowl else "READY")
                    short = item.name.replace("Cosmic ", "").replace("Crystal ", "").replace("Space ", "")
                    cv2.putText(frame, short[:12], (28, y),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.38, WHITE, 1, cv2.LINE_AA)
                    cv2.putText(frame, state, (28 + pantry_w - 78, y),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.36, MINT if item.in_bowl else CYAN, 1, cv2.LINE_AA)
                    y += 22

        name, pair, hint = self._recipe_card()
        card_w = min(250, max(160, int(self.w * 0.22)))
        card_h = 128 if self.stage.startswith("cook") else 96
        card_x = self.w - card_w - 14
        guard = int(max(self.bowl[0] + self.bowl[2], self.water_pos[0] + 70) + 16)
        if card_x < guard:
            card_x = guard
            card_w = max(0, self.w - 14 - card_x)
        if card_w >= 156 and top + card_h < int(self.h * 0.78):
            round_panel(frame, card_x, top, card_w, card_h, 14)
            cv2.putText(frame, "QUANTUM MIXER", (card_x + 14, top + 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, GOLD, 1, cv2.LINE_AA)
            cv2.putText(frame, name, (card_x + 14, top + 44),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, WHITE, 1, cv2.LINE_AA)
            cv2.putText(frame, pair, (card_x + 14, top + 64),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.36, CYAN, 1, cv2.LINE_AA)
            cv2.putText(frame, hint, (card_x + 14, top + 82),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.34, WHITE, 1, cv2.LINE_AA)
            if self.stage.startswith("cook"):
                bar_w = card_w - 28
                filled_round(frame, card_x + 14, top + 94, bar_w, 10, (24, 18, 14), 5, 1.0)
                filled_round(frame, card_x + 14, top + 94, max(8, int(bar_w * self.stir)), 10, MINT, 5, 1.0)
                temp = self.temperature.upper()
                temp_color = GOLD if self.temperature == "hot" else (CYAN if self.temperature == "cold" else WHITE)
                cv2.putText(frame, temp, (card_x + 14, top + 118),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.36, temp_color, 1, cv2.LINE_AA)

    def _draw_console_bar(self, frame: np.ndarray, title_size: float) -> None:
        w, h = self.w, self.h
        bar_y = h - 54
        round_panel(frame, 12, bar_y, w - 24, 42, 14)
        cv2.putText(frame, "ZERO-G", (26, bar_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, CYAN, 1, cv2.LINE_AA)
        note = ascii_text(self.message)
        max_chars = max(16, (w - 420) // 9)
        if len(note) > max_chars:
            note = note[: max_chars - 3] + "..."
        color = WHITE if sum(self.message_color) < 320 else self.message_color
        cv2.putText(frame, note, (118, bar_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, max(0.38, title_size * 0.68), color, 1, cv2.LINE_AA)
        cv2.putText(frame, "PINCH   H C S   R Q", (w - 210, bar_y + 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, GOLD, 1, cv2.LINE_AA)

    def _blend(self, frame: np.ndarray, overlay: np.ndarray, alpha: float) -> None:
        cv2.addWeighted(overlay, alpha, frame, 1.0 - alpha, 0, frame)

    def _draw_soft_glow(self, frame, cx, cy, radius, color, alpha=0.35) -> None:
        overlay = frame.copy()
        for i, a in enumerate((1.0, 0.55, 0.25)):
            r = int(radius * (1.0 - i * 0.28))
            cv2.circle(overlay, (cx, cy), max(2, r), color, -1)
            self._blend(frame, overlay, alpha * a * 0.45)
            overlay = frame.copy()

    def _draw_soft_shadow(self, frame, cx: int, cy: int, rx: int, ry: int, alpha: float = 0.35) -> None:
        overlay = frame.copy()
        cv2.ellipse(overlay, (cx, cy), (rx, ry), 0, 0, 360, (20, 15, 10), -1)
        self._blend(frame, overlay, alpha)
        overlay2 = frame.copy()
        cv2.ellipse(overlay2, (cx, cy), (int(rx * 0.65), int(ry * 0.65)), 0, 0, 360, (10, 8, 5), -1)
        self._blend(frame, overlay2, alpha * 0.5)

    def _draw_bokeh(self, frame, cx, cy, spread=55) -> None:
        """Soft light flecks instead of hard white dots."""
        for i in range(6):
            ang = self.anim_t * 1.2 + i * 1.05
            r = spread * (0.35 + 0.5 * abs(math.sin(self.anim_t * 1.6 + i)))
            px = int(cx + r * math.cos(ang))
            py = int(cy + r * math.sin(ang * 0.85) - 8)
            self._draw_soft_glow(frame, px, py, 6 + (i % 3), (255, 250, 240), 0.22)

    def _draw_sparkles(self, frame, cx, cy, spread=70) -> None:
        self._draw_bokeh(frame, cx, cy, int(spread * 0.85))

    def _draw_holo_panel(self, frame: np.ndarray, x: int, y: int, w: int, h: int) -> None:
        overlay = frame.copy()
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (28, 24, 22), -1)
        self._blend(frame, overlay, 0.45)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (210, 200, 180), 1, cv2.LINE_AA)
        cv2.line(frame, (x + 8, y + h - 1), (x + 60, y + h - 1), (180, 240, 255), 2, cv2.LINE_AA)

    def _octave_noise(self, h: int, w: int, seed: int, octaves: int = 4) -> np.ndarray:
        """Multi-octave soft noise for high-quality nebulae."""
        rng = np.random.RandomState(seed)
        acc = np.zeros((h, w), dtype=np.float32)
        amp = 1.0
        total = 0.0
        for o in range(octaves):
            scale = 2 ** o
            nh, nw = max(8, h // (6 * scale)), max(8, w // (6 * scale))
            n = rng.rand(nh, nw).astype(np.float32)
            n = cv2.resize(n, (w, h), interpolation=cv2.INTER_CUBIC)
            n = cv2.GaussianBlur(n, (0, 0), 10 + 14 * (octaves - o))
            acc += n * amp
            total += amp
            amp *= 0.55
        acc /= max(1e-5, total)
        return acc

    def _build_space_base(self, w: int, h: int) -> np.ndarray:
        """Supersampled space plate for smoother, more realistic quality."""
        # Render at 1.5× then downscale (cheap supersampling).
        sw, sh = int(w * 1.5), int(h * 1.5)
        rng = np.random.RandomState(11)
        space = np.zeros((sh, sw, 3), dtype=np.float32)

        yy = np.linspace(0.0, 1.0, sh, dtype=np.float32)[:, None]
        xx = np.linspace(0.0, 1.0, sw, dtype=np.float32)[None, :]
        # Richer void: near-black with cool/warm horizon
        space[:, :, 0] = 6 + 26 * (1.0 - yy) + 10 * xx * (1.0 - yy)
        space[:, :, 1] = 3 + 12 * (1.0 - yy)
        space[:, :, 2] = 5 + 20 * yy + 8 * (1.0 - xx) * yy

        # Multi-octave nebulae
        for color, strength, seed in (
            ((48, 22, 16), 0.62, 1),
            ((36, 16, 78), 0.55, 2),
            ((72, 48, 18), 0.48, 3),
            ((90, 62, 28), 0.40, 4),
            ((28, 58, 22), 0.32, 5),
            ((60, 35, 55), 0.28, 6),
        ):
            n = self._octave_noise(sh, sw, seed, octaves=4)
            n = np.clip((n - 0.38) * 2.4, 0, 1)
            n = cv2.GaussianBlur(n, (0, 0), 18)
            for c in range(3):
                space[:, :, c] += n * color[c] * strength

        # Milky Way ribbon
        band = np.zeros((sh, sw), dtype=np.float32)
        for i in range(0, sh, 2):
            cx = int(sw * (0.12 + 0.78 * (i / max(1, sh - 1))))
            cv2.circle(band, (cx, i), 70 + (i % 23), 1.0, -1)
        band = cv2.GaussianBlur(band, (0, 0), 55)
        band = np.clip(band, 0, 1)
        space[:, :, 0] += band * 42
        space[:, :, 1] += band * 34
        space[:, :, 2] += band * 38
        dust = rng.rand(sh, sw).astype(np.float32)
        dust = ((dust > 0.988).astype(np.float32) * band)
        space += dust[:, :, None] * 200

        # Distant galaxy
        gal = np.zeros((sh, sw), dtype=np.float32)
        gx, gy = int(sw * 0.17), int(sh * 0.20)
        cv2.ellipse(gal, (gx, gy), (120, 34), -32, 0, 360, 1.0, -1)
        cv2.ellipse(gal, (gx, gy), (70, 16), 55, 0, 360, 0.7, -1)
        gal = cv2.GaussianBlur(gal, (0, 0), 16)
        space[:, :, 0] += gal * 48
        space[:, :, 1] += gal * 34
        space[:, :, 2] += gal * 55

        # Bake faint stars into base (high count, soft)
        colors = [
            (255, 255, 255), (255, 245, 230), (230, 245, 255),
            (200, 225, 255), (255, 235, 210), (210, 235, 255),
        ]
        for _ in range(900):
            sx = int(rng.randint(0, sw))
            sy = int(rng.randint(0, sh))
            col = colors[int(rng.randint(0, len(colors)))]
            bright = 0.35 + 0.65 * rng.rand()
            sz = 1 if rng.rand() > 0.08 else 2
            cv2.circle(space, (sx, sy), sz, tuple(c * bright for c in col), -1, cv2.LINE_AA)

        space = np.clip(space, 0, 255).astype(np.uint8)

        # Soft bloom on bright nebula regions
        blur = cv2.GaussianBlur(space, (0, 0), 12)
        space = cv2.addWeighted(space, 0.78, blur, 0.22, 0)

        self._paint_planet(space, int(sw * 0.78), int(sh * 0.24), int(78 * 1.5))
        self._paint_moon(space, int(sw * 0.12), int(sh * 0.38), int(28 * 1.5))

        # Downsample for anti-aliased result
        return cv2.resize(space, (w, h), interpolation=cv2.INTER_AREA)

    def _paint_planet(self, img: np.ndarray, cx: int, cy: int, r: int) -> None:
        """Higher-quality gas giant: radial light, soft bands, multi-ring."""
        for thick, col, a0, a1 in (
            (14, (95, 88, 75), 195, 345),
            (6, (150, 140, 120), 195, 345),
            (2, (70, 65, 55), 195, 345),
        ):
            cv2.ellipse(img, (cx, cy), (r + 48, 16), 18, a0, a1, col, thick, cv2.LINE_AA)

        atm = img.copy()
        cv2.circle(atm, (cx, cy), r + 20, (150, 120, 80), -1, cv2.LINE_AA)
        atm = cv2.GaussianBlur(atm, (0, 0), 8)
        cv2.addWeighted(atm, 0.28, img, 0.72, 0, img)

        layer = np.zeros_like(img)
        # Radial sphere shading
        ys, xs = np.ogrid[-r:r + 1, -r:r + 1]
        dist = np.sqrt(xs.astype(np.float32) ** 2 + ys.astype(np.float32) ** 2)
        inside = dist <= r
        # Light from upper-left
        nx = xs / max(1, r)
        ny = ys / max(1, r)
        lambert = np.clip(0.35 - 0.55 * nx - 0.35 * ny, 0.08, 1.0)
        base = np.array([95, 78, 48], dtype=np.float32)
        patch = np.zeros((2 * r + 1, 2 * r + 1, 3), dtype=np.float32)
        for c in range(3):
            patch[:, :, c] = base[c] * lambert
        # Soft latitude bands
        for i, mul in enumerate((1.15, 0.75, 1.25, 0.85, 1.1, 0.9)):
            y0 = int(r * (-0.85 + i * 0.3))
            band = (ys > y0 - 7) & (ys < y0 + 7) & inside
            patch[band] *= mul
        patch = np.clip(patch, 0, 255).astype(np.uint8)
        # Specular glint
        spec = patch.copy()
        cv2.ellipse(spec, (r - r // 3, r - r // 4), (r // 3, r // 4), -20, 0, 360, (210, 195, 160), -1, cv2.LINE_AA)
        cv2.addWeighted(spec, 0.28, patch, 0.72, 0, patch)

        y0, x0 = cy - r, cx - r
        y1, x1 = y0 + patch.shape[0], x0 + patch.shape[1]
        if y0 >= 0 and x0 >= 0 and y1 <= img.shape[0] and x1 <= img.shape[1]:
            mask = inside.astype(np.uint8) * 255
            roi = img[y0:y1, x0:x1]
            roi[mask == 255] = patch[mask == 255]
            # Soft limb blur
            soft = roi.copy()
            soft = cv2.GaussianBlur(soft, (0, 0), 1.5)
            roi[:] = np.where(mask[:, :, None] == 255, soft, roi)

        for thick, col, a0, a1 in (
            (11, (155, 145, 125), 12, 168),
            (4, (215, 205, 180), 12, 168),
            (2, (100, 95, 85), 12, 168),
        ):
            cv2.ellipse(img, (cx, cy), (r + 48, 16), 18, a0, a1, col, thick, cv2.LINE_AA)

    def _paint_moon(self, img: np.ndarray, cx: int, cy: int, r: int) -> None:
        glow = img.copy()
        cv2.circle(glow, (cx, cy), r + 10, (80, 75, 70), -1, cv2.LINE_AA)
        glow = cv2.GaussianBlur(glow, (0, 0), 6)
        cv2.addWeighted(glow, 0.25, img, 0.75, 0, img)

        layer = np.zeros((2 * r + 1, 2 * r + 1, 3), dtype=np.float32)
        ys, xs = np.ogrid[-r:r + 1, -r:r + 1]
        dist = np.sqrt(xs.astype(np.float32) ** 2 + ys.astype(np.float32) ** 2)
        inside = dist <= r
        lambert = np.clip(0.4 - 0.5 * (xs / max(1, r)) - 0.3 * (ys / max(1, r)), 0.12, 1.0)
        for c, v in enumerate((120.0, 118.0, 114.0)):
            layer[:, :, c] = v * lambert
        layer = np.clip(layer, 0, 255).astype(np.uint8)
        for dx, dy, cr in ((-6, 4, 5), (8, -5, 4), (2, 8, 3), (-3, -6, 2)):
            cv2.circle(layer, (r + dx, r + dy), cr, (75, 72, 70), -1, cv2.LINE_AA)
        y0, x0 = cy - r, cx - r
        if y0 >= 0 and x0 >= 0 and y0 + layer.shape[0] <= img.shape[0] and x0 + layer.shape[1] <= img.shape[1]:
            mask = inside.astype(np.uint8) * 255
            roi = img[y0:y0 + layer.shape[0], x0:x0 + layer.shape[1]]
            roi[mask == 255] = layer[mask == 255]

    def _draw_space_backdrop(self, frame: np.ndarray) -> None:
        """Full cinematic deep-space sky."""
        w, h = self.w, self.h
        ver = 2  # bump to force rebuild after quality upgrades
        if (
            not hasattr(self, "_space_base")
            or self._space_base is None
            or getattr(self, "_space_ver", 0) != ver
            or self._space_base.shape[:2] != (h, w)
        ):
            self._space_base = self._build_space_base(w, h)
            self._space_ver = ver
            rng = np.random.RandomState(7)
            colors = [
                (255, 255, 255), (255, 245, 230), (230, 245, 255),
                (200, 225, 255), (255, 235, 210), (215, 235, 255),
            ]
            # Only animate brighter stars (base already has dense field)
            self._stars = []
            for _ in range(70):
                self._stars.append((
                    int(rng.randint(0, w)),
                    int(rng.randint(0, h)),
                    2 if rng.rand() > 0.45 else 3,
                    float(rng.rand()),
                    colors[int(rng.randint(0, len(colors)))],
                ))

        space = self._space_base.copy()

        # Gentle twinkle on hero stars only (keeps FPS + quality)
        for sx, sy, size, phase, col in self._stars:
            tw = 0.65 + 0.35 * abs(math.sin(self.anim_t * (1.0 + phase) + phase * 8))
            b = tuple(int(min(255, c * tw)) for c in col)
            cv2.circle(space, (sx, sy), size, b, -1, cv2.LINE_AA)
            if size >= 3:
                cv2.circle(space, (sx, sy), size + 2, b, 1, cv2.LINE_AA)
                if tw > 0.85:
                    arm = 6 + int(3 * tw)
                    cv2.line(space, (sx - arm, sy), (sx + arm, sy), b, 1, cv2.LINE_AA)
                    cv2.line(space, (sx, sy - arm), (sx, sy + arm), b, 1, cv2.LINE_AA)

        streak = (self.anim_t * 0.28) % 8.0
        if streak < 0.65:
            t = streak / 0.65
            x0 = int(w * (0.05 + 0.8 * t))
            y0 = int(h * (0.05 + 0.28 * t))
            for k, a in enumerate((1.0, 0.5, 0.22)):
                x1 = x0 - 45 - k * 20
                y1 = y0 - 16 - k * 7
                cv2.line(space, (x0, y0), (x1, y1), (int(255 * a), int(248 * a), int(235 * a)), 2 - min(1, k), cv2.LINE_AA)
            cv2.circle(space, (x0, y0), 3, (255, 255, 255), -1, cv2.LINE_AA)

        # Tiny soft bloom each frame for cinematic feel
        bloom = cv2.GaussianBlur(space, (0, 0), 3)
        space = cv2.addWeighted(space, 0.88, bloom, 0.12, 0)

        cv2.addWeighted(space, 0.98, frame, 0.02, 0, frame)

    def _viewport_plate(self, w: int, h: int) -> np.ndarray:
        """Baked still: black space, soft sun, shaded Earth. Built once."""
        if getattr(self, "_view_plate", None) is not None and getattr(self, "_view_wh", None) == (w, h):
            return self._view_plate

        img = np.zeros((h, w, 3), dtype=np.float32)
        rng = np.random.RandomState(19)
        for _ in range(520):
            sx, sy = int(rng.randint(0, w)), int(rng.randint(0, int(h * 0.55)))
            bright = 90 + int(165 * rng.rand())
            tint = rng.rand()
            col = (bright, bright, bright) if tint > 0.15 else (bright, int(bright * 0.92), int(bright * 0.82))
            cv2.circle(img, (sx, sy), 1 if rng.rand() > 0.06 else 2, col, -1, cv2.LINE_AA)

        # Soft sun (no crosshair — that reads as a cartoon flare)
        sx, sy = int(w * 0.32), int(h * 0.11)
        sun = np.zeros_like(img)
        cv2.circle(sun, (sx, sy), 140, (40, 55, 80), -1, cv2.LINE_AA)
        cv2.circle(sun, (sx, sy), 70, (80, 110, 160), -1, cv2.LINE_AA)
        cv2.circle(sun, (sx, sy), 22, (180, 210, 255), -1, cv2.LINE_AA)
        sun = cv2.GaussianBlur(sun, (0, 0), 18)
        img += sun * 0.85
        core = np.zeros_like(img)
        cv2.circle(core, (sx, sy), 5, (255, 255, 255), -1, cv2.LINE_AA)
        img += core

        cx, cy, r = int(w * 0.58), int(h * 1.38), int(h * 1.05)
        yy, xx = np.mgrid[0:h, 0:w]
        dx = (xx - cx).astype(np.float32)
        dy = (yy - cy).astype(np.float32)
        dist = np.sqrt(dx * dx + dy * dy)
        inside = dist <= r
        nx = dx / max(1.0, float(r))
        ny = dy / max(1.0, float(r))
        # Light from the sun (upper-left). Screen +y points down.
        ndotl = np.clip((-0.45) * nx + (-0.85) * ny, 0.0, 1.0)
        ndotl = ndotl ** 0.85
        ocean_b = 28 + 165 * ndotl
        ocean_g = 22 + 95 * ndotl
        ocean_r = 12 + 28 * ndotl
        img[:, :, 0] = np.where(inside, ocean_b, img[:, :, 0])
        img[:, :, 1] = np.where(inside, ocean_g, img[:, :, 1])
        img[:, :, 2] = np.where(inside, ocean_r, img[:, :, 2])

        clouds = self._octave_noise(h, w, seed=21, octaves=5)
        clouds = np.clip((clouds - 0.52) * 3.4, 0.0, 1.0)
        clouds = cv2.GaussianBlur(clouds, (0, 0), 2.2)
        clouds *= inside.astype(np.float32)
        clouds *= (0.15 + 0.85 * ndotl)
        shade = 1.0 - 0.72 * clouds
        for c, white in ((0, 230.0), (1, 235.0), (2, 240.0)):
            img[:, :, c] = np.where(inside, img[:, :, c] * shade + white * clouds * 0.72, img[:, :, c])

        # Soft atmosphere limb — falloff, no hard ring
        band = np.clip((dist - r) / 46.0, 0.0, 1.0)
        fall = np.where((dist > r) & (dist < r + 46), (1.0 - band) ** 1.7, 0.0)
        img[:, :, 0] += 210 * fall
        img[:, :, 1] += 150 * fall
        img[:, :, 2] += 70 * fall

        # Gentle bloom so the limb isn't a razor edge
        soft = cv2.GaussianBlur(np.clip(img, 0, 255).astype(np.uint8), (0, 0), 1.2)
        img = cv2.addWeighted(np.clip(img, 0, 255).astype(np.uint8), 0.82, soft, 0.18, 0)
        self._view_plate = img
        self._view_wh = (w, h)
        return img

    def _star_field(self, w: int, h: int):
        if getattr(self, "_star_wh2", None) == (w, h):
            return self._stars_far, self._stars_near
        rng = np.random.RandomState(23)
        far = [(int(rng.randint(0, w)), int(rng.randint(0, h)), int(80 + 140 * rng.rand())) for _ in range(280)]
        near = [(int(rng.randint(0, w)), int(rng.randint(0, h)), 1 + int(rng.rand() > 0.7), int(160 + 95 * rng.rand())) for _ in range(70)]
        self._stars_far, self._stars_near = far, near
        self._star_wh2 = (w, h)
        return far, near

    def _paint_planet(self, img: np.ndarray, cx: int, cy: int, r: int, color: Tuple[int, int, int]) -> None:
        if r < 4 or cx < -r or cy < -r or cx > img.shape[1] + r or cy > img.shape[0] + r:
            return
        glow = img.copy()
        cv2.circle(glow, (cx, cy), r + 8, color, -1, cv2.LINE_AA)
        glow = cv2.GaussianBlur(glow, (0, 0), 4)
        cv2.addWeighted(glow, 0.35, img, 0.65, 0, img)
        cv2.circle(img, (cx, cy), r, color, -1, cv2.LINE_AA)
        cv2.ellipse(img, (cx - r // 4, cy - r // 4), (max(3, r // 3), max(2, r // 4)), -18, 0, 360, (245, 245, 250), -1, cv2.LINE_AA)
        cv2.addWeighted(img, 0.78, img, 0.22, 0, img)
        night = img.copy()
        cv2.ellipse(night, (cx + r // 3, cy), (int(r * 0.72), r), 0, 0, 360, (8, 8, 10), -1, cv2.LINE_AA)
        clip = np.zeros(img.shape[:2], np.uint8)
        cv2.circle(clip, (cx, cy), r, 255, -1, cv2.LINE_AA)
        blended = cv2.addWeighted(img, 0.7, night, 0.3, 0)
        img[clip == 255] = blended[clip == 255]

    def _draw_passing_space(self, frame: np.ndarray) -> None:
        """Stars and planets travel across the canopy. The cabin stays still."""
        w, h = self.w, self.h
        from visual_theme import cached_nebula
        space = cached_nebula(w, h).copy()
        shift = int(self.anim_t * 6) % w
        space = np.roll(space, -shift, axis=1)
        far, near = self._star_field(w, h)
        bob = int(5 * math.sin(self.anim_t * 0.35))
        for x, y, bright in far:
            sx = int((x - self.anim_t * 14) % w)
            sy = (y + bob) % h
            tint = WHITE if bright > 180 else CYAN
            cv2.circle(space, (sx, sy), 1, tint, -1, cv2.LINE_AA)
        for i, (x, y, size, bright) in enumerate(near):
            sx = int((x - self.anim_t * 42) % w)
            sy = int((y + bob * 1.4) % h)
            tint = GOLD if i % 5 == 0 else WHITE
            cv2.circle(space, (sx, sy), size, tint, -1, cv2.LINE_AA)

        span = w + 220
        planets = (
            (0.15, 0.22, 34, 28.0, CYAN),
            (0.55, 0.16, 18, 55.0, VIOLET),
            (0.80, 0.18, 46, 18.0, GOLD),
            (0.35, 0.48, 14, 70.0, MINT),
        )
        for phase, fy, radius, speed, color in planets:
            px = int((phase * span) - (self.anim_t * speed) % span) - 40
            py = int(h * fy + 6 * math.sin(self.anim_t * 0.4 + phase))
            self._paint_planet(space, px, py, radius, color)
            if radius > 30:
                cv2.ellipse(space, (px, py), (radius + 16, 4), -16, 0, 360, color, 1, cv2.LINE_AA)

        win = self._window_mask(w, h)[:, :, None]
        base = frame.astype(np.float32)
        sky = space.astype(np.float32)
        frame[:] = np.clip(base * (1.0 - win) + sky * win, 0, 255).astype(np.uint8)

    def _draw_astronaut(self, frame: np.ndarray) -> None:
        """Small suited pilot. The live face is scaled into the helmet."""
        w, h = self.w, self.h
        cx, cy = int(w * 0.50), int(h * 0.86)
        suit = (168, 150, 132)
        cloth = (210, 198, 180)
        # Seated suit with a soft chest plate and cyan seams
        cv2.ellipse(frame, (cx, cy + 78), (34, 10), 0, 0, 360, (12, 10, 8), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy + 58), (46, 62), 0, 0, 360, suit, -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy + 46), (26, 32), 0, 0, 360, cloth, -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx - 52, cy + 46), (22, 14), 20, 0, 360, suit, -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx + 52, cy + 46), (22, 14), -20, 0, 360, suit, -1, cv2.LINE_AA)
        cv2.line(frame, (cx - 18, cy + 28), (cx - 18, cy + 78), CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (cx + 18, cy + 28), (cx + 18, cy + 78), CYAN, 1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy + 38), 7, GOLD, -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy + 38), 11, GOLD, 1, cv2.LINE_AA)
        cv2.rectangle(frame, (cx - 16, cy + 8), (cx + 16, cy + 26), (42, 36, 28), -1)
        cv2.circle(frame, (cx, cy - 8), 40, (36, 30, 24), -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, cy - 8), 33, (18, 14, 12), -1, cv2.LINE_AA)
        self._fit_face_in_helmet(frame, cx, cy - 8, 29)
        cv2.circle(frame, (cx, cy - 8), 33, GOLD, 2, cv2.LINE_AA)
        cv2.ellipse(frame, (cx - 8, cy - 18), (12, 5), -25, 0, 360, WHITE, 1, cv2.LINE_AA)

    def _fit_face_in_helmet(self, frame: np.ndarray, hx: int, hy: int, radius: int) -> None:
        pilot = getattr(self, "_pilot", None)
        mask = getattr(self, "_pilot_mask", None)
        if pilot is None or mask is None:
            return
        ys, xs = np.where(mask > 0.55)
        if xs.size < 80:
            return
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())
        # Use the upper part of the person so the face, not the torso, fills the helmet.
        head_h = max(24, int((y1 - y0) * 0.46))
        head_w = max(24, x1 - x0)
        crop = pilot[y0:y0 + head_h, x0:x0 + head_w]
        if crop.size == 0:
            return
        side = radius * 2
        face = cv2.resize(crop, (side, side), interpolation=cv2.INTER_AREA)
        disc = np.zeros((side, side), np.float32)
        cv2.circle(disc, (radius, radius), radius - 1, 1.0, -1, cv2.LINE_AA)
        disc = cv2.GaussianBlur(disc, (0, 0), 1.2)
        x = hx - radius
        y = hy - radius
        fh, fw = frame.shape[:2]
        if x < 0 or y < 0 or x + side > fw or y + side > fh:
            return
        roi = frame[y:y + side, x:x + side].astype(np.float32)
        m = disc[:, :, None]
        frame[y:y + side, x:x + side] = np.clip(roi * (1.0 - m) + face.astype(np.float32) * m, 0, 255).astype(np.uint8)

    def _canopy_geom(self) -> Tuple[int, int, int, int]:
        """Center and radii of the curved observation glass."""
        return (self.w // 2, int(self.h * 0.28), int(self.w * 0.36), int(self.h * 0.18))

    def _window_mask(self, w: int, h: int) -> np.ndarray:
        """Soft-edged canopy glass. Cached per resolution."""
        key = (w, h, "canopy")
        cached = getattr(self, "_mask_cache", None)
        if cached is not None and getattr(self, "_mask_key", None) == key:
            return cached
        cx, cy, rx, ry = self._canopy_geom()
        mask = np.zeros((h, w), dtype=np.float32)
        cv2.ellipse(mask, (cx, cy), (rx, ry), 0, 0, 360, 1.0, -1)
        mask = cv2.GaussianBlur(mask, (0, 0), 2.2)
        self._mask_cache = mask
        self._mask_key = key
        return mask

    def _draw_cockpit(self, frame: np.ndarray) -> None:
        """Layered cabin: ceiling, cheek consoles, curved glass, and a foreground dash."""
        w, h = self.w, self.h
        cx, cy, rx, ry = self._canopy_geom()
        metal = (58, 46, 34)
        steel = (92, 78, 60)

        filled_round(frame, 0, 0, w, int(h * 0.07), (32, 24, 18), 0, 1.0)
        cv2.line(frame, (int(w * 0.08), int(h * 0.07)), (int(w * 0.92), int(h * 0.07)), CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (w // 2, int(h * 0.07)), (w // 2, int(h * 0.12)), GOLD, 2, cv2.LINE_AA)

        cheek_w = max(36, int(w * 0.055))
        for side in (0, w - cheek_w):
            filled_round(frame, side, int(h * 0.09), cheek_w, int(h * 0.70), metal, 12, 0.94)
            inset = 8
            filled_round(
                frame, side + inset, int(h * 0.16), cheek_w - inset * 2, int(h * 0.28),
                (28, 22, 18), 8, 1.0,
            )
        cv2.line(frame, (cheek_w, int(h * 0.12)), (cheek_w, int(h * 0.74)), CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (w - cheek_w, int(h * 0.12)), (w - cheek_w, int(h * 0.74)), VIOLET, 1, cv2.LINE_AA)
        for i, fy in enumerate((0.20, 0.26, 0.32)):
            cv2.circle(frame, (cheek_w // 2, int(h * fy)), 3, MINT if i != 1 else GOLD, -1, cv2.LINE_AA)
            cv2.circle(frame, (w - cheek_w // 2, int(h * fy)), 3, CYAN if i != 1 else GOLD, -1, cv2.LINE_AA)

        outer = (rx + 18, ry + 16)
        cv2.ellipse(frame, (cx, cy), outer, 0, 0, 360, (36, 28, 22), 18, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), outer, 0, 200, 330, steel, 3, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, CYAN, 2, cv2.LINE_AA)
        cv2.ellipse(frame, (cx - rx // 6, cy - ry // 3), (rx // 3, ry // 5), -18, 205, 250, WHITE, 1, cv2.LINE_AA)
        for deg in (205, 250, 300, 20, 150):
            rad = math.radians(deg)
            bx = int(cx + math.cos(rad) * outer[0])
            by = int(cy + math.sin(rad) * outer[1])
            cv2.circle(frame, (bx, by), 4, steel, -1, cv2.LINE_AA)
            cv2.circle(frame, (bx, by), 4, CYAN, 1, cv2.LINE_AA)

        lip_y = int(h * 0.82)
        rear = np.array([
            [0, h],
            [w, h],
            [int(w * 0.86), lip_y],
            [int(w * 0.14), lip_y],
        ], np.int32)
        cv2.fillPoly(frame, [rear], (40, 32, 24))
        front = np.array([
            [int(w * 0.06), h],
            [int(w * 0.94), h],
            [int(w * 0.80), int(h * 0.90)],
            [int(w * 0.20), int(h * 0.90)],
        ], np.int32)
        cv2.fillPoly(frame, [front], (26, 20, 16))
        cv2.polylines(frame, [rear], True, CYAN, 1, cv2.LINE_AA)
        cv2.line(frame, (int(w * 0.22), lip_y), (int(w * 0.40), lip_y), GOLD, 2, cv2.LINE_AA)
        cv2.line(frame, (int(w * 0.60), lip_y), (int(w * 0.78), lip_y), VIOLET, 2, cv2.LINE_AA)
        for i, fx in enumerate((0.28, 0.40, 0.60, 0.72)):
            lamp = MINT if i % 2 == 0 else GOLD
            cv2.circle(frame, (int(w * fx), int(h * 0.935)), 4, lamp, -1, cv2.LINE_AA)
            cv2.circle(frame, (int(w * fx), int(h * 0.935)), 7, lamp, 1, cv2.LINE_AA)

    def set_pilot(self, camera_bgr: np.ndarray, mask: Optional[np.ndarray]) -> None:
        """Live webcam figure to composite in front of the planet."""
        self._pilot = camera_bgr
        if mask is None:
            self._pilot_mask = None
            return
        m = np.clip(mask.astype(np.float32), 0.0, 1.0)
        if m.shape[:2] != camera_bgr.shape[:2]:
            m = cv2.resize(m, (camera_bgr.shape[1], camera_bgr.shape[0]))
        # Soft edge so the cutout doesn't look like a sticker
        self._pilot_mask = cv2.GaussianBlur(m, (0, 0), 3.5)

    def _composite_pilot(self, frame: np.ndarray) -> None:
        pilot = getattr(self, "_pilot", None)
        mask = getattr(self, "_pilot_mask", None)
        if pilot is None or mask is None:
            return
        if pilot.shape[:2] != frame.shape[:2]:
            return
        m = mask[:, :, None]
        person = pilot.astype(np.float32)
        # Cool space light on the person so they match the viewport
        person[:, :, 0] = np.clip(person[:, :, 0] * 1.08 + 8.0, 0, 255)
        person[:, :, 1] = np.clip(person[:, :, 1] * 0.98, 0, 255)
        person[:, :, 2] = np.clip(person[:, :, 2] * 0.90, 0, 255)
        base = frame.astype(np.float32)
        out = base * (1.0 - m) + person * m
        # Thin atmosphere rim along the silhouette
        hard = (mask > 0.45).astype(np.uint8)
        edge = cv2.dilate(hard, np.ones((7, 7), np.uint8), iterations=1).astype(np.float32) - hard.astype(np.float32)
        edge = cv2.GaussianBlur(edge, (0, 0), 2.0)
        out[:, :, 0] = np.clip(out[:, :, 0] + edge * 90, 0, 255)
        out[:, :, 1] = np.clip(out[:, :, 1] + edge * 50, 0, 255)
        frame[:] = np.clip(out, 0, 255).astype(np.uint8)

    def _draw_world(self, frame: np.ndarray) -> None:
        """Cabin, space beyond the glass, then the kitchen deck in front of it."""
        w, h = self.w, self.h
        self._paint_cabin(frame)
        self._draw_passing_space(frame)
        self._draw_cabin_atmosphere(frame)
        self._draw_counter(frame)
        self._draw_workstation(frame)
        self._draw_motes(frame)

        if self.bridge and self.bridge.placed:
            sx, sy = int(self.bridge_socket[0]), int(self.bridge_socket[1])
            cv2.ellipse(frame, (sx, sy), (78, 12), 0, 0, 360, GOLD, -1, cv2.LINE_AA)
            cv2.ellipse(frame, (sx, sy), (78, 12), 0, 0, 360, WHITE, 1, cv2.LINE_AA)
        elif self.stage in ("intro", "collect_ember", "cook_ember", "build"):
            sx, sy = int(self.bridge_socket[0]), int(self.bridge_socket[1])
            cv2.ellipse(frame, (sx, sy), (36, 16), 0, 0, 360, (8, 6, 16), -1, cv2.LINE_AA)
            cv2.ellipse(frame, (sx, sy), (36, 16), 0, 0, 360, VIOLET, 1, cv2.LINE_AA)

        if self.grove_grown:
            bx, by = int(self.barren_pos[0]), int(self.barren_pos[1])
            for i, (dx, dy) in enumerate(((-22, 8), (0, -4), (24, 6), (-8, 16), (14, 14))):
                cv2.circle(frame, (bx + dx, by + dy - 18), 12 + i % 3, MINT, -1, cv2.LINE_AA)

        self._draw_astronaut(frame)
        self._draw_cockpit(frame)

    def _paint_cabin(self, frame: np.ndarray) -> None:
        key = (self.w, self.h)
        plate = getattr(self, "_cabin", None)
        if plate is None or getattr(self, "_cabin_key", None) != key:
            yy = np.linspace(0.0, 1.0, self.h, dtype=np.float32)[:, None]
            img = np.zeros((self.h, self.w, 3), np.float32)
            img[:, :, 0] = 26 + 22 * (1.0 - yy)
            img[:, :, 1] = 16 + 10 * (1.0 - yy)
            img[:, :, 2] = 10 + 8 * yy
            plate = np.clip(img, 0, 255).astype(np.uint8)
            self._cabin = plate
            self._cabin_key = key
        frame[:] = plate

    def _draw_cabin_atmosphere(self, frame: np.ndarray) -> None:
        """Violet and cyan light falling across the deck."""
        w, h = self.w, self.h
        self._wash(frame, int(w * 0.18), int(h * 0.55), int(w * 0.14), int(h * 0.18), VIOLET, 0.10)
        self._wash(frame, int(w * 0.82), int(h * 0.50), int(w * 0.12), int(h * 0.16), CYAN, 0.08)
        self._wash(frame, int(self.bowl[0]), int(self.bowl[1]), int(self.bowl[2] + 40), int(self.bowl[3] + 20), GOLD, 0.06)

    def _wash(self, frame, cx, cy, ax, ay, color, alpha: float) -> None:
        h, w = frame.shape[:2]
        x0, y0 = max(0, cx - ax), max(0, cy - ay)
        x1, y1 = min(w, cx + ax), min(h, cy + ay)
        if x1 <= x0 or y1 <= y0:
            return
        roi = frame[y0:y1, x0:x1]
        layer = roi.copy()
        cv2.ellipse(layer, (cx - x0, cy - y0), (ax, ay), 0, 0, 360, color, -1, cv2.LINE_AA)
        cv2.addWeighted(layer, alpha, roi, 1.0 - alpha, 0, roi)

    def _draw_counter(self, frame: np.ndarray) -> None:
        """Kitchen deck beneath the observation glass."""
        w, h = self.w, self.h
        cx, cy = w // 2, int(h * 0.60)
        cv2.ellipse(frame, (cx, cy), (int(w * 0.40), int(h * 0.08)), 0, 0, 360, (44, 34, 26), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy - 4), (int(w * 0.36), int(h * 0.045)), 0, 0, 360, (70, 58, 44), 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (int(w * 0.40), int(h * 0.08)), 0, 200, 340, CYAN, 1, cv2.LINE_AA)

    def _draw_workstation(self, frame: np.ndarray) -> None:
        """Lit ring under the Quantum Mixer. The bowl hitbox is unchanged."""
        cx, cy = int(self.bowl[0]), int(self.bowl[1] + self.bowl[3] * 0.55)
        rx, ry = int(self.bowl[2] + 36), int(max(16, self.bowl[3] * 0.42))
        cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, (18, 14, 12), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, CYAN, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (int(rx * 0.62), int(ry * 0.62)), 0, 0, 360, GOLD, 1, cv2.LINE_AA)

    def _draw_motes(self, frame: np.ndarray) -> None:
        """Slow dust on the glass. Kept off the mixer and the HUD bands."""
        cx, cy, rx, ry = self._canopy_geom()
        for i in range(12):
            swing = 0.35 + 0.55 * (((i * 37) % 100) / 100.0)
            ang = self.anim_t * 0.15 + i * 0.9
            px = int(cx + math.cos(ang + i) * rx * swing)
            py = int(cy + math.sin(ang * 0.65 + i) * ry * swing)
            if ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 > 0.92:
                continue
            col = CYAN if i % 3 == 0 else (GOLD if i % 3 == 1 else WHITE)
            cv2.circle(frame, (px, py), 1, col, -1, cv2.LINE_AA)

    def _draw_ground_pad(self, frame, cx: int, cy: int, rx: int, ry: int, color: Tuple[int, int, int]) -> None:
        """Thin glass marker on the viewport — not a solid cartoon oval."""
        glass = frame.copy()
        cv2.ellipse(glass, (cx, cy), (rx, ry), 0, 0, 360, color, -1, cv2.LINE_AA)
        glass = cv2.GaussianBlur(glass, (0, 0), 6)
        self._blend(frame, glass, 0.16)
        cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, (210, 225, 235), 1, cv2.LINE_AA)

    def _draw_cosmo_fridge(self, frame: np.ndarray) -> None:
        """Rounded glossy fridge with soft shadow (AR prop)."""
        x, y = int(self.w * 0.90), int(self.h * 0.48)
        self._draw_soft_shadow(frame, x + 8, y + 78, 55, 16, 0.35)
        # Body with vertical gradient feel (stacked rects)
        for i in range(8):
            t = i / 7.0
            shade = int(45 + 25 * t)
            y0 = y - 75 + i * 20
            cv2.rectangle(frame, (x - 38, y0), (x + 42, y0 + 22), (shade, shade - 5, 175 + i * 4), -1)
        # Rounded outline
        cv2.rectangle(frame, (x - 38, y - 75), (x + 42, y + 78), (200, 195, 240), 2, cv2.LINE_AA)
        # Door ajar
        door = np.array([[x + 42, y - 65], [x + 88, y - 52], [x + 82, y + 70], [x + 42, y + 68]], np.int32)
        cv2.fillPoly(frame, [door], (55, 50, 165))
        cv2.polylines(frame, [door], True, (190, 185, 230), 1, cv2.LINE_AA)
        # Specular streak
        cv2.line(frame, (x - 28, y - 60), (x - 22, y + 50), (230, 230, 255), 2, cv2.LINE_AA)
        # Interior light
        self._draw_soft_glow(frame, x, y, 36, (255, 255, 255), 0.28)
        cv2.rectangle(frame, (x - 26, y - 48), (x + 28, y + 48), (35, 32, 40), -1)
        self._draw_bokeh(frame, x, y, 28)

    def _draw_cosmo_cooker_shell(self, frame: np.ndarray) -> None:
        """Soft blue appliance shell behind the mixer — glass-like, not a hard box."""
        if self.stage not in ("collect_ember", "cook_ember", "collect_grove", "cook_grove",
                              "collect_mint", "cook_mint", "intro"):
            return
        cx, cy = int(self.bowl[0]), int(self.bowl[1])
        self._draw_soft_shadow(frame, cx, cy + 70, 100, 22, 0.3)
        shell = frame.copy()
        cv2.ellipse(shell, (cx, cy + 10), (105, 78), 0, 0, 360, (170, 120, 55), -1)
        self._blend(frame, shell, 0.28)
        cv2.ellipse(frame, (cx, cy + 10), (105, 78), 0, 0, 360, (230, 200, 140), 2, cv2.LINE_AA)
        # Open door flap
        flap = np.array([[cx - 105, cy - 20], [cx - 145, cy - 5], [cx - 140, cy + 55], [cx - 100, cy + 50]], np.int32)
        flap_ov = frame.copy()
        cv2.fillPoly(flap_ov, [flap], (150, 100, 40))
        self._blend(frame, flap_ov, 0.4)
        self._draw_soft_glow(frame, cx, cy, 55, (255, 210, 120), 0.15)

    def _draw_bowl(self, frame: np.ndarray) -> None:
        cx, cy, rx, ry = int(self.bowl[0]), int(self.bowl[1]), int(self.bowl[2]), int(self.bowl[3])
        if self.temperature == "hot":
            rim = GOLD
        elif self.temperature == "cold":
            rim = CYAN
        else:
            rim = WHITE
        spin = self.anim_t * 12
        # Pedestal and two slow holographic rings. The inner ellipse is the real bowl target.
        cv2.ellipse(frame, (cx, cy + ry + 18), (rx + 10, 12), 0, 0, 360, (18, 14, 12), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy + ry + 8), (rx + 18, 16), spin, 0, 360, CYAN, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy + 8), (rx + 8, ry + 10), -spin, 0, 360, VIOLET, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy + 6), (rx, ry + 8), 0, 0, 180, (48, 40, 32), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, rim, 2, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, cy), (max(8, rx - 16), max(6, ry - 12)), 0, 0, 360, (36, 28, 22), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx - rx // 3, cy - ry // 3), (14, 5), -28, 0, 360, WHITE, 1, cv2.LINE_AA)
        label_y = min(self.h - 70, cy + ry + 54)
        cv2.putText(frame, "QUANTUM MIXER", (cx - 68, label_y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, rim, 1, cv2.LINE_AA)

    def _draw_item(self, frame: np.ndarray, item: Item) -> None:
        cx, cy = int(item.x), int(item.y)
        float_y = cy + int(4 * math.sin(self.anim_t * 1.6 + cx * 0.01))
        cv2.line(frame, (cx, float_y + 8), (cx, float_y + 28), CYAN, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, float_y + 30), (34, 10), 0, 0, 360, (14, 12, 10), -1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, float_y + 30), (34, 10), 0, 0, 360, CYAN, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx, float_y + 30), (20, 5), 0, 0, 360, VIOLET, 1, cv2.LINE_AA)
        cv2.ellipse(frame, (cx - 8, float_y + 28), (10, 3), 0, 0, 360, WHITE, 1, cv2.LINE_AA)

        glow = MINT if item.held else (CYAN if item.near else WHITE)
        if item.near or item.held:
            cv2.circle(frame, (cx, float_y), GRAB, glow, 1, cv2.LINE_AA)

        # Shaded sphere / star
        if item.shape == "star":
            pts = []
            for i in range(10):
                ang = math.radians(-90 + i * 36)
                r = item.radius if i % 2 == 0 else item.radius * 0.45
                pts.append([int(cx + r * math.cos(ang)), int(float_y + r * math.sin(ang))])
            cv2.fillPoly(frame, [np.array(pts, np.int32)], item.color)
            cv2.polylines(frame, [np.array(pts, np.int32)], True, (255, 255, 255), 1, cv2.LINE_AA)
        else:
            # Fake sphere shading
            cv2.circle(frame, (cx, float_y), item.radius, item.color, -1, cv2.LINE_AA)
            shade = tuple(max(0, c - 50) for c in item.color)
            cv2.ellipse(frame, (cx + 4, float_y + 6), (item.radius - 4, item.radius - 6), 0, 0, 360, shade, -1, cv2.LINE_AA)
            cv2.circle(frame, (cx - 8, float_y - 8), max(4, item.radius // 4), (245, 245, 255), -1, cv2.LINE_AA)
        label = "HOLD" if item.held else item.name
        cv2.putText(frame, label, (max(8, cx - 46), min(self.h - 64, float_y + 52)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, glow, 1, cv2.LINE_AA)

    def _draw_bridge_piece(self, frame: np.ndarray, b: BridgePiece) -> None:
        cx, cy = int(b.x), int(b.y)
        glow = MINT if b.held else (CYAN if b.near else GOLD)
        if (b.near or b.held) and not b.placed:
            cv2.circle(frame, (cx, cy), GRAB, glow, 1, cv2.LINE_AA)
        self._draw_soft_glow(frame, cx, cy, 55, GOLD, 0.18)
        filled_round(frame, cx - 52, cy - 16, 104, 32, (90, 140, 210), 14, 0.92)
        cv2.line(frame, (cx - 36, cy), (cx + 36, cy), WHITE, 1, cv2.LINE_AA)
        for i in range(-1, 2):
            cv2.line(frame, (cx + i * 24, cy - 12), (cx + i * 24, cy + 12), (40, 70, 120), 1, cv2.LINE_AA)
        if not b.placed:
            cv2.putText(frame, "Cookie Bridge", (cx - 52, cy + 38),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, glow, 1, cv2.LINE_AA)

    def _draw_challenge(
        self,
        frame: np.ndarray,
        pos: Tuple[float, float],
        label: str,
        melted: bool,
        active: bool,
        carrying: bool,
        cold: bool = False,
        green: bool = False,
    ) -> None:
        x, y = int(pos[0]), int(pos[1])
        if melted:
            self._draw_soft_glow(frame, x, y, 70, (80, 200, 255) if not green else (60, 200, 100), 0.28)
            self._draw_sparkles(frame, x, y, 55)
            done = "MELTED" if not green and not cold else ("GROWN" if green else "FROZEN")
            cv2.putText(frame, done, (x - 40, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, WHITE, 1, cv2.LINE_AA)
            return

        pulse = 0.5 + 0.5 * math.sin(self.anim_t * 2.2)
        if cold:
            fill, edge = (120, 90, 40), CYAN
        elif green:
            fill, edge = (40, 70, 36), MINT
        else:
            fill, edge = (90, 78, 48), WHITE

        self._draw_soft_shadow(frame, x, y + 28, 70, 16, 0.3)
        filled_round(frame, x - 64, y - 36, 128, 68, fill, 18, 0.72)
        cv2.line(frame, (x - 40, y - 36), (x + 40, y - 36), edge, 1, cv2.LINE_AA)
        cv2.putText(frame, label, (x - 50, y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, WHITE, 1, cv2.LINE_AA)

        if active:
            pad_y = y + 48
            pad_r = int(38 + 5 * pulse)
            self._draw_soft_shadow(frame, x, pad_y + 6, pad_r + 6, 12, 0.25)
            self._draw_soft_glow(frame, x, pad_y, pad_r + 10, (255, 255, 255), 0.2)
            cv2.ellipse(frame, (x, pad_y), (pad_r, int(pad_r * 0.36)), 0, 0, 360, (245, 245, 255), 2, cv2.LINE_AA)
            tip = "DROP HERE" if carrying else "LEAVE HERE"
            cv2.putText(frame, tip, (x - 48, pad_y + 32), cv2.FONT_HERSHEY_SIMPLEX, 0.42, GOLD, 1, cv2.LINE_AA)

    def _draw_buddy(self, frame: np.ndarray, buddy: Buddy, active: bool) -> None:
        ex, ey = int(buddy.x), int(buddy.y)
        self._draw_soft_shadow(frame, ex, ey + 48, 40, 12, 0.28)
        self._draw_soft_glow(frame, ex, ey, 55, (255, 230, 180), 0.16)
        self._draw_bokeh(frame, ex, ey, 40)
        draw_creature(frame, buddy.name, (ex, ey), 0.8, self.anim_t)
        if buddy.docked:
            return
        if active and buddy.following:
            cv2.putText(frame, "CARRYING", (ex - 40, ey + 78),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, MINT, 1, cv2.LINE_AA)
        elif active:
            glow = CYAN if buddy.near else WHITE
            cv2.circle(frame, (ex, ey), GRAB + 18, glow, 1, cv2.LINE_AA)
            cv2.putText(frame, "PINCH", (ex - 28, ey + 78),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, glow, 1, cv2.LINE_AA)
        else:
            cv2.putText(frame, "WAITING", (ex - 35, ey + 78),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, WHITE, 1, cv2.LINE_AA)

    def _draw_citizens(self, frame: np.ndarray) -> None:
        for i, xf in enumerate((0.18, 0.28, 0.40, 0.58, 0.70, 0.82)):
            cx = int(self.w * xf)
            cy = int(self.h * 0.66 - 5 * abs(math.sin(self.anim_t * 5 + i)))
            cv2.circle(frame, (cx, cy), 9, GOLD if i % 2 == 0 else CYAN, -1, cv2.LINE_AA)
            cv2.circle(frame, (cx - 2, cy - 1), 2, NAVY, -1)
            cv2.circle(frame, (cx + 3, cy - 1), 2, NAVY, -1)
        cv2.putText(frame, "Cookie citizens celebrate", (int(self.w * 0.34), int(self.h * 0.40)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, GOLD, 1, cv2.LINE_AA)


def run(camera_index: int = 0) -> None:
    hands = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        model_complexity=1,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.5,
    )
    connections = mp.solutions.hands.HAND_CONNECTIONS
    try:
        segmenter = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1)
    except Exception:
        segmenter = None
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

    print("FOODIVERSE Phase 8 - Full Kingdom Restoration")
    print("Ember → Grove → Mint. Keys: 5/6/7 skip challenges. R restart. Q quit.")

    prev = time.time()
    window = "FOODIVERSE - Phase 8 Full Restoration"

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
            pilot_mask = None
            if segmenter is not None:
                seg = segmenter.process(rgb)
                pilot_mask = seg.segmentation_mask
            mission.set_pilot(frame.copy(), pilot_mask)
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
            draw_overlay(frame, state, landmark_list, connections, show_status=False)
            cv2.imshow(window, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("r"):
                mission.reset()
            if key == ord("h") and mission.stage.startswith("cook"):
                mission.temperature = "hot"
                mission.message = "Bowl HEATED"
            if key == ord("c") and mission.stage.startswith("cook"):
                mission.temperature = "cold"
                mission.message = "Bowl COOLED"
            if key == ord("5"):
                mission.skip_to_melt()
            if key == ord("6"):
                mission.skip_to_grow()
            if key == ord("7"):
                mission.skip_to_freeze()
    finally:
        hands.close()
        if segmenter is not None:
            segmenter.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
