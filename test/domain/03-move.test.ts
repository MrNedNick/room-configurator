import { describe, expect, it } from "vitest";
import { validateRoom, type Room } from "../../src/domain/01-room";
import { footprint, insideRoom, type Item } from "../../src/domain/02-catalog";
import { DEFAULT_SNAP, moveItem, NO_SNAP, nudge, snapPosition } from "../../src/domain/03-move";
import { living, lShape } from "../fixtures/01-room/rooms";
import { sofa, table } from "../fixtures/02-catalog/items";

const valid = (room: Room) => {
  const result = validateRoom(room);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
};

const room = valid(living); // 4 × 3 m
const at = (x: number, z: number, rotation = 0): Item => ({ id: "s", catalogId: "sofa", name: "Sofa", transform: { x, z, rotation } });

describe("snapPosition", () => {
  it("rounds to the grid, or not at all with snapping off", () => {
    expect(snapPosition(room, table, at(2, 1.5), { x: 2.03, z: 1.47 }, { grid: 0.1, wall: 0 }).transform).toMatchObject({ x: 2, z: 1.5 });
    expect(snapPosition(room, table, at(2, 1.5), { x: 2.03, z: 1.47 }, NO_SNAP).transform).toMatchObject({ x: 2.03, z: 1.47 });
  });

  it("pulls a piece flush against a wall it comes within reach of", () => {
    // Sofa is 2 × 1; its back edge at z = 0.08 is 8 cm off the wall z = 0.
    const moved = snapPosition(room, sofa, at(2, 1.5), { x: 2, z: 0.58 }, { grid: 0, wall: 0.15 });
    expect(moved.transform.z).toBeCloseTo(0.5);
    expect(moved.snapped).toEqual({ kind: "wall", wall: 0 });
  });

  it("pulls it back in when it pokes slightly through a wall", () => {
    const moved = snapPosition(room, sofa, at(2, 1.5), { x: 3.1, z: 1.5 }, { grid: 0, wall: 0.15 });
    expect(moved.transform.x).toBeCloseTo(3);
    expect(insideRoom(footprint(sofa, moved.transform), room)).toBe(true);
  });

  it("leaves a piece in the middle of the room alone", () => {
    expect(snapPosition(room, sofa, at(2, 1.5), { x: 2, z: 1.5 }, { grid: 0, wall: 0.15 }).snapped).toBeNull();
  });

  it("snaps to the walls of the inner corner of an L-shape too", () => {
    const l = valid(lShape); // inner corner at (3, 2)
    const moved = snapPosition(l, table, { ...at(1, 1), catalogId: "table" }, { x: 3.55, z: 1.4 }, { grid: 0, wall: 0.15 });
    expect(moved.snapped?.kind).toBe("wall");
  });
});

describe("moveItem", () => {
  it("moves within the room and says what it snapped to", () => {
    expect(moveItem(room, sofa, at(2, 1.5), { x: 1.03, z: 2.47 }, DEFAULT_SNAP)).toMatchObject({ ok: true, value: { item: { transform: { x: 1, z: 2.5 } } } });
  });

  it("refuses a drop outside the room — the 'объект вне комнаты' case — and the piece keeps its place", () => {
    const item = at(2, 1.5);
    expect(moveItem(room, sofa, item, { x: 5, z: 1.5 }, DEFAULT_SNAP)).toEqual({ ok: false, error: { kind: "catalog", reason: "outside-room", id: "s" } });
    expect(item.transform).toEqual({ x: 2, z: 1.5, rotation: 0 });
  });
});

describe("nudge", () => {
  it("steps without grid rounding, and stops at a wall", () => {
    expect(nudge(room, sofa, at(2, 1.5), 0.01, 0)).toMatchObject({ ok: true, value: { transform: { x: 2.01 } } });
    expect(nudge(room, sofa, at(3, 1.5), 0.1, 0)).toMatchObject({ ok: false, error: { reason: "outside-room" } });
  });
});
