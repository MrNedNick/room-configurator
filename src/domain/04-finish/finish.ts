import type { CatalogEntry, Item } from "../02-catalog";
import { err, ok, type Result } from "../result";
import { finishError, type FinishError } from "./errors";
import { MATERIALS } from "./materials";
import type { Finish, Lighting, Material, Surface } from "./types";

/** A material by id, checked against where it is meant to go — floor boards don't go on a wall. */
export function findMaterial(id: string, surface: Surface, palette: readonly Material[] = MATERIALS): Result<Material, FinishError> {
  const material = palette.find((candidate) => candidate.id === id);
  if (!material) return err(finishError("unknown-material", id));
  if (material.surface !== surface) return err(finishError("wrong-surface", id));
  return ok(material);
}

/** The room with a new floor or wall finish. */
export function setRoomFinish(finish: Finish, part: keyof Finish, materialId: string): Result<Finish, FinishError> {
  const material = findMaterial(materialId, part === "floor" ? "floor" : "wall");
  if (!material.ok) return material;
  return ok({ ...finish, [part]: materialId });
}

/** Gives one piece a finish, or takes it away (`null`) so it shows its catalogue colour again. */
export function setItemMaterial(items: readonly Item[], itemId: string, materialId: string | null): Result<Item[], FinishError> {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return err(finishError("unknown-item", itemId));
  if (materialId !== null) {
    const material = findMaterial(materialId, "furniture");
    if (!material.ok) return material;
  }
  return ok(
    items.map((candidate) => {
      if (candidate.id !== itemId) return candidate;
      const { materialId: _old, ...rest } = candidate;
      return materialId === null ? rest : { ...rest, materialId };
    }),
  );
}

/** How a piece is drawn: its own finish if it has a known one, its catalogue colour otherwise. */
export function lookOf(item: Item, entry: CatalogEntry): Pick<Material, "colour" | "roughness" | "metalness"> {
  const material = item.materialId ? findMaterial(item.materialId, "furniture") : null;
  if (material?.ok) return material.value;
  return { colour: entry.colour, roughness: 0.8, metalness: 0 };
}

/** Reads a saved finish; anything that no longer matches the palette is an error, not a silent swap. */
export function readFinish(raw: unknown): Result<Finish, FinishError> {
  const value = raw as Partial<Finish> | null;
  if (!value || typeof value.floor !== "string" || typeof value.walls !== "string") return err(finishError("unknown-material"));
  const floor = findMaterial(value.floor, "floor");
  if (!floor.ok) return floor;
  const walls = findMaterial(value.walls, "wall");
  if (!walls.ok) return walls;
  return ok({ floor: value.floor, walls: value.walls });
}

const TIMES = ["morning", "day", "evening", "night"] as const;

export function readLighting(raw: unknown): Result<Lighting, FinishError> {
  const value = raw as Partial<Lighting> | null;
  if (!value || !TIMES.includes(value.time as Lighting["time"]) || typeof value.lampsOn !== "boolean") return err(finishError("bad-lighting"));
  return ok({ time: value.time as Lighting["time"], lampsOn: value.lampsOn });
}
