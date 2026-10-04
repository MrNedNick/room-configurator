import { describe, expect, it } from "vitest";
import { validateRoom, type Room } from "../../src/domain/01-room";
import { FURNITURE } from "../../src/domain/02-catalog";
import { clearances, collisions, formatLength, narrowPassages, wallLabels } from "../../src/domain/05-measure";
import { living, lShape } from "../fixtures/01-room/rooms";
import { crowdedCorner, pushedTogether, sofaOnly } from "../fixtures/05-measure/layouts";

const valid = (room: Room) => {
  const result = validateRoom(room);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
};
const room = valid(living);

describe("wall labels", () => {
  it("gives every wall its length, written just outside the room", () => {
    const labels = wallLabels(room);
    expect(labels.map((label) => label.length)).toEqual([4, 3, 4, 3]);
    expect(labels[0]!.at).toEqual({ x: 2, z: -0.3 });
    expect(labels[1]!.at).toEqual({ x: 4.3, z: 1.5 });
  });

  it("works for an L whose corners run the other way, inner walls included", () => {
    const labels = wallLabels(valid(lShape));
    expect(labels.map((label) => label.length)).toEqual([5, 3, 3, 3, 2, 6]);
    // The inner wall from (3,5) to (3,2) is labelled on the open side, at x > 3.
    expect(labels[2]!.at.x).toBeCloseTo(3.3);
  });

  it("labels the inner walls of an L outside the floor, whichever way the corners run", () => {
    // The studio preset: the notch is the square x 3–7, z 3–6.
    const studio = valid({ name: "Studio", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 7, z: 0 }, { x: 7, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 6 }, { x: 0, z: 6 }] });
    const labels = wallLabels(studio);
    expect(labels[2]!.at).toEqual({ x: 5, z: 3.3 }); // wall (7,3)→(3,3): label below it, in the notch
    expect(labels[3]!.at).toEqual({ x: 3.3, z: 4.5 }); // wall (3,3)→(3,6): label to its right
    expect(labels[0]!.at).toEqual({ x: 3.5, z: -0.3 });
    const reversed = valid({ ...studio, corners: [...studio.corners].reverse() });
    expect(wallLabels(reversed).map((label) => label.at)).toEqual(expect.arrayContaining([{ x: 5, z: 3.3 }, { x: 3.3, z: 4.5 }]));
  });
});

describe("clearances", () => {
  it("measures the free floor to the wall on each side of a piece", () => {
    const result = clearances(room, sofaOnly, FURNITURE, "sofa");
    expect(result.ok).toBe(true);
    const by = Object.fromEntries((result.ok ? result.value : []).map((c) => [c.side, c.distance]));
    expect(by).toEqual({ left: 0.5, right: 1.4, back: 0, front: 2.1 });
  });

  it("draws each line from the piece to the wall", () => {
    const result = clearances(room, sofaOnly, FURNITURE, "sofa");
    const left = result.ok ? result.value.find((c) => c.side === "left")! : null;
    expect(left?.to.x).toBe(0);
    expect(left?.from.x).toBe(0.5);
  });

  it("in an L, the gap is to the nearest wall in that direction — the inner corner counts", () => {
    const l = valid(lShape);
    const result = clearances(l, [{ id: "c", catalogId: "chair", name: "c", transform: { x: 1, z: 4, rotation: 0 } }], FURNITURE, "c");
    const right = result.ok ? result.value.find((c) => c.side === "right")! : null;
    expect(right?.distance).toBeCloseTo(3 - 1 - 0.225);
  });

  it("names what is missing", () => {
    expect(clearances(room, sofaOnly, FURNITURE, "ghost")).toEqual({ ok: false, error: { kind: "measure", reason: "unknown-item", id: "ghost" } });
    expect(clearances(room, [{ ...sofaOnly[0]!, catalogId: "throne" }], FURNITURE, "sofa")).toMatchObject({ ok: false, error: { reason: "unknown-entry" } });
  });
});

describe("collisions and passages", () => {
  it("finds pieces standing in each other, and a gap too narrow to walk through", () => {
    expect(collisions(crowdedCorner, FURNITURE)).toEqual([{ a: "sofa", b: "armchair" }]);
    expect(narrowPassages(crowdedCorner, FURNITURE)).toEqual([{ a: "armchair", b: "chair", width: 0.4 }]);
  });

  it("pieces pushed together on purpose are neither", () => {
    expect(collisions(pushedTogether, FURNITURE)).toEqual([]);
    expect(narrowPassages(pushedTogether, FURNITURE)).toEqual([]);
  });
});

it("writes lengths as people say them", () => {
  expect([formatLength(0.4), formatLength(0.05), formatLength(2.1), formatLength(4)]).toEqual(["40 cm", "5 cm", "2.10 m", "4.00 m"]);
});
