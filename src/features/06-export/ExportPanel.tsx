import { useRef, useState } from "react";
import { parseScene, sceneJson, type StoredScene } from "../../adapters/scene-store";
import { FURNITURE } from "../../domain/02-catalog";
import { planFileName, planSvg, type ExportError } from "../../domain/06-export";
import { describeExportError } from "./messages";

interface Props {
  scene: StoredScene;
  /** The room form currently has crossing walls: exports use the last valid room, and say so. */
  draftInvalid: boolean;
  onReplace: (scene: StoredScene) => void;
}

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** The plan as a drawing with every length on it, the whole scene as a file, and opening one again. */
export function ExportPanel({ scene, draftInvalid, onReplace }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<ExportError | null>(null);
  const [pending, setPending] = useState<{ scene: StoredScene; file: string } | null>(null);

  const open = async (file: File) => {
    setStatus("");
    setError(null);
    const parsed = parseScene(await file.text());
    if (!parsed.ok) return setError(parsed.error);
    // Opening a file over an empty room needs no question; over a furnished one it does.
    if (scene.items.length === 0) {
      onReplace(parsed.value);
      setStatus(`Opened ${parsed.value.room.name}.`);
    } else setPending({ scene: parsed.value, file: file.name });
  };

  return (
    <div className="export">
      <h3>Save & export</h3>
      {draftInvalid && <p className="hint">The walls in the form cross — files use the last valid room, shown in the view.</p>}
      <div className="presets">
        <button
          type="button"
          onClick={() => {
            const svg = planSvg(scene.room, scene.items, FURNITURE);
            if (!svg.ok) return setError(svg.error);
            download(svg.value, planFileName(scene.room), "image/svg+xml");
            setStatus("Floor plan saved.");
          }}
        >
          Floor plan (SVG)
        </button>
        <button
          type="button"
          onClick={() => {
            download(sceneJson(scene), planFileName(scene.room, "json"), "application/json");
            setStatus("Room saved to a file — open it here again any time.");
          }}
        >
          Room file (JSON)
        </button>
        <button type="button" onClick={() => input.current?.click()}>
          Open a room file…
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        aria-label="Open a room file"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void open(file);
        }}
      />
      {pending && (
        <div className="notice" role="alertdialog" aria-label="Replace the current room?">
          <p>
            Replace the current room with <strong>{pending.scene.room.name}</strong> ({pending.scene.items.length}{" "}
            {pending.scene.items.length === 1 ? "piece" : "pieces"}) from {pending.file}? Save the current one to a file first if you want to keep it.
          </p>
          <div className="presets">
            <button
              type="button"
              onClick={() => {
                onReplace(pending.scene);
                setStatus(`Opened ${pending.scene.room.name}.`);
                setPending(null);
              }}
            >
              Replace
            </button>
            <button type="button" onClick={() => setPending(null)}>
              Keep the current room
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {describeExportError(error)}
        </p>
      )}
      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
