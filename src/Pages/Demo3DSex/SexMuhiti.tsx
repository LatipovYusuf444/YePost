import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { SEX_CHUQURLIGI, SEX_ENI, type Materiallar } from "./materiallar";
import { Quti, Silindr, StatikGuruh } from "./shakllar";
import type { StanokTavsifi } from "./sexModeli";
import { ZONALAR } from "./hudud";
import {
  ARAVACHALAR, ARAVACHA_OLCHAMI, ASBOB_STOLI, BORDYUR, CHAP_DEVOR_BOLAKLARI, CHAP_ESHIKLAR_Z, CHIQINDI_IDISHLARI, CHIQISH_ESHIKLARI_X,
  DEVOR_BALANDLIGI, DEVOR_QALINLIGI, ELEKTR_SHKAFLAR, ESHIK_BALANDLIGI, ESHIK_ENI, FERMA, FERMA_X, GALEREYA_OCHIGI, GALEREYA_YOLAGI,
  ICHKI_QATOR_Z, JONATISH_YOLAKLARI, KONDALANG_QUVUR_X, KONDALANG_YOLAKLAR, KRAN, LIST_OLCHAMI, MAGISTRAL_R, MARKAZIY_YOLAK,
  MATERIAL_STELLAJLARI, MATERIAL_TAXLAMLARI, MATERIAL_YOLAKLARI, OLD_BORDYUR_BOLAKLARI, OLD_MAGISTRAL_Z, OLD_RAMPALAR_X, OLD_USTUN_Z,
  ONG_BORDYUR_BOLAKLARI, ONG_USTUN_X, ORQA_MAGISTRAL_Z, ORQA_USTUN_Z, PALET_OLCHAMI, PATRUBKA, PROGON_Z, PRORAB_XONASI, QUVUR_Y,
  RAMPA_OCHIGI, SHKAF_ENI, SIKLON, TAYYOR_PALETLAR, USTUN_KESIMI, CHAP_USTUN_X, bolaklar, kranHolati, magistralZ, tushishNuqtasi,
  ustunlar, type Tortburchak,
} from "./sexBinosi";

// Ishlab chiqarish binosi (64 × 30 × 8 m): beton pol va bo'yalgan yo'laklar, orqa va chap devorlar (derazalar, ko'tariluvchi darvoza
// ochiqlari), po'lat karkas (ustunlar 12 m qadam, fermalar, progonlar), kran-balka, LED yoritgichlar, kabel lotoklari, chang so'rish
// (siklon, magistrallar, har stanokka tushuvchi quvur), elektr shkaflar, chilangar stoli, o't o'chirgichlar, belgilar, favqulodda
// chiqishlar, prorab xonasi, material ombori va tayyor mahsulot zonasi. Old (z = 15) va o'ng (x = 32) tomonlar past bordyurgacha
// qirqilgan, tom yopilmagan — kamera ichini ko'radi. Hammasi kod bilan (tashqi model/tekstura fayli yo'q).
// Qimirlamaydigan qismlar StatikGuruh ichida material bo'yicha birlashtiriladi; kran alohida (sekin harakatlanadi).

type V3 = [number, number, number];

const ZONA_Z = [9, 0];
const ZONA_USLUBI = { pointerEvents: "none" } as const;
const YX = SEX_ENI / 2;
const YZ = SEX_CHUQURLIGI / 2;
const DEVOR_X = -YX;
const DEVOR_Z = -YZ;
/** Devorlarning ichki yuzi. */
const ICHKI_X = DEVOR_X + DEVOR_QALINLIGI / 2;
const ICHKI_Z = DEVOR_Z + DEVOR_QALINLIGI / 2;
/** Pol bo'yog'i sathlari (uzoqdan ham titramasligi uchun bir-biridan sezilarli farq). */
const Y_ASOS = 0.01;
const Y_USTKI = 0.018;
const Y_CHIZIQ = 0.026;
const Y_BELGI = 0.032;
/** Deraza tasmasi (orqa va chap devor). */
const DERAZA = { past: 5.0, tepa: 6.6 } as const;
const YORITGICH_X = [-28, -18, -6, 6, 18, 28] as const;
const YORITGICH_Z = [-12, -6, 0, 6, 12] as const;

export function ZonaYorligi({ p, matn, rang }: { p: [number, number, number]; matn: string; rang: string }) {
  return (
    <Html position={p} center zIndexRange={ZONA_Z} style={ZONA_USLUBI}>
      <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-black uppercase tracking-wide text-white shadow" style={{ background: rang }}>{matn}</span>
    </Html>
  );
}

// ── Mahalliy resurslar: belgilar atlasi, LED, piyoda yo'lagi bo'yog'i, o'q va iz shakllari ──

/** Belgilar atlasi (8 katak × 128 px): 0–1 favqulodda chiqish, 2 kaska, 3 quloqchin, 4 elektr xavfi, 5 chekish man, 6 o't o'chirgich, 7 birinchi yordam. */
function belgiAtlasi() {
  if (typeof document === "undefined") return null;
  const k = 128;
  const canvas = document.createElement("canvas");
  canvas.width = k * 8;
  canvas.height = k;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const doira = (cx: number, r: number, rang: string) => { ctx.fillStyle = rang; ctx.beginPath(); ctx.arc(cx, k / 2, r, 0, Math.PI * 2); ctx.fill(); };
  // 0–1: yashil "chiqish" — yuguruvchi odam, eshik va o'q
  ctx.fillStyle = "#0f8a3c";
  ctx.fillRect(0, 0, k * 2, k);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(12, 14, 58, 100);
  ctx.fillStyle = "#0f8a3c";
  ctx.fillRect(20, 22, 42, 92);
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.arc(104, 28, 10, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(98, 44); ctx.lineTo(88, 76); ctx.lineTo(70, 104); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(88, 76); ctx.lineTo(108, 88); ctx.lineTo(112, 112); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(78, 56); ctx.lineTo(98, 46); ctx.lineTo(118, 60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(150, 64); ctx.lineTo(222, 64); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(196, 38); ctx.lineTo(226, 64); ctx.lineTo(196, 90); ctx.stroke();
  // 2: kaska (ko'k doira)
  doira(k * 2.5, 58, "#1d5fbf");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(k * 2.5, 76, 34, Math.PI, 0); ctx.fill();
  ctx.fillRect(k * 2.5 - 46, 74, 92, 10);
  ctx.fillRect(k * 2.5 - 5, 40, 10, 36);
  // 3: quloqchin (ko'k doira)
  doira(k * 3.5, 58, "#1d5fbf");
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.arc(k * 3.5, 66, 30, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(k * 3.5 - 44, 60, 22, 36);
  ctx.fillRect(k * 3.5 + 22, 60, 22, 36);
  // 4: elektr xavfi (sariq uchburchak, qora chaqmoq)
  ctx.fillStyle = "#111111";
  ctx.beginPath(); ctx.moveTo(k * 4.5, 6); ctx.lineTo(k * 5 - 4, 120); ctx.lineTo(k * 4 + 4, 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f5c518";
  ctx.beginPath(); ctx.moveTo(k * 4.5, 22); ctx.lineTo(k * 5 - 16, 112); ctx.lineTo(k * 4 + 16, 112); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.beginPath(); ctx.moveTo(k * 4.5 + 6, 44); ctx.lineTo(k * 4.5 - 12, 80); ctx.lineTo(k * 4.5 + 2, 80); ctx.lineTo(k * 4.5 - 6, 106); ctx.lineTo(k * 4.5 + 14, 70); ctx.lineTo(k * 4.5, 70); ctx.closePath(); ctx.fill();
  // 5: chekish man (oq fon, qizil doira va chiziq, sigaret)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(k * 5, 0, k, k);
  ctx.fillStyle = "#222222";
  ctx.fillRect(k * 5 + 28, 62, 60, 12);
  ctx.fillStyle = "#c2410c";
  ctx.fillRect(k * 5 + 88, 62, 12, 12);
  ctx.strokeStyle = "#d61f1f";
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(k * 5.5, 64, 50, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(k * 5.5 - 35, 29); ctx.lineTo(k * 5.5 + 35, 99); ctx.stroke();
  // 6: o't o'chirgich (qizil kvadrat, oq ballon)
  ctx.fillStyle = "#d61f1f";
  ctx.fillRect(k * 6 + 4, 4, k - 8, k - 8);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(k * 6.5 - 16, 40, 32, 70);
  ctx.beginPath(); ctx.arc(k * 6.5, 40, 16, Math.PI, 0); ctx.fill();
  ctx.fillRect(k * 6.5 - 4, 16, 8, 12);
  ctx.fillRect(k * 6.5, 18, 30, 6);
  // 7: birinchi yordam (yashil kvadrat, oq xoch)
  ctx.fillStyle = "#0f8a3c";
  ctx.fillRect(k * 7 + 4, 4, k - 8, k - 8);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(k * 7.5 - 14, 26, 28, 76);
  ctx.fillRect(k * 7.5 - 38, 50, 76, 28);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Atlasdan [a, b) kataklarni ko'rsatuvchi 1 × 1 tekislik. */
function atlasTekisligi(a: number, b: number) {
  const g = new THREE.PlaneGeometry(1, 1);
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setX(i, (a + uv.getX(i) * (b - a)) / 8);
  uv.needsUpdate = true;
  return g;
}

function useBinoResurslari() {
  const r = useMemo(() => {
    const atlas = belgiAtlasi();
    // O'q (yo'nalish belgisi): +x ga qaragan, polga yotqiziladi.
    const oq = new THREE.Shape();
    oq.moveTo(-0.65, -0.11); oq.lineTo(0.12, -0.11); oq.lineTo(0.12, -0.32); oq.lineTo(0.65, 0); oq.lineTo(0.12, 0.32); oq.lineTo(0.12, 0.11); oq.lineTo(-0.65, 0.11); oq.closePath();
    // Oyoq izi (piyoda yo'lagi belgisi): taglik + tovon, oldi +y.
    const taglik = new THREE.Shape();
    taglik.absellipse(0, 0.05, 0.055, 0.105, 0, Math.PI * 2, false, 0);
    const tovon = new THREE.Shape();
    tovon.absellipse(0, -0.12, 0.045, 0.055, 0, Math.PI * 2, false, 0);
    const izlar = [new THREE.ShapeGeometry(taglik, 10), new THREE.ShapeGeometry(tovon, 8)];
    const iz = mergeGeometries(izlar, false) ?? izlar[0].clone();
    izlar.forEach((g) => g.dispose());
    return {
      atlas,
      led: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6e0", emissiveIntensity: 2.2, roughness: 0.35 }),
      piyoda: new THREE.MeshStandardMaterial({ color: "#4f8297", roughness: 0.78 }),
      belgi: new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.55 }),
      chiqish: new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.4 }),
      g: {
        chiqish: atlasTekisligi(0, 2),
        kaska: atlasTekisligi(2, 3),
        quloqchin: atlasTekisligi(3, 4),
        elektr: atlasTekisligi(4, 5),
        chekish: atlasTekisligi(5, 6),
        otOchirgich: atlasTekisligi(6, 7),
        yordam: atlasTekisligi(7, 8),
        oq: new THREE.ShapeGeometry(oq),
        iz,
      },
    };
  }, []);
  useEffect(() => () => {
    r.atlas?.dispose();
    [r.led, r.piyoda, r.belgi, r.chiqish].forEach((m) => m.dispose());
    Object.values(r.g).forEach((g) => g.dispose());
  }, [r]);
  return r;
}
type Resurslar = ReturnType<typeof useBinoResurslari>;

// ── Oddiy yordamchi shakllar ──

/** Polga yotqizilgan tekis bo'yoq (soya tashlamaydi, faqat qabul qiladi). `r` — pol tekisligida burilish (0: +x, −π/2: +z). */
function Tekis({ o, p, mat, r = 0 }: { o: [number, number]; p: V3; mat: THREE.Material; r?: number }) {
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, r]} material={mat} receiveShadow>
      <planeGeometry args={o} />
    </mesh>
  );
}

/** To'rtburchakni polga bo'yash. */
function Maydon({ t, y, mat }: { t: Tortburchak; y: number; mat: THREE.Material }) {
  return <Tekis o={[t.x1 - t.x0, t.z1 - t.z0]} p={[(t.x0 + t.x1) / 2, y, (t.z0 + t.z1) / 2]} mat={mat} />;
}

/** Polga yotqizilgan shakl (o'q, iz). */
function PolBelgisi({ g, p, r, mat, s = 1 }: { g: THREE.BufferGeometry; p: [number, number]; r: number; mat: THREE.Material; s?: number }) {
  return <mesh geometry={g} material={mat} position={[p[0], Y_BELGI, p[1]]} rotation={[-Math.PI / 2, 0, r]} scale={s} receiveShadow />;
}

/** Devor yoki ustundagi belgi (atlasdan). `ry` — Y atrofida burilish (0: +z ga qaraydi). */
function Belgi({ g, mat, p, ry = 0, s = 0.4 }: { g: THREE.BufferGeometry; mat: THREE.Material; p: V3; ry?: number; s?: number | V3 }) {
  return <mesh geometry={g} material={mat} position={p} rotation={[0, ry, 0]} scale={s} />;
}

/** Konus yoki kesik konus (siklon, varonka). */
function Konus({ rt, rb, h, p, mat, seg = 24 }: { rt: number; rb: number; h: number; p: V3; mat: THREE.Material; seg?: number }) {
  return (
    <mesh position={p} material={mat} castShadow receiveShadow>
      <cylinderGeometry args={[rt, rb, h, seg]} />
    </mesh>
  );
}

/** Ikki nuqta orasidagi quvur (o'qlarga parallel bo'laklar uchun). */
function Quvur({ a, b, r, mat, seg = 16 }: { a: V3; b: V3; r: number; mat: THREE.Material; seg?: number }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const uzunlik = Math.hypot(dx, dy, dz);
  if (uzunlik < 1e-3) return null;
  const rot: V3 = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > Math.abs(dz) ? [0, 0, Math.PI / 2] : Math.abs(dz) > Math.abs(dy) ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return <Silindr r={r} h={uzunlik} p={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rot={rot} mat={mat} seg={seg} />;
}

function Shar({ r, p, mat }: { r: number; p: V3; mat: THREE.Material }) {
  return (
    <mesh position={p} material={mat} castShadow receiveShadow>
      <sphereGeometry args={[r, 14, 10]} />
    </mesh>
  );
}

/** Xavf chizig'i (sariq-qora bo'laklar) — vertikal: y bo'ylab, gorizontal: `oqi` bo'ylab. */
function XavfChizigi({ mat, p, o, soni, oqi }: { mat: Materiallar; p: V3; o: V3; soni: number; oqi: 0 | 1 | 2 }) {
  const qadam = o[oqi] / soni;
  return (
    <>
      {Array.from({ length: soni }, (_, i) => {
        const pos: V3 = [...p];
        pos[oqi] += -o[oqi] / 2 + qadam * (i + 0.5);
        const olcham: V3 = [...o];
        olcham[oqi] = qadam;
        return <Quti key={i} o={olcham} p={pos} mat={i % 2 ? mat.qora : mat.sariq} />;
      })}
    </>
  );
}

// ── Karkas ──

/** Po'lat ustun (qo'shtavr kesim): asos plitasi, ankerlar, tepasida qalpoq; ichkilarida pastda xavf chizig'i. */
function Ustun({ mat, x, z, ichki }: { mat: Materiallar; x: number; z: number; ichki: boolean }) {
  const h = FERMA.past;
  const k = USTUN_KESIMI;
  return (
    <group position={[x, 0, z]}>
      <Quti o={[0.62, 0.03, 0.62]} p={[0, 0.015, 0]} mat={mat.polatQora} />
      {[[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.05, 0.06, 0.05]} p={[a, 0.06, b]} mat={mat.polatQora} />)}
      {/* Tokchalar (z ga perpendikulyar) va devor */}
      <Quti o={[k, h, 0.03]} p={[0, h / 2, -k / 2 + 0.015]} mat={mat.ustun} />
      <Quti o={[k, h, 0.03]} p={[0, h / 2, k / 2 - 0.015]} mat={mat.ustun} />
      <Quti o={[0.022, h, k - 0.06]} p={[0, h / 2, 0]} mat={mat.ustun} />
      <Quti o={[k + 0.04, 0.03, k + 0.04]} p={[0, h - 0.015, 0]} mat={mat.polatQora} />
      {ichki && <XavfChizigi mat={mat} p={[0, 0.6, 0]} o={[k + 0.05, 1.2, k + 0.05]} soni={6} oqi={1} />}
    </group>
  );
}

/** Ferma (z bo'ylab, butun eni bo'yicha): pastki/yuqori belbog', tirgaklar va qiyalar. */
function Ferma({ mat, x }: { mat: Materiallar; x: number }) {
  const z0 = ORQA_USTUN_Z;
  const z1 = OLD_USTUN_Z;
  const n = FERMA.panellar;
  const qadam = (z1 - z0) / n;
  const bal = FERMA.tepa - FERMA.past;
  const qiya = Math.hypot(qadam, bal);
  const burchak = Math.atan2(bal, qadam);
  return (
    <group position={[x, 0, 0]}>
      <Quti o={[0.16, 0.14, z1 - z0 + 0.3]} p={[0, FERMA.past, (z0 + z1) / 2]} mat={mat.ustun} />
      <Quti o={[0.16, 0.14, z1 - z0 + 0.3]} p={[0, FERMA.tepa, (z0 + z1) / 2]} mat={mat.ustun} />
      {Array.from({ length: n + 1 }, (_, i) => <Quti key={`t${i}`} o={[0.08, bal, 0.08]} p={[0, (FERMA.past + FERMA.tepa) / 2, z0 + i * qadam]} mat={mat.ustun} />)}
      {Array.from({ length: n }, (_, i) => {
        const yuqoriga = i < n / 2;
        return <Quti key={`q${i}`} o={[0.07, 0.07, qiya]} p={[0, (FERMA.past + FERMA.tepa) / 2, z0 + (i + 0.5) * qadam]} r={[yuqoriga ? -burchak : burchak, 0, 0]} mat={mat.ustun} />;
      })}
    </group>
  );
}

/** Kran osti yo'li (x bo'ylab): qo'shtavr to'sin va rels, ustunlardagi konsollarda; uchlarida tirgak. */
function KranYoli({ mat, z, konsolYon }: { mat: Materiallar; z: number; konsolYon: 1 | -1 }) {
  const y = KRAN.relsY;
  const x0 = CHAP_USTUN_X;
  const x1 = ONG_USTUN_X;
  const uz = x1 - x0;
  const markaz = (x0 + x1) / 2;
  return (
    <group>
      <Quti o={[uz, 0.025, 0.3]} p={[markaz, y - 0.4 + 0.0125, z]} mat={mat.polatQora} />
      <Quti o={[uz, 0.35, 0.02]} p={[markaz, y - 0.2, z]} mat={mat.polatQora} />
      <Quti o={[uz, 0.025, 0.3]} p={[markaz, y - 0.0125 - 0.04, z]} mat={mat.polatQora} />
      <Quti o={[uz, 0.04, 0.06]} p={[markaz, y - 0.02, z]} mat={mat.polat} />
      {[CHAP_USTUN_X, ...FERMA_X, ONG_USTUN_X].map((x) => (
        <Quti key={x} o={[0.3, 0.2, 0.42]} p={[x, y - 0.5, z - konsolYon * 0.05]} mat={mat.polatQora} />
      ))}
      {[x0 + 0.3, x1 - 0.3].map((x) => <Quti key={`t${x}`} o={[0.2, 0.3, 0.3]} p={[x, y + 0.15, z]} mat={mat.sariq} />)}
    </group>
  );
}

// ── Kran-balka (sekin harakatlanadi — StatikGuruh tashqarisida, lekin har bir qismi o'z ichida birlashtiriladi) ──

function KranBalka({ mat }: { mat: Materiallar }) {
  const kopirik = useRef<THREE.Group>(null);
  const arava = useRef<THREE.Group>(null);
  const ilmoq = useRef<THREE.Group>(null);
  const tros = useRef<THREE.Group>(null);
  const z0 = KRAN.orqaRelsZ;
  const z1 = KRAN.oldRelsZ;
  const uz = z1 - z0;
  const y = KRAN.relsY;
  /** Baraban o'qi (tros shu yerdan tushadi). */
  const barabanY = y + 0.5;
  useFrame(({ clock }) => {
    const h = kranHolati(clock.elapsedTime);
    if (kopirik.current) kopirik.current.position.x = h.x;
    if (arava.current) arava.current.position.z = h.z;
    if (ilmoq.current) ilmoq.current.position.y = h.ilmoqY;
    if (tros.current) {
      const uzunlik = Math.max(0.05, barabanY - (h.ilmoqY + 0.42));
      tros.current.scale.y = uzunlik;
      tros.current.position.y = h.ilmoqY + 0.42;
    }
  });
  return (
    <group ref={kopirik} position={[(KRAN.xMin + KRAN.xMax) / 2, 0, 0]}>
      <StatikGuruh>
        {/* Ikki qutisimon bosh to'sin */}
        {/* Uchlari ustunlarga tegmaydi: old relsdagi ichki ustunlar yuzi z ≈ −3.8 */}
        {[-0.5, 0.5].map((x) => <Quti key={x} o={[0.3, 0.5, uz + 0.3]} p={[x, y + 0.55, (z0 + z1) / 2]} mat={mat.sariq} />)}
        {[-0.5, 0.5].map((x) => <Quti key={`r${x}`} o={[0.04, 0.04, uz]} p={[x, y + 0.82, (z0 + z1) / 2]} mat={mat.polat} />)}
        {/* Torets aravalari (relslarda), g'ildiraklar, bufer va xavf chizig'i */}
        {[z0, z1].map((z) => (
          <group key={z} position={[0, y, z]}>
            <Quti o={[2.6, 0.3, 0.3]} p={[0, 0.17, 0]} mat={mat.sariq} />
            {[-1.0, 1.0].map((x) => <Silindr key={x} r={0.13} h={0.12} p={[x, 0.08, 0]} rot={[Math.PI / 2, 0, 0]} mat={mat.polatQora} seg={16} />)}
            {[-1.32, 1.32].map((x) => <Quti key={`b${x}`} o={[0.06, 0.16, 0.16]} p={[x, 0.17, 0]} mat={mat.rezina} />)}
            <XavfChizigi mat={mat} p={[0, 0.17, z === z0 ? 0.16 : -0.16]} o={[2.2, 0.12, 0.01]} soni={10} oqi={0} />
            <Quti o={[0.32, 0.22, 0.26]} p={[0.7, 0.45, z === z0 ? 0.3 : -0.3]} mat={mat.korpusQora} />
          </group>
        ))}
        {/* Elektr shkafi (ko'prikda) */}
        <Quti o={[0.5, 0.45, 0.6]} p={[-0.95, y + 0.58, z0 + 1.2]} mat={mat.shkaf} />
      </StatikGuruh>
      <group ref={arava} position={[0, 0, (KRAN.aravaZMin + KRAN.aravaZMax) / 2]}>
        <StatikGuruh>
          <Quti o={[1.35, 0.1, 1.1]} p={[0, y + 0.86, 0]} mat={mat.sariq} />
          {[-0.5, 0.5].flatMap((x) => [-0.4, 0.4].map((z) => <Silindr key={`${x}${z}`} r={0.07} h={0.08} p={[x, y + 0.84, z]} rot={[0, 0, Math.PI / 2]} mat={mat.polatQora} seg={12} />))}
          {/* Tal: baraban, reduktor va motor */}
          <Silindr r={0.17} h={0.7} p={[0, barabanY, 0]} rot={[Math.PI / 2, 0, 0]} mat={mat.polatQora} seg={18} />
          <Quti o={[0.3, 0.3, 0.26]} p={[0, barabanY, 0.48]} mat={mat.korpusQora} />
          <Silindr r={0.13} h={0.34} p={[0, barabanY + 0.02, -0.52]} rot={[Math.PI / 2, 0, 0]} mat={mat.cncRang} seg={16} />
        </StatikGuruh>
        <group ref={tros} position={[0, KRAN.ilmoqYMax + 0.42, 0]}>
          {[-0.05, 0.05].map((x) => (
            <mesh key={x} position={[x, 0.5, 0]} material={mat.polatQora}>
              <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
            </mesh>
          ))}
        </group>
        <group ref={ilmoq} position={[0, KRAN.ilmoqYMax, 0]}>
          <StatikGuruh>
            <Quti o={[0.26, 0.26, 0.12]} p={[0, 0.3, 0]} mat={mat.sariq} />
            <Silindr r={0.11} h={0.14} p={[0, 0.34, 0]} rot={[Math.PI / 2, 0, 0]} mat={mat.polatQora} seg={16} />
            <Silindr r={0.025} h={0.12} p={[0, 0.12, 0]} mat={mat.polatQora} seg={10} />
            <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI * 0.85]} material={mat.polatQora} castShadow>
              <torusGeometry args={[0.055, 0.016, 8, 14, Math.PI * 1.4]} />
            </mesh>
          </StatikGuruh>
        </group>
      </group>
    </group>
  );
}

// ── Devorlar ──

/** Deraza tasmasi (devorning ikki yuzida): yorug' oynalar, rom va impostlar. `yon` — devor normali bo'ylab o'q ("x" yoki "z"). */
function DerazaTasmasi({ mat, markazlar, eni, devor, yon }: { mat: Materiallar; markazlar: readonly number[]; eni: number; devor: number; yon: "x" | "z" }) {
  const h = DERAZA.tepa - DERAZA.past;
  const y = (DERAZA.past + DERAZA.tepa) / 2;
  const joy = (u: number, chuq: number, yy = y): V3 => (yon === "z" ? [u, yy, devor + chuq] : [devor + chuq, yy, u]);
  const ol = (u: number, v: number, w: number): V3 => (yon === "z" ? [u, v, w] : [w, v, u]);
  return (
    <>
      {markazlar.map((u) => [-1, 1].map((tomon) => {
        const chuq = tomon * (DEVOR_QALINLIGI / 2 + 0.01);
        return (
          <group key={`${u}${tomon}`}>
            <Quti o={ol(eni, h, 0.02)} p={joy(u, chuq)} mat={mat.derazaYorugi} />
            {/* Rom */}
            <Quti o={ol(eni + 0.1, 0.07, 0.05)} p={joy(u, chuq * 1.08, DERAZA.tepa)} mat={mat.polatQora} />
            <Quti o={ol(eni + 0.1, 0.09, 0.08)} p={joy(u, chuq * 1.1, DERAZA.past)} mat={mat.polatQora} />
            <Quti o={ol(eni, 0.05, 0.04)} p={joy(u, chuq * 1.08, y)} mat={mat.polatQora} />
            {[-eni / 2, -eni / 6, eni / 6, eni / 2].map((d) => <Quti key={d} o={ol(0.06, h, 0.05)} p={joy(u + d, chuq * 1.08)} mat={mat.polatQora} />)}
          </group>
        );
      }))}
    </>
  );
}

/** Favqulodda chiqish eshigi (orqa devorda): ikki tavaqali po'lat eshik, antipanika dastasi, ustida yonib turuvchi "chiqish" belgisi. */
function ChiqishEshigi({ mat, res, x }: { mat: Materiallar; res: Resurslar; x: number }) {
  const z = ICHKI_Z;
  return (
    <group position={[x, 0, z]}>
      <Quti o={[1.96, 2.24, 0.06]} p={[0, 1.12, 0.03]} mat={mat.polatQora} />
      {[-0.45, 0.45].map((d) => <Quti key={d} o={[0.86, 2.1, 0.05]} p={[d, 1.06, 0.06]} mat={mat.korpusQora} />)}
      {[-0.45, 0.45].map((d) => <Quti key={`d${d}`} o={[0.7, 0.05, 0.05]} p={[d, 1.0, 0.11]} mat={mat.polat} />)}
      {/* Tashqi yuzdagi tavaqalar */}
      <Quti o={[1.96, 2.24, 0.04]} p={[0, 1.12, -DEVOR_QALINLIGI - 0.02]} mat={mat.korpusQora} />
      {/* Chiqish belgisi: yorug' quti */}
      <Quti o={[0.66, 0.34, 0.1]} p={[0, 2.62, 0.07]} mat={mat.korpus} />
      <Belgi g={res.g.chiqish} mat={res.chiqish} p={[0, 2.62, 0.125]} s={[0.6, 0.3, 1]} />
      {/* Polda "bo'sh saqlang" chizig'i */}
      <Tekis o={[2.4, 0.08]} p={[0, Y_CHIZIQ, 1.6]} mat={mat.sariq} />
      <Tekis o={[0.08, 1.6]} p={[-1.2, Y_CHIZIQ, 0.8]} mat={mat.sariq} />
      <Tekis o={[0.08, 1.6]} p={[1.2, Y_CHIZIQ, 0.8]} mat={mat.sariq} />
    </group>
  );
}

/** Ko'tariluvchi darvoza ochig'i (chap devor): xavf chiziqli yon romlar va ustki to'sin, ikki yonida bolard; parda — Transport.tsx da. */
function DarvozaRomi({ mat, z }: { mat: Materiallar; z: number }) {
  const yarim = ESHIK_ENI / 2;
  /** Sex o'rtasidan uzoqroq tomon (o'rta tomonda ichki ustun turadi — bolard va pult u yerga qo'yilmaydi). */
  const tashqi = Math.sign(z) || 1;
  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((tomon) => (
        <group key={tomon}>
          {/* Ichki va tashqi yuzdagi yon romlar */}
          <XavfChizigi mat={mat} p={[ICHKI_X + 0.09, ESHIK_BALANDLIGI / 2, tomon * (yarim + 0.08)]} o={[0.18, ESHIK_BALANDLIGI, 0.16]} soni={8} oqi={1} />
          <XavfChizigi mat={mat} p={[DEVOR_X - DEVOR_QALINLIGI / 2 - 0.05, ESHIK_BALANDLIGI / 2, tomon * (yarim + 0.08)]} o={[0.1, ESHIK_BALANDLIGI, 0.16]} soni={8} oqi={1} />
          {/* Ochiq ichidagi devor qirrasi (qoplama) */}
          <Quti o={[DEVOR_QALINLIGI + 0.02, ESHIK_BALANDLIGI, 0.03]} p={[DEVOR_X, ESHIK_BALANDLIGI / 2, tomon * (yarim - 0.015)]} mat={mat.polatQora} />
        </group>
      ))}
      {/* Himoya bolardi (ichkarida, tashqi tomonda) */}
      <Silindr r={0.09} h={1.1} p={[ICHKI_X + 0.3, 0.55, tashqi * (yarim + 0.3)]} mat={mat.sariq} seg={14} />
      <Silindr r={0.095} h={0.12} p={[ICHKI_X + 0.3, 0.85, tashqi * (yarim + 0.3)]} mat={mat.qora} seg={14} />
      {/* Ustki to'sin (ichki va tashqi) */}
      <Quti o={[0.22, 0.32, ESHIK_ENI + 0.5]} p={[ICHKI_X + 0.1, ESHIK_BALANDLIGI + 0.16, 0]} mat={mat.korpusQora} />
      <XavfChizigi mat={mat} p={[ICHKI_X + 0.215, ESHIK_BALANDLIGI + 0.16, 0]} o={[0.01, 0.12, ESHIK_ENI + 0.4]} soni={14} oqi={2} />
      <Quti o={[0.12, 0.3, ESHIK_ENI + 0.4]} p={[DEVOR_X - DEVOR_QALINLIGI / 2 - 0.06, ESHIK_BALANDLIGI + 0.15, 0]} mat={mat.korpusQora} />
      {/* Ostona: pol xavf chizig'i */}
      <XavfChizigi mat={mat} p={[ICHKI_X + 0.25, 0.022, 0]} o={[0.4, 0.012, ESHIK_ENI]} soni={10} oqi={2} />
      {/* Darvoza boshqaruv pulti */}
      <Quti o={[0.08, 0.32, 0.2]} p={[ICHKI_X + 0.04, 1.45, tashqi * (yarim + 0.6)]} mat={mat.shkaf} />
      <Quti o={[0.02, 0.05, 0.05]} p={[ICHKI_X + 0.09, 1.52, tashqi * (yarim + 0.6)]} mat={mat.qirraRang} />
      <Quti o={[0.02, 0.05, 0.05]} p={[ICHKI_X + 0.09, 1.42, tashqi * (yarim + 0.6)]} mat={mat.qizilTugma} />
    </group>
  );
}

/** Old rampa ochig'i (bordyur uzilgan): rezina buferlar, rampa chirog'i (burilma kronshteynda), polda xavf chizig'i. */
function OldRampa({ mat, res, x }: { mat: Materiallar; res: Resurslar; x: number }) {
  const yarim = RAMPA_OCHIGI / 2;
  const z = YZ - BORDYUR.qalinlik / 2;
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((tomon) => (
        <group key={tomon} position={[tomon * (yarim - 0.2), 0, 0]}>
          {/* Bolard va rezina bufer (mashina orqasi shu yerga tegadi) */}
          <Silindr r={0.1} h={1.15} p={[0, 0.575, -0.05]} mat={mat.sariq} seg={14} />
          <Silindr r={0.105} h={0.14} p={[0, 0.9, -0.05]} mat={mat.qora} seg={14} />
          <Quti o={[0.26, 0.5, 0.12]} p={[0, 0.72, 0.1]} mat={mat.rezina} />
          <Quti o={[0.3, 0.06, 0.1]} p={[0, 0.44, 0.06]} mat={mat.polatQora} />
        </group>
      ))}
      {/* Rampa chirog'i: ustun, burilma kronshteyn, LED boshi */}
      <group position={[-yarim - 0.45, 0, -0.25]}>
        <Quti o={[0.1, 2.6, 0.1]} p={[0, 1.3, 0]} mat={mat.polatQora} />
        <Quti o={[0.05, 0.05, 1.1]} p={[0, 2.5, 0.5]} mat={mat.polatQora} />
        <Silindr r={0.11} h={0.16} p={[0, 2.44, 1.02]} mat={mat.korpusQora} seg={16} />
        <Silindr r={0.09} h={0.02} p={[0, 2.355, 1.02]} mat={res.led} seg={16} />
        {/* Svetofor: qizil/yashil */}
        <Quti o={[0.16, 0.36, 0.1]} p={[0, 1.8, 0.07]} mat={mat.korpusQora} />
        <Silindr r={0.045} h={0.02} p={[0, 1.88, 0.125]} rot={[Math.PI / 2, 0, 0]} mat={mat.qizilTugma} seg={12} />
        <Silindr r={0.045} h={0.02} p={[0, 1.72, 0.125]} rot={[Math.PI / 2, 0, 0]} mat={mat.qirraRang} seg={12} />
      </group>
      {/* Ostona: pol xavf chizig'i */}
      <XavfChizigi mat={mat} p={[0, 0.022, -0.2]} o={[RAMPA_OCHIGI, 0.012, 0.35]} soni={12} oqi={0} />
    </group>
  );
}

// ── Chang so'rish ──

function ChangSorish({ mat, stanoklar }: { mat: Materiallar; stanoklar: StanokTavsifi[] }) {
  const tarmoqlar = useMemo(() => stanoklar.map((s) => {
    const [x, z] = tushishNuqtasi(s);
    return { id: s.id, x, z, mz: magistralZ(z), yPast: PATRUBKA[s.tur].y };
  }), [stanoklar]);
  const oraliq = (mz: number) => {
    const xlar = tarmoqlar.filter((t) => t.mz === mz).map((t) => t.x);
    if (!xlar.length) return null;
    return [Math.min(...xlar, KONDALANG_QUVUR_X) - 0.5, Math.max(...xlar, KONDALANG_QUVUR_X) + 0.5] as const;
  };
  const orqa = oraliq(ORQA_MAGISTRAL_Z) ?? [KONDALANG_QUVUR_X - 2, KONDALANG_QUVUR_X + 2];
  const old = oraliq(OLD_MAGISTRAL_Z);
  const y = QUVUR_Y;
  const ilgichlar = (a: number, b: number) => Array.from({ length: Math.floor((b - a) / 3) + 1 }, (_, i) => a + 0.4 + i * 3).filter((x) => x < b);
  const { x: sx, z: sz, r: sr } = SIKLON;
  return (
    <group>
      {/* Orqa magistral (1-liniya) */}
      <Quvur a={[orqa[0], y, ORQA_MAGISTRAL_Z]} b={[orqa[1], y, ORQA_MAGISTRAL_Z]} r={MAGISTRAL_R} mat={mat.oluk} seg={20} />
      {orqa.map((x) => <Silindr key={x} r={MAGISTRAL_R + 0.02} h={0.04} p={[x, y, ORQA_MAGISTRAL_Z]} rot={[0, 0, Math.PI / 2]} mat={mat.polatQora} seg={20} />)}
      {/* Orqa magistral kran zonasida — osma emas, devordagi konsollarda (kran ko'prigi ustidan o'tadi) */}
      {ilgichlar(orqa[0], orqa[1]).map((x) => (
        <group key={`i${x}`}>
          <Quti o={[0.06, 0.06, ORQA_MAGISTRAL_Z - ICHKI_Z + 0.35]} p={[x, y - MAGISTRAL_R - 0.03, (ICHKI_Z + ORQA_MAGISTRAL_Z + 0.35) / 2]} mat={mat.polatQora} />
          <Quti o={[0.05, 0.05, 0.9]} p={[x, y - MAGISTRAL_R - 0.33, ICHKI_Z + 0.36]} r={[-Math.PI / 4, 0, 0]} mat={mat.polatQora} />
          <Silindr r={MAGISTRAL_R + 0.015} h={0.05} p={[x, y, ORQA_MAGISTRAL_Z]} rot={[0, 0, Math.PI / 2]} mat={mat.polatQora} seg={20} />
        </group>
      ))}
      {/* Old kollektor (2-liniya) va ko'ndalang ulovchi quvur */}
      {old && (
        <>
          <Quvur a={[old[0], y, OLD_MAGISTRAL_Z]} b={[old[1], y, OLD_MAGISTRAL_Z]} r={MAGISTRAL_R * 0.85} mat={mat.oluk} seg={20} />
          {old.map((x) => <Silindr key={x} r={MAGISTRAL_R * 0.85 + 0.02} h={0.04} p={[x, y, OLD_MAGISTRAL_Z]} rot={[0, 0, Math.PI / 2]} mat={mat.polatQora} seg={20} />)}
          {ilgichlar(old[0], old[1]).map((x) => <Quti key={`o${x}`} o={[0.03, FERMA.past - y, 0.03]} p={[x, (FERMA.past + y) / 2, OLD_MAGISTRAL_Z]} mat={mat.polatQora} />)}
          <Quvur a={[KONDALANG_QUVUR_X, y, ORQA_MAGISTRAL_Z]} b={[KONDALANG_QUVUR_X, y, OLD_MAGISTRAL_Z]} r={0.22} mat={mat.oluk} seg={18} />
          <Shar r={0.3} p={[KONDALANG_QUVUR_X, y, OLD_MAGISTRAL_Z]} mat={mat.oluk} />
          {[-3, 3, 9].map((z) => <Quti key={`k${z}`} o={[0.03, FERMA.past - y, 0.03]} p={[KONDALANG_QUVUR_X, (FERMA.past + y) / 2, z]} mat={mat.polatQora} />)}
          {/* Kran zonasida osma bo'lmaydi: poldan tayanch ustuni (ko'ndalang yo'lak chetida) va konsol */}
          <Quti o={[0.12, y - 0.22, 0.12]} p={[KONDALANG_QUVUR_X + 1.3, (y - 0.22) / 2, -8.5]} mat={mat.polatQora} />
          <Quti o={[1.42, 0.08, 0.08]} p={[KONDALANG_QUVUR_X + 0.65, y - 0.26, -8.5]} mat={mat.polatQora} />
          <Quti o={[0.3, 0.02, 0.3]} p={[KONDALANG_QUVUR_X + 1.3, 0.01, -8.5]} mat={mat.polatQora} />
        </>
      )}
      {/* Har stanokka tarmoq: magistraldan gorizontal, shiber, tirsak, tushuvchi quvur va egiluvchan shlang */}
      {tarmoqlar.map((t) => {
        const yon = Math.sign(t.z - t.mz);
        return (
          <group key={t.id}>
            <Quvur a={[t.x, y, t.mz]} b={[t.x, y, t.z]} r={0.12} mat={mat.oluk} />
            <Quti o={[0.32, 0.36, 0.06]} p={[t.x, y + 0.04, t.mz + yon * 0.75]} mat={mat.polatQora} />
            <Shar r={0.13} p={[t.x, y, t.z]} mat={mat.oluk} />
            <Quvur a={[t.x, t.yPast + 0.3, t.z]} b={[t.x, y, t.z]} r={0.1} mat={mat.oluk} />
            <Silindr r={0.12} h={0.36} p={[t.x, t.yPast + 0.12, t.z]} mat={mat.rezina} seg={14} />
            {[0.06, 0.18].map((d) => <Silindr key={d} r={0.125} h={0.02} p={[t.x, t.yPast + d, t.z]} mat={mat.polatQora} seg={14} />)}
          </group>
        );
      })}
      {/* Siklon-filtr: tayanch oyoqlar, konus, silindr, qalpoq; tangensial kirish; chiqish quvuri devor orqali tashqariga */}
      <group position={[sx, 0, sz]}>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.1, 2.85, 0.1]} p={[a * 0.68, 1.425, b * 0.68]} mat={mat.polatQora} />)}
        {[-1, 1].map((a) => <Quti key={`b${a}`} o={[1.46, 0.08, 0.08]} p={[0, 0.6, a * 0.68]} mat={mat.polatQora} />)}
        {[-1, 1].map((a) => <Quti key={`c${a}`} o={[0.08, 0.08, 1.46]} p={[a * 0.68, 0.6, 0]} mat={mat.polatQora} />)}
        <Silindr r={sr + 0.05} h={0.08} p={[0, 2.85, 0]} mat={mat.polatQora} seg={28} />
        <Konus rt={sr} rb={0.18} h={1.45} p={[0, 2.125, 0]} mat={mat.oluk} seg={28} />
        <Silindr r={sr} h={1.6} p={[0, 3.65, 0]} mat={mat.oluk} seg={28} />
        <Konus rt={0.32} rb={sr} h={0.15} p={[0, SIKLON.tepa - 0.075, 0]} mat={mat.oluk} seg={28} />
        {/* Shlyuz-zatvor va chang konteyneri (g'ildirakli) */}
        <Silindr r={0.18} h={0.22} p={[0, 1.29, 0]} mat={mat.polatQora} seg={16} />
        <Quti o={[0.22, 0.18, 0.2]} p={[0.25, 1.29, 0]} mat={mat.cncRang} />
        <Silindr r={0.14} h={0.14} p={[0, 1.11, 0]} mat={mat.rezina} seg={14} />
        <Quti o={[0.9, 0.85, 0.8]} p={[0, 0.555, 0]} mat={mat.korpusQora} />
        {[[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]].map(([a, b]) => <Silindr key={`g${a}${b}`} r={0.065} h={0.05} p={[a, 0.065, b]} rot={[0, 0, Math.PI / 2]} mat={mat.rezina} seg={12} />)}
        {/* Tangensial kirish: magistraldan pastga, keyin siklon yon tomoniga */}
        <Quvur a={[0.55, 4.15, ORQA_MAGISTRAL_Z - sz]} b={[0.55, QUVUR_Y, ORQA_MAGISTRAL_Z - sz]} r={0.2} mat={mat.oluk} />
        <Shar r={0.21} p={[0.55, 4.15, ORQA_MAGISTRAL_Z - sz]} mat={mat.oluk} />
        <Quvur a={[0.55, 4.15, ORQA_MAGISTRAL_Z - sz]} b={[0.55, 4.15, -0.6]} r={0.2} mat={mat.oluk} />
        {/* Toza havo chiqishi: tepadan, tirsak, devor orqali tashqariga — ventilyator va so'rish trubasi bino ortida */}
        <Quvur a={[0, SIKLON.tepa, 0]} b={[0, 4.75, 0]} r={0.22} mat={mat.oluk} />
        <Shar r={0.23} p={[0, 4.75, 0]} mat={mat.oluk} />
        <Quvur a={[0, 4.75, 0]} b={[0, 4.75, DEVOR_Z - sz - 0.9]} r={0.22} mat={mat.oluk} />
        <Silindr r={0.38} h={0.55} p={[0, 4.75, DEVOR_Z - sz - 0.42]} rot={[Math.PI / 2, 0, 0]} mat={mat.korpus} seg={20} />
        <Silindr r={0.17} h={0.4} p={[-0.55, 4.75, DEVOR_Z - sz - 0.42]} rot={[0, 0, Math.PI / 2]} mat={mat.cncRang} seg={16} />
        <Shar r={0.23} p={[0, 4.75, DEVOR_Z - sz - 0.9]} mat={mat.oluk} />
        <Quvur a={[0, 4.75, DEVOR_Z - sz - 0.9]} b={[0, 7.3, DEVOR_Z - sz - 0.9]} r={0.2} mat={mat.oluk} />
        <Konus rt={0.05} rb={0.34} h={0.22} p={[0, 7.55, DEVOR_Z - sz - 0.9]} mat={mat.polatQora} seg={18} />
        {[-1, 1].map((a) => <Quti key={`t${a}`} o={[0.03, 0.2, 0.03]} p={[a * 0.2, 7.4, DEVOR_Z - sz - 0.9]} mat={mat.polatQora} />)}
        {/* Xizmat narvoni */}
        {[-0.22, 0.22].map((a) => <Quti key={`n${a}`} o={[0.04, 4.2, 0.04]} p={[-sr - 0.12, 2.1, a]} mat={mat.polatQora} />)}
        {Array.from({ length: 13 }, (_, i) => <Quti key={`p${i}`} o={[0.03, 0.03, 0.44]} p={[-sr - 0.12, 0.35 + i * 0.3, 0]} mat={mat.polatQora} />)}
      </group>
    </group>
  );
}

// ── Jihozlar ──

function OtOchirgich({ mat, res, p, ry }: { mat: Materiallar; res: Resurslar; p: V3; ry: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Quti o={[0.2, 0.08, 0.04]} p={[0, 1.05, 0.02]} mat={mat.polatQora} />
      <Silindr r={0.085} h={0.5} p={[0, 0.82, 0.12]} mat={mat.qizil} seg={16} />
      <Silindr r={0.04} h={0.1} p={[0, 1.12, 0.12]} mat={mat.polatQora} seg={10} />
      <Quti o={[0.14, 0.025, 0.04]} p={[0.03, 1.18, 0.12]} mat={mat.qora} />
      <Quti o={[0.022, 0.32, 0.022]} p={[0.1, 0.98, 0.16]} mat={mat.qora} />
      <Belgi g={res.g.otOchirgich} mat={res.belgi} p={[0, 1.5, 0.012]} s={0.28} />
    </group>
  );
}

function ElektrShkaf({ mat, res, x }: { mat: Materiallar; res: Resurslar; x: number }) {
  const z = ICHKI_Z + 0.27;
  return (
    <group position={[x, 0, z]}>
      <Quti o={[SHKAF_ENI - 0.02, 0.1, 0.5]} p={[0, 0.05, 0]} mat={mat.korpusQora} />
      <Quti o={[SHKAF_ENI - 0.02, 2.0, 0.5]} p={[0, 1.1, 0]} mat={mat.shkaf} />
      <Quti o={[0.01, 1.9, 0.01]} p={[0, 1.1, 0.255]} mat={mat.qora} />
      {[-0.06, 0.06].map((d) => <Quti key={d} o={[0.025, 0.18, 0.03]} p={[d, 1.15, 0.265]} mat={mat.polatQora} />)}
      <Quti o={[0.3, 0.12, 0.012]} p={[-0.2, 0.35, 0.256]} mat={mat.qora} />
      <Quti o={[0.18, 0.1, 0.02]} p={[0.2, 1.7, 0.26]} mat={mat.ekran} />
      <Belgi g={res.g.elektr} mat={res.belgi} p={[0.2, 1.42, 0.257]} s={0.16} />
      <Belgi g={res.g.elektr} mat={res.belgi} p={[-0.2, 1.42, 0.257]} s={0.16} />
      {/* Kabel ko'tarilishi (lotokka) */}
      <Quti o={[0.3, 1.75, 0.08]} p={[0, 2.95, 0.16]} mat={mat.oluk} />
    </group>
  );
}

/** Kabel lotogi (x bo'ylab): U-profil va ichida kabellar. */
function KabelLotogi({ mat, x0, x1, y, z, osma }: { mat: Materiallar; x0: number; x1: number; y: number; z: number; osma?: number }) {
  const uz = x1 - x0;
  const m = (x0 + x1) / 2;
  return (
    <group>
      <Quti o={[uz, 0.015, 0.4]} p={[m, y, z]} mat={mat.oluk} />
      {[-0.2, 0.2].map((d) => <Quti key={d} o={[uz, 0.1, 0.015]} p={[m, y + 0.05, z + d]} mat={mat.oluk} />)}
      {[-0.12, -0.04, 0.05, 0.13].map((d, i) => <Quti key={`k${d}`} o={[uz - 0.1, 0.035 + (i % 2) * 0.01, 0.06]} p={[m, y + 0.03, z + d]} mat={mat.qora} />)}
      {osma !== undefined && Array.from({ length: Math.floor(uz / 3) }, (_, i) => x0 + 1.5 + i * 3).map((x) => <Quti key={`o${x}`} o={[0.025, osma - y, 0.025]} p={[x, (osma + y) / 2, z]} mat={mat.polatQora} />)}
    </group>
  );
}

function Aravacha({ mat, varaqlar, x, z, burilish, varaq }: { mat: Materiallar; varaqlar: THREE.Material[]; x: number; z: number; burilish: number; varaq: number }) {
  const { eni, chuqurlik } = ARAVACHA_OLCHAMI;
  return (
    <group position={[x, 0, z]} rotation={[0, burilish, 0]}>
      <Quti o={[eni, 0.05, chuqurlik]} p={[0, 0.3, 0]} mat={mat.polatQora} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => (
        <group key={`${a}${b}`} position={[a * (eni / 2 - 0.12), 0, b * (chuqurlik / 2 - 0.1)]}>
          <Quti o={[0.06, 0.12, 0.05]} p={[0, 0.2, 0]} mat={mat.polatQora} />
          <Silindr r={0.075} h={0.045} p={[0, 0.078, 0]} rot={[Math.PI / 2, 0, 0]} mat={mat.rezina} seg={14} />
        </group>
      ))}
      {/* Itarish dastasi */}
      {[-1, 1].map((b) => <Quti key={b} o={[0.03, 0.75, 0.03]} p={[-eni / 2 + 0.02, 0.7, b * (chuqurlik / 2 - 0.04)]} mat={mat.polat} />)}
      <Silindr r={0.017} h={chuqurlik - 0.05} p={[-eni / 2 + 0.02, 1.07, 0]} rot={[Math.PI / 2, 0, 0]} mat={mat.rezina} seg={8} />
      {/* Kesilgan detallar */}
      {Array.from({ length: varaq }, (_, k) => (
        <Quti key={k} o={[eni - 0.18 - (k % 3) * 0.04, 0.018, chuqurlik - 0.08 - (k % 2) * 0.05]} p={[0.04 + (k % 2) * 0.01, 0.335 + k * 0.019, 0]} mat={varaqlar[(k + varaq) % varaqlar.length]} />
      ))}
    </group>
  );
}

/** LDSP list taxlami: tagliklar ustida 3–5 pachka (har biri ≈12 list), oralarida reykalar, ustida himoya listi. */
function ListTaxlami({ mat, varaqlar, x, z, qatlam, urug }: { mat: Materiallar; varaqlar: THREE.Material[]; x: number; z: number; qatlam: number; urug: number }) {
  const { uzunlik, eni } = LIST_OLCHAMI;
  const pachka = 0.22;
  const oraliq = 0.06;
  return (
    <group position={[x, 0, z]}>
      {[-1.15, 0, 1.15].map((d) => <Quti key={d} o={[0.1, 0.1, eni]} p={[d, 0.05, 0]} mat={mat.palet} />)}
      {Array.from({ length: qatlam }, (_, i) => {
        const y0 = 0.1 + i * (pachka + oraliq);
        const siljish = ((urug + i * 3) % 5) * 0.012 - 0.024;
        return (
          <group key={i}>
            <Quti o={[uzunlik, pachka, eni]} p={[siljish, y0 + pachka / 2, -siljish]} mat={varaqlar[(urug + i) % varaqlar.length]} />
            <Quti o={[0.18, 0.09, 0.005]} p={[uzunlik / 2 - 0.3 + siljish, y0 + pachka / 2, eni / 2 + 0.003 - siljish]} mat={mat.oq} />
            {i < qatlam - 1 && [-1.15, 0, 1.15].map((d) => <Quti key={d} o={[0.06, oraliq, eni]} p={[d, y0 + pachka + oraliq / 2, 0]} mat={mat.palet} />)}
          </group>
        );
      })}
      <Quti o={[uzunlik + 0.02, 0.008, eni + 0.02]} p={[0, 0.1 + qatlam * (pachka + oraliq) - oraliq + 0.004, 0]} mat={mat.karton} />
    </group>
  );
}

/** O'ralgan palet: palet tagligi, qutilar, strech-plyonka va karton qopqoq. */
function OralganPalet({ mat, x, z, baland, y = 0 }: { mat: Materiallar; x: number; z: number; baland: number; y?: number }) {
  const { eni, chuqurlik } = PALET_OLCHAMI;
  return (
    <group position={[x, y, z]}>
      <Quti o={[eni, 0.025, chuqurlik]} p={[0, 0.132, 0]} mat={mat.palet} />
      {[-1, 0, 1].map((d) => <Quti key={d} o={[eni, 0.1, 0.1]} p={[0, 0.07, d * (chuqurlik / 2 - 0.05)]} mat={mat.palet} />)}
      <Quti o={[eni, 0.02, chuqurlik]} p={[0, 0.01, 0]} mat={mat.palet} />
      <Quti o={[eni - 0.04, baland, chuqurlik - 0.04]} p={[0, 0.145 + baland / 2, 0]} mat={mat.karton} />
      <Quti o={[eni - 0.01, baland * 0.86, chuqurlik - 0.01]} p={[0, 0.145 + baland * 0.45, 0]} mat={mat.plyonka} />
      <Quti o={[eni - 0.02, 0.01, chuqurlik - 0.02]} p={[0, 0.15 + baland, 0]} mat={mat.karton} />
      <Quti o={[0.2, 0.14, 0.005]} p={[eni / 2 - 0.2, 0.145 + baland * 0.6, chuqurlik / 2 - 0.004]} mat={mat.oq} />
    </group>
  );
}

/** Palletli stellaj (material ombori): ko'k ustunlar, to'q sariq to'sinlar, ramalar bog'ichi; pastda va yaruslarda yuklar. */
function Stellaj({ mat, varaqlar, t }: { mat: Materiallar; varaqlar: THREE.Material[]; t: Tortburchak }) {
  const seksiya = Math.max(1, Math.round((t.x1 - t.x0) / 3));
  const qadam = (t.x1 - t.x0) / seksiya;
  const h = 4.9;
  const yaruslar = [1.55, 3.05, 4.55];
  const zm = (t.z0 + t.z1) / 2;
  const chuq = t.z1 - t.z0;
  return (
    <group>
      {Array.from({ length: seksiya + 1 }, (_, i) => t.x0 + i * qadam).map((x) => (
        <group key={x}>
          {[t.z0 + 0.05, t.z1 - 0.05].map((z) => <Quti key={z} o={[0.09, h, 0.07]} p={[x, h / 2, z]} mat={mat.stellaj} />)}
          {[0.4, 1.6, 2.8, 4.0].map((y) => <Quti key={y} o={[0.03, 0.04, chuq - 0.1]} p={[x, y, zm]} mat={mat.stellaj} />)}
          {[1.0, 2.2, 3.4].map((y, k) => <Quti key={`d${y}`} o={[0.025, 0.025, Math.hypot(chuq - 0.1, 1.2)]} p={[x, y, zm]} r={[(k % 2 ? 1 : -1) * Math.atan2(1.2, chuq - 0.1), 0, 0]} mat={mat.stellaj} />)}
          <Quti o={[0.18, 0.01, chuq]} p={[x, 0.005, zm]} mat={mat.polatQora} />
        </group>
      ))}
      {yaruslar.map((y) => [t.z0 + 0.09, t.z1 - 0.09].map((z) => <Quti key={`${y}${z}`} o={[t.x1 - t.x0, 0.12, 0.05]} p={[(t.x0 + t.x1) / 2, y, z]} mat={mat.kesishRang} />))}
      {/* Yuklar: pol va ikki yarus (eng yuqorisi bo'sh) */}
      {[0, yaruslar[0] + 0.06, yaruslar[1] + 0.06].flatMap((y, yi) => Array.from({ length: seksiya * 2 }, (_, k) => {
        const x = t.x0 + qadam * (Math.floor(k / 2) + 0.5) + (k % 2 ? 0.72 : -0.72);
        const tur = (k + yi * 2) % 4;
        if (tur === 3 && yi > 0) return null;
        return (
          <group key={`${yi}-${k}`} position={[x, y, zm]}>
            <Quti o={[1.2, 0.13, 1.0]} p={[0, 0.065, 0]} mat={mat.palet} />
            {tur === 0 && <Quti o={[1.14, 0.9, 0.96]} p={[0, 0.58, 0]} mat={mat.karton} />}
            {tur === 0 && <Quti o={[1.17, 0.8, 0.99]} p={[0, 0.55, 0]} mat={mat.plyonka} />}
            {tur === 1 && [-0.38, -0.13, 0.13, 0.38].flatMap((a) => [-0.3, 0, 0.3].map((b, j) => (
              <Silindr key={`${a}${b}`} r={0.115} h={0.26} p={[a, 0.26 + (j % 2) * 0.27, b]} mat={j === 1 ? mat.qirraRang : varaqlar[(Math.round(a * 10) + j + 8) % varaqlar.length]} seg={14} />
            )))}
            {tur === 2 && Array.from({ length: 6 }, (_, n) => <Quti key={n} o={[1.15, 0.05, 0.95]} p={[0, 0.155 + n * 0.052, 0]} mat={varaqlar[(n + yi) % varaqlar.length]} />)}
            {tur === 3 && [-0.3, 0.3].flatMap((a) => [-0.25, 0.25].map((b) => <Quti key={`${a}${b}`} o={[0.55, 0.45, 0.45]} p={[a, 0.36, b]} mat={mat.karton} />))}
          </group>
        );
      }))}
    </group>
  );
}

/** Prorab (usta) xonasi: po'lat karkas, pastki panel, shisha devorlar va tom, eshik; ichida stol, monitorlar, kreslo, shkaf, doska. */
function ProrabXonasi({ mat, res }: { mat: Materiallar; res: Resurslar }) {
  const t = PRORAB_XONASI;
  const e = t.x1 - t.x0;
  const c = t.z1 - t.z0;
  const h = 3.0;
  const panel = 1.0;
  const yx = e / 2;
  const yz = c / 2;
  const eshikX = 1.55;
  const eshikEni = 1.0;
  const oldBolaklar = bolaklar(-yx, yx, [{ markaz: eshikX, eni: eshikEni }]);
  return (
    <group position={[(t.x0 + t.x1) / 2, 0, (t.z0 + t.z1) / 2]}>
      <Quti o={[e, 0.08, c]} p={[0, 0.04, 0]} mat={mat.korpus} />
      {/* Karkas */}
      {[[-yx, -yz], [yx, -yz], [-yx, yz], [yx, yz], [0, yz], [eshikX - eshikEni / 2, yz], [eshikX + eshikEni / 2, yz], [-yx, 0]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.08, h, 0.08]} p={[a, h / 2, b]} mat={mat.polatQora} />)}
      <Quti o={[e, 0.1, 0.08]} p={[0, h, yz]} mat={mat.polatQora} />
      <Quti o={[e, 0.1, 0.08]} p={[0, h, -yz]} mat={mat.polatQora} />
      {[-yx, yx].map((a) => <Quti key={a} o={[0.08, 0.1, c]} p={[a, h, 0]} mat={mat.polatQora} />)}
      {/* Orqa devor (sex devoriga yopishgan) — yaxlit panel */}
      <Quti o={[e, h, 0.06]} p={[0, h / 2, -yz]} mat={mat.shkaf} />
      {/* Old devor: eshikdan tashqari pastki panel + shisha */}
      {oldBolaklar.map(([a, b]) => (
        <group key={a}>
          <Quti o={[b - a, panel, 0.06]} p={[(a + b) / 2, panel / 2 + 0.08, yz]} mat={mat.shkaf} />
          <Quti o={[b - a, h - panel - 0.08, 0.03]} p={[(a + b) / 2, panel + 0.08 + (h - panel - 0.08) / 2, yz]} mat={mat.oyna} />
          <Quti o={[b - a, 0.05, 0.07]} p={[(a + b) / 2, panel + 0.08, yz]} mat={mat.polatQora} />
        </group>
      ))}
      {/* Eshik: shisha tavaqa, dastak; ustida yozuv taxtachasi */}
      <Quti o={[eshikEni - 0.06, 2.1, 0.04]} p={[eshikX, 1.13, yz]} mat={mat.oyna} />
      <Quti o={[eshikEni - 0.06, 0.06, 0.05]} p={[eshikX, 2.2, yz]} mat={mat.polatQora} />
      <Quti o={[0.03, 0.3, 0.05]} p={[eshikX - 0.36, 1.05, yz + 0.05]} mat={mat.polat} />
      <Quti o={[1.1, 0.26, 0.03]} p={[eshikX, 2.6, yz + 0.04]} mat={mat.korpusQora} />
      {/* Yon devorlar */}
      {[-yx, yx].map((a) => (
        <group key={`y${a}`}>
          <Quti o={[0.06, panel, c]} p={[a, panel / 2 + 0.08, 0]} mat={mat.shkaf} />
          <Quti o={[0.03, h - panel - 0.08, c]} p={[a, panel + 0.08 + (h - panel - 0.08) / 2, 0]} mat={mat.oyna} />
          <Quti o={[0.07, 0.05, c]} p={[a, panel + 0.08, 0]} mat={mat.polatQora} />
        </group>
      ))}
      {/* Shisha tom (ichi yuqoridan ko'rinadi) va konditsioner bloki */}
      <Quti o={[e, 0.03, c]} p={[0, h + 0.06, 0]} mat={mat.oyna} />
      <Quti o={[0.9, 0.55, 0.4]} p={[-yx + 0.7, h + 0.36, -yz + 0.35]} mat={mat.korpus} />
      <Silindr r={0.2} h={0.02} p={[-yx + 0.7, h + 0.36, -yz + 0.56]} rot={[Math.PI / 2, 0, 0]} mat={mat.qora} seg={18} />
      {/* Burchak stol, monitorlar, klaviatura, kreslo */}
      <group position={[-yx + 1.35, 0, -yz + 0.75]}>
        <Quti o={[2.2, 0.04, 0.8]} p={[0, 0.76, 0]} mat={mat.lmdpYongoq} />
        <Quti o={[0.8, 0.04, 1.4]} p={[-0.7, 0.76, 1.1]} mat={mat.lmdpYongoq} />
        {[[-1.06, -0.36], [1.06, -0.36], [1.06, 0.36], [-1.06, 1.76]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.05, 0.74, 0.05]} p={[a, 0.37, b]} mat={mat.polatQora} />)}
        <Quti o={[0.45, 0.6, 0.6]} p={[0.75, 0.42, 0]} mat={mat.korpusQora} />
        {[-0.32, 0.32].map((a) => (
          <group key={a}>
            <Quti o={[0.58, 0.36, 0.03]} p={[a, 1.1, -0.22]} r={[0, a > 0 ? -0.2 : 0.2, 0]} mat={mat.ekran} />
            <Quti o={[0.05, 0.2, 0.05]} p={[a, 0.88, -0.25]} mat={mat.polatQora} />
          </group>
        ))}
        <Quti o={[0.45, 0.02, 0.15]} p={[0, 0.79, 0.05]} mat={mat.qora} />
        <group position={[0, 0, 0.75]}>
          <Quti o={[0.5, 0.08, 0.48]} p={[0, 0.48, 0]} mat={mat.qora} />
          <Quti o={[0.48, 0.6, 0.07]} p={[0, 0.85, 0.24]} r={[-0.12, 0, 0]} mat={mat.qora} />
          <Silindr r={0.03} h={0.4} p={[0, 0.25, 0]} mat={mat.polatQora} seg={10} />
          {[0, 1, 2, 3, 4].map((i) => <Quti key={i} o={[0.04, 0.03, 0.32]} p={[Math.sin((i * 2 * Math.PI) / 5) * 0.14, 0.05, Math.cos((i * 2 * Math.PI) / 5) * 0.14]} r={[0, (i * 2 * Math.PI) / 5, 0]} mat={mat.polatQora} />)}
        </group>
      </group>
      {/* Hujjat shkaflari va reja doskasi */}
      {[0, 1].map((i) => <Quti key={i} o={[0.8, 1.9, 0.45]} p={[yx - 0.5 - i * 0.82, 0.99, -yz + 0.3]} mat={mat.shkaf} />)}
      <Quti o={[2.0, 1.1, 0.03]} p={[0.05, 1.75, -yz + 0.05]} mat={mat.oq} />
      <Quti o={[2.06, 0.04, 0.05]} p={[0.05, 1.18, -yz + 0.07]} mat={mat.polatQora} />
      {[0, 1, 2, 3].map((i) => <Quti key={`r${i}`} o={[0.35 + (i % 2) * 0.4, 0.06, 0.01]} p={[-0.55 + i * 0.32, 2.0 - i * 0.16, -yz + 0.07]} mat={i % 2 ? mat.qirraRang : mat.cncRang} />)}
      {/* Kichik majlis stoli */}
      <group position={[0.9, 0, 0.95]}>
        <Silindr r={0.45} h={0.04} p={[0, 0.74, 0]} mat={mat.lmdpOq} seg={24} />
        <Silindr r={0.04} h={0.72} p={[0, 0.37, 0]} mat={mat.polatQora} seg={10} />
        {[-1, 1].map((a) => (
          <group key={a} position={[a * 0.75, 0, 0]}>
            <Quti o={[0.42, 0.05, 0.42]} p={[0, 0.46, 0]} mat={mat.korpusQora} />
            <Quti o={[0.42, 0.42, 0.04]} p={[a * 0.2, 0.7, 0]} r={[0, Math.PI / 2, 0]} mat={mat.korpusQora} />
            <Quti o={[0.03, 0.44, 0.03]} p={[0, 0.22, 0]} mat={mat.polatQora} />
          </group>
        ))}
      </group>
      <Belgi g={res.g.kaska} mat={res.belgi} p={[-0.9, 1.75, yz + 0.04]} s={0.3} />
    </group>
  );
}

/** Chilangar stoli: po'lat rama, yog'och usti, tortmalar, perforatsiyali panel va asboblar, gilza; yonida asbob aravachasi. */
function AsbobStoli({ mat }: { mat: Materiallar }) {
  const { x, z, eni } = ASBOB_STOLI;
  return (
    <group position={[x, 0, z]}>
      <Quti o={[eni, 0.05, 0.75]} p={[0, 0.9, 0.12]} mat={mat.lmdp} />
      {[-1, 1].map((a) => <Quti key={a} o={[0.05, 0.88, 0.7]} p={[a * (eni / 2 - 0.05), 0.44, 0.12]} mat={mat.polatQora} />)}
      <Quti o={[eni - 0.1, 0.04, 0.6]} p={[0, 0.15, 0.12]} mat={mat.polatQora} />
      <Quti o={[0.55, 0.7, 0.66]} p={[eni / 2 - 0.4, 0.5, 0.12]} mat={mat.korpusQora} />
      {[0, 1, 2, 3].map((i) => <Quti key={i} o={[0.2, 0.02, 0.01]} p={[eni / 2 - 0.4, 0.3 + i * 0.16, 0.46]} mat={mat.polat} />)}
      <Quti o={[eni, 1.0, 0.03]} p={[0, 1.55, -0.24]} mat={mat.shkaf} />
      {Array.from({ length: 9 }, (_, i) => <Quti key={`a${i}`} o={[0.05, 0.22 + (i % 3) * 0.08, 0.03]} p={[-eni / 2 + 0.25 + i * 0.24, 1.6 - (i % 2) * 0.12, -0.21]} mat={i % 3 === 0 ? mat.qizil : i % 3 === 1 ? mat.polatQora : mat.elim} />)}
      <Quti o={[eni, 0.06, 0.03]} p={[0, 2.08, -0.21]} mat={mat.polatQora} />
      {/* Gilza (tiski) */}
      <group position={[-eni / 2 + 0.35, 0.92, 0.3]}>
        <Quti o={[0.2, 0.06, 0.16]} p={[0, 0.03, 0]} mat={mat.cncRang} />
        <Quti o={[0.18, 0.12, 0.06]} p={[0, 0.12, -0.05]} mat={mat.cncRang} />
        <Quti o={[0.18, 0.12, 0.06]} p={[0, 0.12, 0.08]} mat={mat.cncRang} />
        <Silindr r={0.012} h={0.25} p={[0, 0.1, 0.2]} rot={[Math.PI / 2, 0, 0]} mat={mat.polat} seg={8} />
      </group>
      <Quti o={[0.38, 0.12, 0.26]} p={[0.2, 0.98, 0.25]} mat={mat.qizil} />
      {/* Asbob aravachasi */}
      <group position={[-eni / 2 - 0.55, 0, 0.2]}>
        <Quti o={[0.7, 0.9, 0.45]} p={[0, 0.55, 0]} mat={mat.qizil} />
        {[0, 1, 2, 3].map((i) => <Quti key={i} o={[0.6, 0.012, 0.01]} p={[0, 0.3 + i * 0.18, 0.23]} mat={mat.polatQora} />)}
        {[[-0.28, -0.16], [0.28, -0.16], [-0.28, 0.16], [0.28, 0.16]].map(([a, b]) => <Silindr key={`${a}${b}`} r={0.045} h={0.03} p={[a, 0.05, b]} rot={[Math.PI / 2, 0, 0]} mat={mat.rezina} seg={10} />)}
      </group>
    </group>
  );
}

function ChiqindiIdishi({ mat, x, z, rang }: { mat: Materiallar; x: number; z: number; rang: 0 | 1 | 2 }) {
  const ranglar = [mat.cncRang, mat.qirraRang, mat.sariq];
  return (
    <group position={[x, 0, z]}>
      <Konus rt={0.3} rb={0.26} h={0.88} p={[0, 0.46, 0]} mat={ranglar[rang]} seg={18} />
      <Silindr r={0.315} h={0.05} p={[0, 0.92, 0]} mat={mat.qora} seg={18} />
      <Silindr r={0.27} h={0.03} p={[0, 0.015, 0]} mat={mat.qora} seg={18} />
    </group>
  );
}

// ── Pol belgilari ──

function PolBelgilari({ mat, res }: { mat: Materiallar; res: Resurslar }) {
  const yolak = MARKAZIY_YOLAK;
  const yUz = yolak.x1 - yolak.x0;
  const yM = (yolak.x0 + yolak.x1) / 2;
  const sariqChiziq = (x0: number, x1: number, z0: number, z1: number, key: string) => <Maydon key={key} t={{ x0, x1, z0, z1 }} y={Y_CHIZIQ} mat={mat.sariq} />;
  const materialChegara = bolaklar(-13.5, 13.5, [{ markaz: -6, eni: 1.6 }, { markaz: 0, eni: 6 }, { markaz: 6, eni: 1.6 }]);
  const tayyor = ZONALAR.tayyor;
  const tayyorChegara = bolaklar(tayyor.x0, tayyor.x1, OLD_RAMPALAR_X.map((x) => ({ markaz: x, eni: 2.4 })));
  return (
    <>
      {/* Markaziy yo'lak: yashil qatlam, sariq chegaralar, piyoda qatori (oq chetlar, oyoq izlari), pogruzchik qatori (o'qlar) */}
      <Maydon t={yolak} y={Y_ASOS} mat={mat.yolakYashil} />
      <Maydon t={{ x0: yolak.x0, x1: yolak.x1, z0: -2.6, z1: -0.4 }} y={Y_USTKI} mat={res.piyoda} />
      {[yolak.z0 + 0.06, yolak.z1 - 0.06].map((z) => <Tekis key={z} o={[yUz, 0.12]} p={[yM, Y_CHIZIQ, z]} mat={mat.sariq} />)}
      {[-2.55, -0.45].map((z) => <Tekis key={z} o={[yUz, 0.07]} p={[yM, Y_CHIZIQ, z]} mat={mat.oq} />)}
      {Array.from({ length: Math.floor(yUz / 0.9) }, (_, i) => yolak.x0 + 0.45 + i * 0.9).map((x) => <Tekis key={`u${x}`} o={[0.45, 0.06]} p={[x, Y_CHIZIQ, 1.2]} mat={mat.oq} />)}
      {Array.from({ length: 9 }, (_, i) => -19 + i * 6).map((x) => (
        <group key={`o${x}`}>
          <PolBelgisi g={res.g.oq} p={[x, 0.55]} r={0} mat={mat.oq} />
          <PolBelgisi g={res.g.oq} p={[x + 3, 1.85]} r={Math.PI} mat={mat.oq} />
        </group>
      ))}
      {Array.from({ length: 22 }, (_, i) => -21.5 + i * 2.4).map((x) => (
        <group key={`i${x}`}>
          <PolBelgisi g={res.g.iz} p={[x, -1.62]} r={-Math.PI / 2} mat={mat.oq} s={1.3} />
          <PolBelgisi g={res.g.iz} p={[x + 0.4, -1.38]} r={-Math.PI / 2} mat={mat.oq} s={1.3} />
        </group>
      ))}
      {/* Ko'ndalang yo'laklar (markaziy yo'lakning ikki tomonida) va ular kesishgan joyda zebra */}
      {KONDALANG_YOLAKLAR.map(({ x, eni }) => {
        const z0 = x < 0 ? -14.5 : -11.6;
        const z1 = x < 0 ? 13.5 : 11;
        return (
          <group key={`k${x}`}>
            {[[z0, yolak.z0], [yolak.z1, z1]].map(([a, b]) => (
              <group key={a}>
                <Maydon t={{ x0: x - eni / 2, x1: x + eni / 2, z0: a, z1: b }} y={Y_ASOS} mat={mat.yolakYashil} />
                {sariqChiziq(x - eni / 2, x - eni / 2 + 0.1, a, b, "c")}
                {sariqChiziq(x + eni / 2 - 0.1, x + eni / 2, a, b, "o")}
              </group>
            ))}
            {Array.from({ length: Math.floor(eni / 0.6) }, (_, i) => x - eni / 2 + 0.3 + i * 0.6).map((zx) => <Tekis key={zx} o={[0.32, 3.1]} p={[zx, Y_CHIZIQ, 1.25]} mat={mat.oq} />)}
          </group>
        );
      })}
      {/* Jo'natish yo'laklari (rampa 1, 2): markaziy yo'lakdan old bordyurgacha, o'qlar rampaga */}
      {JONATISH_YOLAKLARI.map((t) => {
        const x = (t.x0 + t.x1) / 2;
        const tt = { x0: x - 1.05, x1: x + 1.05, z0: t.z0, z1: t.z1 - BORDYUR.qalinlik };
        return (
          <group key={`j${x}`}>
            <Maydon t={tt} y={Y_ASOS} mat={mat.yolakYashil} />
            {sariqChiziq(tt.x0, tt.x0 + 0.1, tt.z0, tt.z1, "c")}
            {sariqChiziq(tt.x1 - 0.1, tt.x1, tt.z0, tt.z1, "o")}
            {[5.5, 9.5].map((z) => <PolBelgisi key={z} g={res.g.oq} p={[x, z]} r={-Math.PI / 2} mat={mat.oq} />)}
          </group>
        );
      })}
      {/* Material ombori: qabul yo'laklari (z = ±6) chiziqlari va o'qlari, zona chegarasi */}
      {MATERIAL_YOLAKLARI.map((t) => (
        <group key={`m${t.z0}`}>
          {sariqChiziq(ICHKI_X + 0.5, -21.9, t.z0, t.z0 + 0.1, "a")}
          {sariqChiziq(ICHKI_X + 0.5, -21.9, t.z1 - 0.1, t.z1, "b")}
          {[-29.4, -25].map((x) => <PolBelgisi key={x} g={res.g.oq} p={[x, (t.z0 + t.z1) / 2]} r={0} mat={mat.oq} />)}
        </group>
      ))}
      {materialChegara.map(([a, b]) => sariqChiziq(ZONALAR.material.x1 - 0.05, ZONALAR.material.x1 + 0.05, a, b, `mc${a}`))}
      {/* Tayyor mahsulot zonasi chegarasi (jo'natish yo'laklari ochiq) */}
      {tayyorChegara.map(([a, b]) => sariqChiziq(a, b, tayyor.z0 - 0.05, tayyor.z0 + 0.05, `tc${a}`))}
      {sariqChiziq(tayyor.x0 - 0.05, tayyor.x0 + 0.05, tayyor.z0, tayyor.z1, "tcx")}
      {/* Galereyadan kirish piyoda yo'lagi */}
      {GALEREYA_YOLAGI.map((t, i) => (
        <group key={`g${i}`}>
          <Maydon t={t} y={Y_ASOS} mat={res.piyoda} />
          {i === 0
            ? [t.z0 + 0.04, t.z1 - 0.04].map((z) => <Tekis key={z} o={[t.x1 - t.x0, 0.07]} p={[(t.x0 + t.x1) / 2, Y_CHIZIQ, z]} mat={mat.oq} />)
            : [t.x0 + 0.04, t.x1 - 0.04].map((x) => <Tekis key={x} o={[0.07, t.z1 - t.z0]} p={[x, Y_CHIZIQ, (t.z0 + t.z1) / 2]} mat={mat.oq} />)}
        </group>
      ))}
      {[31, 29.6].map((x) => (
        <group key={`gi${x}`}>
          <PolBelgisi g={res.g.iz} p={[x, -8.62]} r={Math.PI / 2} mat={mat.oq} s={1.3} />
          <PolBelgisi g={res.g.iz} p={[x - 0.4, -8.38]} r={Math.PI / 2} mat={mat.oq} s={1.3} />
        </group>
      ))}
      {[-7.6, -5.4].map((z) => (
        <group key={`gz${z}`}>
          <PolBelgisi g={res.g.iz} p={[27.88, z]} r={Math.PI} mat={mat.oq} s={1.3} />
          <PolBelgisi g={res.g.iz} p={[28.12, z + 0.4]} r={Math.PI} mat={mat.oq} s={1.3} />
        </group>
      ))}
      {/* Elektr shkaflar oldi: "bo'sh saqlang" maydoni */}
      {ELEKTR_SHKAFLAR.map(({ x, soni }) => {
        const x1 = x + soni * SHKAF_ENI;
        return (
          <group key={`e${x}`}>
            {sariqChiziq(x - 0.1, x1 + 0.1, ICHKI_Z + 1.5, ICHKI_Z + 1.58, "a")}
            {sariqChiziq(x - 0.1, x - 0.02, ICHKI_Z, ICHKI_Z + 1.58, "b")}
            {sariqChiziq(x1 + 0.02, x1 + 0.1, ICHKI_Z, ICHKI_Z + 1.58, "c")}
          </group>
        );
      })}
    </>
  );
}

// ── Asosiy komponent ──

export default function SexMuhiti({ mat, stanoklar, uzoq = false }: { mat: Materiallar; stanoklar: StanokTavsifi[]; /** Uzoqdan (butun hudud) — bino ichidagi zona yorliqlari yashiriladi. */ uzoq?: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const res = useBinoResurslari();
  const varaqlar = useMemo(() => [mat.lmdp, mat.lmdpOq, mat.lmdpYongoq, mat.lmdpKul], [mat]);
  const ustunJoylari = useMemo(() => ustunlar(), []);
  const derazaX = useMemo(() => Array.from({ length: 16 }, (_, i) => -30 + i * 4), []);
  const derazaZ = useMemo(() => [-12, -8, -4, 0, 4, 8, 12], []);
  const fermalar = useMemo(() => [CHAP_USTUN_X, ...FERMA_X, ONG_USTUN_X], []);
  const tayyor = ZONALAR.tayyor;
  return (
    <>
      {/* Bino qimirlamaydi — material bo'yicha birlashtiriladi (yuzlab draw call o'rniga o'nlabtasi). */}
      <StatikGuruh kalit={stanoklar}>
        {/* Beton pol (tekstura kod bilan chizilgan, o'lchami SEX_ENI × SEX_CHUQURLIGI) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat.pol}>
          <planeGeometry args={[SEX_ENI, SEX_CHUQURLIGI]} />
        </mesh>
        <PolBelgilari mat={mat} res={res} />

        {/* Orqa devor: sendvich-panel, pastki sokol, deraza tasmasi, tepasida parapet */}
        <Quti o={[SEX_ENI + DEVOR_QALINLIGI, DEVOR_BALANDLIGI, DEVOR_QALINLIGI]} p={[-DEVOR_QALINLIGI / 2, DEVOR_BALANDLIGI / 2, DEVOR_Z]} mat={mat.devor} />
        <Quti o={[SEX_ENI + DEVOR_QALINLIGI, 1.2, DEVOR_QALINLIGI + 0.04]} p={[-DEVOR_QALINLIGI / 2, 0.6, DEVOR_Z]} mat={mat.devorPast} />
        <Quti o={[SEX_ENI + DEVOR_QALINLIGI + 0.1, 0.12, DEVOR_QALINLIGI + 0.1]} p={[-DEVOR_QALINLIGI / 2, DEVOR_BALANDLIGI + 0.06, DEVOR_Z]} mat={mat.polatQora} />
        <DerazaTasmasi mat={mat} markazlar={derazaX} eni={3.5} devor={DEVOR_Z} yon="z" />
        {CHIQISH_ESHIKLARI_X.map((x) => <ChiqishEshigi key={x} mat={mat} res={res} x={x} />)}

        {/* Chap devor: darvoza ochiqlari orasida to'liq balandlikda, ochiqlar ustida — ustki qism */}
        {CHAP_DEVOR_BOLAKLARI.map(([a, b]) => (
          <group key={`cd${a}`}>
            <Quti o={[DEVOR_QALINLIGI, DEVOR_BALANDLIGI, b - a]} p={[DEVOR_X, DEVOR_BALANDLIGI / 2, (a + b) / 2]} mat={mat.devor} />
            <Quti o={[DEVOR_QALINLIGI + 0.04, 1.2, b - a]} p={[DEVOR_X, 0.6, (a + b) / 2]} mat={mat.devorPast} />
          </group>
        ))}
        {CHAP_ESHIKLAR_Z.map((z) => (
          <group key={`ce${z}`}>
            <Quti o={[DEVOR_QALINLIGI, DEVOR_BALANDLIGI - ESHIK_BALANDLIGI, ESHIK_ENI]} p={[DEVOR_X, (DEVOR_BALANDLIGI + ESHIK_BALANDLIGI) / 2, z]} mat={mat.devor} />
            <DarvozaRomi mat={mat} z={z} />
          </group>
        ))}
        <Quti o={[DEVOR_QALINLIGI + 0.1, 0.12, SEX_CHUQURLIGI]} p={[DEVOR_X, DEVOR_BALANDLIGI + 0.06, 0]} mat={mat.polatQora} />
        <DerazaTasmasi mat={mat} markazlar={derazaZ} eni={3.2} devor={DEVOR_X} yon="x" />
        <Belgi g={res.g.chekish} mat={res.belgi} p={[ICHKI_X + 0.01, 2.6, 0]} ry={Math.PI / 2} s={0.5} />

        {/* Old va o'ng tomon: past bordyur (devor qirqilgan); rampalar va galereya ro'parasida uzilgan */}
        {OLD_BORDYUR_BOLAKLARI.map(([a, b]) => (
          <Quti key={`ob${a}`} o={[b - a, BORDYUR.balandlik, BORDYUR.qalinlik]} p={[(a + b) / 2, BORDYUR.balandlik / 2, YZ - BORDYUR.qalinlik / 2]} mat={mat.devorPast} />
        ))}
        {ONG_BORDYUR_BOLAKLARI.map(([a, b]) => (
          <Quti key={`ib${a}`} o={[BORDYUR.qalinlik, BORDYUR.balandlik, b - a]} p={[YX - BORDYUR.qalinlik / 2, BORDYUR.balandlik / 2, (a + b) / 2]} mat={mat.devorPast} />
        ))}
        {OLD_RAMPALAR_X.map((x) => <OldRampa key={x} mat={mat} res={res} x={x} />)}
        {/* Galereya portali (maishiy blokka o'tish) */}
        <group position={[YX - 0.12, 0, GALEREYA_OCHIGI.markaz]}>
          {[-1, 1].map((tomon) => <Quti key={tomon} o={[0.14, 3.2, 0.14]} p={[0, 1.6, tomon * (GALEREYA_OCHIGI.eni / 2 + 0.07)]} mat={mat.polatQora} />)}
          <Quti o={[0.18, 0.24, GALEREYA_OCHIGI.eni + 0.28]} p={[0, 3.2, 0]} mat={mat.polatQora} />
          <Quti o={[0.08, 0.3, 0.62]} p={[-0.12, 2.86, 0]} mat={mat.korpus} />
          <Belgi g={res.g.chiqish} mat={res.chiqish} p={[-0.165, 2.86, 0]} ry={-Math.PI / 2} s={[0.56, 0.28, 1]} />
        </group>

        {/* Po'lat karkas: ustunlar, fermalar, progonlar, bog'lovchi to'sinlar */}
        {ustunJoylari.map((u) => <Ustun key={`${u.x}:${u.z}`} mat={mat} x={u.x} z={u.z} ichki={u.tur === "ichki"} />)}
        {fermalar.map((x) => <Ferma key={x} mat={mat} x={x} />)}
        {PROGON_Z.map((z) => <Quti key={`pr${z}`} o={[SEX_ENI, 0.16, 0.08]} p={[0, FERMA.tepa + 0.15, Math.max(ORQA_USTUN_Z, Math.min(OLD_USTUN_Z, z))]} mat={mat.polatQora} />)}
        {[ORQA_USTUN_Z, -ICHKI_QATOR_Z, ICHKI_QATOR_Z, OLD_USTUN_Z].map((z) => <Quti key={`bt${z}`} o={[ONG_USTUN_X - CHAP_USTUN_X, 0.3, 0.16]} p={[(ONG_USTUN_X + CHAP_USTUN_X) / 2, FERMA.past - 0.22, z]} mat={mat.polatQora} />)}
        {/* Kran osti yo'llari */}
        <KranYoli mat={mat} z={KRAN.orqaRelsZ} konsolYon={1} />
        <KranYoli mat={mat} z={KRAN.oldRelsZ} konsolYon={-1} />

        {/* LED yoritgichlar (progonlarga osilgan) */}
        {YORITGICH_X.flatMap((x) => YORITGICH_Z.map((z) => (
          <group key={`l${x}${z}`} position={[x, 0, z]}>
            <Quti o={[0.02, FERMA.tepa + 0.07 - 7.5, 0.02]} p={[0, (FERMA.tepa + 0.07 + 7.5) / 2, 0]} mat={mat.polatQora} />
            <Silindr r={0.07} h={0.08} p={[0, 7.5, 0]} mat={mat.polatQora} seg={12} />
            <Konus rt={0.12} rb={0.27} h={0.1} p={[0, 7.41, 0]} mat={mat.korpusQora} seg={20} />
            <Silindr r={0.25} h={0.02} p={[0, 7.35, 0]} mat={res.led} seg={20} />
          </group>
        )))}

        {/* Kabel lotoklari: orqa devor bo'ylab va markaziy yo'lak ustida */}
        <KabelLotogi mat={mat} x0={-24.6} x1={25.5} y={3.8} z={ICHKI_Z + 0.65} />
        <KabelLotogi mat={mat} x0={CHAP_USTUN_X + 0.3} x1={ONG_USTUN_X - 0.3} y={6.0} z={ICHKI_QATOR_Z - 0.6} osma={FERMA.past} />

        {/* Chang so'rish tizimi */}
        <ChangSorish mat={mat} stanoklar={stanoklar} />

        {/* Elektr shkaflar, chilangar stoli, o't o'chirish va birinchi yordam, chiqindi idishlari */}
        {ELEKTR_SHKAFLAR.flatMap(({ x, soni }) => Array.from({ length: soni }, (_, i) => <ElektrShkaf key={`es${x}${i}`} mat={mat} res={res} x={x + SHKAF_ENI * (i + 0.5)} />))}
        <AsbobStoli mat={mat} />
        <group position={[-16.2, 0, ICHKI_Z]}>
          <Quti o={[0.75, 0.9, 0.24]} p={[0, 1.45, 0.12]} mat={mat.qizil} />
          <Quti o={[0.6, 0.6, 0.02]} p={[0, 1.5, 0.245]} mat={mat.oyna} />
          <Silindr r={0.22} h={0.12} p={[0, 1.5, 0.15]} rot={[Math.PI / 2, 0, 0]} mat={mat.qizilTugma} seg={18} />
        </group>
        <group position={[-3.4, 0, ICHKI_Z]}>
          <Quti o={[0.46, 0.4, 0.15]} p={[0, 1.55, 0.075]} mat={mat.oq} />
          <Belgi g={res.g.yordam} mat={res.belgi} p={[0, 1.55, 0.152]} s={0.24} />
          <Belgi g={res.g.yordam} mat={res.belgi} p={[0, 2.05, 0.01]} s={0.32} />
        </group>
        {[[-12, -ICHKI_QATOR_Z], [0, -ICHKI_QATOR_Z], [24, -ICHKI_QATOR_Z], [-24, ICHKI_QATOR_Z], [12, ICHKI_QATOR_Z]].map(([x, z]) => (
          <OtOchirgich key={`oo${x}${z}`} mat={mat} res={res} p={[x, 0, z + (z < 0 ? 1 : -1) * (USTUN_KESIMI / 2)]} ry={z < 0 ? 0 : Math.PI} />
        ))}
        {[-20.4 - 1.4, 18.5 + 1.4, 4.4].map((x) => <OtOchirgich key={`od${x}`} mat={mat} res={res} p={[x, 0, ICHKI_Z]} ry={0} />)}
        {/* Xavfsizlik belgilari: ustunlarda (yo'lakka qaragan) va orqa devorda */}
        {[[-24, -ICHKI_QATOR_Z, "kaska"], [12, -ICHKI_QATOR_Z, "kaska"], [-12, ICHKI_QATOR_Z, "quloqchin"], [0, ICHKI_QATOR_Z, "kaska"], [24, ICHKI_QATOR_Z, "quloqchin"], [-12, -ICHKI_QATOR_Z, "quloqchin"]].map(([x, z, tur]) => {
          const zz = Number(z);
          const g = tur === "kaska" ? res.g.kaska : res.g.quloqchin;
          return <Belgi key={`b${x}${z}`} g={g} mat={res.belgi} p={[Number(x), 2.4, zz + (zz < 0 ? 1 : -1) * (USTUN_KESIMI / 2 + 0.012)]} ry={zz < 0 ? 0 : Math.PI} s={0.36} />;
        })}
        {[-14, -4, 6, 16].map((x, i) => <Belgi key={`ob${x}`} g={i % 2 ? res.g.quloqchin : res.g.kaska} mat={res.belgi} p={[x, 2.6, ICHKI_Z + 0.01]} s={0.5} />)}
        <Belgi g={res.g.chekish} mat={res.belgi} p={[-22.6, 2.6, ICHKI_Z + 0.01]} s={0.5} />
        {CHIQINDI_IDISHLARI.map((c) => <ChiqindiIdishi key={`ch${c.x}${c.z}`} mat={mat} x={c.x} z={c.z} rang={c.rang} />)}

        {/* Prorab xonasi (o'ng-orqa burchak) */}
        <ProrabXonasi mat={mat} res={res} />

        {/* Material ombori: palletli stellajlar va LDSP taxlamlari (qabul yo'laklari z = ±6 bo'sh) */}
        {MATERIAL_STELLAJLARI.map((s) => <Stellaj key={s.z0} mat={mat} varaqlar={varaqlar} t={s} />)}
        {MATERIAL_TAXLAMLARI.map((s, i) => <ListTaxlami key={`lt${i}`} mat={mat} varaqlar={varaqlar} x={s.x} z={s.z} qatlam={s.qatlam} urug={i} />)}

        {/* Tayyor mahsulot zonasi: o'ralgan paletlar (jo'natish yo'laklari bo'sh) */}
        {TAYYOR_PALETLAR.map((p) => (
          <group key={`tp${p.x}:${p.z}`}>
            <OralganPalet mat={mat} x={p.x} z={p.z} baland={p.baland} />
            {p.qavat === 2 && <OralganPalet mat={mat} x={p.x} z={p.z} baland={0.8} y={0.16 + p.baland} />}
          </group>
        ))}

        {/* Stanoklar orasidagi aravachalar (kesilgan detallar bilan) */}
        {ARAVACHALAR.map((a, i) => <Aravacha key={`ar${i}`} mat={mat} varaqlar={varaqlar} {...a} />)}

        {!uzoq && <ZonaYorligi p={[(ZONALAR.material.x0 + ZONALAR.material.x1) / 2, 3.6, 0]} matn={t("zones.material")} rang="#1d4ed8" />}
        {!uzoq && <ZonaYorligi p={[(tayyor.x0 + tayyor.x1) / 2, 2.9, (tayyor.z0 + tayyor.z1) / 2]} matn={t("zones.finished")} rang="#15803d" />}
      </StatikGuruh>
      <KranBalka mat={mat} />
    </>
  );
}
