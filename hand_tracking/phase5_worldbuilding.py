"""
FOODIVERSE Phase 5 — Edible world-building (Cookie Kingdom).

Pinch build pieces from the palette and snap them into the miniature world:
- Cookie Bridge spans the kingdom gap
- Chocolate River connects the banks
- Crystal Peak activates an energy node
- Leaf Grove restores a forest patch

Controls:
  q - quit
  r - reset world
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

from hand_tracker import HandState, compute_hand_state, draw_overlay

try:
    import winsound
except ImportError:
    winsound = None

GRAB_RADIUS = 70


@dataclass
class BuildPiece:
    piece_id: str
    label: str
    color: Tuple[int, int, int]
    shape: str  # bridge | river | crystal | grove
    x: float
    y: float
    held: bool = False
    near: bool = False
    placed: bool = False

    @property
    def radius(self) -> int:
        return 34


@dataclass
class SnapSocket:
    socket_id: str
    accepts: str
    x: float
    y: float
    filled: bool = False
    label: str = ""


@dataclass
class CookieKingdom:
    w: int
    h: int
    pieces: List[BuildPiece] = field(default_factory=list)
    sockets: List[SnapSocket] = field(default_factory=list)
    held: Optional[BuildPiece] = None
    restored: bool = False
    message: str = "Build the Cookie Kingdom — snap pieces into the glowing slots"
    message_color: Tuple[int, int, int] = (200, 200, 210)
    flash_t: float = 0.0
    anim_t: float = 0.0

    def __post_init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.held = None
        self.restored = False
        self.flash_t = 0.0
        self.message = "Build the Cookie Kingdom — snap pieces into the glowing slots"
        self.message_color = (200, 200, 210)

        # Palette along the top.
        palette_y = self.h * 0.16
        specs = [
            ("cookie_bridge", "Cookie Bridge", (70, 140, 220), "bridge"),
            ("choc_river", "Chocolate River", (40, 70, 100), "river"),
            ("crystal_peak", "Crystal Peak", (230, 220, 120), "crystal"),
            ("leaf_grove", "Leaf Grove", (70, 190, 90), "grove"),
        ]
        xs = np.linspace(self.w * 0.18, self.w * 0.82, len(specs))
        self.pieces = [
            BuildPiece(pid, label, color, shape, float(x), float(palette_y))
            for (pid, label, color, shape), x in zip(specs, xs)
        ]

        # Snap sockets in the kingdom below.
        mid_y = self.h * 0.62
        self.sockets = [
            SnapSocket("bridge", "cookie_bridge", self.w * 0.50, mid_y - 10, label="Bridge"),
            SnapSocket("river", "choc_river", self.w * 0.50, mid_y + 55, label="River"),
            SnapSocket("crystal", "crystal_peak", self.w * 0.72, mid_y - 50, label="Peak"),
            SnapSocket("grove", "leaf_grove", self.w * 0.28, mid_y - 40, label="Grove"),
        ]

    @property
    def progress(self) -> int:
        return sum(1 for s in self.sockets if s.filled)

    def update(self, hand: HandState, dt: float) -> None:
        self.anim_t += dt
        if self.flash_t > 0:
            self.flash_t = max(0.0, self.flash_t - dt)

        gx = hand.x * self.w
        gy = hand.y * self.h
        pinching = hand.detected and hand.is_pinching

        for piece in self.pieces:
            if piece.placed:
                piece.near = False
                continue
            piece.near = hand.detected and math.hypot(gx - piece.x, gy - piece.y) < GRAB_RADIUS

        if pinching:
            if self.held is None:
                candidates = [p for p in self.pieces if p.near and not p.placed]
                if candidates:
                    self.held = min(candidates, key=lambda p: math.hypot(gx - p.x, gy - p.y))
                    self.held.held = True
            if self.held is not None:
                self.held.x = gx
                self.held.y = gy
                # Soft snap preview: pull toward matching empty socket when close.
                socket = self._matching_socket(self.held, gx, gy, radius=90)
                if socket is not None:
                    self.held.x = 0.65 * self.held.x + 0.35 * socket.x
                    self.held.y = 0.65 * self.held.y + 0.35 * socket.y
        else:
            if self.held is not None:
                piece = self.held
                piece.held = False
                socket = self._matching_socket(piece, piece.x, piece.y, radius=70)
                if socket is not None and not socket.filled:
                    piece.x = socket.x
                    piece.y = socket.y
                    piece.placed = True
                    socket.filled = True
                    self.message = f"Placed {piece.label}!"
                    self.message_color = (120, 220, 160)
                    self._chime(740)
                    self._check_restored()
                else:
                    # Return to palette slot.
                    self._return_to_palette(piece)
                    self.message = "Snap into a matching glowing slot"
                    self.message_color = (180, 180, 200)
                self.held = None

    def _matching_socket(
        self, piece: BuildPiece, x: float, y: float, radius: float
    ) -> Optional[SnapSocket]:
        best = None
        best_d = radius
        for socket in self.sockets:
            if socket.accepts != piece.piece_id or socket.filled:
                continue
            d = math.hypot(x - socket.x, y - socket.y)
            if d < best_d:
                best_d = d
                best = socket
        return best

    def _return_to_palette(self, piece: BuildPiece) -> None:
        idx = next(i for i, p in enumerate(self.pieces) if p.piece_id == piece.piece_id)
        xs = np.linspace(self.w * 0.18, self.w * 0.82, len(self.pieces))
        piece.x = float(xs[idx])
        piece.y = float(self.h * 0.16)
        piece.placed = False

    def _check_restored(self) -> None:
        if all(s.filled for s in self.sockets) and not self.restored:
            self.restored = True
            self.flash_t = 2.5
            self.message = "COOKIE KINGDOM RESTORED! The edible world lives again."
            self.message_color = (80, 220, 255)
            self._chime(988)
            self._chime(1318)

    def _chime(self, freq: int) -> None:
        if winsound is None:
            return
        try:
            winsound.Beep(freq, 90)
        except Exception:
            pass

    def draw(self, frame: np.ndarray) -> None:
        self._draw_world(frame)
        self._draw_sockets(frame)
        for piece in self.pieces:
            if not piece.placed:
                self._draw_piece(frame, piece)
        # Placed pieces drawn as world features (already in world art), plus icons on sockets.
        for piece in self.pieces:
            if piece.placed:
                self._draw_piece(frame, piece, dim=False)

        # HUD
        cv2.rectangle(frame, (8, 8), (430, 100), (20, 20, 30), -1)
        cv2.putText(frame, "WORLD BUILDING — Phase 5", (16, 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 220, 120), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Structures: {self.progress}/4", (16, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 220), 1, cv2.LINE_AA)
        status = "KINGDOM RESTORED" if self.restored else "Gap divides the Cookie Kingdom"
        status_color = (80, 255, 160) if self.restored else (160, 160, 200)
        cv2.putText(frame, status, (16, 82),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 1, cv2.LINE_AA)

        cv2.rectangle(frame, (8, self.h - 58), (self.w - 8, self.h - 8), (20, 20, 30), -1)
        cv2.putText(frame, self.message + "   |  r reset  q quit", (16, self.h - 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, self.message_color, 1, cv2.LINE_AA)

        if self.flash_t > 0 and self.restored:
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (self.w, self.h), (40, 80, 40), -1)
            cv2.addWeighted(overlay, 0.15 * min(1.0, self.flash_t), frame, 0.85, 0, frame)

    def _draw_world(self, frame: np.ndarray) -> None:
        h, w = self.h, self.w
        # Sky / space
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, int(h * 0.22)), (30, 20, 45), -1)
        cv2.addWeighted(overlay, 0.35, frame, 0.65, 0, frame)

        # Two cookie land masses with a gap in the middle.
        left = np.array(
            [
                [int(w * 0.05), int(h * 0.78)],
                [int(w * 0.38), int(h * 0.78)],
                [int(w * 0.40), int(h * 0.55)],
                [int(w * 0.08), int(h * 0.52)],
            ],
            np.int32,
        )
        right = np.array(
            [
                [int(w * 0.62), int(h * 0.55)],
                [int(w * 0.95), int(h * 0.52)],
                [int(w * 0.95), int(h * 0.78)],
                [int(w * 0.60), int(h * 0.78)],
            ],
            np.int32,
        )
        land = (60, 120, 180) if not self.restored else (70, 150, 210)
        cv2.fillPoly(frame, [left], land)
        cv2.fillPoly(frame, [right], land)
        cv2.polylines(frame, [left, right], True, (40, 80, 120), 2)

        # Gap chasm
        if not any(s.socket_id == "bridge" and s.filled for s in self.sockets):
            cv2.rectangle(
                frame,
                (int(w * 0.40), int(h * 0.55)),
                (int(w * 0.60), int(h * 0.78)),
                (20, 15, 25),
                -1,
            )
            cv2.putText(frame, "GAP", (int(w * 0.47), int(h * 0.68)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 90, 120), 2, cv2.LINE_AA)
        else:
            # Cookie bridge deck
            cv2.rectangle(
                frame,
                (int(w * 0.39), int(h * 0.58)),
                (int(w * 0.61), int(h * 0.66)),
                (80, 150, 230),
                -1,
            )
            for i in range(5):
                x = int(w * 0.41 + i * w * 0.04)
                cv2.line(frame, (x, int(h * 0.58)), (x, int(h * 0.66)), (50, 100, 160), 2)

        # Chocolate river if placed
        if any(s.socket_id == "river" and s.filled for s in self.sockets):
            pts = np.array(
                [
                    [int(w * 0.20), int(h * 0.72)],
                    [int(w * 0.35), int(h * 0.70)],
                    [int(w * 0.50), int(h * 0.73)],
                    [int(w * 0.65), int(h * 0.70)],
                    [int(w * 0.80), int(h * 0.72)],
                ],
                np.int32,
            )
            cv2.polylines(frame, [pts], False, (30, 60, 90), 14)
            flow = int((self.anim_t * 40) % 20)
            cv2.polylines(frame, [pts], False, (60, 100, 140), 4)
            cv2.circle(frame, (int(w * 0.35 + flow), int(h * 0.70)), 4, (100, 150, 180), -1)

        # Grove
        if any(s.socket_id == "grove" and s.filled for s in self.sockets):
            gx, gy = int(w * 0.22), int(h * 0.50)
            for i, (ox, oy) in enumerate(((-20, 10), (0, 0), (22, 8), (-5, 20))):
                cv2.circle(frame, (gx + ox, gy + oy), 16 - i, (50, 170 + i * 10, 70), -1)
                cv2.line(frame, (gx + ox, gy + oy + 12), (gx + ox, gy + oy + 28), (30, 80, 40), 2)

        # Crystal peak
        if any(s.socket_id == "crystal" and s.filled for s in self.sockets):
            px, py = int(w * 0.78), int(h * 0.48)
            peak = np.array([[px, py - 55], [px + 28, py + 10], [px - 28, py + 10]], np.int32)
            cv2.fillPoly(frame, [peak], (230, 230, 140))
            pulse = 0.5 + 0.5 * math.sin(self.anim_t * 4)
            cv2.circle(frame, (px, py - 20), int(8 + 4 * pulse), (255, 255, 200), -1)

        # Tiny cookie citizens once restored
        if self.restored:
            for i, x in enumerate((0.25, 0.45, 0.55, 0.75)):
                cx, cy = int(w * x), int(h * 0.58)
                bounce = int(4 * abs(math.sin(self.anim_t * 5 + i)))
                cv2.circle(frame, (cx, cy - bounce), 8, (100, 180, 255), -1)
                cv2.circle(frame, (cx - 2, cy - bounce - 1), 2, (30, 30, 40), -1)
                cv2.circle(frame, (cx + 3, cy - bounce - 1), 2, (30, 30, 40), -1)

    def _draw_sockets(self, frame: np.ndarray) -> None:
        for socket in self.sockets:
            if socket.filled:
                continue
            pulse = 0.5 + 0.5 * math.sin(self.anim_t * 3.5)
            color = (int(80 + 40 * pulse), int(160 + 60 * pulse), 255)
            cv2.circle(frame, (int(socket.x), int(socket.y)), 38, color, 2)
            cv2.putText(
                frame,
                socket.label,
                (int(socket.x) - 28, int(socket.y) + 55),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                color,
                1,
                cv2.LINE_AA,
            )

    def _draw_piece(self, frame: np.ndarray, piece: BuildPiece, dim: bool = False) -> None:
        cx, cy = int(piece.x), int(piece.y)
        color = piece.color
        if piece.held:
            glow = (80, 255, 160)
            label = "HOLD"
        elif piece.near:
            glow = (0, 220, 255)
            label = "PINCH"
        else:
            glow = (200, 190, 170)
            label = piece.label

        if piece.near or piece.held:
            cv2.circle(frame, (cx, cy), GRAB_RADIUS, glow, 1)

        if piece.shape == "bridge":
            cv2.rectangle(frame, (cx - 40, cy - 12), (cx + 40, cy + 12), color, -1)
            for i in range(-1, 2):
                cv2.line(frame, (cx + i * 20, cy - 12), (cx + i * 20, cy + 12), (40, 80, 120), 2)
        elif piece.shape == "river":
            pts = np.array([[cx - 35, cy], [cx - 10, cy - 12], [cx + 15, cy + 8], [cx + 35, cy]], np.int32)
            cv2.polylines(frame, [pts], False, color, 10)
        elif piece.shape == "crystal":
            pts = np.array([[cx, cy - 28], [cx + 20, cy + 16], [cx - 20, cy + 16]], np.int32)
            cv2.fillPoly(frame, [pts], color)
        else:  # grove
            cv2.circle(frame, (cx, cy - 4), 18, color, -1)
            cv2.line(frame, (cx, cy + 8), (cx, cy + 24), (30, 90, 40), 3)

        if not piece.placed or piece.held:
            cv2.putText(frame, label, (cx - 45, cy + 42),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, glow, 1, cv2.LINE_AA)


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
    world = CookieKingdom(w, h)

    print("FOODIVERSE Phase 5 - Cookie Kingdom world-building")
    print("Pinch pieces from the top palette and snap them into glowing slots.")

    prev = time.time()
    window = "FOODIVERSE - World Building (Phase 5)"

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
                print("World reset")
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
