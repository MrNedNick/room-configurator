import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useRef, useState } from "react";
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
  onSelect: (id: string) => void;
  onMove: (id: string, target: Point) => void;
}

const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * The placed furniture as simple solids. Dragging a piece moves it over the floor with snapping; while
 * dragging, orbiting is paused (so one finger or the mouse moves the piece, not the camera) and the
 * piece turns red wherever it would stick through a wall — dropping it there puts it back.
 */
export function ItemsLayer({ room, items, selected, outside, snap, glowing, onSelect, onMove }: Props) {
  const controls = useThree((state) => state.controls) as { enabled: boolean } | null;
  const [drag, setDrag] = useState<{ id: string; x: number; z: number; valid: boolean } | null>(null);
  const grab = useRef<{ dx: number; dz: number }>({ dx: 0, dz: 0 });
  const hit = new THREE.Vector3();

  const pointOnFloor = (event: ThreeEvent<PointerEvent>) => (event.ray.intersectPlane(floor, hit) ? { x: hit.x, z: hit.z } : null);

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
              event.stopPropagation();
              onSelect(item.id);
              const point = pointOnFloor(event);
              if (!point) return;
              grab.current = { dx: item.transform.x - point.x, dz: item.transform.z - point.z };
              (event.target as unknown as Element).setPointerCapture(event.pointerId);
              if (controls) controls.enabled = false;
              setDrag({ id: item.id, x: item.transform.x, z: item.transform.z, valid: true });
            }}
            onPointerMove={(event) => {
              if (!dragging) return;
              event.stopPropagation();
              const point = pointOnFloor(event);
              if (!point) return;
              const target = { x: point.x + grab.current.dx, z: point.z + grab.current.dz };
              const snapped = snapPosition(room, entry, item, target, snap).transform;
              setDrag({ id: item.id, x: snapped.x, z: snapped.z, valid: insideRoom(footprint(entry, snapped), room) });
            }}
            onPointerUp={(event) => {
              if (!dragging) return;
              event.stopPropagation();
              (event.target as unknown as Element).releasePointerCapture(event.pointerId);
              if (controls) controls.enabled = true;
              if (drag.valid && (drag.x !== item.transform.x || drag.z !== item.transform.z)) onMove(item.id, { x: drag.x, z: drag.z });
              setDrag(null);
            }}
          >
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow scale={entry.shape === "cylinder" ? [width / 2, height, depth / 2] : [width, height, depth]}>
              {entry.shape === "cylinder" ? <cylinderGeometry args={[1, 1, 1, 32]} /> : <boxGeometry args={[1, 1, 1]} />}
              <meshStandardMaterial
                color={red ? "#d23c3c" : finish.colour}
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
