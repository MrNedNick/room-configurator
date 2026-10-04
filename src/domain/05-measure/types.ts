import type { Metres, Point } from "../01-room";

/** A wall's length, with where to write it: just outside the middle of the wall. */
export interface WallLabel {
  wall: number;
  length: Metres;
  at: Point;
}

/** The four directions on the floor plan: −x, +x, −z (the far wall in the plan), +z (the near one). */
export type Side = "left" | "right" | "back" | "front";

/** The free floor between a piece and the nearest wall on one side, and the line that shows it. */
export interface Clearance {
  side: Side;
  distance: Metres;
  from: Point;
  to: Point;
}

/** Two pieces that stand in each other. */
export interface Collision {
  a: string;
  b: string;
}

/** Below this, a gap between two pieces is too narrow to walk through comfortably. */
export const MIN_PASSAGE: Metres = 0.6;
/** Gaps under a centimetre count as pieces pushed together on purpose, not a passage. */
export const TOUCHING: Metres = 0.01;

/** A gap between two pieces that a person would have to squeeze through. */
export interface Passage {
  a: string;
  b: string;
  width: Metres;
}
