# Phase 5 — Edible world-building

Deliverable: place food structures into a miniature Cookie Kingdom with snap placement.

## Run

```text
hand_tracking\run_phase5.bat
```

Window title: **World Building (Phase 5)**

## Goal

The Cookie Kingdom is split by a gap. Restore it by snapping all 4 structures:

| Piece | Slot | Effect |
|-------|------|--------|
| Cookie Bridge | Bridge | Spans the gap |
| Chocolate River | River | Flows between banks |
| Crystal Peak | Peak | Activates energy glow |
| Leaf Grove | Grove | Grows a forest patch |

When all 4 are placed → **COOKIE KINGDOM RESTORED** (citizens appear).

## Controls

1. Pinch a piece from the **top palette**
2. Move it over a **glowing slot** (it soft-snaps when close)
3. Release to place — wrong slot returns it to the palette
4. **R** reset · **Q** quit

## Tips

- Match piece type to slot type (bridge only snaps to Bridge, etc.).
- Watch the HUD: `Structures: 2/4`
- Soft magnetism pulls a matching piece into its slot when nearby.
