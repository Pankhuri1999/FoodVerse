"""Offline smoke test for Phase 1 hand tracking (no webcam required)."""

from __future__ import annotations

from types import SimpleNamespace

from hand_tracker import PINCH_THRESHOLD, HandState, compute_hand_state


def _lm(x: float, y: float, z: float = 0.0) -> SimpleNamespace:
    return SimpleNamespace(x=x, y=y, z=z)


def _fake_landmarks(*, pinch: bool) -> list:
    """Build a minimal 21-landmark hand with wrist, tips, and middle MCP."""
    landmarks = [_lm(0.0, 0.0) for _ in range(21)]
    landmarks[0] = _lm(0.5, 0.5)       # wrist
    landmarks[9] = _lm(0.5, 0.35)      # middle MCP — hand size ≈ 0.15
    if pinch:
        landmarks[4] = _lm(0.48, 0.30)  # thumb tip close to index
        landmarks[8] = _lm(0.50, 0.30)
    else:
        landmarks[4] = _lm(0.35, 0.30)
        landmarks[8] = _lm(0.65, 0.30)
    return landmarks


def main() -> None:
    import mediapipe as mp
    import cv2

    print(f"mediapipe {mp.__version__}")
    print(f"cv2       {cv2.__version__}")
    assert hasattr(mp.solutions, "hands"), "MediaPipe Hands solutions API missing"

    open_hand = compute_hand_state(_fake_landmarks(pinch=False))
    pinched = compute_hand_state(_fake_landmarks(pinch=True))

    assert open_hand.detected and not open_hand.is_pinching, open_hand
    assert pinched.detected and pinched.is_pinching, pinched
    assert pinched.pinch_distance < PINCH_THRESHOLD <= open_hand.pinch_distance

    idle = HandState()
    assert not idle.detected

    print(f"PINCH_THRESHOLD={PINCH_THRESHOLD}")
    print(f"open  pinch_distance={open_hand.pinch_distance:.3f} is_pinching={open_hand.is_pinching}")
    print(f"pinch pinch_distance={pinched.pinch_distance:.3f} is_pinching={pinched.is_pinching}")
    print("smoke_test OK")


if __name__ == "__main__":
    main()
