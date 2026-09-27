import { describe, expect, it } from "vitest";
import { loadScene, saveScene, SCENE_VERSION, setAsideScene } from "../../src/adapters/scene-store";
import { lShape } from "../fixtures/01-room/rooms";
import { MemoryStorage } from "../fixtures/memory-storage";

const KEY = "room-configurator:scene";

describe("scene store", () => {
  it("starts empty, then round-trips a saved room", () => {
    const storage = new MemoryStorage();
    expect(loadScene(storage)).toEqual({ ok: true, value: null });
    saveScene({ version: SCENE_VERSION, room: lShape }, storage);
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { room: { corners: lShape.corners } } });
  });

  it.each([
    ["not JSON", "{room:"],
    ["another version", JSON.stringify({ version: 2, room: lShape })],
    ["a room with crossing walls", JSON.stringify({ version: 1, room: { ...lShape, corners: [{ x: 0, z: 0 }, { x: 4, z: 3 }, { x: 4, z: 0 }, { x: 0, z: 3 }] } })],
  ])("reports %s as unreadable and keeps the text", (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, raw);
    expect(loadScene(storage)).toEqual({ ok: false, error: { kind: "unreadable", raw } });
  });

  it("sets unreadable text aside under its own key", () => {
    const storage = new MemoryStorage();
    const key = setAsideScene("{room:", storage, 42);
    expect(key).toBe(`${KEY}:unreadable-42`);
    expect(storage.getItem(key)).toBe("{room:");
  });

  it("a full or blocked storage doesn't break saving", () => {
    const full = { setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(saveScene({ version: SCENE_VERSION, room: lShape }, full)).toBe(false);
  });
});
