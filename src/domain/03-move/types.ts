import type { Metres } from "../01-room";
import type { Transform } from "../02-catalog";

export interface SnapSettings {
  /** Round positions to this step; 0 turns grid snapping off. */
  grid: Metres;
  /** Pull a piece flush against a wall when its edge comes this close; 0 turns it off. */
  wall: Metres;
}

export const DEFAULT_SNAP: SnapSettings = { grid: 0.1, wall: 0.15 };
export const NO_SNAP: SnapSettings = { grid: 0, wall: 0 };

/** Arrow-key steps: a normal press, and a fine one with Shift. */
export const NUDGE: Metres = 0.1;
export const FINE_NUDGE: Metres = 0.01;

export interface MoveResult {
  transform: Transform;
  /** What the position was pulled to, for the UI to say ("against wall 3"). */
  snapped: { kind: "wall"; wall: number } | { kind: "grid" } | null;
}
