import { CATEGORY_LABELS, FURNITURE, type CatalogEntry, type CatalogError, type Item } from "../../domain/02-catalog";
import { describeCatalogError } from "./messages";

interface Props {
  items: Item[];
  selected: string | null;
  outside: string[];
  error: CatalogError | null;
  onAdd: (catalogId: string) => void;
  onSelect: (id: string) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}

const size = (entry: CatalogEntry) => `${entry.size.width} × ${entry.size.depth} m`;

export function CatalogPanel({ items, selected, outside, error, onAdd, onSelect, onRotate, onRemove }: Props) {
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
          {describeCatalogError(error, errorName)}
        </p>
      )}

      <h3>In this room</h3>
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
        </>
      )}
    </section>
  );
}
