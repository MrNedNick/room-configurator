# Example: moving pieces and snapping

## Try it

```bash
npm run dev
```

1. Add a sofa, switch to **Plan**, and drag it towards a wall. It moves in
   10 cm steps and, once its back is within 15 cm of the wall, it is pulled
   flush against it — the panel says "Pushed against wall 2".
2. Keep dragging past the wall: the sofa turns red. Let go there and it goes
   back to where it was.
3. With the sofa selected, the **arrow keys** move it 10 cm (**Shift** for
   1 cm); **R** turns it; **Delete** removes it; **Escape** lets go. A move
   that would hit a wall is refused with a reason.
4. Type an exact position in **x, m** / **z, m**: typed numbers are used as
   they are, without the grid.
5. Untick **Snap to a 10 cm grid and to walls** for free dragging; the choice
   is remembered.

## Rules

- A drag is snapped first to the grid, then — if an edge of the piece runs
  along a wall within 15 cm — flush against that wall, on either side (a
  piece poking slightly through is pulled back in). The walls of an L's
  inner corner count too.
- Every move — drag, arrow key or typed number — is checked the same way as
  placing a piece: all of it on the floor, no wall through it. Refused moves
  leave the piece where it was.
- While a piece is dragged the camera stops orbiting, so one finger (touch)
  or the mouse moves the piece rather than the view; the canvas has
  `touch-action: none`.

## Without WebGL

Arrow keys and the typed position don't need the 3D view, so furniture can
still be arranged when WebGL is off or the context was lost — which is how
the integration test runs, in jsdom.

## Where it is tested

- `test/domain/03-move.test.ts` — grid, wall snapping (inside, outside, the
  inner corner of an L), refused drops, arrow-key steps.
- `test/integration/03-move.test.tsx` — keys, typed positions, the snapping
  preference, refused moves and stage 2's "outside the room", with no WebGL.
