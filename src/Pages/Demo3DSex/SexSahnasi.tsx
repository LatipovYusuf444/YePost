import { useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { useMateriallar, type Materiallar } from "./materiallar";
import { Quti, Silindr } from "./shakllar";
import SexMuhiti from "./SexMuhiti";
import { Ishchi, Pogruzchik, YuruvchiIshchi, type IshHarakati } from "./Ishchilar";
import { HOLAT_RANGI, bajarilishUlushi, korinadiganHolat, type SexHolati, type StanokHolati, type StanokTavsifi, type StanokTuri } from "./sexModeli";

// 3D sex sahnasi. Barcha stanok modellari shu yerda kod bilan (three.js geometriyasi) yasalgan — tashqi model fayli yoki havolasiz.
// Sahna ma'lumotni faqat props orqali oladi (stanoklar ro'yxati + holatlar): demo yoki Ye-Post manbaiga bog'liq emas.

export type KameraBuyrugi = { tur: "umumiy" | "yuqori" | "stanok"; stanokId?: string; n: number };

type Props = {
  stanoklar: StanokTavsifi[];
  holatlar: SexHolati;
  tanlangan: string | null;
  onTanlash: (id: string) => void;
  kamera: KameraBuyrugi;
};

const UMUMIY_KAMERA = { joy: [13.5, 15.5, 18] as const, nishon: [0, 0, 0.8] as const };

/** Signal minorasi (stanok chirog'i): yashil — ishlayapti, sariq — pauza, kulrang — bo'sh, binafsha — aloqa yo'q. */
function SignalMinorasi({ p, rang, mat }: { p: [number, number, number]; rang: string; mat: Materiallar }) {
  // Pastdan yuqoriga: qizil (nosoz), sariq (pauza), yashil (ishlayapti). Bo'sh — hech biri yonmaydi; aloqa yo'q — ustida binafsha chiroq.
  const ranglar = [HOLAT_RANGI.nosoz, HOLAT_RANGI.pauza, HOLAT_RANGI.ishlayapti];
  return (
    <group position={p}>
      <Silindr r={0.025} h={0.5} p={[0, 0.25, 0]} mat={mat.tayoq} />
      {ranglar.map((r, i) => {
        const yoniq = r === rang;
        return (
          <mesh key={r} position={[0, 0.56 + i * 0.11, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 18]} />
            <meshStandardMaterial color={r} emissive={r} emissiveIntensity={yoniq ? 2.2 : 0.05} transparent opacity={yoniq ? 1 : 0.55} />
          </mesh>
        );
      })}
      {rang === HOLAT_RANGI.eskirgan && (
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.055, 16, 12]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
}

// ── Stanok modellari (front tomoni +z) ──

/** Format-kesish stanogi: korpus, uzun suriladigan karetka, ko'ndalang stol, aylanuvchi arra, ustki himoya, boshqaruv paneli, LDSP list. */
function KesishStanogi({ mat, ishlayapti }: { mat: Materiallar; ishlayapti: boolean }) {
  const arra = useRef<THREE.Mesh>(null);
  const karetka = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ishlayapti) return;
    if (arra.current) arra.current.rotation.z -= dt * 30;
    if (karetka.current) karetka.current.position.x = Math.sin(performance.now() / 1400) * 0.7;
  });
  return (
    <group>
      <Quti o={[1.5, 0.85, 1.0]} p={[0.4, 0.425, 0]} mat={mat.korpus} />
      <Quti o={[1.5, 0.08, 1.0]} p={[0.4, 0.89, 0]} mat={mat.kesishRang} />
      <Quti o={[1.55, 0.04, 1.05]} p={[0.4, 0.95, 0]} mat={mat.polatQora} />
      {/* Arra (stol tirqishidan chiqib turadi) */}
      <mesh ref={arra} position={[0.4, 1.02, 0.15]} rotation={[0, 0, 0]} material={mat.polat} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.008, 32]} />
      </mesh>
      {/* Ustki himoya va kronshteyn */}
      <Quti o={[0.06, 1.0, 0.06]} p={[0.95, 1.45, -0.45]} mat={mat.polatQora} />
      <Quti o={[0.06, 0.06, 0.65]} p={[0.95, 1.95, -0.15]} mat={mat.polatQora} />
      <Quti o={[0.42, 0.16, 0.14]} p={[0.65, 1.2, 0.15]} mat={mat.kesishRang} />
      <Quti o={[0.32, 0.06, 0.08]} p={[0.65, 1.33, 0.15]} mat={mat.polat} />
      {/* Suriladigan karetka (uzun) va list */}
      <group ref={karetka}>
        <Quti o={[3.2, 0.07, 0.42]} p={[-0.6, 0.97, 0.65]} mat={mat.polat} />
        <Quti o={[2.2, 0.018, 0.95]} p={[-0.8, 1.02, 0.55]} mat={mat.lmdp} />
      </group>
      <Quti o={[3.4, 0.08, 0.08]} p={[-0.6, 0.86, 0.65]} mat={mat.polatQora} />
      {/* Ko'ndalang stol va oyoqlar */}
      <Quti o={[1.2, 0.04, 1.0]} p={[-1.4, 0.92, 1.45]} mat={mat.polatQora} />
      <Quti o={[0.05, 0.9, 0.05]} p={[-1.9, 0.45, 1.85]} mat={mat.polatQora} />
      <Quti o={[0.05, 0.9, 0.05]} p={[-0.9, 0.45, 1.85]} mat={mat.polatQora} />
      {/* Parallel tirgak (o'ngda) */}
      <Quti o={[0.08, 0.1, 1.1]} p={[1.25, 1.02, 0]} mat={mat.polat} />
      {/* Boshqaruv paneli */}
      <Quti o={[0.32, 0.5, 0.14]} p={[1.3, 1.45, 0.55]} mat={mat.korpusQora} />
      <Quti o={[0.24, 0.16, 0.01]} p={[1.3, 1.55, 0.625]} mat={mat.ekran} />
      <Silindr r={0.05} h={0.04} p={[1.3, 1.31, 0.63]} rot={[Math.PI / 2, 0, 0]} mat={mat.qizilTugma} />
      {/* Chiqindi patrubkasi */}
      <Silindr r={0.08} h={1.4} p={[0.7, 2.6, -0.4]} mat={mat.polat} />
    </group>
  );
}

/** CNC frezer (nesting): vakuum stol, ikki tomonlama relslar, harakatlanuvchi portal, shpindel kallagi, boshqaruv shkafi. */
function CncStanogi({ mat, ishlayapti }: { mat: Materiallar; ishlayapti: boolean }) {
  const portal = useRef<THREE.Group>(null);
  const kallak = useRef<THREE.Group>(null);
  const shpindel = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ishlayapti) return;
    const t = performance.now() / 1000;
    if (portal.current) portal.current.position.x = Math.sin(t * 0.45) * 1.15;
    if (kallak.current) kallak.current.position.z = Math.sin(t * 0.9) * 0.55;
    if (shpindel.current) shpindel.current.rotation.y += dt * 40;
  });
  return (
    <group>
      <Quti o={[3.3, 0.75, 1.75]} p={[0, 0.375, 0]} mat={mat.korpusQora} />
      <Quti o={[3.1, 0.06, 1.6]} p={[0, 0.78, 0]} mat={mat.vakuum} />
      {/* Vakuum stol to'ri */}
      {Array.from({ length: 9 }, (_, i) => <Quti key={`x${i}`} o={[0.012, 0.005, 1.55]} p={[-1.4 + i * 0.35, 0.813, 0]} mat={mat.polatQora} />)}
      <Quti o={[2.44, 0.018, 1.22]} p={[0.1, 0.83, 0]} mat={mat.lmdpOq} />
      {/* Relslar */}
      <Quti o={[3.4, 0.12, 0.12]} p={[0, 0.84, 0.92]} mat={mat.polat} />
      <Quti o={[3.4, 0.12, 0.12]} p={[0, 0.84, -0.92]} mat={mat.polat} />
      {/* Portal */}
      <group ref={portal}>
        <Quti o={[0.3, 1.0, 0.22]} p={[0, 1.4, 0.95]} mat={mat.cncRang} />
        <Quti o={[0.3, 1.0, 0.22]} p={[0, 1.4, -0.95]} mat={mat.cncRang} />
        <Quti o={[0.4, 0.32, 2.15]} p={[0, 1.95, 0]} mat={mat.cncRang} />
        <Quti o={[0.42, 0.06, 2.0]} p={[0, 2.14, 0]} mat={mat.polat} />
        <group ref={kallak}>
          <Quti o={[0.36, 0.5, 0.36]} p={[0.25, 1.62, 0]} mat={mat.korpus} />
          <Silindr r={0.11} h={0.36} p={[0.25, 1.24, 0]} mat={mat.polatQora} />
          <mesh ref={shpindel} position={[0.25, 1.0, 0]} material={mat.polat} castShadow>
            <cylinderGeometry args={[0.03, 0.012, 0.16, 12]} />
          </mesh>
          {/* Chang yig'gich cho'tka */}
          <Silindr r={0.16} h={0.08} p={[0.25, 1.08, 0]} mat={mat.rezina} />
        </group>
      </group>
      {/* Boshqaruv shkafi va pult */}
      <Quti o={[0.6, 1.7, 0.45]} p={[2.15, 0.85, -0.45]} mat={mat.korpus} />
      <Quti o={[0.5, 0.04, 0.02]} p={[2.15, 1.5, -0.22]} mat={mat.cncRang} />
      <Quti o={[0.06, 1.1, 0.06]} p={[1.95, 0.55, 1.15]} mat={mat.polatQora} />
      <Quti o={[0.5, 0.36, 0.08]} p={[1.95, 1.25, 1.15]} r={[-0.35, 0, 0]} mat={mat.korpusQora} />
      <Quti o={[0.42, 0.26, 0.01]} p={[1.95, 1.27, 1.2]} r={[-0.35, 0, 0]} mat={mat.ekran} />
    </group>
  );
}

/** Qirra yopishtirish stanogi: uzun korpus, kirish/chiqish stoli, yuqori bosim balkasi roliklari, elim idishi, lenta rulon, shaffof qopqoq. */
function QirraStanogi({ mat, ishlayapti }: { mat: Materiallar; ishlayapti: boolean }) {
  const detal = useRef<THREE.Mesh>(null);
  const roliklar = useRef<THREE.Group>(null);
  const rulon = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ishlayapti) return;
    if (detal.current) {
      detal.current.position.x += dt * 0.9;
      if (detal.current.position.x > 2.4) detal.current.position.x = -2.6;
    }
    roliklar.current?.children.forEach((r) => { r.rotation.x += dt * 6; });
    if (rulon.current) rulon.current.rotation.y += dt * 1.5;
  });
  return (
    <group>
      <Quti o={[4.2, 0.9, 0.8]} p={[0, 0.45, -0.1]} mat={mat.korpus} />
      <Quti o={[4.2, 0.1, 0.8]} p={[0, 0.95, -0.1]} mat={mat.qirraRang} />
      {/* Konveyer zanjiri va stollar */}
      <Quti o={[4.6, 0.05, 0.22]} p={[0, 1.02, 0.25]} mat={mat.rezina} />
      <Quti o={[0.8, 0.04, 0.9]} p={[-2.6, 0.95, 0.4]} mat={mat.polatQora} />
      <Quti o={[0.8, 0.04, 0.9]} p={[2.6, 0.95, 0.4]} mat={mat.polatQora} />
      <Quti o={[0.04, 0.95, 0.04]} p={[-2.9, 0.47, 0.8]} mat={mat.polatQora} />
      <Quti o={[0.04, 0.95, 0.04]} p={[2.9, 0.47, 0.8]} mat={mat.polatQora} />
      {/* Yuqori bosim balkasi va roliklar */}
      <Quti o={[4.0, 0.14, 0.2]} p={[0, 1.5, 0.25]} mat={mat.polatQora} />
      <group ref={roliklar}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i} position={[-1.8 + i * 0.4, 1.36, 0.25]} rotation={[0, 0, Math.PI / 2]} material={mat.rezina} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.16, 16]} />
          </mesh>
        ))}
      </group>
      {[-1.6, 0, 1.6].map((x) => <Quti key={x} o={[0.08, 0.5, 0.08]} p={[x, 1.75, 0.25]} mat={mat.polatQora} />)}
      <Quti o={[4.1, 0.05, 0.6]} p={[0, 2.02, 0.05]} mat={mat.polatQora} />
      {/* Shaffof himoya qopqog'i */}
      <Quti o={[3.6, 0.55, 0.02]} p={[0, 1.65, 0.56]} mat={mat.oyna} />
      {/* Elim idishi va lenta rulon */}
      <Silindr r={0.17} h={0.3} p={[-1.3, 1.17, -0.2]} mat={mat.elim} />
      <mesh ref={rulon} position={[-2.0, 1.2, -0.25]} rotation={[0, 0, 0]} material={mat.lmdpOq} castShadow>
        <torusGeometry args={[0.18, 0.06, 12, 32]} />
      </mesh>
      {/* Konveyer bo'ylab ketayotgan detal */}
      <mesh ref={detal} position={[-1.2, 1.12, 0.25]} material={mat.lmdpYongoq} castShadow>
        <boxGeometry args={[0.7, 0.018, 0.45]} />
      </mesh>
      {/* Boshqaruv paneli (ustun ustida ekran) */}
      <Quti o={[0.07, 1.2, 0.07]} p={[2.2, 0.6, 0.75]} mat={mat.polatQora} />
      <Quti o={[0.55, 0.38, 0.08]} p={[2.2, 1.35, 0.75]} mat={mat.korpusQora} />
      <Quti o={[0.46, 0.28, 0.01]} p={[2.2, 1.35, 0.795]} mat={mat.ekran} />
    </group>
  );
}

/** Burg'ilash stanogi: ish stoli, orqa tirgak, uch shpindelli vertikal kallak (pastga-yuqoriga yuradi), detal. */
function BurgilashStanogi({ mat, ishlayapti }: { mat: Materiallar; ishlayapti: boolean }) {
  const kallak = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ishlayapti || !kallak.current) return;
    const t = performance.now() / 1000;
    kallak.current.position.y = 1.62 + Math.abs(Math.sin(t * 1.6)) * 0.18;
    kallak.current.position.x = Math.round(Math.sin(t * 0.35) * 2) * 0.35;
  });
  return (
    <group>
      <Quti o={[2.0, 0.85, 1.0]} p={[0, 0.425, 0]} mat={mat.korpus} />
      <Quti o={[2.1, 0.06, 1.05]} p={[0, 0.88, 0]} mat={mat.polatQora} />
      <Quti o={[2.1, 0.12, 0.08]} p={[0, 0.97, -0.48]} mat={mat.burgRang} />
      <Quti o={[1.4, 0.018, 0.6]} p={[0, 0.92, 0.1]} mat={mat.lmdpKul} />
      {/* Portal ustunlar va balka */}
      <Quti o={[0.14, 1.4, 0.18]} p={[-0.95, 1.55, -0.38]} mat={mat.burgRang} />
      <Quti o={[0.14, 1.4, 0.18]} p={[0.95, 1.55, -0.38]} mat={mat.burgRang} />
      <Quti o={[2.05, 0.2, 0.24]} p={[0, 2.3, -0.38]} mat={mat.burgRang} />
      <group ref={kallak} position={[0, 1.62, 0]}>
        <Quti o={[0.5, 0.35, 0.35]} p={[0, 0.2, -0.1]} mat={mat.korpus} />
        {[-0.14, 0, 0.14].map((x) => (
          <group key={x}>
            <Silindr r={0.035} h={0.22} p={[x, -0.07, 0]} mat={mat.polatQora} />
            <mesh position={[x, -0.24, 0]} material={mat.polat} castShadow>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 10]} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Pnevmatik qisqichlar */}
      {[-0.6, 0.6].map((x) => <Silindr key={x} r={0.05} h={0.12} p={[x, 1.0, -0.3]} mat={mat.polat} />)}
      {/* Pedal va panel */}
      <Quti o={[0.3, 0.06, 0.2]} p={[0.5, 0.03, 0.7]} mat={mat.korpusQora} />
      <Quti o={[0.4, 0.3, 0.1]} p={[1.25, 1.3, 0.2]} r={[0, -0.5, 0]} mat={mat.korpusQora} />
      <Quti o={[0.32, 0.2, 0.01]} p={[1.27, 1.3, 0.255]} r={[0, -0.5, 0]} mat={mat.ekran} />
    </group>
  );
}

/** Qadoqlash joyi: qadoqlash stoli, karton qutilar, stretch-plyonka o'rash aylanma stoli (minora, palet). */
function QadoqlashJoyi({ mat, ishlayapti }: { mat: Materiallar; ishlayapti: boolean }) {
  const stol = useRef<THREE.Group>(null);
  const karetka = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ishlayapti) return;
    if (stol.current) stol.current.rotation.y += dt * 1.1;
    if (karetka.current) karetka.current.position.y = 0.9 + (Math.sin(performance.now() / 1800) + 1) * 0.5;
  });
  return (
    <group>
      {/* Qadoqlash stoli */}
      <Quti o={[2.2, 0.06, 1.0]} p={[-1.3, 0.9, 0]} mat={mat.lmdp} />
      {[[-2.3, -0.4], [-2.3, 0.4], [-0.3, -0.4], [-0.3, 0.4]].map(([x, z]) => <Quti key={`${x}${z}`} o={[0.06, 0.88, 0.06]} p={[x, 0.44, z]} mat={mat.polatQora} />)}
      <Quti o={[0.9, 0.25, 0.6]} p={[-1.8, 1.06, 0]} mat={mat.karton} />
      <Quti o={[0.7, 0.2, 0.5]} p={[-0.9, 1.03, 0.1]} mat={mat.karton} />
      <Silindr r={0.12} h={0.5} p={[-2.0, 1.2, 0.35]} rot={[0, 0, Math.PI / 2]} mat={mat.plyonka} />
      {/* Aylanma stol + palet + qutilar */}
      <Silindr r={0.85} h={0.1} p={[1.3, 0.05, 0]} mat={mat.qadoqRang} seg={40} />
      <group ref={stol} position={[1.3, 0.1, 0]}>
        <Quti o={[1.2, 0.14, 0.8]} p={[0, 0.07, 0]} mat={mat.palet} />
        <Quti o={[1.1, 0.5, 0.75]} p={[0, 0.39, 0]} mat={mat.karton} />
        <Quti o={[1.0, 0.45, 0.7]} p={[0, 0.865, 0]} mat={mat.karton} />
        <Quti o={[1.14, 0.98, 0.79]} p={[0, 0.63, 0]} mat={mat.plyonka} />
      </group>
      {/* Minora va plyonka karetkasi */}
      <Quti o={[0.16, 2.3, 0.16]} p={[2.35, 1.15, -0.5]} mat={mat.qadoqRang} />
      <mesh ref={karetka} position={[2.2, 1.2, -0.38]} material={mat.korpus} castShadow>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
      </mesh>
      <Quti o={[0.36, 0.5, 0.2]} p={[2.35, 0.9, 0.35]} mat={mat.korpusQora} />
      <Quti o={[0.28, 0.18, 0.01]} p={[2.35, 1.02, 0.455]} mat={mat.ekran} />
    </group>
  );
}

const MODELLAR: Record<StanokTuri, (p: { mat: Materiallar; ishlayapti: boolean }) => ReactNode> = {
  kesish: KesishStanogi,
  cnc: CncStanogi,
  qirra: QirraStanogi,
  burgilash: BurgilashStanogi,
  qadoqlash: QadoqlashJoyi,
};

/** Har stanokdagi operatorlar (stanokning o'z koordinatasida; old tomoni +z — yo'lak tarafi). */
const OPERATORLAR: Record<StanokTuri, Array<{ p: [number, number, number]; burilish: number; harakat: IshHarakati }>> = {
  kesish: [
    { p: [-0.1, 0, 1.45], burilish: Math.PI, harakat: "surish" },
    { p: [1.55, 0, -1.15], burilish: 0, harakat: "qabul" },
  ],
  cnc: [
    { p: [1.95, 0, 1.75], burilish: Math.PI, harakat: "pult" },
    { p: [-1.4, 0, 1.45], burilish: Math.PI, harakat: "qabul" },
  ],
  qirra: [
    { p: [-2.6, 0, 1.35], burilish: Math.PI, harakat: "surish" },
    { p: [2.75, 0, 1.45], burilish: Math.PI, harakat: "qabul" },
  ],
  burgilash: [{ p: [0.1, 0, 1.0], burilish: Math.PI, harakat: "burgilash" }],
  qadoqlash: [
    { p: [-1.3, 0, 0.95], burilish: Math.PI, harakat: "qadoqlash" },
    { p: [2.4, 0, 1.05], burilish: Math.PI, harakat: "pult" },
  ],
};

/** Stanok balandligi (yorliq va kamera uchun). */
const BALANDLIK: Record<StanokTuri, number> = { kesish: 2.4, cnc: 2.3, qirra: 2.2, burgilash: 2.5, qadoqlash: 2.4 };
/** Stanok izi (tanlash halqasi radiusi). */
const OLCHAM: Record<StanokTuri, number> = { kesish: 2.4, cnc: 2.2, qirra: 3.0, burgilash: 1.5, qadoqlash: 2.6 };

// 3D yorliqlar sahna ustidagi panel va tugmalardan (z-30) pastda qoladi.
const YORLIQ_Z = [20, 10];
const YORLIQ_USLUBI = { pointerEvents: "auto" } as const;

// ── Tanlash halqasi ──
function TanlashHalqasi({ radius, rang }: { radius: number; rang: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = 1 + Math.sin(performance.now() / 300) * 0.03;
    ref.current.scale.set(s, s, 1);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[radius, radius + 0.12, 64]} />
      <meshBasicMaterial color={rang} transparent opacity={0.9} />
    </mesh>
  );
}

function Stanok({ tavsif, holat, tanlangan, onTanlash, mat, yorliqKorinadi }: { tavsif: StanokTavsifi; holat?: StanokHolati; tanlangan: boolean; onTanlash: (id: string) => void; mat: Materiallar; yorliqKorinadi: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const [ustida, setUstida] = useState(false);
  const korinadi = korinadiganHolat(holat);
  const rang = HOLAT_RANGI[korinadi];
  const ishlayapti = Boolean(holat && holat.aloqa && holat.holat === "ishlayapti");
  const Model = MODELLAR[tavsif.tur];
  const ulush = bajarilishUlushi(holat?.joriy);

  useEffect(() => {
    if (!ustida) return;
    document.body.style.cursor = "pointer";
    return () => { document.body.style.cursor = ""; };
  }, [ustida]);

  const bosish = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onTanlash(tavsif.id);
  };

  return (
    <group position={[tavsif.joy[0], 0, tavsif.joy[1]]}>
      <group
        rotation={[0, tavsif.burilish, 0]}
        onClick={bosish}
        onPointerOver={(event) => { event.stopPropagation(); setUstida(true); }}
        onPointerOut={() => setUstida(false)}
      >
        <Model mat={mat} ishlayapti={ishlayapti} />
        {OPERATORLAR[tavsif.tur].map((op, i) => (
          <Ishchi key={i} mat={mat} p={op.p} burilish={op.burilish} harakat={op.harakat} ishlayapti={ishlayapti} turi={(tavsif.joy[0] > 0 ? 1 : 0) + i} faza={i * 1.3 + tavsif.joy[0]} />
        ))}
        <SignalMinorasi p={[-1.0, 1.0, -0.45]} rang={rang} mat={mat} />
        {/* Pol belgisi: stanok zonasi */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
          <planeGeometry args={[OLCHAM[tavsif.tur] * 2 + 0.6, 2.9]} />
          <meshStandardMaterial color={ustida || tanlangan ? "#dbeafe" : "#cbd5e1"} roughness={0.9} />
        </mesh>
      </group>
      {tanlangan && <TanlashHalqasi radius={OLCHAM[tavsif.tur] + 0.35} rang={rang} />}
      {yorliqKorinadi && <Html position={[0, BALANDLIK[tavsif.tur] + 1.1, 0]} center zIndexRange={YORLIQ_Z} style={YORLIQ_USLUBI}>
        <button
          type="button"
          data-stanok-yorliq={tavsif.id}
          onClick={() => onTanlash(tavsif.id)}
          className={`flex min-w-[132px] select-none flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left shadow-lg backdrop-blur transition ${
            tanlangan ? "border-blue-500 bg-white ring-4 ring-blue-200" : "border-white/70 bg-white/90 hover:border-blue-300 hover:bg-white"
          }`}
        >
          <span className="whitespace-nowrap text-[13px] font-black leading-4 text-slate-900">{tavsif.nom}</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold leading-4" style={{ color: korinadi === "bosh" ? "#475569" : rang }}>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: rang }} aria-hidden="true" />
            {t(`status.${korinadi}`)}
          </span>
          {holat?.joriy && (
            <span className="block h-1 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(ulush * 100)}%`, background: rang }} />
            </span>
          )}
        </button>
      </Html>}
    </group>
  );
}

function KameraBoshqaruvi({ kamera, stanoklar }: { kamera: KameraBuyrugi; stanoklar: StanokTavsifi[] }) {
  const ref = useRef<CameraControls>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (kamera.tur === "yuqori") {
      void c.setLookAt(0, 36, 0.01, 0, 0, 0, true);
      return;
    }
    const stanok = kamera.tur === "stanok" ? stanoklar.find((item) => item.id === kamera.stanokId) : undefined;
    if (!stanok) {
      void c.setLookAt(...UMUMIY_KAMERA.joy, ...UMUMIY_KAMERA.nishon, kamera.n > 0);
      return;
    }
    // Stanokka old tomonidan (yo'lak tarafdan), biroz yon va yuqoridan yaqinlashish. Nigoh nuqtasi stanokdan chaproqqa va pastroqqa
    // suriladi: stanok ekranning o'ng-yuqori qismida, ma'lumot paneli (chap-pastda) uni to'smaydi.
    const [x, z] = stanok.joy;
    const yuqori = new THREE.Vector3(0, 1, 0);
    const old = new THREE.Vector3(3.2, 4.6, 7.6).applyAxisAngle(yuqori, stanok.burilish);
    const nigoh = new THREE.Vector3(x, 1.1, z);
    const ong = new THREE.Vector3().subVectors(nigoh, new THREE.Vector3(x + old.x, old.y, z + old.z)).cross(yuqori).normalize();
    nigoh.addScaledVector(ong, -1.7);
    void c.setLookAt(x + old.x - ong.x * 1.7, old.y, z + old.z - ong.z * 1.7, nigoh.x, nigoh.y, nigoh.z, true);
  }, [kamera, stanoklar]);
  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={3}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.1}
      smoothTime={0.6}
      draggingSmoothTime={0.15}
      dollyToCursor
    />
  );
}

export default function SexSahnasi({ stanoklar, holatlar, tanlangan, onTanlash, kamera }: Props) {
  return (
    <Canvas
      // PCF soyalar (three r187 da PCFSoftShadowMap olib tashlangan — ogohlantirish chiqmasin).
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [...UMUMIY_KAMERA.joy], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
      data-sex-sahnasi
    >
      <SahnaIchi stanoklar={stanoklar} holatlar={holatlar} tanlangan={tanlangan} onTanlash={onTanlash} kamera={kamera} />
    </Canvas>
  );
}

function SahnaIchi({ stanoklar, holatlar, tanlangan, onTanlash, kamera }: Props) {
  const mat = useMateriallar();
  return (
    <>
      <color attach="background" args={["#e9eef5"]} />
      <fog attach="fog" args={["#e9eef5", 45, 90]} />
      <hemisphereLight args={["#ffffff", "#94a3b8", 0.9]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[9, 30, 7]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-12, 10, -8]} intensity={0.35} />
      <SexMuhiti mat={mat} stanoklar={stanoklar} />
      {/* Yo'lakdagi harakat: list ko'tarib yuruvchi ishchilar va pogruzchik */}
      <YuruvchiIshchi mat={mat} yol={[-10.5, 8.5]} z={-0.35} tezlik={1.15} turi={1} />
      <YuruvchiIshchi mat={mat} yol={[-8, 6]} z={0.6} tezlik={0.9} turi={2} faza={7} />
      <Pogruzchik mat={mat} x={11.6} yol={[6.5, -6.0]} />
      {stanoklar.map((tavsif) => (
        <Stanok
          key={tavsif.id}
          tavsif={tavsif}
          holat={holatlar[tavsif.id]}
          tanlangan={tanlangan === tavsif.id}
          onTanlash={onTanlash}
          mat={mat}
          // Stanokka yaqinlashilganda faqat uning yorlig'i: ekrandan tashqaridagi yorliqlar sahna chetida tugmalar ustiga chiqib qolmasin.
          yorliqKorinadi={kamera.tur !== "stanok" || !tanlangan || tanlangan === tavsif.id}
        />
      ))}
      <KameraBoshqaruvi kamera={kamera} stanoklar={stanoklar} />
    </>
  );
}
