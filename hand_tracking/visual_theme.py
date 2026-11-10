"""FOODIVERSE visual identity for the OpenCV prototype.

Colors are OpenCV BGR. Hershey fonts cannot draw unicode, so on-screen
text goes through ascii_text().
"""

from __future__ import annotations

import cv2
import numpy as np

# Deep space navy, midnight blue, electric cyan, cosmic violet, warm gold, mint, soft white.
NAVY = (28, 13, 8)
MIDNIGHT = (50, 26, 16)
CYAN = (255, 223, 66)
VIOLET = (255, 101, 144)
GOLD = (109, 198, 255)
MINT = (177, 230, 113)
WHITE = (255, 246, 242)
HULL = (22, 16, 12)


def ascii_text(text: str) -> str:
    """Strip glyphs Hershey fonts render as question marks."""
    return (
        text.replace("—", "-")
        .replace("–", "-")
        .replace("·", "|")
        .replace("→", ">")
        .replace("…", "...")
    )


def ui_scale(width: int) -> float:
    return float(np.clip(width / 1500.0, 0.48, 0.78))


def _clip(frame: np.ndarray, x: int, y: int, w: int, h: int):
    fh, fw = frame.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(fw, x + w), min(fh, y + h)
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def filled_round(
    frame: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    color: tuple,
    radius: int = 16,
    alpha: float = 1.0,
) -> None:
    """Rounded fill on a small region, so panels stay soft without a full-frame copy."""
    bounds = _clip(frame, x, y, w, h)
    if bounds is None:
        return
    x0, y0, x1, y1 = bounds
    roi = frame[y0:y1, x0:x1]
    layer = roi.copy()
    ox, oy = x - x0, y - y0
    r = max(4, min(radius, w // 2, h // 2))
    cv2.rectangle(layer, (ox + r, oy), (ox + w - r, oy + h), color, -1)
    cv2.rectangle(layer, (ox, oy + r), (ox + w, oy + h - r), color, -1)
    for cx, cy in (
        (ox + r, oy + r),
        (ox + w - r, oy + r),
        (ox + r, oy + h - r),
        (ox + w - r, oy + h - r),
    ):
        cv2.circle(layer, (cx, cy), r, color, -1, cv2.LINE_AA)
    if alpha >= 0.99:
        roi[:] = layer
    else:
        cv2.addWeighted(layer, alpha, roi, 1.0 - alpha, 0, roi)


def round_panel(frame: np.ndarray, x: int, y: int, w: int, h: int, radius: int = 16) -> None:
    """Translucent midnight panel with a thin cyan edge and a gold tick."""
    filled_round(frame, x, y, w, h, MIDNIGHT, radius, 0.82)
    x2, y2 = x + w, y + h
    r = max(4, min(radius, w // 2, h // 2))
    cv2.line(frame, (x + r, y), (x2 - r, y), CYAN, 1, cv2.LINE_AA)
    cv2.line(frame, (x + r, y2), (x2 - r, y2), VIOLET, 1, cv2.LINE_AA)
    cv2.line(frame, (x + 16, y2 - 2), (x + 58, y2 - 2), GOLD, 2, cv2.LINE_AA)


def cached_nebula(w: int, h: int) -> np.ndarray:
    key = (w, h)
    plate = getattr(cached_nebula, "_plate", None)
    if plate is not None and getattr(cached_nebula, "_key", None) == key:
        return plate
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    img = np.zeros((h, w, 3), np.float32)
    img[:, :, 0] = 22 + 28 * (1.0 - yy)
    img[:, :, 1] = 12 + 10 * (1.0 - yy)
    img[:, :, 2] = 8 + 14 * yy
    img = np.clip(img, 0, 255).astype(np.uint8)
    rng = np.random.RandomState(4)
    clouds = (
        (0.22, 0.28, int(w * 0.28), int(h * 0.16), VIOLET, 0.24),
        (0.72, 0.22, int(w * 0.32), int(h * 0.14), CYAN, 0.16),
        (0.48, 0.42, int(w * 0.55), int(h * 0.07), (70, 48, 28), 0.22),
        (0.58, 0.62, int(w * 0.22), int(h * 0.10), (40, 28, 70), 0.16),
    )
    for fx, fy, rx, ry, color, alpha in clouds:
        layer = img.copy()
        cv2.ellipse(layer, (int(w * fx), int(h * fy)), (rx, ry), 0, 0, 360, color, -1)
        layer = cv2.GaussianBlur(layer, (0, 0), 28)
        cv2.addWeighted(layer, alpha, img, 1 - alpha, 0, img)
    for _ in range(160):
        cv2.circle(
            img,
            (int(rng.randint(0, w)), int(rng.randint(0, h))),
            1,
            WHITE,
            -1,
            cv2.LINE_AA,
        )
    cached_nebula._plate = img
    cached_nebula._key = key
    return img
