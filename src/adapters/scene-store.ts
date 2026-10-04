import { validateRoom, type Room } from "../domain/01-room";
import { normaliseRotation, type Item } from "../domain/02-catalog";
import { DEFAULT_FINISH, DEFAULT_LIGHTING, readFinish, readLighting, type Finish, type Lighting } from "../domain/04-finish";
import { err, ok, type Result } from "../domain/result";

const KEY = "room-configurator:scene";
export const SCENE_VERSION = 3;

/** What is kept between visits: the room, the furniture in it (all in metres), its finishes and light. */
export interface StoredScene {
  version: typeof SCENE_VERSION;
  room: Room;
  items: Item[];
  finish: Finish;
  lighting: Lighting;
}

export type LoadError = { kind: "unreadable"; raw: string };

function readItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) throw new Error("items");
  return raw.map((entry) => {
    const item = entry as Item;
    const { x, z, rotation } = item.transform ?? {};
    if (typeof item.id !== "string" || typeof item.catalogId !== "string" || ![x, z, rotation].every(Number.isFinite)) {
      throw new Error("item");
    }
    const read: Item = { id: item.id, catalogId: item.catalogId, name: String(item.name ?? item.catalogId), transform: { x, z, rotation: normaliseRotation(rotation) } };
    return typeof item.materialId === "string" ? { ...read, materialId: item.materialId } : read;
  });
}

/**
 * Reads the saved scene. Nothing saved → `null`. A version 1 scene (a room, no furniture yet) is read as
 * an empty room; versions 1 and 2 (before finishes) get the default floor, walls and daylight. A finish
 * the palette no longer has falls back to the default — it is decoration, not the user's layout. Anything that no longer reads → an error that keeps the raw text, so the page can say
 * so and offer to start over instead of silently replacing the user's work.
 */
export function loadScene(storage: Pick<Storage, "getItem"> = localStorage): Result<StoredScene | null, LoadError> {
  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return ok(null);
  }
  if (raw === null) return ok(null);
  try {
    const data = JSON.parse(raw) as { version?: number; room?: Room; items?: unknown; finish?: unknown; lighting?: unknown };
    if (![1, 2, SCENE_VERSION].includes(data.version ?? 0) || !data.room) throw new Error("not a scene");
    const room = validateRoom(data.room);
    if (!room.ok) throw new Error(room.error.reason);
    const finish = readFinish(data.finish);
    const lighting = readLighting(data.lighting);
    return ok({
      version: SCENE_VERSION,
      room: room.value,
      items: data.version === 1 ? [] : readItems(data.items),
      finish: finish.ok ? finish.value : DEFAULT_FINISH,
      lighting: lighting.ok ? lighting.value : DEFAULT_LIGHTING,
    });
  } catch {
    return err({ kind: "unreadable", raw });
  }
}

export function saveScene(scene: StoredScene, storage: Pick<Storage, "setItem"> = localStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(scene));
    return true;
  } catch {
    // Private mode or a full quota: the room still works, it just won't be there next time.
    return false;
  }
}

/** Keeps the unreadable text under another key before starting over, so nothing is lost for good. */
export function setAsideScene(raw: string, storage: Pick<Storage, "setItem"> = localStorage, now = Date.now()): string {
  const key = `${KEY}:unreadable-${now}`;
  try {
    storage.setItem(key, raw);
  } catch {
    // Best effort.
  }
  return key;
}
