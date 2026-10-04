import type { ReactNode } from "react";
import { FURNITURE, type Item } from "../../domain/02-catalog";
import {
  MATERIALS,
  MAX_LAMP_LIGHTS,
  MAX_SHADOW_ITEMS,
  TIME_LABELS,
  type Finish,
  type FinishError,
  type Lighting,
  type LightRig,
  type Material,
  type Surface,
} from "../../domain/04-finish";
import { describeFinishError } from "./messages";

interface Props {
  finish: Finish;
  lighting: Lighting;
  rig: LightRig;
  selected: Item | null;
  error: FinishError | null;
  onFinish: (part: keyof Finish, materialId: string) => void;
  onItemMaterial: (id: string, materialId: string | null) => void;
  onLighting: (lighting: Lighting) => void;
}

function Swatches({ label, surface, value, onPick, extra }: { label: string; surface: Surface; value: string | null; onPick: (id: string) => void; extra?: ReactNode }) {
  return (
    <fieldset className="swatches">
      <legend>{label}</legend>
      <div role="radiogroup" aria-label={label}>
        {extra}
        {MATERIALS.filter((material: Material) => material.surface === surface).map((material) => (
          <button
            key={material.id}
            type="button"
            role="radio"
            aria-checked={value === material.id}
            title={material.name}
            onClick={() => onPick(material.id)}
          >
            <span className="swatch" style={{ background: material.colour }} aria-hidden="true" />
            {material.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Floor and wall finishes, a finish for the selected piece, and the light: time of day and lamps. */
export function FinishPanel({ finish, lighting, rig, selected, error, onFinish, onItemMaterial, onLighting }: Props) {
  const entry = selected ? FURNITURE.find((candidate) => candidate.id === selected.catalogId) : undefined;
  return (
    <section className="panel finish" aria-labelledby="finish-title" tabIndex={0}>
      <h2 id="finish-title">Finish & light</h2>
      <Swatches label="Floor" surface="floor" value={finish.floor} onPick={(id) => onFinish("floor", id)} />
      <Swatches label="Walls" surface="wall" value={finish.walls} onPick={(id) => onFinish("walls", id)} />
      {selected && entry ? (
        <Swatches
          label={`${selected.name} finish`}
          surface="furniture"
          value={selected.materialId ?? null}
          onPick={(id) => onItemMaterial(selected.id, id)}
          extra={
            <button type="button" role="radio" aria-checked={!selected.materialId} onClick={() => onItemMaterial(selected.id, null)}>
              <span className="swatch" style={{ background: entry.colour }} aria-hidden="true" />
              As in the catalogue
            </button>
          }
        />
      ) : (
        <p className="hint">Select a piece to change its finish.</p>
      )}
      {error && (
        <p className="error" role="alert">
          {describeFinishError(error)}
        </p>
      )}

      <fieldset className="swatches">
        <legend>Light</legend>
        <div role="radiogroup" aria-label="Time of day">
          {(Object.keys(TIME_LABELS) as Lighting["time"][]).map((time) => (
            <button key={time} type="button" role="radio" aria-checked={lighting.time === time} onClick={() => onLighting({ ...lighting, time })}>
              {TIME_LABELS[time]}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={lighting.lampsOn} onChange={(event) => onLighting({ ...lighting, lampsOn: event.target.checked })} />
          Lamps in the room are on
        </label>
      </fieldset>
      {rig.glowingOnly.length > 0 && (
        <p className="hint" role="status">
          {rig.glowingOnly.length === 1 ? "1 more lamp glows" : `${rig.glowingOnly.length} more lamps glow`} without lighting the room — the first{" "}
          {MAX_LAMP_LIGHTS} light it, which keeps the view smooth.
        </p>
      )}
      {!rig.shadows && (
        <p className="hint" role="status">
          Shadows are off with more than {MAX_SHADOW_ITEMS} pieces, to keep the view responsive.
        </p>
      )}
    </section>
  );
}
