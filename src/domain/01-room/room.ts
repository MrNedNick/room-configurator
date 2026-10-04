import { err, ok, type Result } from "../result";
import { roomError, type RoomError } from "./errors";
import {
  MAX_HEIGHT,
  MAX_SIDE,
  MIN_HEIGHT,
  MIN_SIDE,
  type Bounds,
  type CameraPreset,
  type CameraView,
  type Point,
  type Room,
  type Wall,
} from "./types";

/** Millimetre tolerance: two corners closer than this are the same corner. */
const EPSILON = 0.001;

export function rectangularRoom(width: number, depth: number, height = 2.7, name = "Room"): Result<Room, RoomError> {
  return validateRoom({
    name,
    height,
    corners: [
      { x: 0, z: 0 },
      { x: width, z: 0 },
      { x: width, z: depth },
      { x: 0, z: depth },
    ],
  });
}

export function walls(room: Pick<Room, "corners">): Wall[] {
  return room.corners.map((from, index) => {
    const to = room.corners[(index + 1) % room.corners.length]!;
    return { index, from, to, length: Math.hypot(to.x - from.x, to.z - from.z) };
  });
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

function onSegment(p: Point, a: Point, b: Point): boolean {
  return (
    Math.min(a.x, b.x) - EPSILON <= p.x &&
    p.x <= Math.max(a.x, b.x) + EPSILON &&
    Math.min(a.z, b.z) - EPSILON <= p.z &&
    p.z <= Math.max(a.z, b.z) + EPSILON
  );
}

/** Whether two wall segments touch or cross, collinear overlaps included. */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  if (((d1 > EPSILON && d2 < -EPSILON) || (d1 < -EPSILON && d2 > EPSILON)) && ((d3 > EPSILON && d4 < -EPSILON) || (d3 < -EPSILON && d4 > EPSILON))) {
    return true;
  }
  if (Math.abs(d1) <= EPSILON && onSegment(a1, b1, b2)) return true;
  if (Math.abs(d2) <= EPSILON && onSegment(a2, b1, b2)) return true;
  if (Math.abs(d3) <= EPSILON && onSegment(b1, a1, a2)) return true;
  if (Math.abs(d4) <= EPSILON && onSegment(b2, a1, a2)) return true;
  return false;
}

/**
 * The first pair of walls that cross, if any. Neighbouring walls share a corner by design and are only
 * reported when they fold back over each other.
 */
export function crossingWalls(room: Pick<Room, "corners">): [number, number] | null {
  const list = walls(room);
  const n = list.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = list[i]!;
      const b = list[j]!;
      const neighbours = j === i + 1 || (i === 0 && j === n - 1);
      if (neighbours) {
        // Sharing the corner is expected; running back along each other is not.
        const shared = j === i + 1 ? a.to : a.from;
        const aOther = j === i + 1 ? a.from : a.to;
        const bOther = j === i + 1 ? b.to : b.from;
        if (Math.abs(cross(shared, aOther, bOther)) <= EPSILON && (aOther.x - shared.x) * (bOther.x - shared.x) + (aOther.z - shared.z) * (bOther.z - shared.z) > 0) {
          return [i, j];
        }
        continue;
      }
      if (segmentsIntersect(a.from, a.to, b.from, b.to)) return [i, j];
    }
  }
  return null;
}

/** Floor area by the shoelace formula; positive whichever way the corners run. */
export function floorArea(room: Pick<Room, "corners">): number {
  let twice = 0;
  room.corners.forEach((p, i) => {
    const q = room.corners[(i + 1) % room.corners.length]!;
    twice += p.x * q.z - q.x * p.z;
  });
  return Math.abs(twice) / 2;
}

export function bounds(room: Pick<Room, "corners">): Bounds {
  const xs = room.corners.map((p) => p.x);
  const zs = room.corners.map((p) => p.z);
  const min = { x: Math.min(...xs), z: Math.min(...zs) };
  const max = { x: Math.max(...xs), z: Math.max(...zs) };
  return {
    min,
    max,
    width: max.x - min.x,
    depth: max.z - min.z,
    centre: { x: (min.x + max.x) / 2, z: (min.z + max.z) / 2 },
  };
}

/**
 * Checks a room outline: at least three corners, finite numbers, no corner repeated, every wall at least
 * `MIN_SIDE`, the whole room within `MAX_SIDE`, a height in range — and walls that don't cross.
 * Coordinates are rounded to the millimetre, so a room typed in centimetres reads back the same.
 */
export function validateRoom(input: Room): Result<Room, RoomError> {
  if (input.corners.length < 3) return err(roomError("too-few-corners"));
  if (!input.corners.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)) || !Number.isFinite(input.height)) {
    return err(roomError("not-a-number"));
  }
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const corners = input.corners.map((p) => ({ x: round(p.x), z: round(p.z) }));
  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      if (Math.hypot(corners[i]!.x - corners[j]!.x, corners[i]!.z - corners[j]!.z) < EPSILON) {
        return err(roomError("duplicate-corner", [i, j]));
      }
    }
  }
  for (const wall of walls({ corners })) {
    if (wall.length < MIN_SIDE - EPSILON) return err(roomError("wall-too-short", [wall.index]));
  }
  const box = bounds({ corners });
  if (box.width > MAX_SIDE + EPSILON || box.depth > MAX_SIDE + EPSILON) return err(roomError("room-too-large"));
  const crossing = crossingWalls({ corners });
  if (crossing) return err(roomError("walls-intersect", crossing));
  if (input.height < MIN_HEIGHT || input.height > MAX_HEIGHT) return err(roomError("height-out-of-range"));
  return ok({ name: input.name.trim() || "Room", corners, height: round(input.height) });
}

/**
 * Camera for a room: the plan view looks straight down from high enough to fit the whole floor — in both
 * directions, so a tall narrow viewport still shows the full width; the perspective view stands off a
 * corner above the ceiling. Orbiting is limited to a sensible range around the room so it can't be lost.
 */
export function cameraPreset(room: Room, view: CameraView, fov = 50, aspect = 1.6): CameraPreset {
  const box = bounds(room);
  const span = Math.max(box.width, box.depth);
  const tanHalf = Math.tan(((fov / 2) * Math.PI) / 180);
  // Distance at which `span` fits vertically, and horizontally given the viewport's width/height.
  const fit = Math.max(span / 2 / tanHalf, span / 2 / (tanHalf * Math.max(aspect, 0.1)));
  const target: [number, number, number] = [box.centre.x, 0, box.centre.z];
  if (view === "plan") {
    return {
      view,
      position: [box.centre.x, fit * 1.15 + room.height, box.centre.z],
      target,
      minDistance: span * 0.5,
      maxDistance: Math.max(span * 4, fit * 2),
      maxPolarAngle: 0,
    };
  }
  const distance = fit * 1.35 + span * 0.4;
  return {
    view,
    position: [box.centre.x + distance * 0.7, room.height + distance * 0.45, box.centre.z + distance * 0.7],
    target: [box.centre.x, room.height * 0.35, box.centre.z],
    minDistance: Math.max(1.5, span * 0.3),
    maxDistance: Math.max(span * 4, distance * 2),
    maxPolarAngle: Math.PI / 2 - 0.05,
  };
}

/** Pixels per metre for an orthographic plan, including space for the wall labels. */
export function planZoom(room: Room, width: number, height: number): number {
  const box = bounds(room);
  const margin = Math.max(1, Math.max(box.width, box.depth) * 0.16);
  return Math.max(0.01, Math.min(width / (box.width + margin), height / (box.depth + margin)));
}
