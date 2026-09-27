# Example: the furniture catalogue

## Try it

```bash
npm run dev
```

1. Start from **L-shape**, then **Add** a sofa, a round coffee table, a
   double bed and a bookcase. Each goes to the free spot nearest the middle
   of the room — pushed up against the others at most, never inside them,
   and on the floor even though the middle of an L's bounding box is outside
   it.
2. **⟳ 90°** turns a piece in place. Near a wall, where the turned piece
   wouldn't fit, the turn is refused with a reason instead of pushing it
   through the wall.
3. Move **Corner 2 x** and **Corner 3 x** in to `4`: the sofa now sticks
   through the wall. It turns red, the list says one piece is outside, and
   it is not deleted — move the wall back and it is fine again.
4. Reload: the room and every piece are where you left them.

## Rules

- Sizes are real ones in metres (a 2.1 × 0.9 m sofa, a 1.6 × 2.1 m bed).
  Pieces are drawn as boxes and cylinders from their size — no downloaded
  models, so a furnished room stays light; that is also this milestone's
  answer to "a heavy model".
- **On the floor** means every point of the piece's outline is inside the
  room *and* no wall runs through it — the second check catches a piece
  straddling the inner corner of an L with all four corners technically
  on the floor.
- **Not overlapping** is checked with the separating axis theorem on the
  (convex) outlines; touching along an edge is allowed.
- A piece bigger than the room in both orientations is refused
  ("too-big-for-room"); if the floor is full, the nearest spot on the floor
  is used and the pieces overlap until moved.
- Scenes are saved as `{ version: 2, room, items }`; a version 1 save (a room
  without furniture) opens as an empty room.

## Touch and WebGL

The 3D view takes one-finger rotate, two-finger zoom and pan through
OrbitControls, with `touch-action: none` on the canvas so the page doesn't
scroll instead. Without WebGL, or after the browser takes the context back,
the catalogue and lists keep working.

## Where it is tested

- `test/domain/02-catalog.test.ts` — the catalogue, footprints, inside/outside,
  overlap, placement.
- `test/adapters/scene-store.test.ts` — version 1 → 2, items read back.
- `test/integration/02-catalog.test.tsx` — the scenario above and its edge
  cases through the real UI, together with stage 1's crossing walls.
