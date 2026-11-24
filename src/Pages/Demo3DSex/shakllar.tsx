import { useLayoutEffect, useRef, type ReactNode } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

/** Qirralari yumaloqlangan quti (stanok korpusi, kabina, mashina kuzovi) — o'tkir qirrali qutidan ancha tabiiy ko'rinadi. */
export function Yumaloq({ o, p, mat, r, radius = 0.04, soya = true }: { o: [number, number, number]; p: [number, number, number]; mat: THREE.Material; r?: [number, number, number]; radius?: number; soya?: boolean }) {
  const rad = Math.min(radius, Math.min(...o) / 2 - 0.001);
  return <RoundedBox args={o} radius={rad} smoothness={3} position={p} rotation={r} material={mat} castShadow={soya} receiveShadow />;
}

const ATRIBUTLAR = ["position", "normal", "uv"];

/**
 * Qimirlamaydigan qismlar guruhi: ichidagi meshlar material (va soya bayrog'i) bo'yicha bitta geometriyaga birlashtiriladi —
 * yuzlab draw call o'rniga o'nlabtasi. Asl meshlar yashiriladi (sahna daraxtida qoladi). Ichida animatsiya yoki
 * bosish hodisasi bo'lgan mesh bo'lmasligi kerak. `kalit` o'zgarsa qayta birlashtiriladi.
 */
export function StatikGuruh({ children, kalit }: { children: ReactNode; kalit?: unknown }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const guruh = ref.current;
    if (!guruh) return;
    guruh.updateWorldMatrix(true, true);
    const teskari = new THREE.Matrix4().copy(guruh.matrixWorld).invert();
    const nisbiy = new THREE.Matrix4();
    const toplam = new Map<string, { material: THREE.Material; soya: boolean; qabul: boolean; geo: THREE.BufferGeometry[]; manba: THREE.Mesh[] }>();
    guruh.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || mesh.userData.birlashgan || Array.isArray(mesh.material)) return;
      const asl = mesh.geometry;
      if (!ATRIBUTLAR.every((a) => asl.getAttribute(a))) return;
      const geo = asl.index ? asl.toNonIndexed() : asl.clone();
      for (const nom of Object.keys(geo.attributes)) if (!ATRIBUTLAR.includes(nom)) geo.deleteAttribute(nom);
      geo.morphAttributes = {};
      geo.applyMatrix4(nisbiy.multiplyMatrices(teskari, mesh.matrixWorld));
      const kalitM = `${mesh.material.uuid}|${mesh.castShadow ? 1 : 0}|${mesh.receiveShadow ? 1 : 0}`;
      let t = toplam.get(kalitM);
      if (!t) {
        t = { material: mesh.material, soya: mesh.castShadow, qabul: mesh.receiveShadow, geo: [], manba: [] };
        toplam.set(kalitM, t);
      }
      t.geo.push(geo);
      t.manba.push(mesh);
    });
    const yangi: THREE.Mesh[] = [];
    const yashirilgan: THREE.Mesh[] = [];
    for (const t of toplam.values()) {
      const birlashgan = t.manba.length > 1 ? mergeGeometries(t.geo, false) : null;
      t.geo.forEach((g) => g.dispose());
      if (!birlashgan) continue;
      const mesh = new THREE.Mesh(birlashgan, t.material);
      mesh.castShadow = t.soya;
      mesh.receiveShadow = t.qabul;
      mesh.userData.birlashgan = true;
      guruh.add(mesh);
      yangi.push(mesh);
      t.manba.forEach((m) => { m.visible = false; yashirilgan.push(m); });
    }
    return () => {
      yangi.forEach((m) => { guruh.remove(m); m.geometry.dispose(); });
      yashirilgan.forEach((m) => { m.visible = true; });
    };
  }, [kalit]);
  return <group ref={ref}>{children}</group>;
}
