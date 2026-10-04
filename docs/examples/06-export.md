# Example: saving, exporting and opening a room

## Try it

```bash
npm run dev
```

1. Furnish a room, then under **Save & export** press **Floor plan (SVG)**: you get
   `living-room-plan.svg` — the floor to scale (1 m = 100 px), every wall with its length, every
   piece as its footprint in its finish with its name, the floor area and ceiling height, and a 1 m
   scale bar. It opens in any browser and prints sharp.
2. **Room file (JSON)** saves everything — the room, the furniture, finishes and light — to
   `living-room-scene.json`.
3. **Open a room file…** reads one back. Over an empty room it opens straight away; over a furnished
   one it asks first: **Replace** or **Keep the current room**. Either way, the room you end up with is
   saved in the browser as usual.

## Rules

- A file is checked before anything is replaced, and the reason is given when it can't be opened: not
  a room file at all, a different kind of file, saved by a newer version, damaged furniture, or **a room
  whose walls cross** — named, for example "wall 1 and wall 3". The current room stays as it was.
- Files from earlier versions (before furniture, before finishes) open with the default floor, walls and
  daylight.
- While the walls in the form cross, the files use the last valid room — the one shown in the view —
  and the panel says so. A plan of a bow-tie is never drawn.
- Wall lengths are written outside the floor, also around the inner corner of an L.

## Where it lives

- `src/domain/06-export/` — `planSvg`, `planFileName` and the errors of reading a file.
- `src/adapters/scene-store.ts` — `parseScene` (used for the saved room and for opened files alike)
  and `sceneJson`.
- `src/features/06-export/ExportPanel.tsx` — the panel under the room form.
- Tests: `test/domain/06-export.test.ts`, `test/integration/06-export.test.tsx`.
