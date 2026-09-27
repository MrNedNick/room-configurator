import type { Room } from "../../../src/domain/01-room";

const room = (corners: [number, number][], height = 2.7): Room => ({
  name: "Test",
  height,
  corners: corners.map(([x, z]) => ({ x, z })),
});

/** A 4 × 3 m living room. */
export const living = room([[0, 0], [4, 0], [4, 3], [0, 3]]);

/** An L-shaped flat, corners running the other way round. */
export const lShape = room([[0, 0], [0, 5], [3, 5], [3, 2], [6, 2], [6, 0]]);

/** A bow-tie: two walls cross in the middle — the "пересечение стен" case. */
export const bowTie = room([[0, 0], [4, 3], [4, 0], [0, 3]]);

/** A wall doubling back on the previous one. */
export const foldedBack = room([[0, 0], [4, 0], [2, 0], [2, 3]]);

/** Outlines that must be refused, and why. */
export const refused: ReadonlyArray<readonly [label: string, room: Room, reason: string]> = [
  ["two corners", room([[0, 0], [4, 0]]), "too-few-corners"],
  ["a missing number", room([[0, 0], [Number.NaN, 0], [4, 3]]), "not-a-number"],
  ["a repeated corner", room([[0, 0], [4, 0], [4, 0], [0, 3]]), "duplicate-corner"],
  ["a 40 cm wall", room([[0, 0], [4, 0], [4, 0.4], [0, 0.4]]), "wall-too-short"],
  ["a 60 m hall", room([[0, 0], [60, 0], [60, 3], [0, 3]]), "room-too-large"],
  ["crossing walls", bowTie, "walls-intersect"],
  ["a wall folding back", foldedBack, "walls-intersect"],
  ["a 1.5 m ceiling", room([[0, 0], [4, 0], [4, 3], [0, 3]], 1.5), "height-out-of-range"],
];
