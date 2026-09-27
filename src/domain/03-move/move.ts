import { walls, type Point, type Room } from "../01-room";
import { catalogError, footprint, insideRoom, type CatalogEntry, type CatalogError, type Item } from "../02-catalog";
import { err, ok, type Result } from "../result";
import type { MoveResult, SnapSettings } from "./types";

const round = (value: number) => Math.round(value * 1000) / 1000;

function snapToGrid(value: number, step: number): number {
  return step > 0 ? round(Math.round(value / step) * step) : round(value);
}

/** Distance from `p` to the line through a wall, signed towards the room's inside (positive = inside). */
function distanceToWallLine(p: Point, from: Point, to: Point, inwards: number): number {
  const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  return (((to.x - from.x) * (p.z - from.z) - (to.z - from.z) * (p.x - from.x)) / length) * inwards;
}

/** +1 when corners run anticlockwise in x/z (inside is to the left of each wall), -1 otherwise. */
function winding(room: Pick<Room, "corners">): number {
  let twice = 0;
  room.corners.forEach((p, i) => {
    const q = room.corners[(i + 1) % room.corners.length]!;
    twice += p.x * q.z - q.x * p.z;
  });
  return twice > 0 ? 1 : -1;
}

/** Whether a point's projection falls within a wall segment (with a little slack at the ends). */
function alongWall(p: Point, from: Point, to: Point, slack: number): boolean {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length2 = dx * dx + dz * dz || 1;
  const t = ((p.x - from.x) * dx + (p.z - from.z) * dz) / length2;
  const margin = slack / Math.sqrt(length2);
  return t >= -margin && t <= 1 + margin;
}

/**
 * Where a piece lands when dragged to `target`: first rounded to the grid, then — if one of its edges is
 * within `settings.wall` of a wall it runs along — pushed flush against that wall. The result is a
 * suggestion; `moveItem` decides whether it is allowed.
 */
export function snapPosition(room: Room, entry: CatalogEntry, item: Item, target: Point, settings: SnapSettings): MoveResult {
  let transform = { ...item.transform, x: snapToGrid(target.x, settings.grid), z: snapToGrid(target.z, settings.grid) };
  let snapped: MoveResult["snapped"] = settings.grid > 0 ? { kind: "grid" } : null;
  if (settings.wall <= 0) return { transform, snapped };

  const inwards = winding(room);
  let best: { wall: number; shift: number } | null = null;
  for (const wall of walls(room)) {
    const points = footprint(entry, transform);
    const near = points.filter((p) => alongWall(p, wall.from, wall.to, settings.wall));
    if (near.length === 0) continue;
    // How far the nearest point of the piece is from the wall's face, on the inside.
    const gap = Math.min(...near.map((p) => distanceToWallLine(p, wall.from, wall.to, inwards)));
    if (Math.abs(gap) <= settings.wall && (best === null || Math.abs(gap) < Math.abs(best.shift))) {
      best = { wall: wall.index, shift: gap };
    }
  }
  if (best) {
    const wall = walls(room)[best.wall]!;
    const length = wall.length || 1;
    // The wall's inward normal; moving against it by `shift` closes the gap.
    const normal = { x: (-(wall.to.z - wall.from.z) / length) * inwards, z: ((wall.to.x - wall.from.x) / length) * inwards };
    transform = { ...transform, x: round(transform.x - normal.x * best.shift), z: round(transform.z - normal.z * best.shift) };
    snapped = { kind: "wall", wall: best.wall };
  }
  return { transform, snapped };
}

/** Moves a piece, refusing a position that would put any of it outside the room. */
export function moveItem(
  room: Room,
  entry: CatalogEntry,
  item: Item,
  target: Point,
  settings: SnapSettings,
): Result<{ item: Item; snapped: MoveResult["snapped"] }, CatalogError> {
  const { transform, snapped } = snapPosition(room, entry, item, target, settings);
  if (!insideRoom(footprint(entry, transform), room)) return err(catalogError("outside-room", item.id));
  return ok({ item: { ...item, transform }, snapped });
}

/** Arrow keys: step the piece along x or z, without grid rounding so fine steps stay fine. */
export function nudge(room: Room, entry: CatalogEntry, item: Item, dx: number, dz: number): Result<Item, CatalogError> {
  const transform = { ...item.transform, x: round(item.transform.x + dx), z: round(item.transform.z + dz) };
  if (!insideRoom(footprint(entry, transform), room)) return err(catalogError("outside-room", item.id));
  return ok({ ...item, transform });
}
