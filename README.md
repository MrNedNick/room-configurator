# Room configurator

Draw a room from its corners, furnish it from a catalogue, and look at it in
3D or as a floor plan. Next: moving pieces with snapping, then dimensions.

**React 19 · Three.js through React Three Fiber · TypeScript · Vite · Vitest**

## Why this stack

A 3D scene is the part of front-end work most portfolios skip. React Three
Fiber keeps it declarative — walls and floor are components derived from the
room, not objects mutated by hand — while the geometry that matters (wall
lengths, crossing walls, floor area, camera fitting) is plain TypeScript in
`src/domain/`, tested without a GPU.

## What works today

- **A room from its corners** — start from a rectangle or an L-shape, then
  edit any corner, add or remove corners, and set the ceiling height. Sizes
  are in metres, rounded to the millimetre.
- **Walls that cross are caught** — the two walls are drawn in red and named
  ("Wall 2 crosses wall 4"); the last valid room stays saved. So are rooms
  with fewer than three corners, walls under 1 m, repeated corners, rooms
  over 50 m and ceilings outside 2–6 m.
- **3D and plan views** — the camera is fitted to the room; orbiting is
  limited so the room can't be lost, and the plan view looks straight down.
- **Furniture from a catalogue** — ten real-sized pieces; each new one goes to
  the nearest free spot on the floor, clear of the others. Turn pieces a
  quarter at a time (refused where the turn would hit a wall) or remove
  them. After a room change, pieces left sticking through a wall turn red
  and are listed — never silently deleted.
- **Kept between visits** — the room is saved in the browser. Saved data that
  no longer reads is not overwritten: the page says so and keeps it aside
  before starting over.
- **When 3D isn't available** — without WebGL the editor still works; if the
  browser takes the graphics context back, the view says so and restarts on
  request. Three.js is loaded after the editor, which is usable first.

## Run it

Requires Node 22 (`.nvmrc`).

```bash
npm install
npm run dev
npm test          # domain, storage and UI tests (Vitest, jsdom)
npm run typecheck
npm run lint      # oxlint
npm run build
```

Walkthroughs with the rules and edge cases: [a room and the camera](docs/examples/01-room.md),
[the furniture catalogue](docs/examples/02-catalog.md).

## Layout

```
src/domain/    rooms, walls, geometry, camera presets — no React, no Three.js
src/adapters/  where the scene is saved
src/features/  the editor and the 3D view
test/          domain, adapter and feature tests + fixtures
```
