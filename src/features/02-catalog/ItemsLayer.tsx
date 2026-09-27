import { FURNITURE, type Item } from "../../domain/02-catalog";

interface Props {
  items: Item[];
  selected: string | null;
  outside: string[];
  onSelect: (id: string) => void;
}

/** The placed furniture as simple solids: boxes and cylinders sized from the catalogue. */
export function ItemsLayer({ items, selected, outside, onSelect }: Props) {
  return (
    <>
      {items.map((item) => {
        const entry = FURNITURE.find((e) => e.id === item.catalogId);
        if (!entry) return null;
        const { width, depth, height } = entry.size;
        const colour = outside.includes(item.id) ? "#d23c3c" : entry.colour;
        return (
          <group
            key={item.id}
            position={[item.transform.x, 0, item.transform.z]}
            // The domain turns clockwise seen from above; Three.js turns anticlockwise about +y.
            rotation={[0, (-item.transform.rotation * Math.PI) / 180, 0]}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item.id);
            }}
          >
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow scale={entry.shape === "cylinder" ? [width / 2, height, depth / 2] : [width, height, depth]}>
              {entry.shape === "cylinder" ? <cylinderGeometry args={[1, 1, 1, 32]} /> : <boxGeometry args={[1, 1, 1]} />}
              <meshStandardMaterial color={colour} emissive={item.id === selected ? "#3a5a9a" : "#000000"} emissiveIntensity={item.id === selected ? 0.6 : 0} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
