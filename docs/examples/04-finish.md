# Example: finishes and light

## Try it

```bash
npm run dev
```

1. In **Finish & light**, pick a floor (oak, walnut, tiles, concrete, carpet) and a wall colour. The
   view changes at once; the walls stay see-through so the room can still be looked into.
2. Select a piece and give it a finish — fabric, linen, leather, oak, lacquer or black metal — or put
   it back to **As in the catalogue**. Metal reads shiny, fabric matte: each finish carries its own
   roughness, not just a colour.
3. Switch the **time of day**. Morning light comes low from one side and warm; evening is low, orange
   and dim; at night the room is dark except for its lamps.
4. Add a **Floor lamp**: with **Lamps in the room are on**, it glows and lights the floor and
   furniture around it. Untick the box to switch every lamp off.
5. Reload: floor, walls, every piece's finish, the time of day and the lamps come back as they were.

## Rules

- A finish belongs to one surface: floor boards can't go on a wall, wall paint can't go on a sofa.
  The palette is checked when a choice is made and when a saved room is read.
- Lamps from the catalogue light the room only when they are switched on, from near their top.
- **A heavy room** stays smooth: only the first 4 lamps cast real light — the rest glow without
  lighting anything — and with more than 40 pieces shadows are switched off. The panel says when
  either happens.
- A room saved before finishes existed opens with oak floor, warm white walls and daylight. A finish
  the palette no longer has falls back to the default, because it is decoration — the layout itself
  is never touched.
- Without WebGL every choice still works and is saved; only the drawing waits.

## Where it lives

- `src/domain/04-finish/` — the palette, room and piece finishes, reading saved values, and
  `lightRig`, which works out every light from the room, the pieces and the time of day.
- `src/features/04-finish/FinishPanel.tsx` — the panel.
- `src/adapters/scene-store.ts` — scene version 3, reading versions 1 and 2.
- Tests: `test/domain/04-finish.test.ts`, `test/integration/04-finish.test.tsx`.
