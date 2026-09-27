import { useEffect, useMemo, useReducer, useState } from "react";
import { validateRoom, type Room } from "../../domain/01-room";
import {
  checkPlacement,
  FURNITURE,
  findEntry,
  footprint,
  itemsOutside,
  normaliseRotation,
  placeItem,
  type CatalogError,
  type Item,
} from "../../domain/02-catalog";
import { loadScene, saveScene, SCENE_VERSION, setAsideScene } from "../../adapters/scene-store";

export const PRESETS: Record<"rectangle" | "l-shape", Room> = {
  rectangle: { name: "Living room", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }] },
  "l-shape": {
    name: "L-shaped studio",
    height: 2.7,
    corners: [{ x: 0, z: 0 }, { x: 7, z: 0 }, { x: 7, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 6 }, { x: 0, z: 6 }],
  },
};

let counter = 0;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}-${counter++}`);

interface Furnishing {
  items: Item[];
  selected: string | null;
  error: CatalogError | null;
}

type FurnishingAction =
  | { type: "add"; room: Room; catalogId: string; id: string }
  | { type: "rotate"; room: Room; id: string }
  | { type: "remove"; id: string }
  | { type: "select"; id: string | null }
  | { type: "reset" };

/**
 * Furniture changes as a reducer: each one works on the current list, so placing several pieces in quick
 * succession spreads them out instead of stacking them where the first one went.
 */
function furnish(state: Furnishing, action: FurnishingAction): Furnishing {
  switch (action.type) {
    case "add": {
      const entry = findEntry(FURNITURE, action.catalogId);
      if (!entry.ok) return { ...state, error: entry.error };
      const occupied = state.items.flatMap((item) => {
        const other = findEntry(FURNITURE, item.catalogId);
        return other.ok ? [footprint(other.value, item.transform)] : [];
      });
      const placed = placeItem(action.room, entry.value, action.id, occupied);
      if (!placed.ok) return { ...state, error: placed.error };
      return { items: [...state.items, placed.value], selected: placed.value.id, error: null };
    }
    case "rotate": {
      // A quarter turn — refused if it would push the piece through a wall.
      const item = state.items.find((candidate) => candidate.id === action.id);
      const entry = item && findEntry(FURNITURE, item.catalogId);
      if (!item || !entry?.ok) return state;
      const turned = { ...item, transform: { ...item.transform, rotation: normaliseRotation(item.transform.rotation + 90) } };
      const allowed = checkPlacement(action.room, entry.value, turned);
      if (!allowed.ok) return { ...state, error: allowed.error };
      return { ...state, items: state.items.map((i) => (i.id === item.id ? turned : i)), error: null };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id), selected: state.selected === action.id ? null : state.selected, error: null };
    case "select":
      return { ...state, selected: action.id };
    case "reset":
      return { items: [], selected: null, error: null };
  }
}

/**
 * The scene being edited. `draft` is the room as the form shows it — possibly invalid while typing;
 * `room` is the last valid version, which the 3D view keeps showing so a half-typed number never
 * blanks the scene. The room and its furniture are saved together on every valid change.
 */
export function useRoom() {
  const initial = useMemo(() => loadScene(), []);
  const [unreadable, setUnreadable] = useState(initial.ok ? null : initial.error.raw);
  const start = initial.ok && initial.value ? initial.value : null;
  const [draft, setDraftState] = useState<Room>(start?.room ?? PRESETS.rectangle);
  const [room, setRoom] = useState<Room>(start?.room ?? PRESETS.rectangle);
  const [furnishing, dispatch] = useReducer(furnish, { items: start?.items ?? [], selected: null, error: null });
  const { items, selected, error: itemError } = furnishing;
  const check = useMemo(() => validateRoom(draft), [draft]);
  const outside = useMemo(() => itemsOutside(room, items, FURNITURE), [room, items]);

  function setDraft(next: Room) {
    setDraftState(next);
    const valid = validateRoom(next);
    if (valid.ok) setRoom(valid.value);
  }

  // Saving is the one outside system to keep in step; nothing is written over data that didn't read.
  useEffect(() => {
    if (unreadable === null) saveScene({ version: SCENE_VERSION, room, items });
  }, [room, items, unreadable]);

  return {
    draft,
    room,
    items,
    selected,
    outside,
    error: check.ok ? null : check.error,
    itemError,
    unreadable,
    setDraft,
    usePreset(name: keyof typeof PRESETS) {
      setDraft(PRESETS[name]);
    },
    addItem(catalogId: string) {
      dispatch({ type: "add", room, catalogId, id: newId() });
    },
    rotateItem(id: string) {
      dispatch({ type: "rotate", room, id });
    },
    removeItem(id: string) {
      dispatch({ type: "remove", id });
    },
    select(id: string | null) {
      dispatch({ type: "select", id });
    },
    startOver() {
      if (unreadable !== null) setAsideScene(unreadable);
      setUnreadable(null);
      dispatch({ type: "reset" });
      setDraft(PRESETS.rectangle);
    },
  };
}
