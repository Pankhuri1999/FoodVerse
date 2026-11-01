# Phase 2 — Virtual hand + cosmic fruit

Deliverable: a cosmic fruit that follows your hand pinch in Unity.

## Architecture

```
Webcam → MediaPipe (Python) → UDP JSON :5005 → Unity HandUdpReceiver
                                              → HandCursorController
                                              → GrabbableIngredient
```

Input stays behind `IHandInputSource`, so Quest hand tracking can replace the webcam later.

## Prerequisites

1. Phase 1 setup already done (`hand_tracking\setup.ps1`)
2. [Unity Hub](https://unity.com/download) + **Unity 2022.3 LTS** (or Unity 6; scripts support both)
3. When Hub asks, add the project folder: `UnityProject`

## Run the demo

1. Open `UnityProject` in Unity Hub.
2. Create a new empty scene (`File → New Scene`).
3. Create an empty GameObject, name it `Phase2Bootstrap`, add the `Phase2Bootstrap` component.
4. Press **Play**.
5. In a separate terminal / double-click:

```text
hand_tracking\run_bridge.bat
```

6. Show your hand to the webcam. Move around — the yellow cursor should follow.
7. Pinch near the pink cosmic fruit to grab it; release to drop it.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Cursor never moves | Confirm bridge console says `streaming…` and Unity Console shows `Listening for hand input on UDP :5005` |
| Fruit won't grab | Move closer / pinch while the cursor overlaps the fruit |
| Port already in use | Close other bridge windows, or run `unity_bridge.py --port 5006` and change the receiver port in Unity |
| No Unity installed yet | Scripts are ready in the repo; install Unity Hub when you can and open `UnityProject` |
