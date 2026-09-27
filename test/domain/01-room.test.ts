import { describe, expect, it } from "vitest";
import {
  bounds,
  cameraPreset,
  crossingWalls,
  floorArea,
  rectangularRoom,
  segmentsIntersect,
  validateRoom,
  walls,
} from "../../src/domain/01-room";
import { bowTie, lShape, living, refused } from "../fixtures/01-room/rooms";

describe("validateRoom", () => {
  it("accepts a rectangle and an L-shape, in either winding", () => {
    expect(validateRoom(living)).toMatchObject({ ok: true });
    expect(validateRoom(lShape)).toMatchObject({ ok: true });
    expect(validateRoom({ ...lShape, corners: [...lShape.corners].reverse() })).toMatchObject({ ok: true });
  });

  const cases = refused.map(([label, room, reason]) => ({ label, room, reason }));
  it.each(cases)("refuses $label with $reason", ({ room, reason }) => {
    expect(validateRoom(room)).toMatchObject({ ok: false, error: { kind: "room", reason } });
  });

  it("names the two walls that cross", () => {
    expect(validateRoom(bowTie)).toEqual({ ok: false, error: { kind: "room", reason: "walls-intersect", walls: [0, 2] } });
  });

  it("rounds to the millimetre so a room typed in centimetres reads back the same", () => {
    const result = rectangularRoom(4.2000001, 3.1499999, 2.7);
    expect(result.ok && result.value.corners[2]).toEqual({ x: 4.2, z: 3.15 });
  });

  it("is plain data that survives JSON", () => {
    const result = validateRoom(lShape);
    if (!result.ok) throw new Error(result.error.reason);
    expect(JSON.parse(JSON.stringify(result.value))).toEqual(result.value);
  });
});

describe("geometry", () => {
  it("lists walls with their lengths", () => {
    expect(walls(living).map((w) => w.length)).toEqual([4, 3, 4, 3]);
  });

  it("measures floor area and bounds", () => {
    expect(floorArea(living)).toBe(12);
    expect(floorArea(lShape)).toBe(3 * 5 + 3 * 2);
    expect(bounds(lShape)).toMatchObject({ width: 6, depth: 5, centre: { x: 3, z: 2.5 } });
  });

  it("detects crossing, touching and collinear-overlapping segments, not parallel ones", () => {
    const p = (x: number, z: number) => ({ x, z });
    expect(segmentsIntersect(p(0, 0), p(2, 2), p(0, 2), p(2, 0))).toBe(true);
    expect(segmentsIntersect(p(0, 0), p(2, 0), p(1, 0), p(3, 0))).toBe(true);
    expect(segmentsIntersect(p(0, 0), p(2, 0), p(2, 0), p(2, 2))).toBe(true);
    expect(segmentsIntersect(p(0, 0), p(2, 0), p(0, 1), p(2, 1))).toBe(false);
    expect(crossingWalls(living)).toBeNull();
  });
});

describe("cameraPreset", () => {
  const room = rectangularRoom(8, 4);
  if (!room.ok) throw new Error("room");

  it("plan view looks straight down at the centre, high enough to see the whole floor", () => {
    const plan = cameraPreset(room.value, "plan");
    expect(plan.target).toEqual([4, 0, 2]);
    expect(plan.position[0]).toBe(4);
    const halfFov = (25 * Math.PI) / 180;
    expect(plan.position[1] * Math.tan(halfFov)).toBeGreaterThanOrEqual(4);
    expect(plan.maxPolarAngle).toBe(0);
  });

  it("perspective view stays above the floor and can't orbit out of reach", () => {
    const view = cameraPreset(room.value, "perspective");
    expect(view.position[1]).toBeGreaterThan(room.value.height);
    expect(view.maxPolarAngle).toBeLessThan(Math.PI / 2);
    expect(view.minDistance).toBeLessThan(view.maxDistance);
  });
});
