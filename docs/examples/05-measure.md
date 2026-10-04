# Example: dimensions and collisions

## Try it

```bash
npm run dev
```

1. Switch to **Plan**. Every wall has its length written just outside it.
2. Add a sofa and select it: dashed amber lines run from it to the nearest wall on the left, right,
   back and front, each with the free floor in centimetres or metres. The furniture panel says the
   same in words ("To the walls: left 50 cm · right 2.40 m …"), so it works without the 3D view too.
3. Add an armchair and push it into the sofa with the arrow keys. Both turn amber and the panel names
   them: "Two pieces stand in each other: Three-seat sofa and Armchair". Each name selects its piece.
4. Move the armchair away until there is less than 60 cm between them: the panel points out the
   narrow passage and its width.
5. **Dimensions** in the top bar hides the lengths and lines in the view; the choice is remembered.

## Rules

- Clearances are measured in plan directions (left is −x, back is −z), from the side of the piece that
  faces each way to the first wall in that direction — in an L-shaped room, the inner corner counts.
- Overlapping is allowed, because people do tuck chairs under tables — it is shown and named, never
  refused. Pieces pushed together edge to edge are neither a collision nor a passage.
- A gap between 1 cm and 60 cm is a narrow passage; under 1 cm the pieces count as pushed together.
- Labels and lines in the view ignore the pointer: a finger or the mouse goes through them to the
  piece or floor underneath, so dragging and orbiting are never blocked by a measurement.
- Lengths under a metre are written in centimetres, longer ones in metres to the centimetre.

## Where it lives

- `src/domain/05-measure/` — `wallLabels`, `clearances`, `collisions`, `narrowPassages`, `formatLength`.
- `src/features/05-measure/` — the summary in the furniture panel and the lengths in the view (drawn
  as sprites, no DOM inside the canvas and no font to download).
- Tests: `test/domain/05-measure.test.ts`, `test/integration/05-measure.test.tsx`.
