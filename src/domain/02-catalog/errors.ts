export type CatalogReason =
  | "unknown-entry"
  | "duplicate-entry"
  | "bad-size"
  | "too-big-for-room"
  | "outside-room"
  | "no-free-spot";

export interface CatalogError {
  kind: "catalog";
  reason: CatalogReason;
  /** The catalogue entry or item concerned. */
  id?: string;
}

export function catalogError(reason: CatalogReason, id?: string): CatalogError {
  return { kind: "catalog", reason, ...(id !== undefined ? { id } : {}) };
}
