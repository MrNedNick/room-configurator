import type { Item } from "../../../src/domain/02-catalog";

const piece = (id: string, catalogId: string, x: number, z: number): Item => ({ id, catalogId, name: catalogId, transform: { x, z, rotation: 0 } });

/** A sofa and one floor lamp. */
export const cosy: Item[] = [piece("sofa", "sofa-3", 2, 2), piece("lamp", "floor-lamp", 4, 1)];

/**
 * The heavy case: fifty pieces in a big hall, eight of them lamps — more lamps than the light budget
 * and more pieces than the shadow budget.
 */
export const crowded: Item[] = Array.from({ length: 50 }, (_, index) =>
  piece(`p${index}`, index % 6 === 0 && index < 48 ? "floor-lamp" : "chair", 1 + (index % 10) * 1.5, 1 + Math.floor(index / 10) * 1.5),
);
