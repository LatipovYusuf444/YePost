import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Materiallar } from "./materiallar";
import { Quti, Silindr } from "./shakllar";

// Sexdagi odamlar va transport (kod bilan yasalgan, tashqi model yo'q). Stanok ishlayotganda operator ish harakatini qiladi,
// pauza / bo'sh / aloqa yo'q bo'lsa — joyida tik turadi (faqat nafas oladi, atrofga qaraydi).

/** Ish harakati turi. */
export type IshHarakati = "surish" | "pult" | "qabul" | "qadoqlash" | "burgilash";

type IshchiProps = {
  mat: Materiallar;
  p: [number, number, number];
  /** Y o'qi atrofida burilish: 0 — +z ga qaraydi. */
  burilish?: number;
  harakat: IshHarakati;
  ishlayapti: boolean;
  /** Ko'rinish varianti: teri / jilet / kaska rangi. */
  turi?: number;
  /** Animatsiya fazasi (bir xil harakat qiladigan ishchilar bir xil vaqtda qimirlamasin). */
  faza?: number;
};

/** Bitta odam: oyoq, kombinezon, signal jilet (nur qaytargich chiziqlari bilan), qo'llar (yelka va tirsak bo'g'imli), bosh, kaska, quloqchin. */
function Tana({ mat, turi = 0, chapQol, ongQol, bosh, tana, chapOyoq, ongOyoq }: {
  mat: Materiallar;
  turi?: number;
  chapQol: React.RefObject<THREE.Group | null>;
  ongQol: React.RefObject<THREE.Group | null>;
  bosh: React.RefObject<THREE.Group | null>;
  tana: React.RefObject<THREE.Group | null>;
  chapOyoq?: React.RefObject<THREE.Group | null>;
  ongOyoq?: React.RefObject<THREE.Group | null>;
}) {
  const teri = mat.teri[turi % mat.teri.length];
  const jilet = mat.jilet[turi % mat.jilet.length];
  const kaska = mat.kaska[turi % mat.kaska.length];
  const oyoq = (x: number, ref?: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[x, 0.86, 0]}>
      <mesh position={[0, -0.4, 0]} material={mat.kombinezon} castShadow>
        <capsuleGeometry args={[0.075, 0.62, 4, 10]} />
      </mesh>
      <Quti o={[0.13, 0.08, 0.26]} p={[0, -0.82, 0.05]} mat={mat.etik} />
    </group>
  );
  const qol = (x: number, ref: React.RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[x, 1.42, 0]}>
      <mesh position={[0, -0.15, 0]} material={mat.kofta} castShadow>
        <capsuleGeometry args={[0.058, 0.22, 4, 10]} />
      </mesh>
      <group position={[0, -0.31, 0]} name="bilak">
        <mesh position={[0, -0.13, 0]} material={mat.kofta} castShadow>
          <capsuleGeometry args={[0.052, 0.2, 4, 10]} />
        </mesh>
        <mesh position={[0, -0.29, 0]} material={mat.qolqop} castShadow>
          <sphereGeometry args={[0.055, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
  return (
    <>
      {oyoq(-0.1, chapOyoq)}
      {oyoq(0.1, ongOyoq)}
      <group ref={tana}>
        <Quti o={[0.32, 0.14, 0.2]} p={[0, 0.92, 0]} mat={mat.kombinezon} />
        <mesh position={[0, 1.18, 0]} material={mat.kofta} castShadow>
          <capsuleGeometry args={[0.17, 0.32, 4, 12]} />
        </mesh>
        {/* Signal jilet va nur qaytargich chiziqlar */}
        <Quti o={[0.37, 0.4, 0.27]} p={[0, 1.2, 0]} mat={jilet} />
        <Quti o={[0.375, 0.035, 0.275]} p={[0, 1.1, 0]} mat={mat.nurQaytargich} />
        <Quti o={[0.375, 0.035, 0.275]} p={[0, 1.28, 0]} mat={mat.nurQaytargich} />
        <Silindr r={0.05} h={0.08} p={[0, 1.47, 0]} mat={teri} seg={10} />
        <group ref={bosh} position={[0, 1.6, 0]}>
          <mesh material={teri} castShadow>
            <sphereGeometry args={[0.11, 16, 14]} />
          </mesh>
          {/* Kaska + soyabon */}
          <mesh position={[0, 0.045, 0]} material={kaska} castShadow>
            <sphereGeometry args={[0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <Quti o={[0.2, 0.015, 0.1]} p={[0, 0.045, 0.12]} mat={kaska} />
          {/* Quloqchin (shovqindan himoya) */}
          <Silindr r={0.045} h={0.04} p={[-0.115, -0.005, 0]} rot={[0, 0, Math.PI / 2]} mat={mat.quloqchin} seg={12} />
          <Silindr r={0.045} h={0.04} p={[0.115, -0.005, 0]} rot={[0, 0, Math.PI / 2]} mat={mat.quloqchin} seg={12} />
          {/* Ko'zoynak */}
          <Quti o={[0.16, 0.035, 0.02]} p={[0, 0.01, 0.105]} mat={mat.qora} />
        </group>
        {qol(-0.23, chapQol)}
        {qol(0.23, ongQol)}
      </group>
    </>
  );
}

const bilak = (qol: THREE.Group | null) => qol?.getObjectByName("bilak") ?? null;

/** Stanok yonidagi operator. */
export function Ishchi({ mat, p, burilish = 0, harakat, ishlayapti, turi = 0, faza = 0 }: IshchiProps) {
  const ildiz = useRef<THREE.Group>(null);
  const tana = useRef<THREE.Group>(null);
  const bosh = useRef<THREE.Group>(null);
  const chapQol = useRef<THREE.Group>(null);
  const ongQol = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const chap = chapQol.current;
    const ong = ongQol.current;
    const chapBilak = bilak(chap);
    const ongBilak = bilak(ong);
    if (!chap || !ong || !tana.current || !bosh.current || !ildiz.current) return;
    // Nafas (har doim)
    tana.current.position.y = Math.sin(t * 1.6) * 0.006;
    if (!ishlayapti) {
      // Kutish: qo'llar pastda, bosh sekin atrofga qaraydi.
      chap.rotation.set(0, 0, 0.08);
      ong.rotation.set(0, 0, -0.08);
      chapBilak?.rotation.set(-0.15, 0, 0);
      ongBilak?.rotation.set(-0.15, 0, 0);
      tana.current.rotation.x = 0;
      bosh.current.rotation.y = Math.sin(t * 0.4) * 0.6;
      ildiz.current.position.z = p[2];
      return;
    }
    bosh.current.rotation.y = Math.sin(t * 0.7) * 0.12;
    if (harakat === "surish") {
      // List suradi: ikki qo'l oldinga, tana bilan birga oldinga-orqaga.
      const s = (Math.sin(t * 1.7) + 1) / 2;
      chap.rotation.set(-1.15 - s * 0.25, 0, 0.12);
      ong.rotation.set(-1.15 - s * 0.25, 0, -0.12);
      chapBilak?.rotation.set(-0.35 + s * 0.3, 0, 0);
      ongBilak?.rotation.set(-0.35 + s * 0.3, 0, 0);
      tana.current.rotation.x = 0.12 + s * 0.08;
      ildiz.current.position.z = p[2] - s * 0.12;
    } else if (harakat === "pult") {
      // Pultda ishlaydi: o'ng qo'l ekranga tegib turadi, chap qo'l bel atrofida.
      const tegish = Math.max(0, Math.sin(t * 2.2));
      ong.rotation.set(-1.25 - tegish * 0.2, 0, -0.15);
      ongBilak?.rotation.set(-0.5, 0, 0);
      chap.rotation.set(-0.25, 0, 0.12);
      chapBilak?.rotation.set(-0.9, 0, 0);
      tana.current.rotation.x = 0.05;
      bosh.current.rotation.x = 0.15;
    } else if (harakat === "qabul") {
      // Chiqishda detalni qabul qilib, aravachaga taxlaydi.
      const s = Math.sin(t * 1.3);
      chap.rotation.set(-0.95 + s * 0.35, 0, 0.18);
      ong.rotation.set(-0.95 + s * 0.35, 0, -0.18);
      chapBilak?.rotation.set(-0.5, 0, 0);
      ongBilak?.rotation.set(-0.5, 0, 0);
      tana.current.rotation.x = 0.15 + Math.max(0, s) * 0.15;
      tana.current.rotation.y = s * 0.35;
    } else if (harakat === "qadoqlash") {
      // Quti yopadi / skotch tortadi: qo'llar yonga harakatlanadi.
      const s = Math.sin(t * 2.4);
      chap.rotation.set(-1.0, s * 0.35, 0.25 + s * 0.2);
      ong.rotation.set(-1.0, s * 0.35, -0.25 + s * 0.2);
      chapBilak?.rotation.set(-0.6, 0, 0);
      ongBilak?.rotation.set(-0.6, 0, 0);
      tana.current.rotation.x = 0.28;
    } else {
      // Burg'ilash: detalni tirgakka bosib turadi, bir qo'l pedal/tugmada.
      const s = (Math.sin(t * 3.2) + 1) / 2;
      chap.rotation.set(-1.05, 0, 0.12);
      ong.rotation.set(-0.9 - s * 0.15, 0, -0.1);
      chapBilak?.rotation.set(-0.45, 0, 0);
      ongBilak?.rotation.set(-0.35 - s * 0.2, 0, 0);
      tana.current.rotation.x = 0.18;
    }
  });

  return (
    <group ref={ildiz} position={p} rotation={[0, burilish, 0]}>
      <Tana mat={mat} turi={turi} chapQol={chapQol} ongQol={ongQol} bosh={bosh} tana={tana} />
    </group>
  );
}

/** Yo'lak bo'ylab LDSP list ko'tarib yuradigan ishchi (borib-keladi). */
export function YuruvchiIshchi({ mat, yol, tezlik = 1.1, turi = 1, z, faza = 0 }: { mat: Materiallar; yol: [number, number]; tezlik?: number; turi?: number; z: number; faza?: number }) {
  const ildiz = useRef<THREE.Group>(null);
  const tana = useRef<THREE.Group>(null);
  const bosh = useRef<THREE.Group>(null);
  const chapQol = useRef<THREE.Group>(null);
  const ongQol = useRef<THREE.Group>(null);
  const chapOyoq = useRef<THREE.Group>(null);
  const ongOyoq = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const uzunlik = yol[1] - yol[0];
    const davr = (uzunlik / tezlik) * 2;
    const f = (t % davr) / davr; // 0..1
    const oldinga = f < 0.5;
    const ulush = oldinga ? f * 2 : (1 - f) * 2;
    if (ildiz.current) {
      ildiz.current.position.set(yol[0] + uzunlik * ulush, 0, z);
      ildiz.current.rotation.y = oldinga ? Math.PI / 2 : -Math.PI / 2;
    }
    const qadam = Math.sin(t * tezlik * 5.2);
    if (chapOyoq.current) chapOyoq.current.rotation.x = qadam * 0.45;
    if (ongOyoq.current) ongOyoq.current.rotation.x = -qadam * 0.45;
    if (tana.current) tana.current.position.y = Math.abs(qadam) * 0.025;
    // List ikki qo'lda, tana yonida
    chapQol.current?.rotation.set(-0.55, 0, 0.35);
    ongQol.current?.rotation.set(-0.55, 0, -0.35);
    bilak(chapQol.current)?.rotation.set(-0.7, 0, 0);
    bilak(ongQol.current)?.rotation.set(-0.7, 0, 0);
    if (bosh.current) bosh.current.rotation.y = Math.sin(t * 0.5) * 0.25;
  });
  return (
    <group ref={ildiz}>
      <Tana mat={mat} turi={turi} chapQol={chapQol} ongQol={ongQol} bosh={bosh} tana={tana} chapOyoq={chapOyoq} ongOyoq={ongOyoq} />
      {/* Ko'tarib ketilayotgan list (tana oldida, vertikal) */}
      <Quti o={[0.9, 0.6, 0.018]} p={[0, 1.05, 0.33]} mat={mat.lmdpOq} />
    </group>
  );
}

/** Pogruzchik (forklift) LDSP to'plami bilan: ko'ndalang yo'lak bo'ylab borib-keladi, vilkalarini ko'taradi/tushiradi. */
export function Pogruzchik({ mat, x, yol, faza = 0 }: { mat: Materiallar; x: number; yol: [number, number]; faza?: number }) {
  const ildiz = useRef<THREE.Group>(null);
  const vilka = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const t = performance.now() / 1000 + faza;
    const davr = 26;
    const f = (t % davr) / davr;
    // Yo'l: borish (0–0.4), to'xtab yuk ko'tarish (0.4–0.5), qaytish (0.5–0.9), to'xtash (0.9–1)
    let ulush = 0;
    let harakat = 0;
    if (f < 0.4) { ulush = f / 0.4; harakat = 1; }
    else if (f < 0.5) { ulush = 1; }
    else if (f < 0.9) { ulush = 1 - (f - 0.5) / 0.4; harakat = -1; }
    const silliq = ulush * ulush * (3 - 2 * ulush);
    if (ildiz.current) {
      ildiz.current.position.set(x, 0, yol[0] + (yol[1] - yol[0]) * silliq);
      ildiz.current.rotation.y = 0;
    }
    if (vilka.current) {
      const kotarish = f >= 0.4 && f < 0.5 ? Math.sin(((f - 0.4) / 0.1) * Math.PI) : 0;
      vilka.current.position.y = 0.12 + kotarish * 0.5;
    }
    goldiraklar.current?.children.forEach((g) => { g.rotation.x += dt * harakat * 3; });
  });
  return (
    <group ref={ildiz}>
      {/* Korpus va kabina */}
      <Quti o={[1.1, 0.7, 1.6]} p={[0, 0.55, -0.2]} mat={mat.pogruzchik} />
      <Quti o={[1.0, 0.5, 0.55]} p={[0, 0.65, -0.75]} mat={mat.korpusQora} />
      {[[-0.5, 0.35], [0.5, 0.35], [-0.5, -0.75], [0.5, -0.75]].map(([a, b]) => (
        <Quti key={`${a}${b}`} o={[0.06, 1.3, 0.06]} p={[a, 1.55, b]} mat={mat.korpusQora} />
      ))}
      <Quti o={[1.1, 0.06, 1.2]} p={[0, 2.22, -0.2]} mat={mat.korpusQora} />
      <Quti o={[0.4, 0.4, 0.4]} p={[0, 1.15, -0.25]} mat={mat.korpusQora} />
      {/* Haydovchi */}
      <group position={[0, 0.3, -0.25]} scale={0.95}>
        <Ishchi mat={mat} p={[0, 0, 0]} harakat="pult" ishlayapti turi={2} />
      </group>
      {/* G'ildiraklar */}
      <group ref={goldiraklar}>
        {[[-0.58, 0.35], [0.58, 0.35], [-0.58, -0.75], [0.58, -0.75]].map(([a, b]) => (
          <Silindr key={`${a}${b}`} r={0.24} h={0.18} p={[a, 0.24, b]} rot={[0, 0, Math.PI / 2]} mat={mat.rezina} />
        ))}
      </group>
      {/* Machta va vilkalar */}
      <Quti o={[0.08, 2.4, 0.1]} p={[-0.32, 1.2, 0.72]} mat={mat.polatQora} />
      <Quti o={[0.08, 2.4, 0.1]} p={[0.32, 1.2, 0.72]} mat={mat.polatQora} />
      <group ref={vilka} position={[0, 0.12, 0]}>
        <Quti o={[0.8, 0.5, 0.06]} p={[0, 0.25, 0.8]} mat={mat.polatQora} />
        <Quti o={[0.1, 0.05, 1.1]} p={[-0.25, 0, 1.35]} mat={mat.polat} />
        <Quti o={[0.1, 0.05, 1.1]} p={[0.25, 0, 1.35]} mat={mat.polat} />
        <Quti o={[1.2, 0.12, 1.0]} p={[0, 0.09, 1.4]} mat={mat.palet} />
        {Array.from({ length: 8 }, (_, i) => <Quti key={i} o={[1.15, 0.03, 0.95]} p={[0, 0.17 + i * 0.033, 1.4]} mat={[mat.lmdp, mat.lmdpOq, mat.lmdpYongoq][i % 3]} />)}
      </group>
    </group>
  );
}
