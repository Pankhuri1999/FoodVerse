# Phase 8 — Full Kingdom Restoration (+ Quest prep)

Deliverable: complete Cookie Kingdom rescue using **all three creatures**, with polished drop-pad UX. Quest readiness notes included for the next hardware step.

## Run

```text
hand_tracking\run_phase8.bat
```

## Mission flow

| Step | What to do |
|------|------------|
| Collect / cook Ember | Cosmic Fruit + Star-Pepper → **H** heat → stir |
| Build | Pinch Cookie Bridge onto the GAP |
| Melt | **PINCH Ember** → fly to ICE GATE pad → **OPEN hand** to drop |
| Collect / cook Grove | Space Leaves + Crystal Sugar → stir (any temp) |
| Grow | **PINCH Grove** → DROP on BARREN SOIL |
| Collect / cook Mint | Chocolate + Mint Crystal → **C** cool → stir |
| Freeze | **PINCH Mint** → DROP on WATER PATH |
| Restored | Citizens celebrate — kingdom fully alive |

## Keys

| Key | Action |
|-----|--------|
| H / C | Heat / cool bowl |
| S | Hold to stir |
| E | Pick up / drop active creature |
| 5 / 6 / 7 | Skip to Ember melt / Grove grow / Mint freeze |
| R | Restart |
| Q | Quit |

## Quest readiness (next hardware step)

Desktop webcam remains the daily prototype. For Meta Quest:

1. Keep gameplay behind `IHandInputSource` (already in Unity).
2. Install **Meta XR SDK** in Unity 2022.3 LTS when a headset is available.
3. Use `QuestHandInputSource` stub (`UnityProject/Assets/Scripts/Input/QuestHandInputSource.cs`) — wire Meta hand joints → pinch + palm pose.
4. Comfort: keep interactions within arm reach; avoid forced locomotion for the MVP kitchen.
5. Test pinch grab, bowl stir, and creature drop pads on-device before expanding content.

See also [docs/QUEST.md](QUEST.md).
