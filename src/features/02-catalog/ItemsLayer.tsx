import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Point, Room } from "../../domain/01-room";
import { footprint, FURNITURE, insideRoom, type Item } from "../../domain/02-catalog";
import { snapPosition, type SnapSettings } from "../../domain/03-move";
import { lookOf } from "../../domain/04-finish";

interface Props {
  room: Room;
  items: Item[];
  selected: string | null;
  outside: string[];
  snap: SnapSettings;
  /** Lamps that are switched on: drawn glowing. */
  glowing: string[];
  /** Pieces standing in another piece: drawn in amber. */
  colliding?: string[];
  onSelect: (id: string) => void;
  onMove: (id: string, target: Point) => void;
}

const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * The placed furniture as simple solids. Dragging a piece moves it over the floor with snapping; while
 * dragging, orbiting is paused (so one finger or the mouse moves the piece, not the camera) and the
 * piece turns red wherever it would stick through a wall — dropping it there puts it back.
 */
export function ItemsLayer({ room, items, selected, outside, snap, glowing, colliding = [], onSelect, onMove }: Props) {
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null;
  const gl = useThree((state) => state.gl);
  type Preview = { id: string; x: number; z: number; target: Point; valid: boolean };
  type Capture = { setPointerCapture: (id: number) => void; releasePointerCapture: (id: number) => void };
  const [drag, setDrag] = useState<Preview | null>(null);
  const active = useRef<{ pointerId: number; capture: Capture; preview: Preview; dx: number; dz: number } | null>(null);
  const hit = new THREE.Vector3();
  const pointOnFloor = (event: ThreeEvent<PointerEvent>) => (event.ray.intersectPlane(floor, hit) ? { x: hit.x, z: hit.z } : null);

  useEffect(() => {
    const cancel = () => {
      const current = active.current;
      active.current = null;
      if (controls) controls.enabled = true;
      if (current) {
        try { current.capture.releasePointerCapture(current.pointerId); } catch { /* Capture may already be gone. */ }
      }
    };
    const onCancel = () => { cancel(); setDrag(null); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    const canvas = gl.domElement;
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("lostpointercapture", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("lostpointercapture", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("keydown", onKey);
      cancel();
    };
  }, [controls, gl]);

  return (
    <>
      {items.map((item) => {
        const entry = FURNITURE.find((e) => e.id === item.catalogId);
        if (!entry) return null;
        const { width, depth, height } = entry.size;
        const dragging = drag?.id === item.id;
        const transform = dragging ? { ...item.transform, x: drag.x, z: drag.z } : item.transform;
        const red = outside.includes(item.id) || (dragging && !drag.valid);
        const finish = lookOf(item, entry);
        const lit = glowing.includes(item.id);
        return (
          <group
            key={item.id}
            position={[transform.x, 0, transform.z]}
            // The domain turns clockwise seen from above; Three.js turns anticlockwise about +y.
            rotation={[0, (-transform.rotation * Math.PI) / 180, 0]}
            onPointerDown={(event) => {
              if (event.button !== 0 || active.current) return;
              event.stopPropagation();
              onSelect(item.id);
              const point = pointOnFloor(event);
              if (!point) return;
              const preview = { id: item.id, x: item.transform.x, z: item.transform.z, target: { x: item.transform.x, z: item.transform.z }, valid: true };
              const capture = event.target as unknown as Capture;
              active.current = { pointerId: event.pointerId, capture, preview, dx: item.transform.x - point.x, dz: item.transform.z - point.z };
              capture.setPointerCapture(event.pointerId);
              gl.domElement.tabIndex = 0;
              gl.domElement.focus({ preventScroll: true });
              if (controls) controls.enabled = false;
              setDrag(preview);
            }}
            onPointerMove={(event) => {
              const current = active.current;
              if (current?.preview.id !== item.id || current.pointerId !== event.pointerId) return;
              event.stopPropagation();
              const point = pointOnFloor(event);
              if (!point) return;
              const target = { x: point.x + current.dx, z: point.z + current.dz };
              const snapped = snapPosition(room, entry, item, target, snap).transform;
              current.preview = { id: item.id, x: snapped.x, z: snapped.z, target, valid: insideRoom(footprint(entry, snapped), room) };
              setDrag(current.preview);
            }}
            onPointerUp={(event) => {
              const current = active.current;
              if (current?.preview.id !== item.id || current.pointerId !== event.pointerId) return;
              event.stopPropagation();
              active.current = null;
              if (controls) controls.enabled = true;
              current.capture.releasePointerCapture(event.pointerId);
              const preview = current.preview;
              // Commit the raw target: the domain applies snapping once, just as in the preview.
              if (preview.valid && (preview.x !== item.transform.x || preview.z !== item.transform.z)) onMove(item.id, preview.target);
              setDrag(null);
            }}
          >
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow scale={entry.shape === "cylinder" ? [width / 2, height, depth / 2] : [width, height, depth]}>
              {entry.shape === "cylinder" ? <cylinderGeometry args={[1, 1, 1, 32]} /> : <boxGeometry args={[1, 1, 1]} />}
              <meshStandardMaterial
                color={red ? "#d23c3c" : colliding.includes(item.id) ? "#e8a33c" : finish.colour}
                roughness={finish.roughness}
                metalness={finish.metalness}
                emissive={item.id === selected ? "#3a5a9a" : lit ? "#ffcf8a" : "#000000"}
                emissiveIntensity={item.id === selected ? 0.6 : lit ? 0.8 : 0}
                transparent={dragging}
                opacity={dragging ? 0.8 : 1}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
