# FOODIVERSE: Cosmic Kitchen

**Hosted URL:** https://pankhuri1999.github.io/FoodVerse/

**Tagline:** The living universe you cook into existence.

VR cooking adventure · creative sandbox · world-building · puzzle adventure

Space affects cooking → Cooking creates life → Life transforms worlds.

## Current status

**Phase 1** — Webcam hand tracking (ready)  
**Phase 2** — Hand pinch grab + cosmic fruit (ready)  
**Phase 3** — Cosmic Kitchen + bowl + zero-G (ready)  
**Phase 4** — Cooking + recipe discovery (ready)  
**Phase 5** — Edible world-building / Cookie Kingdom (ready)  
**Phase 6** — Creature abilities (ready)  
**Phase 7** — Cookie Kingdom rescue mission (ready)  
**Phase 8** — Full kingdom restoration + Quest prep (ready to play)

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

## Phase 2: Grab a cosmic fruit

**Today (no Unity required):**

```powershell
cd hand_tracking
.\run_phase2_preview.bat
```

Pinch the on-screen fruit to grab it.

**Full Unity path** (install [Unity Hub](https://unity.com/download) + 2022.3 LTS first):

1. Open `UnityProject` in Hub.
2. Menu **FOODIVERSE → Create Phase 2 Scene** → **Play**.
3. Run `hand_tracking\run_bridge.bat`.
4. Pinch near the pink fruit.

Details: [docs/PHASE2.md](docs/PHASE2.md)

## Phase 3: Cosmic Kitchen

```powershell
cd hand_tracking
.\run_phase3.bat
```

Pinch ingredients into the mixing bowl. Press **G** for zero-G, **R** to reset.

Details: [docs/PHASE3.md](docs/PHASE3.md)

## Phase 4: Cooking

```powershell
cd hand_tracking
.\run_phase4.bat
```

Drop recipe pairs in the bowl → **H** heat / **C** cool → pinch-stir in circles over the bowl.

Details: [docs/PHASE4.md](docs/PHASE4.md)

## Phase 5: World-building

```powershell
cd hand_tracking
.\run_phase5.bat
```

Pinch Cookie Bridge / Chocolate River / Crystal Peak / Leaf Grove into glowing kingdom slots.

Details: [docs/PHASE5.md](docs/PHASE5.md)

## Phase 6: Creature abilities

```powershell
cd hand_tracking
.\run_phase6.bat
```

Drag Ember / Grove / Mint to challenges and press **A** or **Space** to activate.

Details: [docs/PHASE6.md](docs/PHASE6.md)

## Phase 7: Rescue mission

```powershell
cd hand_tracking
.\run_phase7.bat
```

One guided loop: collect → cook Ember → build bridge → melt ice gate → restore.

Details: [docs/PHASE7.md](docs/PHASE7.md)

## Phase 8: Full kingdom restoration

```powershell
cd hand_tracking
.\run_phase8.bat
```

Ember melts ice → Grove grows forest → Mint freezes water → full celebration.  
Quest readiness: [docs/QUEST.md](docs/QUEST.md) · details: [docs/PHASE8.md](docs/PHASE8.md)

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
| 8 | Full restoration (3 creatures) + Quest prep |

## Platform plan

- **Now:** Windows desktop prototype (webcam → MediaPipe → Unity)
- **Later:** Meta Quest (native hand tracking via Meta XR SDK)

Input stays behind an interface so gameplay does not need a rewrite for VR.
