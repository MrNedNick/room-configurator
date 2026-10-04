import { bounds, walls, type Point, type Room } from "../01-room";
import { footprint, footprintsOverlap, type CatalogEntry, type Footprint, type Item } from "../02-catalog";
import { err, ok, type Result } from "../result";
import { measureError, type MeasureError } from "./errors";
import { MIN_PASSAGE, TOUCHING, type Clearance, type Collision, type Passage, type Side, type WallLabel } from "./types";

const round = (value: number) => Math.round(value * 1000) / 1000;

/** Each wall's length, labelled 30 cm outside its middle so the label never sits on the floor plan. */
export function wallLabels(room: Room): WallLabel[] {
  const centre = bounds(room).centre;
  return walls(room).map((wall) => {
    const middle = { x: (wall.from.x + wall.to.x) / 2, z: (wall.from.z + wall.to.z) / 2 };
    // A normal to the wall; flipped if it points towards the room's centre.
    let nx = -(wall.to.z - wall.from.z) / (wall.length || 1);
    let nz = (wall.to.x - wall.from.x) / (wall.length || 1);
    if ((centre.x - middle.x) * nx + (centre.z - middle.z) * nz > 0) {
      nx = -nx;
      nz = -nz;
    }
    return { wall: wall.index, length: round(wall.length), at: { x: round(middle.x + nx * 0.3), z: round(middle.z + nz * 0.3) } };
  });
}

const DIRECTIONS: Record<Side, Point> = { left: { x: -1, z: 0 }, right: { x: 1, z: 0 }, back: { x: 0, z: -1 }, front: { x: 0, z: 1 } };

/** How far a ray from `p` going in `d` travels before it meets a wall, or Infinity. */
function rayToWall(room: Room, p: Point, d: Point): number {
  let nearest = Infinity;
  for (const wall of walls(room)) {
    const ex = wall.to.x - wall.from.x;
    const ez = wall.to.z - wall.from.z;
    const denominator = d.x * ez - d.z * ex;
    if (Math.abs(denominator) < 1e-12) continue; // parallel
    const wx = wall.from.x - p.x;
    const wz = wall.from.z - p.z;
    const t = (wx * ez - wz * ex) / denominator;
    const s = (wx * d.z - wz * d.x) / denominator;
    if (t > -1e-9 && s >= -1e-9 && s <= 1 + 1e-9) nearest = Math.min(nearest, Math.max(0, t));
  }
  return nearest;
}

/** Corners and the middles of the edges: where a piece is nearest a wall in some direction. */
function samples(points: Footprint): Point[] {
  return points.flatMap((p, i) => {
    const q = points[(i + 1) % points.length]!;
    return [p, { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 }];
  });
}

/**
 * The free floor between a piece and the walls to its left, right, back and front (plan directions,
 * not the piece's own), each with a line to draw from the piece to the wall.
 */
export function clearances(room: Room, items: readonly Item[], catalog: readonly CatalogEntry[], itemId: string): Result<Clearance[], MeasureError> {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return err(measureError("unknown-item", itemId));
  const entry = catalog.find((candidate) => candidate.id === item.catalogId);
  if (!entry) return err(measureError("unknown-entry", item.catalogId));
  const points = samples(footprint(entry, item.transform));
  return ok(
    (Object.keys(DIRECTIONS) as Side[]).flatMap((side) => {
      const d = DIRECTIONS[side];
      // Only points on the side facing that way can reach the wall without crossing the piece itself.
      const extreme = Math.max(...points.map((p) => p.x * d.x + p.z * d.z));
      const facing = points.filter((p) => p.x * d.x + p.z * d.z >= extreme - 0.02);
      let best: Clearance | null = null;
      for (const from of facing) {
        const distance = rayToWall(room, from, d);
        if (Number.isFinite(distance) && (!best || distance < best.distance)) {
          best = { side, distance: round(distance), from: { x: round(from.x), z: round(from.z) }, to: { x: round(from.x + d.x * distance), z: round(from.z + d.z * distance) } };
        }
      }
      return best ? [best] : [];
    }),
  );
}

function footprints(items: readonly Item[], catalog: readonly CatalogEntry[]) {
  return items.flatMap((item) => {
    const entry = catalog.find((candidate) => candidate.id === item.catalogId);
    return entry ? [{ id: item.id, shape: footprint(entry, item.transform) }] : [];
  });
}

/** Every pair of pieces that stand in each other. Pieces pushed together, edge to edge, are fine. */
export function collisions(items: readonly Item[], catalog: readonly CatalogEntry[]): Collision[] {
  const shapes = footprints(items, catalog);
  const found: Collision[] = [];
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++) if (footprintsOverlap(shapes[i]!.shape, shapes[j]!.shape)) found.push({ a: shapes[i]!.id, b: shapes[j]!.id });
  return found;
}

/** The shortest distance between two convex outlines that don't overlap. */
function gapBetween(a: Footprint, b: Footprint): number {
  const toSegment = (p: Point, s: Point, e: Point) => {
    const dx = e.x - s.x;
    const dz = e.z - s.z;
    const length2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.z - s.z) * dz) / length2));
    return Math.hypot(p.x - (s.x + t * dx), p.z - (s.z + t * dz));
  };
  let best = Infinity;
  for (const [from, to] of [[a, b], [b, a]] as const)
    for (const p of from) for (let i = 0; i < to.length; i++) best = Math.min(best, toSegment(p, to[i]!, to[(i + 1) % to.length]!));
  return best;
}

/**
 * Gaps between pieces narrower than a comfortable walkway (60 cm) — but not pieces pushed together on
 * purpose, and not pieces that already overlap (those are collisions).
 */
export function narrowPassages(items: readonly Item[], catalog: readonly CatalogEntry[], minimum = MIN_PASSAGE): Passage[] {
  const shapes = footprints(items, catalog);
  const found: Passage[] = [];
  for (let i = 0; i < shapes.length; i++)
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i]!;
      const b = shapes[j]!;
      if (footprintsOverlap(a.shape, b.shape)) continue;
      const width = gapBetween(a.shape, b.shape);
      if (width > TOUCHING && width < minimum) found.push({ a: a.id, b: b.id, width: round(width) });
    }
  return found;
}

/** "2.35 m" or "45 cm": metres for room-sized lengths, centimetres for gaps. */
export function formatLength(metres: number): string {
  return metres < 1 ? `${Math.round(metres * 100)} cm` : `${(Math.round(metres * 100) / 100).toFixed(2)} m`;
}
