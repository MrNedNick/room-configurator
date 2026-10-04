# Example: a room and the camera

## Try it

```bash
npm run dev
```

1. **L-shape** loads a 30 m² studio. The 3D view fits it; drag to orbit,
   scroll to zoom — the camera can't dive under the floor or fly off.
2. **Plan** looks straight down, framing the whole floor.
3. Change **Corner 2 x** to `-2`: wall 2 now runs through wall 4. Both are
   drawn in red and named under the form; the saved room is still the last
   valid one. Put it back to `7` and the warning goes.
4. Clear a field: the form asks for a number and the view keeps the last
   valid room instead of going blank.
5. Reload: the room is where you left it.

## Rules

| Check | Refused as |
|---|---|
| fewer than 3 corners | `too-few-corners` |
| an empty or non-numeric value | `not-a-number` |
| two corners in the same place (to the millimetre) | `duplicate-corner` |
| a wall shorter than 1 m | `wall-too-short` |
| a room wider or deeper than 50 m | `room-too-large` |
| two walls crossing, touching or folding back over each other | `walls-intersect` + both walls |
| a ceiling outside 2–6 m | `height-out-of-range` |

Corners may run clockwise or anticlockwise. Coordinates are metres on the
floor: `x` to the right, `z` towards the viewer — the same axes as Three.js,
with `y` up.

## When 3D is not available

- **No WebGL** (disabled, blocked, no GPU): the editor works and saves; the
  view explains why it is empty.
- **Context lost** (the GPU is reclaimed by the browser): the view says so,
  the room is untouched, and **Restart the 3D view** brings it back. Tested
  in a real browser with `WEBGL_lose_context`.

## Where it is tested

- `test/domain/01-room.test.ts` — validation, geometry, camera fitting.
- `test/adapters/scene-store.test.ts` — saving, unreadable data, a full storage.
- `test/features/01-room.test.tsx`, `test/integration/01-room.test.tsx` — the
  UI in jsdom (which has no WebGL, so the fallback is covered too).

Plan uses an orthographic projection, so parallel walls remain parallel and
furniture keeps the same scale across the floor. Reset view restores the fitted
frame after zooming or panning, in both Plan and 3D.
