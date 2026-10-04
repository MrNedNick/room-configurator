import { describe, expect, it } from "vitest";
import { validateRoom, type Room } from "../../src/domain/01-room";
import { FURNITURE } from "../../src/domain/02-catalog";
import {
  DEFAULT_FINISH,
  findMaterial,
  lightRig,
  lookOf,
  MAX_LAMP_LIGHTS,
  readFinish,
  readLighting,
  setItemMaterial,
  setRoomFinish,
} from "../../src/domain/04-finish";
import { living } from "../fixtures/01-room/rooms";
import { cosy, crowded } from "../fixtures/04-finish/scenes";

const valid = (room: Room) => {
  const result = validateRoom(room);
  if (!result.ok) throw new Error(result.error.reason);
  return result.value;
};
const room = valid(living);
const hall = valid({ name: "Hall", height: 4, corners: [{ x: 0, z: 0 }, { x: 16, z: 0 }, { x: 16, z: 9 }, { x: 0, z: 9 }] });

describe("materials", () => {
  it("finds a material for the surface it is meant for, and names the mistake otherwise", () => {
    expect(findMaterial("walnut-floor", "floor")).toMatchObject({ ok: true, value: { name: "Walnut boards" } });
    expect(findMaterial("walnut-floor", "wall")).toEqual({ ok: false, error: { kind: "finish", reason: "wrong-surface", id: "walnut-floor" } });
    expect(findMaterial("gold", "floor")).toEqual({ ok: false, error: { kind: "finish", reason: "unknown-material", id: "gold" } });
  });

  it("changes the floor or the walls, and refuses paint on the floor", () => {
    expect(setRoomFinish(DEFAULT_FINISH, "walls", "sage")).toEqual({ ok: true, value: { floor: "oak-floor", walls: "sage" } });
    expect(setRoomFinish(DEFAULT_FINISH, "floor", "sage")).toMatchObject({ ok: false, error: { reason: "wrong-surface" } });
  });

  it("gives one piece a finish and can take it away again", () => {
    const leather = setItemMaterial(cosy, "sofa", "tan-leather");
    expect(leather.ok && leather.value[0]).toMatchObject({ materialId: "tan-leather" });
    expect(leather.ok && leather.value[1]).toBe(cosy[1]);
    const back = setItemMaterial(leather.ok ? leather.value : [], "sofa", null);
    expect(back.ok && "materialId" in back.value[0]!).toBe(false);
    expect(setItemMaterial(cosy, "ghost", "linen")).toMatchObject({ ok: false, error: { reason: "unknown-item" } });
    expect(setItemMaterial(cosy, "sofa", "oak-floor")).toMatchObject({ ok: false, error: { reason: "wrong-surface" } });
  });

  it("draws a piece in its finish, or in its catalogue colour", () => {
    const sofa = FURNITURE.find((entry) => entry.id === "sofa-3")!;
    expect(lookOf({ ...cosy[0]!, materialId: "black-metal" }, sofa)).toMatchObject({ colour: "#2b2d30", metalness: 0.8 });
    expect(lookOf(cosy[0]!, sofa).colour).toBe(sofa.colour);
    expect(lookOf({ ...cosy[0]!, materialId: "retired" }, sofa).colour).toBe(sofa.colour);
  });

  it("reads saved finishes and lighting, rejecting what no longer fits", () => {
    expect(readFinish({ floor: "concrete", walls: "navy" })).toEqual({ ok: true, value: { floor: "concrete", walls: "navy" } });
    expect(readFinish({ floor: "navy", walls: "navy" })).toMatchObject({ ok: false, error: { reason: "wrong-surface" } });
    expect(readFinish(null)).toMatchObject({ ok: false });
    expect(readLighting({ time: "evening", lampsOn: false })).toEqual({ ok: true, value: { time: "evening", lampsOn: false } });
    expect(readLighting({ time: "noon", lampsOn: true })).toMatchObject({ ok: false, error: { reason: "bad-lighting" } });
  });
});

describe("lightRig", () => {
  it("lights a lamp where it stands, near its top, when the lamps are on", () => {
    const rig = lightRig(room, cosy, { time: "evening", lampsOn: true }, FURNITURE);
    expect(rig.lamps).toEqual([{ itemId: "lamp", position: [4, 1.6 * 0.9, 1], intensity: 2.5, colour: "#ffd8a0" }]);
    expect(rig.shadows).toBe(true);
    expect(lightRig(room, cosy, { time: "evening", lampsOn: false }, FURNITURE).lamps).toEqual([]);
  });

  it("night is darker outside than day", () => {
    const day = lightRig(room, cosy, { time: "day", lampsOn: true }, FURNITURE);
    const night = lightRig(room, cosy, { time: "night", lampsOn: true }, FURNITURE);
    expect(night.sun.intensity).toBeLessThan(day.sun.intensity / 10);
    expect(night.lamps[0]!.intensity).toBeGreaterThan(day.lamps[0]!.intensity);
  });

  it("edge case, a heavy room: extra lamps only glow and shadows are switched off", () => {
    const rig = lightRig(hall, crowded, { time: "night", lampsOn: true }, FURNITURE);
    const lampCount = crowded.filter((item) => item.catalogId === "floor-lamp").length;
    expect(lampCount).toBeGreaterThan(MAX_LAMP_LIGHTS);
    expect(rig.lamps).toHaveLength(MAX_LAMP_LIGHTS);
    expect(rig.glowingOnly).toHaveLength(lampCount - MAX_LAMP_LIGHTS);
    expect(rig.shadows).toBe(false);
  });
});
