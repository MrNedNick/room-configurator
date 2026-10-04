import type { Metres, Point } from "../01-room";

export type Category = "seating" | "tables" | "storage" | "beds" | "lighting" | "decor";

/**
 * A piece of furniture as the catalogue offers it. Shapes are simple solids drawn from their size, so a
 * room of fifty pieces stays light — no downloaded models.
 */
export interface CatalogEntry {
  id: string;
  name: string;
  category: Category;
  /** Width (x), depth (z) and height (y) when not rotated. */
  size: { width: Metres; depth: Metres; height: Metres };
  shape: "box" | "cylinder";
  colour: string;
}

/** Where a placed piece stands: its centre on the floor and a turn about the vertical axis. */
export interface Transform {
  x: Metres;
  z: Metres;
  /** Degrees, clockwise seen from above, normalised to [0, 360). */
  rotation: number;
}

/** A piece placed in the room. */
export interface Item {
  id: string;
  catalogId: string;
  name: string;
  transform: Transform;
  /** A finish from the materials palette; without one the piece shows its catalogue colour. */
  materialId?: string;
}

/** The floor outline an item covers: four corners for a box, a sampled circle for a cylinder. */
export type Footprint = Point[];

/** A catalogue piece can't be taller than the tallest room, nor wider than a big hall. */
export const MAX_ITEM_SIDE: Metres = 10;
export const MAX_ITEM_HEIGHT: Metres = 6;
export const MIN_ITEM_SIDE: Metres = 0.05;
