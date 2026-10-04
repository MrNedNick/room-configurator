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
import { loadScene, saveScene, SCENE_VERSION, setAsideScene, type StoredScene } from "../../adapters/scene-store";
import { DEFAULT_SNAP, moveItem, nudge, NO_SNAP, type MoveResult, type SnapSettings } from "../../domain/03-move";
import type { Point } from "../../domain/01-room";
import { DEFAULT_FINISH, DEFAULT_LIGHTING, setItemMaterial, setRoomFinish, type Finish, type FinishError, type Lighting } from "../../domain/04-finish";

export const PRESETS: Record<"rectangle" | "l-shape", Room> = {
  rectangle: { name: "Living room", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }] },
  "l-shape": {
    name: "L-shaped studio",
    height: 2.7,
    corners: [{ x: 0, z: 0 }, { x: 7, z: 0 }, { x: 7, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 6 }, { x: 0, z: 6 }],
  },
};

const SNAP_KEY = "room-configurator:snap";
const DIMENSIONS_KEY = "room-configurator:dimensions";

let counter = 0;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `item-${Date.now()}-${counter++}`);

interface Furnishing {
  items: Item[];
  selected: string | null;
  error: CatalogError | null;
  /** Which action the error came from — the same "outside the room" reads differently after a turn or a move. */
  errorAction: "add" | "turn" | "move" | null;
  /** What the last move snapped to, for the status line. */
  snapped: MoveResult["snapped"];
  /** A finish that couldn't be applied to the selected piece. */
  finishError?: FinishError | null;
}

type FurnishingAction =
  | { type: "add"; room: Room; catalogId: string; id: string }
  | { type: "rotate"; room: Room; id: string }
  | { type: "move"; room: Room; id: string; target: Point; settings: SnapSettings }
  | { type: "nudge"; room: Room; id: string; dx: number; dz: number }
  | { type: "material"; id: string; materialId: string | null }
  | { type: "remove"; id: string }
  | { type: "select"; id: string | null }
  | { type: "load"; items: Item[] }
  | { type: "reset" };

/**
 * Furniture changes as a reducer: each one works on the current list, so placing several pieces in quick
 * succession spreads them out instead of stacking them where the first one went.
 */
function furnish(state: Furnishing, action: FurnishingAction): Furnishing {
  switch (action.type) {
    case "add": {
      const entry = findEntry(FURNITURE, action.catalogId);
      if (!entry.ok) return { ...state, error: entry.error, errorAction: "add" };
      const occupied = state.items.flatMap((item) => {
        const other = findEntry(FURNITURE, item.catalogId);
        return other.ok ? [footprint(other.value, item.transform)] : [];
      });
      const placed = placeItem(action.room, entry.value, action.id, occupied);
      if (!placed.ok) return { ...state, error: placed.error, errorAction: "add" };
      return { items: [...state.items, placed.value], selected: placed.value.id, error: null, errorAction: null, snapped: null };
    }
    case "rotate": {
      // A quarter turn — refused if it would push the piece through a wall.
      const item = state.items.find((candidate) => candidate.id === action.id);
      const entry = item && findEntry(FURNITURE, item.catalogId);
      if (!item || !entry?.ok) return state;
      const turned = { ...item, transform: { ...item.transform, rotation: normaliseRotation(item.transform.rotation + 90) } };
      const allowed = checkPlacement(action.room, entry.value, turned);
      if (!allowed.ok) return { ...state, error: allowed.error, errorAction: "turn" };
      return { ...state, items: state.items.map((i) => (i.id === item.id ? turned : i)), error: null, errorAction: null, snapped: null };
    }
    case "move":
    case "nudge": {
      const item = state.items.find((candidate) => candidate.id === action.id);
      const entry = item && findEntry(FURNITURE, item.catalogId);
      if (!item || !entry?.ok) return state;
      if (action.type === "move") {
        const moved = moveItem(action.room, entry.value, item, action.target, action.settings);
        if (!moved.ok) return { ...state, error: moved.error, errorAction: "move", snapped: null };
        return { ...state, items: state.items.map((i) => (i.id === item.id ? moved.value.item : i)), error: null, errorAction: null, snapped: moved.value.snapped };
      }
      const stepped = nudge(action.room, entry.value, item, action.dx, action.dz);
      if (!stepped.ok) return { ...state, error: stepped.error, errorAction: "move", snapped: null };
      return { ...state, items: state.items.map((i) => (i.id === item.id ? stepped.value : i)), error: null, errorAction: null, snapped: null };
    }
    case "material": {
      const changed = setItemMaterial(state.items, action.id, action.materialId);
      if (!changed.ok) return { ...state, finishError: changed.error };
      return { ...state, items: changed.value, finishError: null };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.id), selected: state.selected === action.id ? null : state.selected, error: null, errorAction: null, snapped: null };
    case "select":
      return { ...state, selected: action.id };
    case "load":
      return { items: action.items, selected: null, error: null, errorAction: null, snapped: null, finishError: null };
    case "reset":
      return { items: [], selected: null, error: null, errorAction: null, snapped: null };
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
  const [furnishing, dispatch] = useReducer(furnish, { items: start?.items ?? [], selected: null, error: null, errorAction: null, snapped: null });
  const { items, selected, error: itemError, errorAction, snapped } = furnishing;
  const [finish, setFinish] = useState<Finish>(start?.finish ?? DEFAULT_FINISH);
  const [lighting, setLighting] = useState<Lighting>(start?.lighting ?? DEFAULT_LIGHTING);
  const [roomFinishError, setRoomFinishError] = useState<FinishError | null>(null);
  const [snapOn, setSnapOn] = useState(() => {
    try {
      return localStorage.getItem(SNAP_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const snap = snapOn ? DEFAULT_SNAP : NO_SNAP;
  const [dimensionsOn, setDimensionsOn] = useState(() => {
    try {
      return localStorage.getItem(DIMENSIONS_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const check = useMemo(() => validateRoom(draft), [draft]);
  const outside = useMemo(() => itemsOutside(room, items, FURNITURE), [room, items]);

  function setDraft(next: Room) {
    setDraftState(next);
    const valid = validateRoom(next);
    if (valid.ok) setRoom(valid.value);
  }

  // Saving is the one outside system to keep in step; nothing is written over data that didn't read.
  useEffect(() => {
    if (unreadable === null) saveScene({ version: SCENE_VERSION, room, items, finish, lighting });
  }, [room, items, finish, lighting, unreadable]);

  return {
    draft,
    room,
    items,
    selected,
    outside,
    error: check.ok ? null : check.error,
    itemError,
    errorAction,
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
    snapped,
    snap,
    snapOn,
    setSnapOn(on: boolean) {
      setSnapOn(on);
      try {
        localStorage.setItem(SNAP_KEY, on ? "on" : "off");
      } catch {
        // A preference that isn't remembered is fine.
      }
    },
    /** Drag or a typed position; snapping applies to drags only — a typed number is meant exactly. */
    moveItem(id: string, target: Point, exact = false) {
      dispatch({ type: "move", room, id, target, settings: exact ? NO_SNAP : snap });
    },
    nudgeItem(id: string, dx: number, dz: number) {
      dispatch({ type: "nudge", room, id, dx, dz });
    },
    finish,
    lighting,
    finishError: roomFinishError ?? furnishing.finishError ?? null,
    setRoomFinish(part: keyof Finish, materialId: string) {
      // Whether a material fits a surface doesn't depend on the current finish, so it is checked up front;
      // the change itself works on the latest finish, so a floor and a wall picked in quick succession both stick.
      const check = setRoomFinish(DEFAULT_FINISH, part, materialId);
      setRoomFinishError(check.ok ? null : check.error);
      if (check.ok) setFinish((current) => ({ ...current, [part]: materialId }));
    },
    setItemMaterial(id: string, materialId: string | null) {
      setRoomFinishError(null);
      dispatch({ type: "material", id, materialId });
    },
    setLighting,
    /** Everything at once, from a room file: the room, its furniture, finishes and light. */
    replaceScene(scene: StoredScene) {
      dispatch({ type: "load", items: scene.items });
      setFinish(scene.finish);
      setLighting(scene.lighting);
      setRoomFinishError(null);
      setDraft(scene.room);
    },
    dimensionsOn,
    setDimensionsOn(on: boolean) {
      setDimensionsOn(on);
      try {
        localStorage.setItem(DIMENSIONS_KEY, on ? "on" : "off");
      } catch {
        // A preference that isn't remembered is fine.
      }
    },
    startOver() {
      if (unreadable !== null) setAsideScene(unreadable);
      setUnreadable(null);
      dispatch({ type: "reset" });
      setFinish(DEFAULT_FINISH);
      setLighting(DEFAULT_LIGHTING);
      setDraft(PRESETS.rectangle);
    },
  };
}
