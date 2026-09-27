import { validateRoom, type Room } from "../domain/01-room";
import { err, ok, type Result } from "../domain/result";

const KEY = "room-configurator:scene";
export const SCENE_VERSION = 1;

/** What is kept between visits. Items join the scene with the furniture catalogue. */
export interface StoredScene {
  version: typeof SCENE_VERSION;
  room: Room;
}

export type LoadError = { kind: "unreadable"; raw: string };

/**
 * Reads the saved scene. Nothing saved → `null` (start from the default room). Something saved that no
 * longer reads as a valid scene → an error that keeps the raw text, so the page can say so and offer to
 * start over instead of silently replacing the user's work.
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
    const data = JSON.parse(raw) as Partial<StoredScene>;
    if (data.version !== SCENE_VERSION || !data.room) throw new Error("not a scene");
    const room = validateRoom(data.room);
    if (!room.ok) throw new Error(room.error.reason);
    return ok({ version: SCENE_VERSION, room: room.value });
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
