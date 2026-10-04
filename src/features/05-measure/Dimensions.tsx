import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { formatLength, type Clearance, type WallLabel } from "../../domain/05-measure";

const LIFT = 0.02; // just above the floor, so the lines are never hidden in it
/** Label height in metres for a room up to 5 m across; bigger rooms are seen from further away. */
const LABEL_HEIGHT = 0.24;
const labelHeight = (roomSize: number) => Math.max(LABEL_HEIGHT, roomSize * 0.045);

/**
 * A length drawn into a small texture and shown on a sprite that always faces the camera. No DOM
 * nodes in the scene and no font to download; the browser's own sans-serif draws the digits.
 */
function Label({ x, z, text, size, accent = false }: { x: number; z: number; text: string; size: number; accent?: boolean }) {
  const texture = useMemo(() => {
    const scale = 4;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    const font = `600 ${14 * scale}px system-ui, sans-serif`;
    context.font = font;
    const width = Math.ceil(context.measureText(text).width) + 14 * scale;
    canvas.width = width;
    canvas.height = 26 * scale;
    context.font = font;
    context.fillStyle = accent ? "#ffb547" : "rgba(20, 22, 28, 0.85)";
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, 6 * scale);
    context.fill();
    context.fillStyle = accent ? "#1d1a14" : "#f2f0eb";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + scale);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [text, accent]);
  useEffect(() => () => texture.dispose(), [texture]);
  const image = texture.image as HTMLCanvasElement;
  const aspect = image.width / image.height;
  return (
    // raycast disabled: a finger or the mouse goes through the label to the piece or the floor beneath.
    <sprite position={[x, LIFT + size / 2, z]} scale={[size * aspect, size, 1]} raycast={() => null} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent />
    </sprite>
  );
}

/** Wall lengths around the room, and the free floor from the selected piece to each wall. */
export function Dimensions({ labels, clearances, roomSize }: { labels: WallLabel[]; clearances: Clearance[]; roomSize: number }) {
  const size = labelHeight(roomSize);
  return (
    <>
      {labels.map((label) => (
        <Label key={label.wall} x={label.at.x} z={label.at.z} text={formatLength(label.length)} size={size} />
      ))}
      {clearances
        .filter((clearance) => clearance.distance > 0.005)
        .map((clearance) => (
          <group key={clearance.side}>
            <Line
              points={[
                [clearance.from.x, LIFT, clearance.from.z],
                [clearance.to.x, LIFT, clearance.to.z],
              ]}
              color="#ffb547"
              lineWidth={2}
              dashed
              dashSize={0.08}
              gapSize={0.05}
              raycast={() => null}
            />
            <Label x={(clearance.from.x + clearance.to.x) / 2} z={(clearance.from.z + clearance.to.z) / 2} text={formatLength(clearance.distance)} size={size} accent />
          </group>
        ))}
    </>
  );
}
