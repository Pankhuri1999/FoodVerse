"""
FOODIVERSE Phase 2 preview (no Unity required).

Uses the same hand tracking + pinch logic as the Unity bridge, but draws a
2D "cosmic fruit" on the webcam feed so you can practice grab/release while
Unity Hub installs.

Controls:
  q — quit
"""

from __future__ import annotations

import math
import os
import time

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np

from hand_tracker import HandState, compute_hand_state, draw_overlay

# How close the yellow grab reticle must be to start a grab (pixels).
GRAB_START_RADIUS = 90


class CosmicFruit2D:
    def __init__(self, x: float, y: float, radius: int = 42):
        self.x = x
        self.y = y
        self.home = (x, y)
        self.radius = radius
        self.held = False
        self.near = False
        self.vx = 0.0
        self.vy = 0.0

    def update(self, hand: HandState, frame_w: int, frame_h: int, dt: float) -> None:
        cx = hand.x * frame_w
        cy = hand.y * frame_h
        dist = math.hypot(cx - self.x, cy - self.y)
        self.near = hand.detected and dist < GRAB_START_RADIUS

        can_start_grab = self.near and hand.is_pinching
        if hand.detected and hand.is_pinching and (self.held or can_start_grab):
            self.held = True
            self.vx = (cx - self.x) * 14.0
            self.vy = (cy - self.y) * 14.0
            self.x = cx
            self.y = cy
        else:
            if self.held:
                self.held = False
            # Soft settle / bounce when released.
            self.vx *= 0.90
            self.vy *= 0.90
            self.vy += 900.0 * dt
            self.x += self.vx * dt
            self.y += self.vy * dt

            floor = frame_h * 0.72
            if self.y > floor:
                self.y = floor
                self.vy *= -0.35
                self.vx *= 0.8

            self.x = float(np.clip(self.x, self.radius, frame_w - self.radius))
            self.y = float(np.clip(self.y, self.radius, frame_h - self.radius))

    def draw(self, frame: np.ndarray) -> None:
        center = (int(self.x), int(self.y))
        if self.held:
            glow = (80, 255, 160)
            label = "HELD"
        elif self.near:
            glow = (0, 220, 255)
            label = "PINCH TO GRAB"
        else:
            glow = (0, 140, 255)
            label = "COSMIC FRUIT"

        # Grab range ring so it's clear when you're close enough.
        cv2.circle(frame, center, GRAB_START_RADIUS, (80, 80, 100), 1)
        cv2.circle(frame, center, self.radius + 10, glow, 2)
        cv2.circle(frame, center, self.radius, (60, 80, 255), -1)
        cv2.circle(frame, (center[0] - 8, center[1] - 8), 8, (180, 220, 255), -1)
        cv2.putText(
            frame,
            label,
            (center[0] - 70, center[1] + self.radius + 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            glow,
            1,
            cv2.LINE_AA,
        )


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
    fruit = CosmicFruit2D(w * 0.5, h * 0.55)

    print("FOODIVERSE Phase 2 preview")
    print("Move the YELLOW cross onto the fruit, then pinch thumb + index.")
    print("Release pinch to drop. Press q to quit.")

    prev = time.time()
    window = "FOODIVERSE - Phase 2 Preview"

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

            fruit.update(state, w, h, dt)
            draw_overlay(frame, state, landmark_list, connections)
            fruit.draw(frame)

            hint = "Move yellow + onto fruit, then pinch"
            if state.detected and state.is_pinching:
                hint = "PINCHING — hold over fruit to carry it"
            elif fruit.near:
                hint = "Close enough — pinch thumb + index now"
            cv2.putText(
                frame,
                hint,
                (16, h - 16),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (180, 220, 255) if fruit.near or fruit.held else (180, 180, 200),
                1,
                cv2.LINE_AA,
            )
            cv2.imshow(window, frame)
            if (cv2.waitKey(1) & 0xFF) == ord("q"):
                break
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    run()
