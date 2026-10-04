import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import * as THREE from "three";
import { bounds, cameraPreset, planZoom, crossingWalls, walls, type CameraView, type Room } from "../../domain/01-room";
import type { Item } from "../../domain/02-catalog";
import type { Point } from "../../domain/01-room";
import type { SnapSettings } from "../../domain/03-move";
import { ItemsLayer } from "../02-catalog/ItemsLayer";
import { Dimensions } from "../05-measure/Dimensions";
import type { Clearance, WallLabel } from "../../domain/05-measure";
import { findMaterial, type Finish, type LightRig, type Material } from "../../domain/04-finish";

const FALLBACK: Pick<Material, "colour" | "roughness" | "metalness"> = { colour: "#d9cbb4", roughness: 0.8, metalness: 0 };
const look = (id: string, surface: "floor" | "wall") => {
  const found = findMaterial(id, surface);
  return found.ok ? found.value : FALLBACK;
};

const WALL_THICKNESS = 0.12;

function Floor({ room, material }: { room: Room; material: string }) {
  const finish = look(material, "floor");
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    room.corners.forEach((p, i) => (i === 0 ? s.moveTo(p.x, p.z) : s.lineTo(p.x, p.z)));
    s.closePath();
    return s;
  }, [room]);
  // The shape is drawn in x/y; a quarter turn about x lays it flat with y becoming z.
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={finish.colour} roughness={finish.roughness} metalness={finish.metalness} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Walls({ room, highlight, material }: { room: Room; highlight: number[]; material: string }) {
  const finish = look(material, "wall");
  return (
    <>
      {walls(room).map((wall) => {
        const angle = Math.atan2(wall.to.z - wall.from.z, wall.to.x - wall.from.x);
        const bad = highlight.includes(wall.index);
        return (
          <mesh
            key={wall.index}
            position={[(wall.from.x + wall.to.x) / 2, room.height / 2, (wall.from.z + wall.to.z) / 2]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[wall.length + WALL_THICKNESS, room.height, WALL_THICKNESS]} />
            {/* Walls stay see-through so the room can be looked into from any side. */}
            <meshStandardMaterial color={bad ? "#d23c3c" : finish.colour} roughness={finish.roughness} transparent opacity={bad ? 0.9 : 0.6} />
          </mesh>
        );
      })}
    </>
  );
}

/** Fits each projection to the room and restores the view on request. */
function CameraRig({ room, view, reset, onContextLost }: { room: Room; view: CameraView; reset: number; onContextLost: () => void }) {
  const { camera, gl, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const aspect = size.height > 0 ? size.width / size.height : 1.6;
  const preset = cameraPreset(room, view, 50, aspect);
  const [px, py, pz] = preset.position;
  const [tx, ty, tz] = preset.target;
  const zoom = planZoom(room, size.width, size.height);

  useEffect(() => {
    const orbit = controls.current;
    // Flush any unfinished damping before applying the new frame.
    if (orbit) { orbit.enableDamping = false; orbit.update(); }
    camera.up.set(0, view === "plan" ? 0 : 1, view === "plan" ? -1 : 0);
    camera.position.set(px, py, pz);
    // Three.js cameras are mutable objects owned by the renderer.
    // oxlint-disable-next-line react/immutability
    if (camera instanceof THREE.OrthographicCamera) camera.zoom = zoom;
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
    if (orbit) {
      orbit.target.set(tx, ty, tz);
      orbit.update();
      orbit.enableDamping = true;
    }
  }, [camera, view, px, py, pz, tx, ty, tz, zoom, reset]);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);

  return (
    <OrbitControls
      ref={controls}
      minDistance={preset.minDistance}
      maxDistance={preset.maxDistance}
      minZoom={zoom / 4}
      maxZoom={zoom * 8}
      maxPolarAngle={view === "plan" ? Math.PI : preset.maxPolarAngle}
      enableRotate={view === "perspective"}
      makeDefault
    />
  );
}

interface Props {
  room: Room;
  /** A draft that fails validation: its crossing walls are drawn in red on top of the last valid room. */
  draft: Room;
  view: CameraView;
  reset?: number;
  items: Item[];
  selected: string | null;
  outside: string[];
  snap: SnapSettings;
  finish: Finish;
  rig: LightRig;
  /** Wall lengths and the selected piece's clearances; empty when dimensions are switched off. */
  labels: WallLabel[];
  clearances: Clearance[];
  colliding: string[];
  onSelect: (id: string | null) => void;
  onMove: (id: string, target: Point) => void;
}

export function RoomView({ room, draft, view, reset = 0, items, selected, outside, snap, finish, rig, labels, clearances, colliding, onSelect, onMove }: Props) {
  const [contextLost, setContextLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const crossing = crossingWalls(draft);
  const shown = crossing ? draft : room;

  if (contextLost) {
    return (
      <div className="view-fallback" role="alert">
        <p>The 3D view stopped — the browser took its graphics context back (too many tabs using the GPU, or a driver reset).</p>
        <p>The room is safe: it is kept in the form and saved.</p>
        <button
          type="button"
          onClick={() => {
            setContextLost(false);
            setGeneration((n) => n + 1);
          }}
        >
          Restart the 3D view
        </button>
      </div>
    );
  }

  return (
    <Canvas
      key={`${generation}:${view}`}
      shadows={rig.shadows}
      orthographic={view === "plan"}
      camera={view === "plan" ? { near: 0.05, far: 500 } : { fov: 50, near: 0.05, far: 500 }}
      tabIndex={0}
      aria-label="3D view of the room"
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={[rig.background]} />
      <hemisphereLight args={[rig.ambient.colour, "#5a5048", rig.ambient.intensity]} />
      <directionalLight position={rig.sun.position} color={rig.sun.colour} intensity={rig.sun.intensity} castShadow={rig.shadows} />
      {rig.lamps.map((lamp) => (
        // Lamps light a few metres around them and fade with distance, like a real shade.
        <pointLight key={lamp.itemId} position={lamp.position} color={lamp.colour} intensity={lamp.intensity} distance={6} decay={1.5} />
      ))}
      <Grid position={[0, -0.001, 0]} args={[60, 60]} cellSize={0.5} sectionSize={1} infiniteGrid fadeDistance={40} />
      <Floor room={shown} material={finish.floor} />
      <Walls room={shown} highlight={crossing ?? []} material={finish.walls} />
      <ItemsLayer
        room={room}
        items={items}
        selected={selected}
        outside={outside}
        snap={snap}
        glowing={[...rig.lamps.map((lamp) => lamp.itemId), ...rig.glowingOnly]}
        colliding={colliding}
        onSelect={onSelect}
        onMove={onMove}
      />
      <Dimensions labels={labels} clearances={clearances} roomSize={Math.max(bounds(room).width, bounds(room).depth)} />
      <CameraRig room={room} view={view} reset={reset} onContextLost={() => setContextLost(true)} />
    </Canvas>
  );
}
