import type { Item } from "../../../src/domain/02-catalog";

const piece = (id: string, catalogId: string, x: number, z: number, rotation = 0): Item => ({ id, catalogId, name: id, transform: { x, z, rotation } });

/** A 2.1 × 0.9 m sofa standing 50 cm from the left wall and against the back wall of a 4 × 3 m room. */
export const sofaOnly: Item[] = [piece("sofa", "sofa-3", 0.5 + 1.05, 0.45)];

/** A sofa and an armchair standing in each other, and a chair 40 cm from the armchair. */
export const crowdedCorner: Item[] = [
  piece("sofa", "sofa-3", 1.55, 0.45),
  piece("armchair", "armchair", 2.9, 0.6), // overlaps the sofa's right end
  piece("chair", "chair", 2.9 + 0.425 + 0.4 + 0.225, 0.6), // 40 cm to the right of the armchair
];

/** Two pieces pushed together edge to edge on purpose — neither a collision nor a passage. */
export const pushedTogether: Item[] = [piece("left", "armchair", 1, 1), piece("right", "armchair", 1.85, 1)];
