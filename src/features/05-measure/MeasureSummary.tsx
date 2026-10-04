import type { Item } from "../../domain/02-catalog";
import { formatLength, type Clearance, type Collision, type Passage } from "../../domain/05-measure";

const SIDE_LABELS: Record<Clearance["side"], string> = { left: "left", right: "right", back: "back", front: "front" };

interface Props {
  items: Item[];
  selected: Item | null;
  clearances: Clearance[];
  collisions: Collision[];
  passages: Passage[];
  onSelect: (id: string) => void;
}

/**
 * The measurements in words: how much floor is free around the selected piece, which pieces stand in
 * each other, and which gaps are too narrow to walk through. Works without the 3D view.
 */
export function MeasureSummary({ items, selected, clearances, collisions, passages, onSelect }: Props) {
  const name = (id: string) => items.find((item) => item.id === id)?.name ?? "A piece";
  return (
    <div className="measures">
      {selected && clearances.length > 0 && (
        <p className="hint" aria-label={`Free floor around ${selected.name}`}>
          To the walls:{" "}
          {clearances.map((clearance, index) => (
            <span key={clearance.side}>
              {index > 0 && " · "}
              {SIDE_LABELS[clearance.side]} <strong>{formatLength(clearance.distance)}</strong>
            </span>
          ))}
        </p>
      )}
      {collisions.length > 0 && (
        <div className="error" role="alert">
          <p>{collisions.length === 1 ? "Two pieces stand in each other:" : `${collisions.length} pairs of pieces stand in each other:`}</p>
          <ul>
            {collisions.map((collision) => (
              <li key={`${collision.a}:${collision.b}`}>
                <button type="button" className="link" onClick={() => onSelect(collision.a)}>
                  {name(collision.a)}
                </button>{" "}
                and{" "}
                <button type="button" className="link" onClick={() => onSelect(collision.b)}>
                  {name(collision.b)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {passages.length > 0 && (
        <div className="hint" role="status">
          <p>Narrow to walk between (under 60 cm):</p>
          <ul>
            {passages.map((passage) => (
              <li key={`${passage.a}:${passage.b}`}>
                {name(passage.a)} and {name(passage.b)} — {formatLength(passage.width)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
