import type { Metres } from "../01-room";

/** Where a material may go: the floor, the walls, or the surface of a piece of furniture. */
export type Surface = "floor" | "wall" | "furniture";

/**
 * A finish as the renderer needs it: a colour and how rough or metallic it reads under light. No
 * textures to download — a room keeps its look from the first frame, and fifty pieces stay light.
 */
export interface Material {
  id: string;
  name: string;
  surface: Surface;
  colour: string;
  /** 0 is a mirror, 1 is chalk. */
  roughness: number;
  /** 0 for paint, wood and fabric; near 1 for bare metal. */
  metalness: number;
}

/** The room's own surfaces, by material id. */
export interface Finish {
  floor: string;
  walls: string;
}

export type TimeOfDay = "morning" | "day" | "evening" | "night";

/** What lights the room: the time outside, and whether the lamps in it are switched on. */
export interface Lighting {
  time: TimeOfDay;
  lampsOn: boolean;
}

export interface LampLight {
  itemId: string;
  position: [Metres, Metres, Metres];
  intensity: number;
  colour: string;
}

/** Everything the renderer needs to light the scene, worked out once from the scene itself. */
export interface LightRig {
  ambient: { colour: string; intensity: number };
  sun: { position: [number, number, number]; colour: string; intensity: number };
  background: string;
  lamps: LampLight[];
  /** Lamps that glow but do not cast light, because the scene is past the light budget. */
  glowingOnly: string[];
  /** Shadows cost a pass per light; a crowded room renders without them. */
  shadows: boolean;
}

/** A heavy scene: past this many real lamps, extra lamps only glow. */
export const MAX_LAMP_LIGHTS = 4;
/** Past this many pieces, shadows are switched off to keep the view responsive on modest hardware. */
export const MAX_SHADOW_ITEMS = 40;
