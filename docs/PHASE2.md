# Phase 2 — Virtual hand + cosmic fruit

Deliverable: a cosmic fruit that follows your hand pinch.

## Two ways to test

### A. Quick preview (no Unity) — start here today

Double-click:

```text
hand_tracking\run_phase2_preview.bat
```

Pinch near the pink fruit on the webcam feed to grab it. This uses the same MediaPipe pinch logic Unity will use.

### B. Full Unity demo

```
Webcam → MediaPipe (Python) → UDP JSON :5005 → Unity HandUdpReceiver
                                              → HandCursorController
                                              → GrabbableIngredient
```

#### Prerequisites

1. Phase 1 setup already done (`hand_tracking\setup.ps1`)
2. [Unity Hub](https://unity.com/download) + **Unity 2022.3 LTS** (or Unity 6)
3. In Hub: **Add** → select the `UnityProject` folder

#### Run

1. Open `UnityProject` in Unity Hub (first import can take a few minutes).
2. Menu: **FOODIVERSE → Create Phase 2 Scene**
3. Press **Play**
4. Double-click `hand_tracking\run_bridge.bat`
5. Move your hand — yellow cursor follows. Pinch near the pink fruit to grab; release to drop.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Cursor never moves | Bridge console should say `streaming…`; Unity Console should show `Listening for hand input on UDP :5005` |
| Fruit won't grab | Pinch while the cursor overlaps the fruit |
| Port already in use | Close other bridge windows, or `unity_bridge.py --port 5006` |
| No Unity yet | Use the OpenCV preview above while Unity Hub downloads |
