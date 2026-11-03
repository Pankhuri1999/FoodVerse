"""
FOODIVERSE Phase 2 — stream hand tracking to Unity over UDP.

Sends one JSON packet per frame to 127.0.0.1:5005:
{
  "detected": true,
  "x": 0.0-1.0,   # pinch midpoint (grab point), origin top-left
  "y": 0.0-1.0,
  "z": 0.0-1.0,   # depth proxy (closer hand → higher)
  "pinch": true,
  "pinch_distance": 0.2
}

Usage:
  python unity_bridge.py
  python unity_bridge.py --port 5005 --camera 0
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import time

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import cv2
import mediapipe as mp

from hand_tracker import HandState, compute_hand_state, draw_overlay


DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5005


def state_to_payload(state: HandState) -> dict:
    return {
        "detected": bool(state.detected),
        "x": round(float(state.x), 4),
        "y": round(float(state.y), 4),
        "z": round(float(state.z), 4),
        "pinch": bool(state.is_pinching),
        "pinch_distance": round(float(state.pinch_distance), 4),
    }


def run(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT, camera_index: int = 0) -> None:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (host, port)

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

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    window_name = "FOODIVERSE - Unity Bridge (Phase 2)"
    print(f"Streaming hand data to udp://{host}:{port}")
    print("Start the Unity scene, then show one hand to the webcam.")
    print("Pinch to grab. Press q to quit.")

    packets = 0
    last_report = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Failed to read frame from webcam.")
                break

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

            payload = json.dumps(state_to_payload(state), separators=(",", ":"))
            sock.sendto(payload.encode("utf-8"), target)
            packets += 1

            draw_overlay(frame, state, landmark_list, connections)
            cv2.putText(
                frame,
                f"UDP {host}:{port}",
                (frame.shape[1] - 220, 28),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (160, 200, 255),
                1,
                cv2.LINE_AA,
            )
            cv2.imshow(window_name, frame)

            now = time.time()
            if now - last_report >= 2.0:
                print(f"streaming… {packets} packets  pinch={state.is_pinching}")
                last_report = now
                packets = 0

            if (cv2.waitKey(1) & 0xFF) == ord("q"):
                break
    finally:
        hands.close()
        cap.release()
        sock.close()
        cv2.destroyAllWindows()
        print("Unity bridge stopped.")


def main() -> None:
    parser = argparse.ArgumentParser(description="FOODIVERSE hand → Unity UDP bridge")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--camera", type=int, default=0)
    args = parser.parse_args()
    run(host=args.host, port=args.port, camera_index=args.camera)


if __name__ == "__main__":
    main()
