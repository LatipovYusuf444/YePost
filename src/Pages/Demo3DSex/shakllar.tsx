import * as THREE from "three";

// Oddiy shakllar (soya tashlaydi va qabul qiladi).

/** Quti: soya tashlaydi va qabul qiladi. */
export function Quti({ o, p, mat, r }: { o: [number, number, number]; p: [number, number, number]; mat: THREE.Material; r?: [number, number, number] }) {
  return (
    <mesh position={p} rotation={r} material={mat} castShadow receiveShadow>
      <boxGeometry args={o} />
    </mesh>
  );
}

export function Silindr({ r, h, p, mat, rot, seg = 24 }: { r: number; h: number; p: [number, number, number]; mat: THREE.Material; rot?: [number, number, number]; seg?: number }) {
  return (
    <mesh position={p} rotation={rot} material={mat} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, h, seg]} />
    </mesh>
  );
}
