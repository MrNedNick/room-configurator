import type { CatalogEntry } from "../../../src/domain/02-catalog";

export const sofa: CatalogEntry = { id: "sofa", name: "Sofa", category: "seating", size: { width: 2, depth: 1, height: 0.8 }, shape: "box", colour: "#777" };
export const table: CatalogEntry = { id: "table", name: "Round table", category: "tables", size: { width: 1, depth: 1, height: 0.75 }, shape: "cylinder", colour: "#999" };
export const hall: CatalogEntry = { id: "hall", name: "Stage", category: "decor", size: { width: 9, depth: 9, height: 1 }, shape: "box", colour: "#555" };
