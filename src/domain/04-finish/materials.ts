import type { Finish, Lighting, Material } from "./types";

/** The built-in finishes: a few floors, wall paints and furniture surfaces that go together. */
export const MATERIALS: Material[] = [
  { id: "oak-floor", name: "Oak boards", surface: "floor", colour: "#c9a777", roughness: 0.7, metalness: 0 },
  { id: "walnut-floor", name: "Walnut boards", surface: "floor", colour: "#6e4a32", roughness: 0.6, metalness: 0 },
  { id: "grey-tiles", name: "Grey tiles", surface: "floor", colour: "#9ea3a8", roughness: 0.35, metalness: 0 },
  { id: "concrete", name: "Polished concrete", surface: "floor", colour: "#b7b3ad", roughness: 0.5, metalness: 0 },
  { id: "wool-carpet", name: "Wool carpet", surface: "floor", colour: "#a9a08f", roughness: 1, metalness: 0 },
  { id: "warm-white", name: "Warm white", surface: "wall", colour: "#f1ece2", roughness: 0.9, metalness: 0 },
  { id: "sage", name: "Sage green", surface: "wall", colour: "#a9b8a0", roughness: 0.9, metalness: 0 },
  { id: "terracotta", name: "Terracotta", surface: "wall", colour: "#c9876a", roughness: 0.9, metalness: 0 },
  { id: "navy", name: "Navy blue", surface: "wall", colour: "#33415c", roughness: 0.9, metalness: 0 },
  { id: "grey-fabric", name: "Grey fabric", surface: "furniture", colour: "#7d838c", roughness: 1, metalness: 0 },
  { id: "linen", name: "Linen", surface: "furniture", colour: "#d9cfbd", roughness: 1, metalness: 0 },
  { id: "tan-leather", name: "Tan leather", surface: "furniture", colour: "#9a6440", roughness: 0.55, metalness: 0 },
  { id: "light-oak", name: "Light oak", surface: "furniture", colour: "#cfae80", roughness: 0.65, metalness: 0 },
  { id: "white-lacquer", name: "White lacquer", surface: "furniture", colour: "#f3f2ef", roughness: 0.25, metalness: 0 },
  { id: "black-metal", name: "Black metal", surface: "furniture", colour: "#2b2d30", roughness: 0.4, metalness: 0.8 },
];

export const DEFAULT_FINISH: Finish = { floor: "oak-floor", walls: "warm-white" };
export const DEFAULT_LIGHTING: Lighting = { time: "day", lampsOn: true };

export const TIME_LABELS: Record<Lighting["time"], string> = {
  morning: "Morning",
  day: "Day",
  evening: "Evening",
  night: "Night",
};
