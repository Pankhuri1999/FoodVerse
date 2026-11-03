"""
FOODIVERSE Phase 3 — Cosmic Kitchen preview (OpenCV).

Playable kitchen prototype:
- Multiple ingredients you can pinch-grab
- Mixing bowl that collects dropped ingredients
- Gravity / Zero-G toggle (press G)

Controls:
  q — quit
  g — toggle gravity / zero-G
  r — reset kitchen
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

from hand_tracker import HandState, compute_hand_state, draw_overlay

GRAB_RADIUS = 80


@dataclass
class IngredientDef:
    name: str
    color: Tuple[int, int, int]  # BGR
    shape: str = "circle"  # circle | diamond | square | hex | leaf | star
    radius: int = 34
    mass: float = 1.0
    buoyancy: float = 0.0  # extra upward force in zero-G / floatiness


INGREDIENTS: List[IngredientDef] = [
    IngredientDef("Cosmic Fruit", (90, 90, 255), "circle", 38, 1.0, 0.15),
    IngredientDef("Star-Pepper", (40, 40, 255), "star", 34, 0.8, 0.05),
    IngredientDef("Crystal Sugar", (255, 230, 120), "diamond", 34, 1.2, 0.0),
    IngredientDef("Chocolate", (50, 80, 110), "square", 34, 1.1, 0.0),
    IngredientDef("Mint Crystal", (180, 255, 140), "hex", 34, 0.9, 0.1),
    IngredientDef("Space Leaves", (60, 200, 80), "leaf", 36, 0.5, 0.35),
]


@dataclass
class KitchenItem:
    spec: IngredientDef
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    held: bool = False
    in_bowl: bool = False
    near: bool = False
    consumed: bool = False

    @property
    def radius(self) -> int:
        return self.spec.radius


@dataclass
class MixingBowl:
    cx: float
    cy: float
    rx: float = 140
    ry: float = 70
    contents: List[str] = field(default_factory=list)

    def contains(self, x: float, y: float) -> bool:
        # Elliptical bowl mouth, upper half preferred for "drop in".
        nx = (x - self.cx) / self.rx
        ny = (y - self.cy) / self.ry
        return nx * nx + ny * ny <= 1.0 and y >= self.cy - self.ry * 0.35

    def draw(self, frame: np.ndarray) -> None:
        # Bowl body
        cv2.ellipse(
            frame,
            (int(self.cx), int(self.cy + 18)),
            (int(self.rx), int(self.ry + 28)),
            0,
            0,
            180,
            (70, 55, 45),
            -1,
        )
        cv2.ellipse(
            frame,
            (int(self.cx), int(self.cy)),
            (int(self.rx), int(self.ry)),
            0,
            0,
            360,
            (120, 95, 70),
            3,
        )
        cv2.ellipse(
            frame,
            (int(self.cx), int(self.cy)),
            (int(self.rx - 12), int(self.ry - 10)),
            0,
            0,
            360,
            (35, 28, 24),
            -1,
        )
        label = f"Mixing Bowl ({len(self.contents)})"
        cv2.putText(
            frame,
            label,
            (int(self.cx - 90), int(self.cy + self.ry + 42)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (200, 190, 170),
            1,
            cv2.LINE_AA,
        )
        if self.contents:
            preview = ", ".join(self.contents[-3:])
            cv2.putText(
                frame,
                preview,
                (int(self.cx - 110), int(self.cy + self.ry + 64)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (160, 200, 255),
                1,
                cv2.LINE_AA,
            )


class CosmicKitchen:
    def __init__(self, width: int, height: int):
        self.w = width
        self.h = height
        self.gravity_on = True
        self.bowl = MixingBowl(cx=width * 0.5, cy=height * 0.68)
        self.items: List[KitchenItem] = []
        self.held: Optional[KitchenItem] = None
        self._was_pinching = False
        self.reset()

    def reset(self) -> None:
        self.bowl.contents.clear()
        self.held = None
        self._was_pinching = False
        # Two rows above the bowl so all six stay visible and separated.
        self.items = []
        for i, spec in enumerate(INGREDIENTS):
            col = i % 3
            row = i // 3
            x = self.w * (0.22 + col * 0.28)
            y = self.h * (0.28 + row * 0.16)
            self.items.append(KitchenItem(spec=spec, x=float(x), y=float(y)))

    def toggle_gravity(self) -> None:
        self.gravity_on = not self.gravity_on
        if not self.gravity_on:
            # Nudge floating motion when entering zero-G.
            for item in self.items:
                if not item.held and not item.in_bowl:
                    item.vx += np.random.uniform(-40, 40)
                    item.vy += np.random.uniform(-60, -10)

    def update(self, hand: HandState, dt: float) -> None:
        grab_x = hand.x * self.w
        grab_y = hand.y * self.h
        pinching = hand.detected and hand.is_pinching

        # Update near flags.
        for item in self.items:
            if item.in_bowl or item.consumed:
                item.near = False
                continue
            dist = math.hypot(grab_x - item.x, grab_y - item.y)
            item.near = hand.detected and dist < GRAB_RADIUS

        # Grab / release
        if pinching:
            if self.held is None:
                # Pick nearest near item.
                candidates = [i for i in self.items if i.near and not i.in_bowl and not i.consumed]
                if candidates:
                    self.held = min(
                        candidates,
                        key=lambda i: math.hypot(grab_x - i.x, grab_y - i.y),
                    )
                    self.held.held = True
                    self.held.vx = 0.0
                    self.held.vy = 0.0
            if self.held is not None:
                self.held.x = grab_x
                self.held.y = grab_y
        else:
            if self.held is not None:
                item = self.held
                item.held = False
                # Inherit a little release velocity from hand motion is approximated
                # by a soft drop; keep current velocity small.
                if self.bowl.contains(item.x, item.y):
                    item.in_bowl = True
                    item.x = self.bowl.cx + np.random.uniform(-40, 40)
                    item.y = self.bowl.cy + 10
                    item.vx = 0.0
                    item.vy = 0.0
                    if item.spec.name not in self.bowl.contents:
                        self.bowl.contents.append(item.spec.name)
                self.held = None

        self._was_pinching = pinching

        # Physics for free items
        floor = self.h * 0.82
        g = 1100.0 if self.gravity_on else 0.0

        for item in self.items:
            if item.held or item.in_bowl or item.consumed:
                continue

            if self.gravity_on:
                item.vy += g * item.spec.mass * dt
            else:
                # Zero-G drift + buoyancy toward slight float.
                item.vy += (-80.0 * item.spec.buoyancy) * dt
                item.vx *= 0.995
                item.vy *= 0.995
                # Gentle wander
                item.vx += np.random.uniform(-15, 15) * dt
                item.vy += np.random.uniform(-15, 15) * dt

            item.x += item.vx * dt
            item.y += item.vy * dt

            # Counter / floor collision when gravity is on.
            if self.gravity_on and item.y > floor - item.radius:
                item.y = floor - item.radius
                item.vy *= -0.25
                item.vx *= 0.85

            # Keep on screen
            item.x = float(np.clip(item.x, item.radius, self.w - item.radius))
            item.y = float(np.clip(item.y, item.radius, self.h - item.radius))

            # Soft bounce off bowl rim in zero-G so things can still enter from above.
            if not self.gravity_on and self.bowl.contains(item.x, item.y):
                # Floating into bowl still counts as collected.
                item.in_bowl = True
                item.vx = 0.0
                item.vy = 0.0
                item.x = self.bowl.cx + np.random.uniform(-40, 40)
                item.y = self.bowl.cy + 10
                if item.spec.name not in self.bowl.contents:
                    self.bowl.contents.append(item.spec.name)

    def draw(self, frame: np.ndarray) -> None:
        self._draw_kitchen_backdrop(frame)
        self.bowl.draw(frame)

        # Draw bowl contents as small chips inside.
        for i, name in enumerate(self.bowl.contents):
            spec = next((s for s in INGREDIENTS if s.name == name), None)
            color = spec.color if spec else (180, 180, 180)
            ox = int(self.bowl.cx - 50 + (i % 4) * 28)
            oy = int(self.bowl.cy + 8 + (i // 4) * 18)
            cv2.circle(frame, (ox, oy), 10, color, -1)

        for item in self.items:
            if item.in_bowl or item.consumed:
                continue
            self._draw_item(frame, item)

        mode = "GRAVITY: ON" if self.gravity_on else "ZERO-G"
        mode_color = (120, 220, 160) if self.gravity_on else (180, 160, 255)
        free = sum(1 for i in self.items if not i.in_bowl and not i.consumed)
        cv2.rectangle(frame, (8, 130), (340, 248), (20, 20, 30), -1)
        cv2.putText(frame, "COSMIC KITCHEN — Phase 3", (16, 152),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 220, 120), 1, cv2.LINE_AA)
        cv2.putText(frame, mode, (16, 176),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, mode_color, 1, cv2.LINE_AA)
        cv2.putText(frame, f"Ingredients out: {free}/6", (16, 200),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 220), 1, cv2.LINE_AA)
        cv2.putText(frame, "g gravity | r reset | q quit", (16, 224),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 180), 1, cv2.LINE_AA)

        # Legend so every ingredient is always identifiable.
        legend_y = 260
        cv2.rectangle(frame, (8, legend_y), (220, legend_y + 20 + 22 * len(INGREDIENTS)), (20, 20, 30), -1)
        for i, spec in enumerate(INGREDIENTS):
            ly = legend_y + 18 + i * 22
            _draw_shape(frame, (28, ly), 10, spec.color, spec.shape)
            cv2.putText(frame, spec.name, (48, ly + 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 210), 1, cv2.LINE_AA)

    def _draw_kitchen_backdrop(self, frame: np.ndarray) -> None:
        # Soft vignette panels suggesting a spaceship counter.
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, int(self.h * 0.78)), (self.w, self.h), (45, 35, 40), -1)
        cv2.rectangle(overlay, (0, 0), (self.w, int(self.h * 0.12)), (25, 20, 40), -1)
        cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)
        # Counter line
        cv2.line(frame, (40, int(self.h * 0.82)), (self.w - 40, int(self.h * 0.82)),
                 (90, 75, 70), 2)

    def _draw_item(self, frame: np.ndarray, item: KitchenItem) -> None:
        center = (int(item.x), int(item.y))
        if item.held:
            glow = (80, 255, 160)
            status = "HELD"
        elif item.near:
            glow = (0, 220, 255)
            status = "PINCH"
        else:
            glow = (220, 200, 160)
            status = item.spec.name

        if item.near or item.held:
            cv2.circle(frame, center, GRAB_RADIUS, glow, 1)

        _draw_shape(frame, center, item.radius, item.spec.color, item.spec.shape)
        cv2.putText(
            frame,
            status,
            (center[0] - 55, center[1] + item.radius + 22),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            glow,
            2,
            cv2.LINE_AA,
        )


def _draw_shape(
    frame: np.ndarray,
    center: Tuple[int, int],
    radius: int,
    color: Tuple[int, int, int],
    shape: str,
) -> None:
    cx, cy = center
    if shape == "square":
        pts = np.array(
            [
                [cx - radius, cy - radius],
                [cx + radius, cy - radius],
                [cx + radius, cy + radius],
                [cx - radius, cy + radius],
            ],
            np.int32,
        )
        cv2.fillPoly(frame, [pts], color)
    elif shape == "diamond":
        pts = np.array(
            [[cx, cy - radius], [cx + radius, cy], [cx, cy + radius], [cx - radius, cy]],
            np.int32,
        )
        cv2.fillPoly(frame, [pts], color)
    elif shape == "hex":
        pts = []
        for i in range(6):
            ang = math.radians(60 * i - 30)
            pts.append([int(cx + radius * math.cos(ang)), int(cy + radius * math.sin(ang))])
        cv2.fillPoly(frame, [np.array(pts, np.int32)], color)
    elif shape == "star":
        pts = []
        for i in range(10):
            ang = math.radians(-90 + i * 36)
            r = radius if i % 2 == 0 else radius * 0.45
            pts.append([int(cx + r * math.cos(ang)), int(cy + r * math.sin(ang))])
        cv2.fillPoly(frame, [np.array(pts, np.int32)], color)
    elif shape == "leaf":
        axes = (radius, int(radius * 0.65))
        cv2.ellipse(frame, center, axes, 35, 0, 360, color, -1)
        cv2.line(frame, (cx, cy + radius // 2), (cx, cy - radius // 2), (30, 90, 40), 2)
    else:
        cv2.circle(frame, center, radius, color, -1)
        cv2.circle(frame, (cx - 7, cy - 7), 6, (230, 230, 255), -1)


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
    kitchen = CosmicKitchen(w, h)

    print("FOODIVERSE Phase 3 — Cosmic Kitchen")
    print("Pinch ingredients into the bowl. Press G for zero-G. R reset. Q quit.")

    prev = time.time()
    window = "FOODIVERSE - Cosmic Kitchen (Phase 3)"

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
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
                print("Zero-G" if not kitchen.gravity_on else "Gravity ON")
            if key == ord("r"):
                kitchen.reset()
                print("Kitchen reset")
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
