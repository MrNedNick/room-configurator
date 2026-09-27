import { useEffect, useMemo, useState } from "react";
import { validateRoom, type Room } from "../../domain/01-room";
import { loadScene, saveScene, SCENE_VERSION, setAsideScene } from "../../adapters/scene-store";

export const PRESETS: Record<"rectangle" | "l-shape", Room> = {
  rectangle: { name: "Living room", height: 2.7, corners: [{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 5, z: 4 }, { x: 0, z: 4 }] },
  "l-shape": {
    name: "L-shaped studio",
    height: 2.7,
    corners: [{ x: 0, z: 0 }, { x: 7, z: 0 }, { x: 7, z: 3 }, { x: 3, z: 3 }, { x: 3, z: 6 }, { x: 0, z: 6 }],
  },
};

/**
 * The room being edited. `draft` is what the form shows — possibly invalid while typing; `room` is the
 * last valid version, which the 3D view keeps showing so a half-typed number never blanks the scene.
 * Every valid room is saved.
 */
export function useRoom() {
  const initial = useMemo(() => loadScene(), []);
  const [unreadable, setUnreadable] = useState(initial.ok ? null : initial.error.raw);
  const start = initial.ok && initial.value ? initial.value.room : PRESETS.rectangle;
  const [draft, setDraftState] = useState<Room>(start);
  const [room, setRoom] = useState<Room>(start);
  const check = useMemo(() => validateRoom(draft), [draft]);

  function setDraft(next: Room) {
    setDraftState(next);
    const valid = validateRoom(next);
    if (valid.ok) setRoom(valid.value);
  }

  // Saving is the one outside system to keep in step; nothing is written over data that didn't read.
  useEffect(() => {
    if (unreadable === null) saveScene({ version: SCENE_VERSION, room });
  }, [room, unreadable]);

  return {
    draft,
    room,
    error: check.ok ? null : check.error,
    unreadable,
    setDraft,
    usePreset(name: keyof typeof PRESETS) {
      setDraft(PRESETS[name]);
    },
    startOver() {
      if (unreadable !== null) setAsideScene(unreadable);
      setUnreadable(null);
      setDraft(PRESETS.rectangle);
    },
  };
}
