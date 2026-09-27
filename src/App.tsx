import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { FINE_NUDGE, NUDGE } from "./domain/03-move";
import type { CameraView } from "./domain/01-room";
import { RoomEditor, useRoom, webglAvailable } from "./features/01-room";
import { CatalogPanel } from "./features/02-catalog";

// Three.js is most of the download; the editor is usable while it arrives.
const RoomView = lazy(() => import("./features/01-room/RoomView").then((module) => ({ default: module.RoomView })));

export default function App() {
  const state = useRoom();
  const [view, setView] = useState<CameraView>("perspective");
  const canRender = useMemo(() => webglAvailable(), []);

  // Keyboard moves work with or without the 3D view: arrows step the selected piece (Shift for 1 cm),
  // R turns it, Delete removes it, Escape lets go. Typing in a field is left alone.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!state.selected || event.metaKey || event.ctrlKey || event.altKey) return;
      if (target instanceof Element && target.closest("input, textarea, select")) return;
      const step = event.shiftKey ? FINE_NUDGE : NUDGE;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (event.key in moves) {
        event.preventDefault();
        state.nudgeItem(state.selected, ...moves[event.key]!);
      } else if (event.key === "r" || event.key === "R") {
        state.rotateItem(state.selected);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        state.removeItem(state.selected);
      } else if (event.key === "Escape") {
        state.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Room configurator</h1>
        <div className="views" role="group" aria-label="Camera">
          <button type="button" aria-pressed={view === "perspective"} onClick={() => setView("perspective")}>
            3D
          </button>
          <button type="button" aria-pressed={view === "plan"} onClick={() => setView("plan")}>
            Plan
          </button>
        </div>
      </header>

      {state.unreadable !== null && (
        <div className="notice" role="alert">
          <p>The saved room couldn't be read, so it wasn't loaded — and nothing will be saved over it.</p>
          <button type="button" onClick={state.startOver}>
            Keep it aside and start a new room
          </button>
        </div>
      )}

      <main className="layout">
        <RoomEditor
          draft={state.draft}
          room={state.room}
          error={state.error}
          onChange={state.setDraft}
          onPreset={state.usePreset}
        />
        <CatalogPanel
          items={state.items}
          selected={state.selected}
          outside={state.outside}
          error={state.itemError}
          errorAction={state.errorAction}
          snapOn={state.snapOn}
          snapped={state.snapped}
          onSnapChange={state.setSnapOn}
          onPosition={(id, target) => state.moveItem(id, target, true)}
          onAdd={state.addItem}
          onSelect={state.select}
          onRotate={state.rotateItem}
          onRemove={state.removeItem}
        />
        <div className="view" data-testid="view">
          {canRender ? (
            <Suspense fallback={<div className="view-fallback" role="status"><p>Loading the 3D view…</p></div>}>
              <RoomView
                room={state.room}
                draft={state.draft}
                view={view}
                items={state.items}
                selected={state.selected}
                outside={state.outside}
                snap={state.snap}
                onSelect={state.select}
                onMove={(id, target) => state.moveItem(id, target)}
              />
            </Suspense>
          ) : (
            <div className="view-fallback" role="note">
              <p>This browser can't show 3D (WebGL is off or unavailable). The room editor still works and everything is saved.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
