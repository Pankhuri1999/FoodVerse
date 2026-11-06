# Meta Quest integration notes

Target: Meta Quest 2 / 3 / 3S with native hand tracking.

## Architecture

```
Quest hands (Meta XR) ─┐
                       ├─► IHandInputSource ─► grab / cook / build / abilities
Webcam MediaPipe UDP ──┘
```

Do not fork gameplay scripts per platform. Swap only the input source.

## Suggested Unity packages

- Meta XR All-in-One SDK (or Meta XR Core + Hands)
- OpenXR plugin (if using Unity OpenXR path)

## Pinch mapping

| Webcam prototype | Quest |
|------------------|-------|
| Thumb–index distance | Meta pinch strength / pinch API |
| Palm midpoint | Wrist / palm pose |
| Open hand stir | Low pinch + palm motion over bowl |

## Checklist before a Quest demo build

- [ ] `QuestHandInputSource` reads live hand data
- [ ] Mixing bowl works at standing kitchen height
- [ ] Creature drop pads readable in passthrough / VR
- [ ] Frame time stable (≥72 Hz target)
- [ ] Comfort: seated or standing, no snap-turn required for MVP
