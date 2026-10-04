import { describe, expect, it } from "vitest";
import { loadScene, saveScene, SCENE_VERSION, setAsideScene } from "../../src/adapters/scene-store";
import { lShape } from "../fixtures/01-room/rooms";
import { MemoryStorage } from "../fixtures/memory-storage";
import { DEFAULT_FINISH, DEFAULT_LIGHTING } from "../../src/domain/04-finish";

const defaults = { finish: DEFAULT_FINISH, lighting: DEFAULT_LIGHTING };

const KEY = "room-configurator:scene";

describe("scene store", () => {
  it("starts empty, then round-trips a saved room", () => {
    const storage = new MemoryStorage();
    expect(loadScene(storage)).toEqual({ ok: true, value: null });
    saveScene({ version: SCENE_VERSION, room: lShape, items: [], ...defaults }, storage);
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { room: { corners: lShape.corners } } });
  });

  it.each([
    ["not JSON", "{room:"],
    ["a future version", JSON.stringify({ version: 4, room: lShape, items: [] })],
    ["an item without a position", JSON.stringify({ version: 2, room: lShape, items: [{ id: "a", catalogId: "sofa-3", transform: { x: 1 } }] })],
    ["a room with crossing walls", JSON.stringify({ version: 1, room: { ...lShape, corners: [{ x: 0, z: 0 }, { x: 4, z: 3 }, { x: 4, z: 0 }, { x: 0, z: 3 }] } })],
  ])("reports %s as unreadable and keeps the text", (_label, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, raw);
    expect(loadScene(storage)).toEqual({ ok: false, error: { kind: "unreadable", raw } });
  });

  it("reads a scene saved before furniture existed (version 1) as an empty room", () => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, JSON.stringify({ version: 1, room: lShape }));
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { version: SCENE_VERSION, items: [], ...defaults } });
  });

  it("keeps items, normalising their rotation", () => {
    const storage = new MemoryStorage();
    const item = { id: "a", catalogId: "sofa-3", name: "Sofa", transform: { x: 1, z: 1, rotation: -90 } };
    storage.setItem(KEY, JSON.stringify({ version: 2, room: lShape, items: [item] }));
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { items: [{ transform: { rotation: 270 } }] } });
  });

  it("reads a scene from before finishes (version 2) with the default floor, walls and daylight", () => {
    const storage = new MemoryStorage();
    storage.setItem(KEY, JSON.stringify({ version: 2, room: lShape, items: [] }));
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { version: SCENE_VERSION, ...defaults } });
  });

  it("round-trips finishes, light and a piece's material; a retired material falls back to the default", () => {
    const storage = new MemoryStorage();
    const item = { id: "a", catalogId: "sofa-3", name: "Sofa", transform: { x: 1, z: 1, rotation: 0 }, materialId: "tan-leather" };
    const finish = { floor: "concrete", walls: "navy" };
    const lighting = { time: "night" as const, lampsOn: false };
    saveScene({ version: SCENE_VERSION, room: lShape, items: [item], finish, lighting }, storage);
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { items: [{ materialId: "tan-leather" }], finish, lighting } });
    storage.setItem(KEY, JSON.stringify({ version: 3, room: lShape, items: [], finish: { floor: "marble", walls: "navy" }, lighting }));
    expect(loadScene(storage)).toMatchObject({ ok: true, value: { finish: DEFAULT_FINISH, lighting } });
  });

  it("sets unreadable text aside under its own key", () => {
    const storage = new MemoryStorage();
    const key = setAsideScene("{room:", storage, 42);
    expect(key).toBe(`${KEY}:unreadable-42`);
    expect(storage.getItem(key)).toBe("{room:");
  });

  it("a full or blocked storage doesn't break saving", () => {
    const full = { setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(saveScene({ version: SCENE_VERSION, room: lShape, items: [], ...defaults }, full)).toBe(false);
  });
});
