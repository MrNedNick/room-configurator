import type { CatalogEntry } from "./types";

/** The built-in catalogue, sized like common real pieces. */
export const FURNITURE: CatalogEntry[] = [
  { id: "sofa-3", name: "Three-seat sofa", category: "seating", size: { width: 2.1, depth: 0.9, height: 0.85 }, shape: "box", colour: "#6b7c93" },
  { id: "armchair", name: "Armchair", category: "seating", size: { width: 0.85, depth: 0.85, height: 0.9 }, shape: "box", colour: "#8a6f5a" },
  { id: "dining-table", name: "Dining table", category: "tables", size: { width: 1.6, depth: 0.9, height: 0.75 }, shape: "box", colour: "#b08a5f" },
  { id: "coffee-table", name: "Round coffee table", category: "tables", size: { width: 0.8, depth: 0.8, height: 0.42 }, shape: "cylinder", colour: "#c9a77c" },
  { id: "chair", name: "Chair", category: "seating", size: { width: 0.45, depth: 0.5, height: 0.9 }, shape: "box", colour: "#7a6a58" },
  { id: "bookcase", name: "Bookcase", category: "storage", size: { width: 0.8, depth: 0.3, height: 2 }, shape: "box", colour: "#e3dccf" },
  { id: "wardrobe", name: "Wardrobe", category: "storage", size: { width: 1.5, depth: 0.6, height: 2.2 }, shape: "box", colour: "#d8d0c2" },
  { id: "double-bed", name: "Double bed", category: "beds", size: { width: 1.6, depth: 2.1, height: 0.5 }, shape: "box", colour: "#a7b4c2" },
  { id: "floor-lamp", name: "Floor lamp", category: "lighting", size: { width: 0.35, depth: 0.35, height: 1.6 }, shape: "cylinder", colour: "#f0d9a0" },
  { id: "plant", name: "Plant", category: "decor", size: { width: 0.5, depth: 0.5, height: 1.1 }, shape: "cylinder", colour: "#5f8f5a" },
];

export const CATEGORY_LABELS: Record<CatalogEntry["category"], string> = {
  seating: "Seating",
  tables: "Tables",
  storage: "Storage",
  beds: "Beds",
  lighting: "Lighting",
  decor: "Decor",
};
