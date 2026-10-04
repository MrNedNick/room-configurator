import { SCENE_VERSION, type StoredScene } from "../../../src/adapters/scene-store";

/** A furnished room with every kind of saved value: finishes, light and a piece's own material. */
export const furnished: StoredScene = {
  version: SCENE_VERSION,
  room: { name: "Kids & guests <room>", height: 2.6, corners: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }] },
  items: [
    { id: "s", catalogId: "sofa-3", name: "Three-seat sofa", transform: { x: 1.55, z: 0.45, rotation: 0 }, materialId: "tan-leather" },
    { id: "b", catalogId: "double-bed", name: "Double bed", transform: { x: 3.9, z: 2.9, rotation: 90 } },
  ],
  finish: { floor: "walnut-floor", walls: "sage" },
  lighting: { time: "evening", lampsOn: true },
};

/** A bow-tie: the "пересечение стен" case, as it would arrive in a hand-edited file. */
export const crossingWallsFile = JSON.stringify({ ...furnished, room: { ...furnished.room, corners: [{ x: 0, z: 0 }, { x: 4, z: 3 }, { x: 4, z: 0 }, { x: 0, z: 3 }] } });
