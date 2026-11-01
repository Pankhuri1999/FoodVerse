# FOODIVERSE: Cosmic Kitchen

**Tagline:** The living universe you cook into existence.

VR cooking adventure · creative sandbox · world-building · puzzle adventure

Space affects cooking → Cooking creates life → Life transforms worlds.

## Current status

**Phase 1** — Webcam hand tracking (ready)  
**Phase 2** — Unity hand cursor + cosmic fruit grab (scripts ready)

## Project layout

```
FOODIVERSE/
├── hand_tracking/          # Python webcam + MediaPipe
│   ├── hand_tracker.py     # Phase 1 tracker
│   ├── unity_bridge.py     # Phase 2 UDP stream → Unity
│   ├── run.bat / run_bridge.bat
│   └── requirements.txt
├── UnityProject/           # Unity 2022.3+ project
│   └── Assets/Scripts/     # Input, ingredients, bootstrap
├── docs/
│   ├── DESIGN.md
│   └── PHASE2.md
└── README.md
```

## Phase 1: Hand tracker

```powershell
cd hand_tracking
.\setup.ps1
.\run.bat
```

Or double-click `hand_tracking\run.bat`.

## Phase 2: Grab a cosmic fruit in Unity

See [docs/PHASE2.md](docs/PHASE2.md) for full steps.

Short version:
1. Open `UnityProject` in Unity Hub (2022.3 LTS recommended).
2. New empty scene → add `Phase2Bootstrap` component → **Play**.
3. Double-click `hand_tracking\run_bridge.bat`.
4. Pinch near the pink fruit to grab it.

## Roadmap

| Phase | Deliverable |
|-------|-------------|
| 1 | Working webcam hand-tracking prototype |
| 2 | Virtual hand cursor in Unity + grab cosmic fruit |
| 3 | Cosmic kitchen + gravity toggle |
| 4 | Cooking / recipe system |
| 5 | Edible world-building |
| 6 | Three creatures |
| 7 | Cookie Kingdom rescue mission |
| 8 | Meta Quest VR polish |

## Platform plan

- **Now:** Windows desktop prototype (webcam → MediaPipe → Unity)
- **Later:** Meta Quest (native hand tracking via Meta XR SDK)

Input stays behind an interface so gameplay does not need a rewrite for VR.
