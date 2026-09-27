import { describe, expect, it } from "vitest";
import {
  checkPlacement,
  findEntry,
  footprint,
  footprintsOverlap,
  FURNITURE,
  insideRoom,
  itemsOutside,
  normaliseRotation,
  placeItem,
  pointInRoom,
  validateCatalog,
} from "../../src/domain/02-catalog";
import { validateRoom, type Room } from "../../src/domain/01-room";
import { living, lShape } from "../fixtures/01-room/rooms";
import { hall, sofa, table } from "../fixtures/02-catalog/items";

const valid = (room: Room) => {
  const result = validateRoom(room);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
};

describe("catalogue", () => {
  it("the built-in catalogue is valid", () => {
    expect(validateCatalog(FURNITURE)).toMatchObject({ ok: true });
  });

  it("refuses duplicates and impossible sizes", () => {
    expect(validateCatalog([sofa, sofa])).toMatchObject({ ok: false, error: { reason: "duplicate-entry", id: "sofa" } });
    expect(validateCatalog([{ ...sofa, size: { width: 0, depth: 1, height: 1 } }])).toMatchObject({ ok: false, error: { reason: "bad-size" } });
    expect(validateCatalog([{ ...sofa, size: { width: 1, depth: 1, height: 9 } }])).toMatchObject({ ok: false, error: { reason: "bad-size" } });
    expect(findEntry(FURNITURE, "piano")).toEqual({ ok: false, error: { kind: "catalog", reason: "unknown-entry", id: "piano" } });
  });
});

describe("footprint", () => {
  it("turns with the item: a 2 × 1 sofa at 90° covers 1 × 2", () => {
    const points = footprint(sofa, { x: 2, z: 2, rotation: 90 });
    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(2);
  });

  it("normalises rotations", () => {
    expect(normaliseRotation(-90)).toBe(270);
    expect(normaliseRotation(450)).toBe(90);
  });
});

describe("inside the room — the 'объект вне комнаты' edge case", () => {
  const room = valid(living);
  const l = valid(lShape);

  it("knows inside from outside, including the missing corner of an L", () => {
    expect(pointInRoom({ x: 2, z: 1.5 }, room)).toBe(true);
    expect(pointInRoom({ x: 5, z: 1 }, room)).toBe(false);
    expect(pointInRoom({ x: 5, z: 4 }, l)).toBe(false);
    expect(pointInRoom({ x: 1, z: 4 }, l)).toBe(true);
  });

  it("an item against a wall is inside; one poking through it is not", () => {
    expect(insideRoom(footprint(sofa, { x: 1, z: 0.5, rotation: 0 }), room)).toBe(true);
    expect(insideRoom(footprint(sofa, { x: 0.8, z: 0.5, rotation: 0 }), room)).toBe(false);
    expect(checkPlacement(room, sofa, { id: "s", catalogId: "sofa", name: "Sofa", transform: { x: 3.5, z: 1.5, rotation: 0 } })).toEqual({
      ok: false,
      error: { kind: "catalog", reason: "outside-room", id: "s" },
    });
  });

  it("an item straddling the inner corner of an L is outside even with its corners on the floor", () => {
    // A ~1 m square turned 45° next to the inner corner (3, 2): all four corners are on the floor, but
    // the edge between two of them cuts through both walls of the missing corner.
    const square = { ...sofa, size: { width: 0.99, depth: 0.99, height: 1 } };
    const points = footprint(square, { x: 2.7, z: 1.7, rotation: 45 });
    expect(points.every((p) => pointInRoom(p, l))).toBe(true);
    expect(insideRoom(points, l)).toBe(false);
  });
});

describe("placeItem", () => {
  it("puts a new item at the centre when it fits", () => {
    expect(placeItem(valid(living), sofa, "i1")).toEqual({
      ok: true,
      value: { id: "i1", catalogId: "sofa", name: "Sofa", transform: { x: 2, z: 1.5, rotation: 0 } },
    });
  });

  it("moves it onto the floor when the centre of an L-shape is outside it", () => {
    const l = valid(lShape);
    const placed = placeItem(l, table, "i2");
    expect(placed.ok).toBe(true);
    if (placed.ok) expect(insideRoom(footprint(table, placed.value.transform), l)).toBe(true);
  });

  it("puts the next piece beside the first instead of on top of it", () => {
    const room = valid(living);
    const first = placeItem(room, sofa, "a");
    if (!first.ok) throw new Error("first");
    const second = placeItem(room, sofa, "b", [footprint(sofa, first.value.transform)]);
    if (!second.ok) throw new Error("second");
    expect(footprintsOverlap(footprint(sofa, first.value.transform), footprint(sofa, second.value.transform))).toBe(false);
  });

  it("overlap: crossing or containing overlaps, pushed together does not", () => {
    const at = (x: number, z: number) => footprint(sofa, { x, z, rotation: 0 });
    expect(footprintsOverlap(at(2, 2), at(2.5, 2.3))).toBe(true);
    expect(footprintsOverlap(at(2, 2), at(4, 2))).toBe(false);
    expect(footprintsOverlap(at(2, 2), at(2, 2))).toBe(true);
  });

  it("overlap: a round table half inside a bed is caught even with its outline vertices on the bed's edge", () => {
    const bed = { ...sofa, size: { width: 1.6, depth: 2.1, height: 0.5 } };
    const bedAt = footprint(bed, { x: 1.7, z: 4, rotation: 0 });
    const tableAt = footprint(table, { x: 2.5, z: 3.4, rotation: 0 });
    expect(footprintsOverlap(bedAt, tableAt)).toBe(true);
    expect(footprintsOverlap(bedAt, footprint(table, { x: 3, z: 3.4, rotation: 0 }))).toBe(false);
  });

  it("refuses an item bigger than the room", () => {
    expect(placeItem(valid(living), hall, "i3")).toEqual({ ok: false, error: { kind: "catalog", reason: "too-big-for-room", id: "hall" } });
  });

  it("lists items left outside after the room shrinks, without deleting them", () => {
    const placed = placeItem(valid(living), sofa, "i4");
    if (!placed.ok) throw new Error("place");
    const smaller = valid({ ...living, corners: [{ x: 0, z: 0 }, { x: 2.5, z: 0 }, { x: 2.5, z: 3 }, { x: 0, z: 3 }] });
    expect(itemsOutside(smaller, [placed.value], [sofa])).toEqual(["i4"]);
  });
});
