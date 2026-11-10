"""
FOODIVERSE: Cosmic Kitchen — Phase 1 Hand Tracker

Webcam hand tracking with MediaPipe:
- Detect one hand
- Recognize pinch (grab) gestures
- Extract normalized hand coordinates for later Unity bridging

Controls:
  q — quit
  s — print a snapshot of the current hand state to the console
"""

from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass
from typing import Optional

# Quiet MediaPipe / TFLite startup noise before those libraries load.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp
import numpy as np


def _bring_window_forward(window_name: str) -> None:
    """Try to surface the OpenCV window on Windows (often opens behind Cursor)."""
    try:
        import ctypes

        hwnd = ctypes.windll.user32.FindWindowW(None, window_name)
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 9)  # SW_RESTORE
            ctypes.windll.user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


# Thumb tip = 4, index tip = 8 (MediaPipe Hands landmark indices)
THUMB_TIP = 4
INDEX_TIP = 8
WRIST = 0

# Pinch distance as a fraction of hand size (wrist → middle MCP).
# Forgiving for seated webcam distance and soft pinches around objects.
PINCH_THRESHOLD = 0.55


@dataclass
class HandState:
    """Normalized hand data ready for Unity / gameplay consumers."""

    detected: bool = False
    # Grab point = midpoint of thumb tip + index tip ([0, 1], origin top-left).
    x: float = 0.0
    y: float = 0.0
    # Approximate depth proxy from hand size (larger hand → closer → higher z).
    z: float = 0.0
    is_pinching: bool = False
    pinch_distance: float = 1.0
    confidence: float = 0.0


def _landmark_distance(a, b) -> float:
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)


def compute_hand_state(landmarks, handedness_score: float = 1.0) -> HandState:
    """Build a HandState from MediaPipe landmarks (normalized image coords)."""
    wrist = landmarks[WRIST]
    thumb = landmarks[THUMB_TIP]
    index = landmarks[INDEX_TIP]
    middle_mcp = landmarks[9]

    hand_size = max(_landmark_distance(wrist, middle_mcp), 1e-6)
    pinch_raw = _landmark_distance(thumb, index)
    pinch_norm = pinch_raw / hand_size
    is_pinching = pinch_norm < PINCH_THRESHOLD

    # Interaction point is where you pinch — not the wrist.
    grab_x = (thumb.x + index.x) * 0.5
    grab_y = (thumb.y + index.y) * 0.5

    # Depth proxy: hand_size grows as the hand moves toward the camera.
    # Clamp into a comfortable [0, 1] band for the desktop prototype.
    z = float(np.clip((hand_size - 0.08) / 0.25, 0.0, 1.0))

    return HandState(
        detected=True,
        x=float(grab_x),
        y=float(grab_y),
        z=z,
        is_pinching=is_pinching,
        pinch_distance=float(pinch_norm),
        confidence=float(handedness_score),
    )


def draw_overlay(
    frame: np.ndarray,
    state: HandState,
    landmarks,
    connections,
    show_status: bool = True,
) -> None:
    """Draw landmarks and, unless a mission supplies its own HUD, pinch status."""
    h, w = frame.shape[:2]

    if state.detected and landmarks is not None:
        mp.solutions.drawing_utils.draw_landmarks(
            frame,
            landmarks,
            connections,
            mp.solutions.drawing_styles.get_default_hand_landmarks_style(),
            mp.solutions.drawing_styles.get_default_hand_connections_style(),
        )

        # Pinch indicator between thumb and index tips.
        thumb = landmarks.landmark[THUMB_TIP]
        index = landmarks.landmark[INDEX_TIP]
        pt1 = (int(thumb.x * w), int(thumb.y * h))
        pt2 = (int(index.x * w), int(index.y * h))
        color = (177, 230, 113) if state.is_pinching else (255, 223, 66)
        cv2.line(frame, pt1, pt2, color, 2)
        cv2.circle(frame, pt1, 8, color, -1)
        cv2.circle(frame, pt2, 8, color, -1)

        # Yellow reticle = grab point (pinch midpoint).
        cursor = (int(state.x * w), int(state.y * h))
        cv2.circle(frame, cursor, 16, (109, 198, 255), 2)
        cv2.drawMarker(frame, cursor, (109, 198, 255), cv2.MARKER_CROSS, 12, 2)

    if not show_status:
        return

    from visual_theme import CYAN, GOLD, MINT, WHITE, round_panel

    if not state.detected:
        status, status_color = "NONE", (140, 150, 170)
    elif state.is_pinching:
        status, status_color = "PINCH", MINT
    else:
        status, status_color = "OPEN", WHITE
    detect_text = "Hand  YES" if state.detected else "Hand  NO"
    detect_color = MINT if state.detected else (80, 80, 255)

    round_panel(frame, 8, 8, 340, 100, 14)
    cv2.putText(frame, "FOODIVERSE  |  Hand Tracker", (22, 34),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, GOLD, 1, cv2.LINE_AA)
    cv2.putText(frame, detect_text, (22, 58),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, detect_color, 1, cv2.LINE_AA)
    cv2.putText(frame, f"Gesture  {status}", (22, 82),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, status_color, 1, cv2.LINE_AA)

    if state.detected:
        coords = f"x={state.x:.2f}  y={state.y:.2f}  z={state.z:.2f}  pinch={state.pinch_distance:.2f}"
        cv2.putText(frame, coords, (22, 100),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, CYAN, 1, cv2.LINE_AA)

    cv2.putText(frame, "q quit  |  s snapshot", (16, h - 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, WHITE, 1, cv2.LINE_AA)


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
        raise RuntimeError(
            f"Could not open webcam (index {camera_index}). "
            "Check that a camera is connected and not used by another app."
        )

    # Prefer a modest resolution for stable tracking latency on laptops.
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    window_name = "FOODIVERSE - Hand Tracker (Phase 1)"
    print("FOODIVERSE hand tracker running.")
    print("Look for the camera window (it may open behind Cursor — check the taskbar).")
    print("Show one hand to the webcam. Pinch thumb + index to grab.")
    print("Press q to quit, s for a console snapshot.")

    prev_time = time.time()
    fps = 0.0
    raised = False

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Failed to read frame from webcam.")
                break

            # Mirror for natural interaction (like looking in a mirror).
            frame = cv2.flip(frame, 1)
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

            now = time.time()
            dt = now - prev_time
            prev_time = now
            if dt > 0:
                fps = 0.9 * fps + 0.1 * (1.0 / dt) if fps else 1.0 / dt

            draw_overlay(frame, state, landmark_list, connections)
            cv2.putText(frame, f"{fps:.0f} fps", (frame.shape[1] - 90, 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 180), 1, cv2.LINE_AA)

            cv2.imshow(window_name, frame)
            if not raised:
                _bring_window_forward(window_name)
                raised = True

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            if key == ord("s"):
                print(
                    f"snapshot | detected={state.detected} "
                    f"x={state.x:.3f} y={state.y:.3f} z={state.z:.3f} "
                    f"pinch={state.is_pinching} dist={state.pinch_distance:.3f}"
                )
    finally:
        hands.close()
        cap.release()
        cv2.destroyAllWindows()
        print("Hand tracker stopped.")


if __name__ == "__main__":
    run()
