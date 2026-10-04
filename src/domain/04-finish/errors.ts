export type FinishReason = "unknown-material" | "wrong-surface" | "unknown-item" | "bad-lighting";

export interface FinishError {
  kind: "finish";
  reason: FinishReason;
  /** The material or item concerned. */
  id?: string;
}

export function finishError(reason: FinishReason, id?: string): FinishError {
  return { kind: "finish", reason, ...(id !== undefined ? { id } : {}) };
}
