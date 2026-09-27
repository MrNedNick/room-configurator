export type RoomReason =
  | "too-few-corners"
  | "not-a-number"
  | "duplicate-corner"
  | "wall-too-short"
  | "room-too-large"
  | "walls-intersect"
  | "height-out-of-range";

export interface RoomError {
  kind: "room";
  reason: RoomReason;
  /** The wall (or corner) the problem is at, when there is one; for crossing walls, both. */
  walls?: number[];
}

export function roomError(reason: RoomReason, walls?: number[]): RoomError {
  return { kind: "room", reason, ...(walls ? { walls } : {}) };
}
