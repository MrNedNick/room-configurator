import { CATEGORY_LABELS, FURNITURE, type CatalogEntry, type CatalogError, type Item } from "../../domain/02-catalog";
import { describeCatalogError } from "./messages";
import type { Point } from "../../domain/01-room";
import type { MoveResult } from "../../domain/03-move";

interface Props {
  items: Item[];
  selected: string | null;
  outside: string[];
  error: CatalogError | null;
  errorAction?: "add" | "turn" | "move" | null;
  snapOn: boolean;
  snapped: MoveResult["snapped"];
  onSnapChange: (on: boolean) => void;
  onPosition: (id: string, target: Point) => void;
  onAdd: (catalogId: string) => void;
  onSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

const size = (entry: CatalogEntry) => `${entry.size.width} × ${entry.size.depth} m`;

export function CatalogPanel({ items, selected, outside, error, errorAction = null, snapOn, snapped, onSnapChange, onPosition, onAdd, onSelect, onRotate, onRemove }: Props) {
  const current = items.find((item) => item.id === selected) ?? null;
  const categories = Object.keys(CATEGORY_LABELS) as CatalogEntry["category"][];
  const errorName = error?.id ? (FURNITURE.find((e) => e.id === error.id)?.name ?? items.find((i) => i.id === error.id)?.name) : undefined;

  return (
    <section className="panel catalog" aria-labelledby="catalog-title">
      <h2 id="catalog-title">Furniture</h2>

      <details className="catalogue" open>
        <summary>Catalogue</summary>
        {categories.map((category) => (
          <div key={category} className="category">
            <h3>{CATEGORY_LABELS[category]}</h3>
            <ul>
              {FURNITURE.filter((entry) => entry.category === category).map((entry) => (
                <li key={entry.id}>
                  <span className="swatch" style={{ background: entry.colour }} aria-hidden="true" />
                  <span className="entry-name">{entry.name}</span>
                  <span className="entry-size">{size(entry)}</span>
                  <button type="button" aria-label={`Add ${entry.name}`} onClick={() => onAdd(entry.id)}>
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>

      {error && (
        <p className="error" role="alert">
          {describeCatalogError(error, errorName, errorAction)}
        </p>
      )}

      <h3>In this room</h3>
      <label className="check">
        <input type="checkbox" checked={snapOn} onChange={(e) => onSnapChange(e.target.checked)} />
        Snap to a 10 cm grid and to walls when dragging
      </label>
      {items.length === 0 ? (
        <p className="summary">Nothing yet — add a piece from the catalogue; it goes to the nearest free spot.</p>
      ) : (
        <>
          {outside.length > 0 && (
            <p className="error" role="alert">
              {outside.length === 1 ? "1 piece is" : `${outside.length} pieces are`} outside the room after the last change — shown in red.
              Move the walls back or remove {outside.length === 1 ? "it" : "them"}.
            </p>
          )}
          <ul className="placed">
            {items.map((item) => (
              <li key={item.id} className={item.id === selected ? "is-selected" : undefined} data-outside={outside.includes(item.id) || undefined}>
                <button type="button" className="link" aria-pressed={item.id === selected} onClick={() => onSelect(item.id)}>
                  {item.name}
                </button>
                <span className="entry-size">
                  {item.transform.x.toFixed(1)}, {item.transform.z.toFixed(1)} m · {item.transform.rotation}°
                </span>
                <button type="button" aria-label={`Turn ${item.name}`} onClick={() => onRotate(item.id)}>
                  ⟳ 90°
                </button>
                <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <fieldset className="position" key={`${current.id}:${current.transform.x}:${current.transform.z}`}>
              <legend>{current.name}</legend>
              <label className="field">
                x, m
                <input
                  type="number"
                  step="0.05"
                  defaultValue={current.transform.x}
                  onBlur={(e) => Number.isFinite(e.target.valueAsNumber) && onPosition(current.id, { x: e.target.valueAsNumber, z: current.transform.z })}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              </label>
              <label className="field">
                z, m
                <input
                  type="number"
                  step="0.05"
                  defaultValue={current.transform.z}
                  onBlur={(e) => Number.isFinite(e.target.valueAsNumber) && onPosition(current.id, { x: current.transform.x, z: e.target.valueAsNumber })}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              </label>
              <p className="hint">Drag it in the view, or use the arrow keys (Shift for 1 cm) · R turns · Delete removes.</p>
              {snapped?.kind === "wall" && <p className="hint" role="status">Pushed against wall {snapped.wall + 1}.</p>}
            </fieldset>
          ) : (
            <p className="hint">Select a piece to move it.</p>
          )}
        </>
      )}
    </section>
  );
}
