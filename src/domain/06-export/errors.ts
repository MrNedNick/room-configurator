import type { RoomReason } from "../01-room";

export type ExportReason = "not-json" | "not-a-scene" | "newer-version" | "room-invalid" | "items-invalid";

export interface ExportError {
  kind: "export";
  reason: ExportReason;
  /** For an invalid room: what is wrong with it, and the walls involved (crossing walls name both). */
  room?: RoomReason;
  walls?: number[];
}

export function exportError(reason: ExportReason, detail: Pick<ExportError, "room" | "walls"> = {}): ExportError {
  return { kind: "export", reason, ...detail };
}
