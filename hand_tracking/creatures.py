"""Simple OpenCV creature drawings for FOODIVERSE recipe transformations."""

from __future__ import annotations

import math
from typing import Tuple

import cv2
import numpy as np


Point = Tuple[int, int]


def draw_creature(
    frame: np.ndarray,
    creature_id: str,
    center: Point,
    scale: float = 1.0,
    t: float = 0.0,
) -> None:
    """
    Draw a recognizable creature silhouette.
    creature_id: ember_dragon | grove_guardian | mint_current
    scale: 0..1+ size multiplier
    t: time seconds for idle animation
    """
    if scale <= 0.05:
        return
    drawers = {
        "Ember Dragon": _draw_ember_dragon,
        "ember_dragon": _draw_ember_dragon,
        "ember_spark": _draw_ember_dragon,
        "Grove Guardian": _draw_grove_guardian,
        "grove_guardian": _draw_grove_guardian,
        "grove_bloom": _draw_grove_guardian,
        "Mint Current": _draw_mint_current,
        "mint_current": _draw_mint_current,
    }
    drawer = drawers.get(creature_id, _draw_ember_dragon)
    drawer(frame, center, scale, t)


def _draw_ember_dragon(frame: np.ndarray, center: Point, scale: float, t: float) -> None:
    cx, cy = center
    s = scale
    bob = int(6 * math.sin(t * 4.0) * s)

    body = (40, 110, 255)
    wing = (30, 180, 255)
    glow = (80, 200, 255)
    eye = (240, 240, 255)

    # Wings (flutter)
    flap = int(10 * math.sin(t * 8.0) * s)
    left_wing = np.array(
        [
            [cx - int(18 * s), cy + bob],
            [cx - int(70 * s), cy - int(35 * s) + bob - flap],
            [cx - int(25 * s), cy + int(10 * s) + bob],
        ],
        np.int32,
    )
    right_wing = np.array(
        [
            [cx + int(18 * s), cy + bob],
            [cx + int(70 * s), cy - int(35 * s) + bob - flap],
            [cx + int(25 * s), cy + int(10 * s) + bob],
        ],
        np.int32,
    )
    cv2.fillPoly(frame, [left_wing], wing)
    cv2.fillPoly(frame, [right_wing], wing)

    # Body + head
    cv2.ellipse(frame, (cx, cy + bob + int(8 * s)), (int(28 * s), int(34 * s)), 0, 0, 360, body, -1)
    cv2.circle(frame, (cx, cy + bob - int(28 * s)), int(20 * s), body, -1)

    # Snout
    snout = np.array(
        [
            [cx + int(12 * s), cy + bob - int(28 * s)],
            [cx + int(42 * s), cy + bob - int(22 * s)],
            [cx + int(14 * s), cy + bob - int(16 * s)],
        ],
        np.int32,
    )
    cv2.fillPoly(frame, [snout], glow)

    # Eye + horn
    cv2.circle(frame, (cx + int(6 * s), cy + bob - int(32 * s)), int(4 * s), eye, -1)
    cv2.circle(frame, (cx + int(6 * s), cy + bob - int(32 * s)), max(1, int(2 * s)), (20, 40, 200), -1)
    cv2.line(
        frame,
        (cx - int(4 * s), cy + bob - int(42 * s)),
        (cx - int(2 * s), cy + bob - int(58 * s)),
        glow,
        max(2, int(3 * s)),
    )

    # Tail spark
    cv2.line(
        frame,
        (cx - int(20 * s), cy + bob + int(20 * s)),
        (cx - int(55 * s), cy + bob + int(35 * s)),
        glow,
        max(2, int(3 * s)),
    )
    cv2.circle(frame, (cx - int(55 * s), cy + bob + int(35 * s)), int(6 * s), (0, 220, 255), -1)

    # Soft glow
    cv2.circle(frame, (cx, cy + bob), int(55 * s), glow, 1)


def _draw_grove_guardian(frame: np.ndarray, center: Point, scale: float, t: float) -> None:
    cx, cy = center
    s = scale
    sway = int(5 * math.sin(t * 2.5) * s)

    leaf = (60, 190, 80)
    crystal = (220, 230, 120)
    bark = (40, 90, 50)
    eye = (240, 255, 240)

    # Crystal crown
    crown = np.array(
        [
            [cx - int(18 * s) + sway, cy - int(35 * s)],
            [cx + sway, cy - int(70 * s)],
            [cx + int(18 * s) + sway, cy - int(35 * s)],
        ],
        np.int32,
    )
    cv2.fillPoly(frame, [crown], crystal)

    # Leafy body
    cv2.ellipse(frame, (cx + sway, cy), (int(32 * s), int(40 * s)), 0, 0, 360, leaf, -1)
    cv2.ellipse(frame, (cx - int(28 * s) + sway, cy + int(5 * s)), (int(18 * s), int(26 * s)), -25, 0, 360, leaf, -1)
    cv2.ellipse(frame, (cx + int(28 * s) + sway, cy + int(5 * s)), (int(18 * s), int(26 * s)), 25, 0, 360, leaf, -1)

    # Face
    cv2.circle(frame, (cx - int(8 * s) + sway, cy - int(8 * s)), int(4 * s), eye, -1)
    cv2.circle(frame, (cx + int(8 * s) + sway, cy - int(8 * s)), int(4 * s), eye, -1)
    cv2.ellipse(frame, (cx + sway, cy + int(6 * s)), (int(8 * s), int(5 * s)), 0, 0, 180, bark, 2)

    # Root feet
    cv2.line(frame, (cx - int(10 * s) + sway, cy + int(35 * s)), (cx - int(22 * s) + sway, cy + int(55 * s)), bark, max(2, int(3 * s)))
    cv2.line(frame, (cx + int(10 * s) + sway, cy + int(35 * s)), (cx + int(22 * s) + sway, cy + int(55 * s)), bark, max(2, int(3 * s)))

    cv2.circle(frame, (cx + sway, cy), int(55 * s), (120, 220, 140), 1)


def _draw_mint_current(frame: np.ndarray, center: Point, scale: float, t: float) -> None:
    cx, cy = center
    s = scale
    wave = int(8 * math.sin(t * 3.5) * s)

    body = (200, 230, 140)
    mint = (180, 255, 160)
    deep = (140, 180, 90)
    eye = (250, 255, 250)

    # Flowing body segments
    for i, offset in enumerate((-30, -10, 10, 28)):
        ox = cx + int(offset * s) + (wave if i % 2 == 0 else -wave)
        oy = cy + int(6 * math.sin(t * 3.0 + i) * s)
        rad = int((22 - i * 2) * s)
        color = mint if i % 2 == 0 else body
        cv2.ellipse(frame, (ox, oy), (rad, int(rad * 0.7)), 0, 0, 360, color, -1)

    # Head
    hx, hy = cx + int(40 * s) + wave, cy
    cv2.circle(frame, (hx, hy), int(22 * s), mint, -1)
    cv2.circle(frame, (hx + int(6 * s), hy - int(4 * s)), int(4 * s), eye, -1)
    cv2.circle(frame, (hx + int(6 * s), hy - int(4 * s)), max(1, int(2 * s)), deep, -1)

    # Frost trail
    for i in range(5):
        fx = cx - int((40 + i * 12) * s) - wave
        fy = cy + int(10 * math.sin(t * 2.5 + i) * s)
        cv2.circle(frame, (fx, fy), max(2, int((6 - i) * s)), (230, 255, 200), -1)

    cv2.circle(frame, (cx, cy), int(58 * s), mint, 1)
