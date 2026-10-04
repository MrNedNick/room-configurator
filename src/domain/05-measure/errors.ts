export type MeasureReason = "unknown-item" | "unknown-entry";

export interface MeasureError {
  kind: "measure";
  reason: MeasureReason;
  id?: string;
}

export function measureError(reason: MeasureReason, id?: string): MeasureError {
  return { kind: "measure", reason, ...(id !== undefined ? { id } : {}) };
}
