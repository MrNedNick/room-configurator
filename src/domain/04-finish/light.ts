import { bounds, type Room } from "../01-room";
import type { CatalogEntry, Item } from "../02-catalog";
import { MAX_LAMP_LIGHTS, MAX_SHADOW_ITEMS, type Lighting, type LightRig, type TimeOfDay } from "./types";

/** The light outside for each time of day: where the sun stands relative to the room, its colour and strength. */
const DAYLIGHT: Record<TimeOfDay, { side: number; height: number; sun: string; sunIntensity: number; ambient: string; ambientIntensity: number; background: string; lamp: number }> = {
  morning: { side: -1, height: 0.5, sun: "#ffd9a8", sunIntensity: 1.1, ambient: "#dfe8ff", ambientIntensity: 0.55, background: "#2a3140", lamp: 1.2 },
  day: { side: 0.6, height: 1.6, sun: "#ffffff", sunIntensity: 1.4, ambient: "#ffffff", ambientIntensity: 0.9, background: "#1d2027", lamp: 1 },
  evening: { side: 1, height: 0.35, sun: "#ff9a5c", sunIntensity: 0.6, ambient: "#ffd0a8", ambientIntensity: 0.35, background: "#241c22", lamp: 2.5 },
  night: { side: 0.3, height: 1.2, sun: "#9fb3ff", sunIntensity: 0.08, ambient: "#7f8fb8", ambientIntensity: 0.12, background: "#0c0e14", lamp: 3.5 },
};

const LAMP_COLOUR = "#ffd8a0";

/**
 * Lights the scene from the room and what is in it. Lamps from the catalogue light the room when they
 * are on — but only the first few: every real light costs the GPU a pass, so past `MAX_LAMP_LIGHTS`
 * the rest only glow, and past `MAX_SHADOW_ITEMS` pieces shadows are switched off. A heavy room stays
 * usable instead of stuttering.
 */
export function lightRig(room: Room, items: readonly Item[], lighting: Lighting, catalog: readonly CatalogEntry[]): LightRig {
  const day = DAYLIGHT[lighting.time];
  const box = bounds(room);
  const reach = Math.max(box.width, box.depth, 4);
  const lamps = lighting.lampsOn
    ? items.flatMap((item) => {
        const entry = catalog.find((candidate) => candidate.id === item.catalogId);
        return entry?.category === "lighting" ? [{ item, entry }] : [];
      })
    : [];
  return {
    ambient: { colour: day.ambient, intensity: day.ambientIntensity },
    sun: {
      position: [box.centre.x + day.side * reach, room.height + day.height * reach, box.centre.z + reach * 0.6],
      colour: day.sun,
      intensity: day.sunIntensity,
    },
    background: day.background,
    lamps: lamps.slice(0, MAX_LAMP_LIGHTS).map(({ item, entry }) => ({
      itemId: item.id,
      position: [item.transform.x, entry.size.height * 0.9, item.transform.z],
      intensity: day.lamp,
      colour: LAMP_COLOUR,
    })),
    glowingOnly: lamps.slice(MAX_LAMP_LIGHTS).map(({ item }) => item.id),
    shadows: items.length <= MAX_SHADOW_ITEMS,
  };
}
