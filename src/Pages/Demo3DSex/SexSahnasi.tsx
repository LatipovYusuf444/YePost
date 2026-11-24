import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, Environment, Html, Lightformer, Sky } from "@react-three/drei";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { useMateriallar, type Materiallar } from "./materiallar";
import { useShaharMateriallari } from "./shaharMateriallari";
import { Quti, Silindr, Yumaloq } from "./shakllar";
import SexMuhiti from "./SexMuhiti";
import Shaharcha from "./Shaharcha";
import Logistika from "./Transport";
import { Pogruzchik, type IshHarakati } from "./Ishchilar";
import { GlbOdam, KelibKetuvchilar, YuruvchiGlbOdam } from "./Odamlar";
import Ofis from "./Ofis";
import Maishiy from "./Maishiy";
import { MAISHIY, OFIS } from "./hudud";
import { HOLAT_RANGI, bajarilishUlushi, korinadiganHolat, type Reys, type SexHolati, type StanokHolati, type StanokTavsifi, type StanokTuri } from "./sexModeli";

// 3D sex sahnasi. Barcha stanok modellari shu yerda kod bilan (three.js geometriyasi) yasalgan — tashqi model fayli yoki havolasiz.
// Sahna ma'lumotni faqat props orqali oladi (stanoklar ro'yxati + holatlar): demo yoki Ye-Post manbaiga bog'liq emas.

export type KameraBuyrugi = { tur: "umumiy" | "yuqori" | "hudud" | "ofis" | "maishiy" | "stanok"; stanokId?: string; n: number };

type Props = {
  stanoklar: StanokTavsifi[];
  holatlar: SexHolati;
  /** Hududdagi yuk mashinalari (manba bermasa — bo'sh). */
  reyslar: Reys[];
  tanlangan: string | null;
  onTanlash: (id: string) => void;
  kamera: KameraBuyrugi;
};

/** Ishlab chiqarish binosi (64 × 30 m) old-o'ng tomondan. */
const UMUMIY_KAMERA = { joy: [30, 30, 40] as const, nishon: [-1, 0, 1] as const };
/** Ofis (direktor qavati ochiq) va maishiy blok. */
const OFIS_KAMERA = { joy: [(OFIS.x0 + OFIS.x1) / 2 + 22, 30, OFIS.z1 + 26] as const, nishon: [(OFIS.x0 + OFIS.x1) / 2, 4, (OFIS.z0 + OFIS.z1) / 2] as const };
const MAISHIY_KAMERA = { joy: [(MAISHIY.x0 + MAISHIY.x1) / 2 + 20, 26, MAISHIY.z1 + 22] as const, nishon: [(MAISHIY.x0 + MAISHIY.x1) / 2, 0, (MAISHIY.z0 + MAISHIY.z1) / 2] as const };
/** Butun zavod hududi: KPP, rampalar, yuk mashinalari va atrofdagi shaharcha. */
const HUDUD_KAMERA = { joy: [95, 78, 118] as const, nishon: [2, 0, 12] as const };
/** Quyosh (osmon, yorug'lik va soyalar bir yo'nalishda). */
const QUYOSH: [number, number, number] = [40, 60, 25];

/** Yorliq ko'rinishi kameragacha masofaga qarab: 0 — to'liq karta, 1 — ixcham (nom), 2 — faqat holat nuqtasi. */
type Daraja = 0 | 1 | 2;

/** Stanok pultidagi ekran: joriy buyurtma, detal, miqdor va holat (ma'lumot o'zgarganda qayta chiziladi). */
function useEkranMateriali(nom: string, holat: StanokHolati | undefined) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const { canvas, tekstura, material } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 200;
    const tekstura = new THREE.CanvasTexture(canvas);
    tekstura.colorSpace = THREE.SRGBColorSpace;
    tekstura.anisotropy = 4;
    return { canvas, tekstura, material: new THREE.MeshBasicMaterial({ map: tekstura, toneMapped: false }) };
  }, []);
  useEffect(() => () => { tekstura.dispose(); material.dispose(); }, [tekstura, material]);
  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const korinadi = korinadiganHolat(holat);
    const rang = HOLAT_RANGI[korinadi];
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, 320, 200);
    ctx.fillStyle = rang;
    ctx.fillRect(0, 0, 320, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(nom, 12, 21);
    ctx.textAlign = "right";
    ctx.font = "bold 15px Arial, sans-serif";
    ctx.fillText(t(`status.${korinadi}`).toUpperCase(), 308, 21);
    ctx.textAlign = "left";
    const joriy = holat?.joriy;
    if (joriy) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 19px Arial, sans-serif";
      ctx.fillText(`${joriy.buyurtma} · ${joriy.detal}`, 12, 64);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "15px Arial, sans-serif";
      ctx.fillText(joriy.operatsiya, 12, 88);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 46px Arial, sans-serif";
      const miqdor = `${joriy.bajarildi}/${joriy.jami}`;
      ctx.fillText(miqdor, 12, 130);
      const eni = ctx.measureText(miqdor).width;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText(joriy.birlik, 20 + eni, 138);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(12, 160, 296, 12);
      ctx.fillStyle = rang;
      ctx.fillRect(12, 160, 296 * bajarilishUlushi(joriy), 12);
    } else {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 20px Arial, sans-serif";
      ctx.fillText(t("list.noTask"), 12, 100);
    }
    if (holat) {
      ctx.fillStyle = "#64748b";
      ctx.font = "13px Arial, sans-serif";
      ctx.fillText(new Date(holat.yangilangan).toLocaleTimeString("uz-UZ", { hour12: false }), 12, 189);
      ctx.textAlign = "right";
      ctx.fillStyle = holat.aloqa ? "#22c55e" : "#a855f7";
      ctx.fillText(holat.aloqa ? "ONLINE" : "OFFLINE", 308, 189);
    }
    tekstura.needsUpdate = true;
  }, [canvas, tekstura, nom, holat, t]);
  return material;
}

/** Avariya to'xtatish tugmasi (sariq qutida qizil "qo'ziqorin"), old tomoni +z. */
function AvariyaTugmasi({ mat, p, r }: { mat: Materiallar; p: [number, number, number]; r?: [number, number, number] }) {
  return (
    <group position={p} rotation={r}>
      <Yumaloq o={[0.11, 0.11, 0.07]} p={[0, 0, 0]} mat={mat.ogohlantirish} radius={0.015} />
      <Silindr r={0.038} h={0.045} p={[0, 0, 0.055]} rot={[Math.PI / 2, 0, 0]} mat={mat.qizilTugma} seg={16} />
    </group>
  );
}

/** Ogohlantirish belgisi (sariq romb), old tomoni +z. */
function Belgi({ mat, p, r }: { mat: Materiallar; p: [number, number, number]; r?: [number, number, number] }) {
  return (
    <group position={p} rotation={r}>
      <Quti o={[0.17, 0.17, 0.008]} p={[0, 0, 0]} r={[0, 0, Math.PI / 4]} mat={mat.qora} />
      <Quti o={[0.14, 0.14, 0.01]} p={[0, 0, 0.001]} r={[0, 0, Math.PI / 4]} mat={mat.ogohlantirish} />
    </group>
  );
}

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

type ModelProps = { mat: Materiallar; ishlayapti: boolean; ekran: THREE.Material };

/** Format-kesish stanogi: korpus, uzun suriladigan karetka, ko'ndalang stol, aylanuvchi arra, ustki himoya, boshqaruv paneli, LDSP list. */
function KesishStanogi({ mat, ishlayapti, ekran }: ModelProps) {
  const arra = useRef<THREE.Mesh>(null);
  const karetka = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!ishlayapti) return;
    if (arra.current) arra.current.rotation.z -= dt * 30;
    if (karetka.current) karetka.current.position.x = Math.sin(performance.now() / 1400) * 0.7;
  });
  return (
    <group>
      <Yumaloq o={[1.5, 0.85, 1.0]} p={[0.4, 0.425, 0]} mat={mat.korpus} radius={0.05} />
      <Yumaloq o={[1.5, 0.1, 1.0]} p={[0.4, 0.88, 0]} mat={mat.kesishRang} radius={0.03} />
      <Belgi mat={mat} p={[0.0, 0.6, 0.505]} />
      <Quti o={[0.5, 0.12, 0.01]} p={[0.65, 0.6, 0.505]} mat={mat.korpusQora} />
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
      <Yumaloq o={[0.36, 0.52, 0.14]} p={[1.3, 1.45, 0.55]} mat={mat.korpusQora} radius={0.03} />
      <Quti o={[0.3, 0.19, 0.01]} p={[1.3, 1.56, 0.625]} mat={ekran} />
      <AvariyaTugmasi mat={mat} p={[1.3, 1.3, 0.6]} />
      {/* Chiqindi patrubkasi */}
      <Silindr r={0.08} h={1.4} p={[0.7, 2.6, -0.4]} mat={mat.polat} />
    </group>
  );
}

/** CNC frezer (nesting): vakuum stol, ikki tomonlama relslar, harakatlanuvchi portal, shpindel kallagi, boshqaruv shkafi. */
function CncStanogi({ mat, ishlayapti, ekran }: ModelProps) {
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
      <Yumaloq o={[3.3, 0.75, 1.75]} p={[0, 0.375, 0]} mat={mat.korpusQora} radius={0.06} />
      <Belgi mat={mat} p={[-1.2, 0.45, 0.88]} />
      <Quti o={[0.7, 0.14, 0.01]} p={[-0.4, 0.45, 0.88]} mat={mat.cncRang} />
      <Quti o={[3.1, 0.06, 1.6]} p={[0, 0.78, 0]} mat={mat.vakuum} />
      {/* Vakuum stol to'ri */}
      {Array.from({ length: 9 }, (_, i) => <Quti key={`x${i}`} o={[0.012, 0.005, 1.55]} p={[-1.4 + i * 0.35, 0.813, 0]} mat={mat.polatQora} />)}
      <Quti o={[2.44, 0.018, 1.22]} p={[0.1, 0.83, 0]} mat={mat.lmdpOq} />
      {/* Relslar */}
      <Quti o={[3.4, 0.12, 0.12]} p={[0, 0.84, 0.92]} mat={mat.polat} />
      <Quti o={[3.4, 0.12, 0.12]} p={[0, 0.84, -0.92]} mat={mat.polat} />
      {/* Portal */}
      <group ref={portal}>
        <Yumaloq o={[0.3, 1.0, 0.22]} p={[0, 1.4, 0.95]} mat={mat.cncRang} radius={0.04} />
        <Yumaloq o={[0.3, 1.0, 0.22]} p={[0, 1.4, -0.95]} mat={mat.cncRang} radius={0.04} />
        <Yumaloq o={[0.4, 0.32, 2.15]} p={[0, 1.95, 0]} mat={mat.cncRang} radius={0.05} />
        <Quti o={[0.42, 0.06, 2.0]} p={[0, 2.14, 0]} mat={mat.polat} />
        <group ref={kallak}>
          <Yumaloq o={[0.36, 0.5, 0.36]} p={[0.25, 1.62, 0]} mat={mat.korpus} radius={0.04} />
          <Silindr r={0.11} h={0.36} p={[0.25, 1.24, 0]} mat={mat.polatQora} />
          <mesh ref={shpindel} position={[0.25, 1.0, 0]} material={mat.polat} castShadow>
            <cylinderGeometry args={[0.03, 0.012, 0.16, 12]} />
          </mesh>
          {/* Chang yig'gich cho'tka */}
          <Silindr r={0.16} h={0.08} p={[0.25, 1.08, 0]} mat={mat.rezina} />
        </group>
      </group>
      {/* Boshqaruv shkafi va pult */}
      <Yumaloq o={[0.6, 1.7, 0.45]} p={[2.15, 0.85, -0.45]} mat={mat.korpus} radius={0.04} />
      <Quti o={[0.5, 0.04, 0.02]} p={[2.15, 1.5, -0.22]} mat={mat.cncRang} />
      <Belgi mat={mat} p={[2.15, 1.25, -0.22]} />
      <Quti o={[0.06, 1.1, 0.06]} p={[1.95, 0.55, 1.15]} mat={mat.polatQora} />
      <Yumaloq o={[0.5, 0.36, 0.08]} p={[1.95, 1.25, 1.15]} r={[-0.35, 0, 0]} mat={mat.korpusQora} radius={0.025} />
      <Quti o={[0.42, 0.26, 0.01]} p={[1.95, 1.27, 1.2]} r={[-0.35, 0, 0]} mat={ekran} />
      <AvariyaTugmasi mat={mat} p={[2.32, 1.12, 1.17]} r={[-0.35, 0, 0]} />
    </group>
  );
}

/** Qirra yopishtirish stanogi: uzun korpus, kirish/chiqish stoli, yuqori bosim balkasi roliklari, elim idishi, lenta rulon, shaffof qopqoq. */
function QirraStanogi({ mat, ishlayapti, ekran }: ModelProps) {
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
      <Yumaloq o={[4.2, 0.9, 0.8]} p={[0, 0.45, -0.1]} mat={mat.korpus} radius={0.05} />
      <Yumaloq o={[4.2, 0.12, 0.8]} p={[0, 0.94, -0.1]} mat={mat.qirraRang} radius={0.03} />
      {[-1.5, 0, 1.5].map((x) => <Quti key={`l${x}`} o={[0.02, 0.6, 0.01]} p={[x, 0.5, 0.305]} mat={mat.korpusQora} />)}
      <Belgi mat={mat} p={[-0.75, 0.6, 0.31]} />
      <AvariyaTugmasi mat={mat} p={[1.2, 0.75, 0.33]} />
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
      <Yumaloq o={[0.55, 0.38, 0.08]} p={[2.2, 1.35, 0.75]} mat={mat.korpusQora} radius={0.025} />
      <Quti o={[0.46, 0.29, 0.01]} p={[2.2, 1.35, 0.795]} mat={ekran} />
    </group>
  );
}

/** Burg'ilash stanogi: ish stoli, orqa tirgak, uch shpindelli vertikal kallak (pastga-yuqoriga yuradi), detal. */
function BurgilashStanogi({ mat, ishlayapti, ekran }: ModelProps) {
  const kallak = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ishlayapti || !kallak.current) return;
    const t = performance.now() / 1000;
    kallak.current.position.y = 1.62 + Math.abs(Math.sin(t * 1.6)) * 0.18;
    kallak.current.position.x = Math.round(Math.sin(t * 0.35) * 2) * 0.35;
  });
  return (
    <group>
      <Yumaloq o={[2.0, 0.85, 1.0]} p={[0, 0.425, 0]} mat={mat.korpus} radius={0.05} />
      <Belgi mat={mat} p={[-0.6, 0.55, 0.505]} />
      <AvariyaTugmasi mat={mat} p={[0.75, 0.65, 0.52]} />
      <Quti o={[2.1, 0.06, 1.05]} p={[0, 0.88, 0]} mat={mat.polatQora} />
      <Quti o={[2.1, 0.12, 0.08]} p={[0, 0.97, -0.48]} mat={mat.burgRang} />
      <Quti o={[1.4, 0.018, 0.6]} p={[0, 0.92, 0.1]} mat={mat.lmdpKul} />
      {/* Portal ustunlar va balka */}
      <Yumaloq o={[0.14, 1.4, 0.18]} p={[-0.95, 1.55, -0.38]} mat={mat.burgRang} radius={0.03} />
      <Yumaloq o={[0.14, 1.4, 0.18]} p={[0.95, 1.55, -0.38]} mat={mat.burgRang} radius={0.03} />
      <Yumaloq o={[2.05, 0.2, 0.24]} p={[0, 2.3, -0.38]} mat={mat.burgRang} radius={0.04} />
      <group ref={kallak} position={[0, 1.62, 0]}>
        <Yumaloq o={[0.5, 0.35, 0.35]} p={[0, 0.2, -0.1]} mat={mat.korpus} radius={0.04} />
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
      <Yumaloq o={[0.4, 0.3, 0.1]} p={[1.25, 1.3, 0.2]} r={[0, -0.5, 0]} mat={mat.korpusQora} radius={0.025} />
      <Quti o={[0.33, 0.21, 0.01]} p={[1.275, 1.3, 0.255]} r={[0, -0.5, 0]} mat={ekran} />
    </group>
  );
}

/** Qadoqlash joyi: qadoqlash stoli, karton qutilar, stretch-plyonka o'rash aylanma stoli (minora, palet). */
function QadoqlashJoyi({ mat, ishlayapti, ekran }: ModelProps) {
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
      <Yumaloq o={[0.16, 2.3, 0.16]} p={[2.35, 1.15, -0.5]} mat={mat.qadoqRang} radius={0.03} />
      <mesh ref={karetka} position={[2.2, 1.2, -0.38]} material={mat.korpus} castShadow>
        <boxGeometry args={[0.28, 0.32, 0.28]} />
      </mesh>
      <Yumaloq o={[0.36, 0.5, 0.2]} p={[2.35, 0.9, 0.35]} mat={mat.korpusQora} radius={0.03} />
      <Quti o={[0.3, 0.19, 0.01]} p={[2.35, 1.02, 0.455]} mat={ekran} />
      <AvariyaTugmasi mat={mat} p={[2.35, 0.75, 0.46]} />
    </group>
  );
}

const MODELLAR: Record<StanokTuri, (p: ModelProps) => ReactNode> = {
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

function Stanok({ tavsif, holat, tanlangan, onTanlash, mat, yorliqKorinadi, daraja }: { tavsif: StanokTavsifi; holat?: StanokHolati; tanlangan: boolean; onTanlash: (id: string) => void; mat: Materiallar; yorliqKorinadi: boolean; daraja: Daraja }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const ekran = useEkranMateriali(tavsif.nom, holat);
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
        <Model mat={mat} ishlayapti={ishlayapti} ekran={ekran} />
        {OPERATORLAR[tavsif.tur].map((op, i) => (
          <Suspense key={i} fallback={null}>
            <GlbOdam tur="ishchi" harakat={ishlayapti ? "ishlash" : "turish"} p={op.p} burilish={op.burilish} faza={((i * 0.37 + tavsif.joy[0] * 0.13) % 1 + 1) % 1} />
          </Suspense>
        ))}
        <SignalMinorasi p={[-1.0, 1.0, -0.45]} rang={rang} mat={mat} />
        {/* Pol belgisi: stanok zonasi */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
          <planeGeometry args={[OLCHAM[tavsif.tur] * 2 + 0.6, 2.9]} />
          <meshStandardMaterial color={ustida || tanlangan ? "#dbeafe" : "#cbd5e1"} roughness={0.9} />
        </mesh>
      </group>
      {tanlangan && <TanlashHalqasi radius={OLCHAM[tavsif.tur] + 0.35} rang={rang} />}
      {yorliqKorinadi && <Html position={[0, BALANDLIK[tavsif.tur] + (daraja === 0 || tanlangan ? 1.1 : 0.6), 0]} center zIndexRange={YORLIQ_Z} style={YORLIQ_USLUBI}>
        {daraja === 2 && !tanlangan ? (
          // Uzoqdan: faqat holat nuqtasi (nomi — sichqoncha ustida va ekran o'quvchi uchun).
          <button type="button" data-stanok-yorliq={tavsif.id} onClick={() => onTanlash(tavsif.id)} title={`${tavsif.nom} · ${t(`status.${korinadi}`)}`} aria-label={`${tavsif.nom} · ${t(`status.${korinadi}`)}`} className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-md" style={{ background: rang }} />
        ) : daraja === 1 && !tanlangan ? (
          <button type="button" data-stanok-yorliq={tavsif.id} onClick={() => onTanlash(tavsif.id)} title={t(`status.${korinadi}`)} className="flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11.5px] font-black text-slate-900 shadow-md backdrop-blur transition hover:border-blue-300 hover:bg-white">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: rang }} aria-hidden="true" />
            {tavsif.nom}
          </button>
        ) : (
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
        )}
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
      void c.setLookAt(0, 75, 0.01, 0, 0, 2, true);
      return;
    }
    if (kamera.tur === "hudud") {
      void c.setLookAt(...HUDUD_KAMERA.joy, ...HUDUD_KAMERA.nishon, true);
      return;
    }
    if (kamera.tur === "ofis") {
      void c.setLookAt(...OFIS_KAMERA.joy, ...OFIS_KAMERA.nishon, true);
      return;
    }
    if (kamera.tur === "maishiy") {
      void c.setLookAt(...MAISHIY_KAMERA.joy, ...MAISHIY_KAMERA.nishon, true);
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
      maxDistance={260}
      maxPolarAngle={Math.PI / 2.1}
      smoothTime={0.6}
      draggingSmoothTime={0.15}
      dollyToCursor
    />
  );
}

/** Kameragacha masofaga qarab yorliq darajasini aniqlaydi (chegarada titramasligi uchun gisterezis bilan). */
function MasofaKuzatuvchi({ onDaraja }: { onDaraja: (d: Daraja) => void }) {
  const joriy = useRef<Daraja>(0);
  useFrame(({ camera }) => {
    const d = camera.position.length();
    const j = joriy.current;
    const yangi: Daraja = d > (j === 2 ? 65 : 71) ? 2 : d > (j >= 1 ? 35 : 41) ? 1 : 0;
    if (yangi !== j) {
      joriy.current = yangi;
      onDaraja(yangi);
    }
  });
  return null;
}

export default function SexSahnasi({ stanoklar, holatlar, reyslar, tanlangan, onTanlash, kamera }: Props) {
  return (
    <Canvas
      // PCF soyalar (three r187 da PCFSoftShadowMap olib tashlangan — ogohlantirish chiqmasin).
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ position: [...UMUMIY_KAMERA.joy], fov: 42, near: 0.3, far: 2500 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
      data-sex-sahnasi
    >
      <SahnaIchi stanoklar={stanoklar} holatlar={holatlar} reyslar={reyslar} tanlangan={tanlangan} onTanlash={onTanlash} kamera={kamera} />
    </Canvas>
  );
}

/** Usta sexni aylanib chiqadi (har stanok oldida to'xtab planshetga qaraydi). */
const USTA_YOLI: Array<[number, number]> = [[-19, -1.5], [-10, -1.5], [0, -1.5], [10, -1.5], [19, -1.5], [19, 1.9], [10, 1.9], [0, 1.9], [-10, 1.9], [-19, 1.9]];

function SahnaIchi({ stanoklar, holatlar, reyslar, tanlangan, onTanlash, kamera }: Props) {
  const mat = useMateriallar();
  const sm = useShaharMateriallari();
  const [daraja, setDaraja] = useState<Daraja>(0);
  return (
    <>
      {/* Osmon (shader, tashqi rasm yo'q) va havo pardasi: uzoqdagi shaharcha ufqda eriydi */}
      <Sky distance={1800} sunPosition={QUYOSH} turbidity={4.5} rayleigh={1.2} mieCoefficient={0.004} mieDirectionalG={0.8} />
      <fog attach="fog" args={["#d4dfe9", 220, 720]} />
      {/* Muhit aksi: kod bilan yasalgan yorug' panellar (metall va oynalar realistik aks etadi) */}
      <Environment resolution={128} frames={1} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.2} position={[0, 40, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[120, 120, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={0.9} position={[-50, 12, 0]} rotation={[0, Math.PI / 2, 0]} scale={[100, 24, 1]} color="#c7dbff" />
        <Lightformer form="rect" intensity={0.7} position={[50, 10, 20]} rotation={[0, -Math.PI / 2, 0]} scale={[100, 24, 1]} color="#ffe6c7" />
        <Lightformer form="rect" intensity={0.35} position={[0, -6, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[150, 150, 1]} color="#8a9873" />
      </Environment>
      <hemisphereLight args={["#e3edf8", "#6f7d5e", 0.55]} />
      <directionalLight
        position={QUYOSH}
        intensity={2.3}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={62}
        shadow-camera-bottom={-62}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-30, 20, -20]} intensity={0.3} color="#cfe0ff" />
      <MasofaKuzatuvchi onDaraja={setDaraja} />
      {/* Ambient occlusion (burchak va tutashgan joylardagi yumshoq soya) — sahnani ancha realistik qiladi */}
      <EffectComposer multisampling={4}>
        <N8AO halfRes aoRadius={1.6} intensity={2.2} distanceFalloff={0.6} quality="performance" />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      <Shaharcha m={mat} sm={sm} />
      <SexMuhiti mat={mat} stanoklar={stanoklar} uzoq={daraja === 2} />
      <Logistika m={mat} sm={sm} reyslar={reyslar} yorliq={daraja > 0 || kamera.tur === "hudud"} />
      {/* Yo'lakdagi harakat: list ko'tarib yuruvchi ishchilar, sexni aylanayotgan usta va pogruzchik */}
      {/* Ofis (direktorlar qavati), maishiy blok (kiyinish xonalari, oshxona), odamlar — GLB modellar yuklanguncha ko'rinmaydi */}
      <Suspense fallback={null}><Ofis m={mat} /></Suspense>
      <Suspense fallback={null}><Maishiy m={mat} /></Suspense>
      <Suspense fallback={null}>
        <YuruvchiGlbOdam tur="biznesmen" nuqtalar={USTA_YOLI} halqa tezlik={1.0} toxtash={2.5} toxtashHarakati="gaplashish" />
        <YuruvchiGlbOdam tur="oddiyErkak" nuqtalar={[[-21, -1.2], [20, -1.2]]} tezlik={1.2} faza={0.3} />
        <YuruvchiGlbOdam tur="ishchi" nuqtalar={[[20, -0.8], [-21, -0.8]]} tezlik={1.1} faza={0.6} />
        <YuruvchiGlbOdam tur="ayolOddiy" nuqtalar={[[41, -8.5], [33, -8.5], [28, -8.5], [28, -1.5]]} tezlik={1.15} faza={0.1} toxtash={1.5} />
        <KelibKetuvchilar />
      </Suspense>
      {/* Markaziy yo'lak bo'ylab (x yo'nalishida) yuradigan pogruzchik */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <Pogruzchik mat={mat} x={-1.2} yol={[-18, 10]} />
      </group>
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
          daraja={daraja}
        />
      ))}
      <KameraBoshqaruvi kamera={kamera} stanoklar={stanoklar} />
    </>
  );
}
