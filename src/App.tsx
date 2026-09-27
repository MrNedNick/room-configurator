import { lazy, Suspense, useMemo, useState } from "react";
import type { CameraView } from "./domain/01-room";
import { RoomEditor, useRoom, webglAvailable } from "./features/01-room";
import { CatalogPanel } from "./features/02-catalog";

// Three.js is most of the download; the editor is usable while it arrives.
const RoomView = lazy(() => import("./features/01-room/RoomView").then((module) => ({ default: module.RoomView })));

export default function App() {
  const state = useRoom();
  const [view, setView] = useState<CameraView>("perspective");
  const canRender = useMemo(() => webglAvailable(), []);

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
                onSelect={state.select}
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
