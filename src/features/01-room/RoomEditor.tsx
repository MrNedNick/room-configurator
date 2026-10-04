import type { ReactNode } from "react";
import type { Point, Room, RoomError } from "../../domain/01-room";
import { floorArea, walls } from "../../domain/01-room";
import { describeRoomError, formatMetres } from "./messages";
import type { PRESETS } from "./useRoom";

interface Props {
  draft: Room;
  room: Room;
  error: RoomError | null;
  onChange: (room: Room) => void;
  onPreset: (name: keyof typeof PRESETS) => void;
  /** Saving and exporting the room, under the form. */
  footer?: ReactNode;
}

/** Corners as number fields; a bad value shows the reason and leaves the last good room on screen. */
export function RoomEditor({ draft, room, error, onChange, onPreset, footer }: Props) {
  const setCorner = (index: number, patch: Partial<Point>) =>
    onChange({ ...draft, corners: draft.corners.map((p, i) => (i === index ? { ...p, ...patch } : p)) });
  const addCorner = () => {
    const last = draft.corners.at(-1)!;
    const first = draft.corners[0]!;
    onChange({ ...draft, corners: [...draft.corners, { x: (last.x + first.x) / 2, z: (last.z + first.z) / 2 }] });
  };
  const removeCorner = (index: number) => onChange({ ...draft, corners: draft.corners.filter((_, i) => i !== index) });
  const number = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));

  return (
    <section className="panel" aria-labelledby="room-title">
      <h2 id="room-title">Room</h2>
      <div className="presets" role="group" aria-label="Start from">
        <button type="button" onClick={() => onPreset("rectangle")}>Rectangle</button>
        <button type="button" onClick={() => onPreset("l-shape")}>L-shape</button>
      </div>

      <label className="field">
        Name
        <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </label>
      <label className="field">
        Ceiling height, m
        <input
          type="number"
          step="0.05"
          min="2"
          max="6"
          value={Number.isNaN(draft.height) ? "" : draft.height}
          onChange={(e) => onChange({ ...draft, height: number(e.target.value) })}
        />
      </label>

      <table className="corners">
        <caption>Corners, in metres</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">x</th>
            <th scope="col">z</th>
            <th scope="col"><span className="visually-hidden">Remove</span></th>
          </tr>
        </thead>
        <tbody>
          {draft.corners.map((corner, index) => (
            <tr key={index}>
              <th scope="row">{index + 1}</th>
              <td>
                <input
                  type="number"
                  step="0.1"
                  aria-label={`Corner ${index + 1} x`}
                  value={Number.isNaN(corner.x) ? "" : corner.x}
                  onChange={(e) => setCorner(index, { x: number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  aria-label={`Corner ${index + 1} z`}
                  value={Number.isNaN(corner.z) ? "" : corner.z}
                  onChange={(e) => setCorner(index, { z: number(e.target.value) })}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="icon"
                  aria-label={`Remove corner ${index + 1}`}
                  disabled={draft.corners.length <= 3}
                  onClick={() => removeCorner(index)}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={addCorner}>Add corner</button>

      {error ? (
        <p className="error" role="alert">
          {describeRoomError(error)}{" "}
          {error.reason === "walls-intersect"
            ? "The crossing walls are drawn in red; the last valid room stays saved."
            : "The view shows the last valid room."}
        </p>
      ) : (
        <p className="summary" role="status">
          {formatMetres(floorArea(room))}² floor · {walls(room).length} walls · {formatMetres(room.height)} ceiling
        </p>
      )}
      {footer}
    </section>
  );
}
