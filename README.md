# Room configurator

Draw a room from its corners, furnish it from a catalogue, choose floors, wall
colours and finishes, set the light, and look at it in 3D or as a floor plan
with every length written on it — moving pieces by dragging, keys or exact
numbers. Next: saving and exporting the plan.

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
- **Moving with snapping** — drag a piece over the floor in 10 cm steps; near
  a wall it is pulled flush against it. Arrow keys (Shift for 1 cm), R to
  turn, Delete, Escape, or an exact position typed in — all of them work
  without the 3D view. A move through a wall is refused and the piece stays.
- **Finishes and light** — five floors, four wall colours and six furniture
  finishes, each with its own roughness and sheen; morning, day, evening and
  night light; lamps from the catalogue glow and light the room around them.
  A crowded room stays smooth: only four lamps cast real light and shadows go
  off past 40 pieces — and the panel says so.
- **Dimensions and collisions** — wall lengths around the plan; for the
  selected piece, dashed lines to the nearest wall on each side with the free
  floor written on them. Pieces standing in each other turn amber and are
  named; gaps under 60 cm are pointed out as too narrow to walk through. All
  of it is also written in the panel, so it works without 3D.
- **Kept between visits** — the room, its furniture, finishes and light are
  saved in the browser; rooms saved by earlier versions open with defaults.
  Saved data that no longer reads is not overwritten: the page says so and
  keeps it aside before starting over.
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
[the furniture catalogue](docs/examples/02-catalog.md),
[moving and snapping](docs/examples/03-move.md),
[finishes and light](docs/examples/04-finish.md),
[dimensions and collisions](docs/examples/05-measure.md).

## Layout

```
src/domain/    rooms, walls, geometry, camera presets — no React, no Three.js
src/adapters/  where the scene is saved
src/features/  the editor and the 3D view
test/          domain, adapter and feature tests + fixtures
```
