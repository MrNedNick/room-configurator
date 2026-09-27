import { Canvas, useThree } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { cameraPreset, crossingWalls, walls, type CameraView, type Room } from "../../domain/01-room";
import type { Item } from "../../domain/02-catalog";
import { ItemsLayer } from "../02-catalog/ItemsLayer";

const WALL_THICKNESS = 0.12;

function Floor({ room }: { room: Room }) {
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
      <meshStandardMaterial color="#d9cbb4" side={THREE.DoubleSide} />
    </mesh>
  );
}

function Walls({ room, highlight }: { room: Room; highlight: number[] }) {
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
            <meshStandardMaterial color={bad ? "#d23c3c" : "#f1efe9"} transparent opacity={bad ? 0.9 : 0.55} />
          </mesh>
        );
      })}
    </>
  );
}

/** Moves the camera when the room or the view changes, and reports a lost WebGL context. */
function CameraRig({ room, view, onContextLost }: { room: Room; view: CameraView; onContextLost: () => void }) {
  const { camera, gl, size } = useThree();
  const aspect = size.height > 0 ? size.width / size.height : 1.6;
  const preset = useMemo(() => cameraPreset(room, view, 50, aspect), [room, view, aspect]);

  useEffect(() => {
    camera.position.set(...preset.position);
    camera.lookAt(...preset.target);
  }, [camera, preset]);

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
      target={preset.target}
      minDistance={preset.minDistance}
      maxDistance={preset.maxDistance}
      maxPolarAngle={preset.maxPolarAngle}
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
  items: Item[];
  selected: string | null;
  outside: string[];
  onSelect: (id: string | null) => void;
}

export function RoomView({ room, draft, view, items, selected, outside, onSelect }: Props) {
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
      key={generation}
      shadows
      camera={{ fov: 50, near: 0.05, far: 500 }}
      aria-label="3D view of the room"
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#1d2027"]} />
      <hemisphereLight args={["#ffffff", "#5a5048", 0.9]} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} castShadow />
      <Grid position={[0, -0.001, 0]} args={[60, 60]} cellSize={0.5} sectionSize={1} infiniteGrid fadeDistance={40} />
      <Floor room={shown} />
      <Walls room={shown} highlight={crossing ?? []} />
      <ItemsLayer items={items} selected={selected} outside={outside} onSelect={onSelect} />
      <CameraRig room={room} view={view} onContextLost={() => setContextLost(true)} />
    </Canvas>
  );
}
