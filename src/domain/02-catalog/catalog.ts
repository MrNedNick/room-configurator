import { bounds, segmentsIntersect, walls, type Point, type Room } from "../01-room";
import { err, ok, type Result } from "../result";
import { catalogError, type CatalogError } from "./errors";
import {
  MAX_ITEM_HEIGHT,
  MAX_ITEM_SIDE,
  MIN_ITEM_SIDE,
  type CatalogEntry,
  type Footprint,
  type Item,
  type Transform,
} from "./types";

/** Checks a catalogue: unique ids and sizes in range. */
export function validateCatalog(entries: readonly CatalogEntry[]): Result<CatalogEntry[], CatalogError> {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) return err(catalogError("duplicate-entry", entry.id));
    seen.add(entry.id);
    const { width, depth, height } = entry.size;
    const side = (value: number) => Number.isFinite(value) && value >= MIN_ITEM_SIDE && value <= MAX_ITEM_SIDE;
    if (!side(width) || !side(depth) || !Number.isFinite(height) || height < MIN_ITEM_SIDE || height > MAX_ITEM_HEIGHT) {
      return err(catalogError("bad-size", entry.id));
    }
  }
  return ok([...entries]);
}

export const normaliseRotation = (degrees: number) => ((Math.round(degrees) % 360) + 360) % 360;

/** The floor outline an item covers at its transform. */
export function footprint(entry: CatalogEntry, transform: Transform): Footprint {
  const { width, depth } = entry.size;
  const angle = (normaliseRotation(transform.rotation) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local: Point[] =
    entry.shape === "cylinder"
      ? Array.from({ length: 16 }, (_, i) => {
          const t = (i / 16) * Math.PI * 2;
          return { x: (Math.cos(t) * width) / 2, z: (Math.sin(t) * depth) / 2 };
        })
      : [
          { x: -width / 2, z: -depth / 2 },
          { x: width / 2, z: -depth / 2 },
          { x: width / 2, z: depth / 2 },
          { x: -width / 2, z: depth / 2 },
        ];
  // Clockwise seen from above with z towards the viewer.
  return local.map((p) => ({ x: transform.x + p.x * cos - p.z * sin, z: transform.z + p.x * sin + p.z * cos }));
}

/** Even-odd rule; a point exactly on a wall counts as inside. */
export function pointInRoom(point: Point, room: Pick<Room, "corners">): boolean {
  let inside = false;
  const corners = room.corners;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const a = corners[i]!;
    const b = corners[j]!;
    if (a.z > point.z !== b.z > point.z) {
      const x = ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x;
      if (point.x < x) inside = !inside;
    }
  }
  return inside;
}

/**
 * Whether the whole footprint is on the floor: every corner inside, and no wall cutting through it — the
 * second check catches a sofa straddling the inner corner of an L-shaped room with all four corners
 * technically inside.
 */
export function insideRoom(footprintPoints: Footprint, room: Pick<Room, "corners">): boolean {
  if (!footprintPoints.every((p) => pointInRoom(p, room))) return false;
  // A corner of the room poking into the piece (the inner corner of an L) means a wall runs through it,
  // even when the piece's edges only graze that corner.
  if (room.corners.some((corner) => strictlyInside(corner, footprintPoints))) return false;
  for (const wall of walls(room)) {
    for (let i = 0; i < footprintPoints.length; i++) {
      const a = footprintPoints[i]!;
      const b = footprintPoints[(i + 1) % footprintPoints.length]!;
      // Touching a wall is fine (a wardrobe against it); crossing it is not.
      if (segmentsIntersect(a, b, wall.from, wall.to) && !touchesOnly(a, b, wall.from, wall.to)) return false;
    }
  }
  return true;
}

/** Inside a convex footprint and not on its outline. */
function strictlyInside(point: Point, polygon: Footprint): boolean {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const side = (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
    if (Math.abs(side) < 1e-6) return false;
    if (sign === 0) sign = Math.sign(side);
    else if (Math.sign(side) !== sign) return false;
  }
  return true;
}

function touchesOnly(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point) => (d.x - c.x) * (p.z - c.z) - (d.z - c.z) * (p.x - c.x);
  const sa = side(a);
  const sb = side(b);
  return Math.abs(sa) < 1e-6 || Math.abs(sb) < 1e-6 || Math.sign(sa) === Math.sign(sb);
}

/**
 * Whether two footprints overlap, by the separating axis theorem (footprints are convex: a rectangle or a
 * sampled ellipse). Pieces pushed together — touching along an edge or at a point — do not overlap.
 */
export function footprintsOverlap(a: Footprint, b: Footprint, tolerance = 1e-6): boolean {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i]!;
      const q = polygon[(i + 1) % polygon.length]!;
      const axis = { x: -(q.z - p.z), z: q.x - p.x };
      const project = (points: Footprint) => points.map((point) => point.x * axis.x + point.z * axis.z);
      const pa = project(a);
      const pb = project(b);
      const length = Math.hypot(axis.x, axis.z) || 1;
      const gap = Math.max(Math.min(...pa) - Math.max(...pb), Math.min(...pb) - Math.max(...pa)) / length;
      if (gap >= -tolerance) return false;
    }
  }
  return true;
}

/** Refuses a transform that would put any part of the item outside the room. */
export function checkPlacement(room: Room, entry: CatalogEntry, item: Item): Result<Item, CatalogError> {
  return insideRoom(footprint(entry, item.transform), room) ? ok(item) : err(catalogError("outside-room", item.id));
}

/**
 * Puts a new item in the room: at the centre of the room's bounding box when that spot fits (it may be
 * outside an L-shaped floor), otherwise at the spot nearest to it on a 10 cm grid. Spots clear of the
 * pieces already standing (`occupied`) win; if the floor is too full, the nearest spot on the floor is
 * used and the pieces overlap until moved. An item bigger than the room is refused outright.
 */
export function placeItem(room: Room, entry: CatalogEntry, id: string, occupied: readonly Footprint[] = []): Result<Item, CatalogError> {
  const box = bounds(room);
  const { width, depth } = entry.size;
  const fits = (w: number, d: number) => w <= box.width + 1e-9 && d <= box.depth + 1e-9;
  if (!fits(width, depth) && !fits(depth, width)) return err(catalogError("too-big-for-room", entry.id));

  const make = (x: number, z: number, rotation: number): Item => ({
    id,
    catalogId: entry.id,
    name: entry.name,
    transform: { x: Math.round(x * 1000) / 1000, z: Math.round(z * 1000) / 1000, rotation },
  });

  const step = 0.1;
  const candidates: { x: number; z: number; distance: number }[] = [];
  for (let x = box.min.x; x <= box.max.x + 1e-9; x += step) {
    for (let z = box.min.z; z <= box.max.z + 1e-9; z += step) {
      candidates.push({ x, z, distance: Math.hypot(x - box.centre.x, z - box.centre.z) });
    }
  }
  candidates.unshift({ x: box.centre.x, z: box.centre.z, distance: -1 });
  candidates.sort((a, b) => a.distance - b.distance);
  let fallback: Item | null = null;
  for (const rotation of [0, 90]) {
    for (const spot of candidates) {
      const item = make(spot.x, spot.z, rotation);
      const points = footprint(entry, item.transform);
      if (!insideRoom(points, room)) continue;
      if (occupied.every((other) => !footprintsOverlap(points, other))) return ok(item);
      fallback ??= item;
    }
  }
  return fallback ? ok(fallback) : err(catalogError("no-free-spot", entry.id));
}

/** Items whose footprint no longer fits after the room changed — shown to the user, not deleted. */
export function itemsOutside(room: Room, items: readonly Item[], catalog: readonly CatalogEntry[]): string[] {
  return items
    .filter((item) => {
      const entry = catalog.find((e) => e.id === item.catalogId);
      return !entry || !insideRoom(footprint(entry, item.transform), room);
    })
    .map((item) => item.id);
}

export function findEntry(catalog: readonly CatalogEntry[], id: string): Result<CatalogEntry, CatalogError> {
  const entry = catalog.find((e) => e.id === id);
  return entry ? ok(entry) : err(catalogError("unknown-entry", id));
}
