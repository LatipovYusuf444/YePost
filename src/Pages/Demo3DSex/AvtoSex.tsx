import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import type { Materiallar } from "./materiallar";
import { Quti, Silindr, StatikGuruh } from "./shakllar";
import { GlbOdam, YuruvchiGlbOdam } from "./Odamlar";
import { ZonaYorligi } from "./SexMuhiti";
import { AVTO_SEX } from "./hudud";
import { bolaklar } from "./sexBinosi";
import {
  AGV, AGV_BEKATLAR, AGV_SONI, AGV_TAYANCH, AVTO_DERAZA, AVTO_FERMA, AVTO_H, AVTO_PROGON_Z, AVTO_USTUN_KESIMI, AVTO_USTUN_X,
  AVTO_USTUN_Z, BOSHQARUV_XONASI, BURGILASH, BURGILASH_STANOGI, BURILISH_X, C3_OXIRI_Z, CHAP_DARVOZA, CHAP_DERAZALAR_Z, CNC,
  CNC_CHIQISH_STOLI, CNC_KIRISH_STOLI, CNC_QATORLARI, CNC_SHKAFLARI, CNC_STANOGI, DETAL, DETAL_MAX, DEVOR_Q, ICHKI, KOMPRESSOR,
  KONVEYERLAR, KONVEYER_Y, KROMKA_STANOGI, LINIYA_Z, MCC_SHKAFLARI, NUR_PARDALARI, OMBOR, ODAM_YOLLARI, ONG_DEVOR_H,
  ORQA_DERAZALAR_X, PACHKA, PALETLAR, PALET_Y, PIYODA_YOLAGI, PLITA, PORTAL, ROBOT, ROBOTLAR, ROBOT_SHKAFLARI, TAGLIK, TAKT,
  TAXLAMLAR, TOSIQLAR, TOSIQ_H, TURGAN_ODAMLAR, XONA_H, XONA_POL, agvHolati, agvJadvali, burgilashHolati, cncHolati,
  detallarHolati, paletQatlamlari, portalHolati, qoldiq, robotHolati, roliklar, type RobotTavsifi, type Tortburchak,
} from "./avtoSexRejasi";

// 2-sex — avtomatlashtirilgan prolyot (asosiy sex ortida, x −32…32, z −41…−15): plita ombori (portal va vakuum ko'targich),
// 2 ta CNC nesting (avtomatik kirish/chiqish stollari), 3 ta 6 o'qli robot (saralash, kromkaga berish, paletlash) yorug'lik
// pardali to'siqlar ichida, kromka liniyasi, burg'ilash stanogi, konveyerlar, 3 ta AGV (asosiy sexga ochiqlar orqali qatnaydi),
// shisha SCADA xonasi va operatorlar. Hamma narsa kod bilan; harakat — bitta soatdan (avtoSexRejasi.ts dagi toza funksiyalar),
// useFrame orqali ref'larga yoziladi. Qimirlamaydigan qismlar bitta StatikGuruh da material bo'yicha birlashtiriladi.

type V3 = [number, number, number];

const Y1 = 0.012;
const Y2 = 0.02;
const Y3 = 0.028;
const ORTA_Z = (AVTO_SEX.z0 + AVTO_SEX.z1) / 2;
const ENI = AVTO_SEX.x1 - AVTO_SEX.x0;
const CHUQURLIK = AVTO_SEX.z1 - AVTO_SEX.z0;
const DETAL_RANGLARI = ["#f1ede6", "#e7d3b0", "#b9bec6", "#8b5a3c"].map((c) => new THREE.Color(c));

// ── Kod bilan chiziladigan teksturalar ──

/** To'siq to'ri (sim setka): shaffof fon, oq simlar — material rangi bilan bo'yaladi. */
function setkaTeksturasi() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, 32, 32);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 32, 4);
  ctx.fillRect(0, 0, 4, 32);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7, 10);
  return t;
}

/** Kesilgan (nesting) plita: och LDSP, ichida detallar konturi va teshik izlari. */
function kesilganTeksturasi() {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ece6dc";
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = "#7c6f5f";
  ctx.lineWidth = 4;
  const detallar = [[14, 14, 230, 150], [254, 14, 244, 150], [14, 174, 150, 196], [174, 174, 150, 196], [334, 174, 164, 92], [334, 276, 164, 94]];
  for (const [x, y, w, h] of detallar) ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#8a7d6c";
  for (const [x, y, w, h] of detallar) for (const [u, v] of [[0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) {
    ctx.beginPath();
    ctx.arc(x + w * u, y + h * v, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** SCADA ekrani (3 ta katta monitor): liniya holati, detal/soat, bugungi soni, OEE, soatlik grafik, AGV holati. */
function scadaChiz(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const bol = w / 3;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#111b2e";
    ctx.fillRect(i * bol + 6, 6, bol - 12, h - 12);
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(i * bol + 6, 6, bol - 12, 34);
  }
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("LINIYA HOLATI", 18, 23);
  ctx.fillText("ISHLAB CHIQARISH", bol + 18, 23);
  ctx.fillText("SOATLIK GRAFIK · AGV", bol * 2 + 18, 23);
  // 1-ekran: stansiyalar
  const stansiyalar = ["Plita ombori", "CNC-1", "CNC-2", "Robot R1", "Robot R2", "Kromka", "Burg'ilash", "Robot R3"];
  ctx.font = "17px sans-serif";
  stansiyalar.forEach((s, i) => {
    const y = 60 + i * 29;
    const miltillash = i === Math.floor(t / 2) % stansiyalar.length;
    ctx.fillStyle = miltillash ? "#86efac" : "#22c55e";
    ctx.beginPath();
    ctx.arc(26, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(s, 42, y);
    ctx.fillStyle = "#4ade80";
    ctx.fillText("ISHLAYAPTI", bol - 120, y);
  });
  // 2-ekran: ko'rsatkichlar
  const tezlik = Math.round(3600 / TAKT + 6 * Math.sin(t / 7));
  const bugun = 4800 + Math.floor(t / TAKT);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px sans-serif";
  ctx.fillText("DETAL / SOAT", bol + 22, 66);
  ctx.fillText("BUGUN", bol + 22, 166);
  ctx.fillText("OEE", bol + 200, 166);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(String(tezlik), bol + 22, 112);
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(bugun.toLocaleString("ru-RU"), bol + 22, 206);
  ctx.fillStyle = "#4ade80";
  ctx.fillText("87%", bol + 200, 206);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(bol + 22, 240, bol - 56, 16);
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(bol + 22, 240, (bol - 56) * (0.55 + 0.4 * ((t / 60) % 1)), 16);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "15px sans-serif";
  ctx.fillText("Smena rejasi", bol + 22, 272);
  // 3-ekran: soatlik grafik va AGV
  const x0 = bol * 2 + 22;
  for (let i = 0; i < 12; i++) {
    const v = 0.55 + 0.35 * Math.abs(Math.sin(i * 1.7 + 0.4)) + (i === 11 ? 0.05 * Math.sin(t) : 0);
    ctx.fillStyle = i === 11 ? "#60a5fa" : "#2563eb";
    ctx.fillRect(x0 + i * 26, 190 - v * 130, 18, v * 130);
  }
  ctx.fillStyle = "#334155";
  ctx.fillRect(x0, 192, 12 * 26, 2);
  ctx.font = "17px sans-serif";
  for (let i = 0; i < AGV_SONI; i++) {
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(x0 + 6 + i * 110, 236, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`AGV-${i + 1}`, x0 + 20 + i * 110, 236);
  }
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Bekatlar: paletlash · topshirish · olish", x0, 272);
}

/** 2-sex uchun qo'shimcha materiallar va teksturalar (bir marta yaratiladi, unmount da tozalanadi). */
function useAvtoMateriallari() {
  const r = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...extra });
    const setka = setkaTeksturasi();
    const kesilgan = kesilganTeksturasi();
    let scadaCanvas: HTMLCanvasElement | null = null;
    let scada: THREE.CanvasTexture | null = null;
    if (typeof document !== "undefined") {
      scadaCanvas = document.createElement("canvas");
      scadaCanvas.width = 1080;
      scadaCanvas.height = 320;
      const ctx = scadaCanvas.getContext("2d");
      if (ctx) scadaChiz(ctx, scadaCanvas.width, scadaCanvas.height, 0);
      scada = new THREE.CanvasTexture(scadaCanvas);
      scada.colorSpace = THREE.SRGBColorSpace;
      scada.anisotropy = 4;
    }
    return {
      teksturalar: [setka, kesilgan, scada],
      scadaCanvas,
      scada,
      mat: {
        robot: m("#f07f12", { roughness: 0.38, metalness: 0.2 }),
        robotQora: m("#2a2f37", { roughness: 0.5, metalness: 0.35 }),
        setka: new THREE.MeshStandardMaterial({ color: "#2b3138", map: setka, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }),
        nur: new THREE.MeshStandardMaterial({ color: "#ff3b3b", emissive: "#ff1f1f", emissiveIntensity: 1.6, transparent: true, opacity: 0.55, depthWrite: false }),
        led: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#f4f8ff", emissiveIntensity: 2.0, roughness: 0.35 }),
        agvYolak: m("#2f6fd6", { roughness: 0.8, metalness: 0 }),
        andonYashil: m("#22c55e", { emissive: "#22c55e", emissiveIntensity: 1.4 }),
        andonSariq: m("#f59e0b", { emissive: "#f59e0b", emissiveIntensity: 0.2 }),
        andonQizil: m("#7f1d1d", { roughness: 0.4 }),
        agvChiroq: m("#22d3ee", { emissive: "#22d3ee", emissiveIntensity: 1.5 }),
        agvKorpus: m("#d9dee5", { roughness: 0.4, metalness: 0.3 }),
        detal: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7 }),
        paletYuk: m("#ece6dc", { roughness: 0.75, metalness: 0 }),
        kesilgan: new THREE.MeshStandardMaterial({ color: "#ffffff", map: kesilgan, roughness: 0.7 }),
        scada: new THREE.MeshStandardMaterial({ color: "#ffffff", map: scada, emissiveMap: scada, emissive: "#ffffff", emissiveIntensity: 0.95, roughness: 0.35 }),
        darvoza: m("#c7d0db", { roughness: 0.4, metalness: 0.55 }),
        spoyler: m("#b08a5a", { roughness: 0.85, metalness: 0 }),
      },
    };
  }, []);
  useEffect(() => () => {
    r.teksturalar.forEach((t) => t?.dispose());
    Object.values(r.mat).forEach((x) => x.dispose());
  }, [r]);
  return r;
}
type AvtoResurslar = ReturnType<typeof useAvtoMateriallari>;
type AvtoMat = AvtoResurslar["mat"];

// ── Oddiy yordamchilar ──

/** Polga yotqizilgan tekis bo'yoq. */
function Tekis({ o, p, mat, r = 0 }: { o: [number, number]; p: V3; mat: THREE.Material; r?: number }) {
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, r]} material={mat} receiveShadow>
      <planeGeometry args={o} />
    </mesh>
  );
}
function Maydon({ t, y, mat }: { t: Tortburchak; y: number; mat: THREE.Material }) {
  return <Tekis o={[t.x1 - t.x0, t.z1 - t.z0]} p={[(t.x0 + t.x1) / 2, y, (t.z0 + t.z1) / 2]} mat={mat} />;
}
/** To'rtburchak chegarasi (polda chiziq). */
function Chegara({ t, y, mat, w = 0.1 }: { t: Tortburchak; y: number; mat: THREE.Material; w?: number }) {
  const e = t.x1 - t.x0;
  const c = t.z1 - t.z0;
  const mx = (t.x0 + t.x1) / 2;
  const mz = (t.z0 + t.z1) / 2;
  return (
    <>
      <Tekis o={[e, w]} p={[mx, y, t.z0]} mat={mat} />
      <Tekis o={[e, w]} p={[mx, y, t.z1]} mat={mat} />
      <Tekis o={[w, c]} p={[t.x0, y, mz]} mat={mat} />
      <Tekis o={[w, c]} p={[t.x1, y, mz]} mat={mat} />
    </>
  );
}
/** Signal ustuni (andon): yashil (yonib turadi), sariq (miltillaydi), qizil (o'chiq). */
function Andon({ m, a, p, h = 2.2 }: { m: Materiallar; a: AvtoMat; p: [number, number]; h?: number }) {
  return (
    <group position={[p[0], 0, p[1]]}>
      <Silindr r={0.025} h={h - 0.36} p={[0, (h - 0.36) / 2, 0]} mat={m.polatQora} seg={8} />
      <Silindr r={0.05} h={0.1} p={[0, h - 0.31, 0]} mat={a.andonYashil} seg={12} />
      <Silindr r={0.05} h={0.1} p={[0, h - 0.2, 0]} mat={a.andonSariq} seg={12} />
      <Silindr r={0.05} h={0.1} p={[0, h - 0.09, 0]} mat={a.andonQizil} seg={12} />
      <Silindr r={0.04} h={0.03} p={[0, h - 0.025, 0]} mat={m.korpusQora} seg={12} />
    </group>
  );
}

// ── Bino: pol, devorlar, derazalar, karkas, LED, darvoza ──

function DerazaQatori({ m, devor, markazlar, oqi }: { m: Materiallar; devor: number; markazlar: readonly number[]; oqi: "x" | "z" }) {
  const { past, tepa, eni } = AVTO_DERAZA;
  const h = tepa - past;
  const y = (past + tepa) / 2;
  const joy = (u: number, d: number, yy = y): V3 => (oqi === "x" ? [u, yy, devor + d] : [devor + d, yy, u]);
  const ol = (u: number, v: number, w: number): V3 => (oqi === "x" ? [u, v, w] : [w, v, u]);
  return (
    <>
      {markazlar.map((u) => [-1, 1].map((tomon) => {
        const d = tomon * (DEVOR_Q / 2 + 0.01);
        return (
          <group key={`${u}${tomon}`}>
            <Quti o={ol(eni, h, 0.02)} p={joy(u, d)} mat={m.derazaYorugi} />
            <Quti o={ol(eni + 0.1, 0.07, 0.05)} p={joy(u, d * 1.1, tepa)} mat={m.polatQora} />
            <Quti o={ol(eni + 0.1, 0.09, 0.08)} p={joy(u, d * 1.15, past)} mat={m.polatQora} />
            {[-eni / 2, 0, eni / 2].map((s) => <Quti key={s} o={ol(0.06, h, 0.05)} p={joy(u + s, d * 1.1)} mat={m.polatQora} />)}
          </group>
        );
      }))}
    </>
  );
}

function Ferma({ m, x }: { m: Materiallar; x: number }) {
  const [z0, z1] = AVTO_USTUN_Z;
  const n = AVTO_FERMA.panellar;
  const qadam = (z1 - z0) / n;
  const bal = AVTO_FERMA.tepa - AVTO_FERMA.past;
  const ym = (AVTO_FERMA.past + AVTO_FERMA.tepa) / 2;
  const qiya = Math.hypot(qadam, bal);
  const burchak = Math.atan2(bal, qadam);
  return (
    <group position={[x, 0, 0]}>
      <Quti o={[0.16, 0.14, z1 - z0 + 0.3]} p={[0, AVTO_FERMA.past, (z0 + z1) / 2]} mat={m.ustun} />
      <Quti o={[0.16, 0.14, z1 - z0 + 0.3]} p={[0, AVTO_FERMA.tepa, (z0 + z1) / 2]} mat={m.ustun} />
      {Array.from({ length: n + 1 }, (_, i) => <Quti key={`t${i}`} o={[0.08, bal, 0.08]} p={[0, ym, z0 + i * qadam]} mat={m.ustun} />)}
      {Array.from({ length: n }, (_, i) => <Quti key={`q${i}`} o={[0.07, 0.07, qiya]} p={[0, ym, z0 + (i + 0.5) * qadam]} r={[i % 2 ? burchak : -burchak, 0, 0]} mat={m.ustun} />)}
    </group>
  );
}

function Bino({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const h = AVTO_H;
  const x0 = AVTO_SEX.x0;
  const x1 = AVTO_SEX.x1;
  const z0 = AVTO_SEX.z0;
  const ledX = AVTO_USTUN_X.slice(0, -1).map((x, i) => (x + AVTO_USTUN_X[i + 1]) / 2);
  const d = CHAP_DARVOZA;
  return (
    <>
      {/* Beton pol (asosiy sex poli bilan bir xil tekstura) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ORTA_Z]} receiveShadow material={m.pol}>
        <planeGeometry args={[ENI, CHUQURLIK]} />
      </mesh>
      {/* Orqa devor (z = −41): sendvich-panel, sokol, parapet, deraza tasmasi */}
      <Quti o={[ENI + DEVOR_Q, h, DEVOR_Q]} p={[0, h / 2, z0]} mat={m.devor} />
      <Quti o={[ENI + DEVOR_Q, 1.2, DEVOR_Q + 0.04]} p={[0, 0.6, z0]} mat={m.devorPast} />
      <Quti o={[ENI + DEVOR_Q + 0.1, 0.12, DEVOR_Q + 0.1]} p={[0, h + 0.06, z0]} mat={m.polatQora} />
      <DerazaQatori m={m} devor={z0} markazlar={ORQA_DERAZALAR_X} oqi="x" />
      {/* Chap devor (x = −32) */}
      <Quti o={[DEVOR_Q, h, CHUQURLIK - DEVOR_Q]} p={[x0, h / 2, ORTA_Z]} mat={m.devor} />
      <Quti o={[DEVOR_Q + 0.04, 1.2, CHUQURLIK - DEVOR_Q]} p={[x0, 0.6, ORTA_Z]} mat={m.devorPast} />
      <Quti o={[DEVOR_Q + 0.1, 0.12, CHUQURLIK]} p={[x0, h + 0.06, ORTA_Z]} mat={m.polatQora} />
      <DerazaQatori m={m} devor={x0} markazlar={CHAP_DERAZALAR_Z} oqi="z" />
      {/* Chap devordagi seksiyali darvoza (yopiq): ikki yuzda panel va qovurg'alar, xavf chiziqli rom, tepada val qutisi */}
      {[-1, 1].map((tomon) => {
        const x = x0 + tomon * (DEVOR_Q / 2 + 0.02);
        return (
          <group key={`dv${tomon}`}>
            <Quti o={[0.03, d.h, d.eni]} p={[x, d.h / 2, d.z]} mat={a.darvoza} />
            {Array.from({ length: 6 }, (_, i) => <Quti key={i} o={[0.05, 0.04, d.eni]} p={[x + tomon * 0.02, 0.38 + i * 0.76, d.z]} mat={m.polatQora} />)}
            {[-1, 1].map((s) => <Quti key={`r${s}`} o={[0.08, d.h, 0.14]} p={[x + tomon * 0.03, d.h / 2, d.z + s * (d.eni / 2 + 0.07)]} mat={m.sariq} />)}
            <Quti o={[0.36, 0.42, d.eni + 0.4]} p={[x + tomon * 0.16, d.h + 0.21, d.z]} mat={m.korpusQora} />
          </group>
        );
      })}
      {/* O'ng past devor (x = 32) */}
      <Quti o={[DEVOR_Q, ONG_DEVOR_H, CHUQURLIK]} p={[x1, ONG_DEVOR_H / 2, ORTA_Z]} mat={m.devorPast} />
      <Quti o={[DEVOR_Q + 0.1, 0.08, CHUQURLIK]} p={[x1, ONG_DEVOR_H + 0.04, ORTA_Z]} mat={m.polatQora} />
      {/* Karkas: ustunlar, fermalar, progonlar, bog'lovchi to'sinlar */}
      {AVTO_USTUN_X.flatMap((x) => AVTO_USTUN_Z.map((z) => (
        <group key={`u${x}${z}`} position={[x, 0, z]}>
          <Quti o={[0.62, 0.03, 0.62]} p={[0, 0.015, 0]} mat={m.polatQora} />
          <Quti o={[AVTO_USTUN_KESIMI, AVTO_FERMA.past, 0.03]} p={[0, AVTO_FERMA.past / 2, -0.185]} mat={m.ustun} />
          <Quti o={[AVTO_USTUN_KESIMI, AVTO_FERMA.past, 0.03]} p={[0, AVTO_FERMA.past / 2, 0.185]} mat={m.ustun} />
          <Quti o={[0.022, AVTO_FERMA.past, 0.34]} p={[0, AVTO_FERMA.past / 2, 0]} mat={m.ustun} />
        </group>
      )))}
      {AVTO_USTUN_X.map((x) => <Ferma key={`f${x}`} m={m} x={x} />)}
      {AVTO_PROGON_Z.map((z) => <Quti key={`p${z}`} o={[ENI - 0.4, 0.16, 0.08]} p={[0, AVTO_FERMA.tepa + 0.15, z]} mat={m.polatQora} />)}
      {AVTO_USTUN_Z.map((z) => <Quti key={`b${z}`} o={[ENI - 0.8, 0.3, 0.16]} p={[0, AVTO_FERMA.past - 0.22, z]} mat={m.polatQora} />)}
      {/* LED yoritgichlar (fermalar orasida, chiziqli) */}
      {ledX.flatMap((x) => [-37.5, -31.5, -25.5, -19.5].map((z) => (
        <group key={`l${x}${z}`} position={[x, 0, z]}>
          {[-0.6, 0.6].map((s) => <Quti key={s} o={[0.015, AVTO_FERMA.past - 7.6, 0.015]} p={[s, (AVTO_FERMA.past + 7.6) / 2, 0]} mat={m.polatQora} />)}
          <Quti o={[1.5, 0.08, 0.26]} p={[0, 7.6, 0]} mat={m.korpusQora} />
          <Quti o={[1.4, 0.02, 0.18]} p={[0, 7.55, 0]} mat={a.led} />
        </group>
      )))}
      {/* Kabel lotogi (liniya ustida, x bo'ylab) */}
      <Quti o={[ENI - 1.2, 0.1, 0.5]} p={[0, 6.8, -30.2]} mat={m.oluk} />
      {Array.from({ length: 10 }, (_, i) => -27 + i * 6).map((x) => <Quti key={`kh${x}`} o={[0.025, AVTO_FERMA.past - 6.8, 0.025]} p={[x, (AVTO_FERMA.past + 6.8) / 2, -30.2]} mat={m.polatQora} />)}
      {/* Orqa devordagi yong'in shkaflari */}
      {[-20, 4, 20].map((x) => <Quti key={`oo${x}`} o={[0.7, 0.9, 0.22]} p={[x, 1.45, z0 + DEVOR_Q / 2 + 0.11]} mat={m.qizil} />)}
    </>
  );
}

// ── Pol belgilari ──

function PolBelgilari({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const agvBolaklari = useMemo(() => AGV_TAYANCH.map((p, i) => {
    const q = AGV_TAYANCH[(i + 1) % AGV_TAYANCH.length];
    const yarim = 0.5;
    const t: Tortburchak = p[1] === q[1]
      ? { x0: Math.min(p[0], q[0]) - yarim, x1: Math.max(p[0], q[0]) + yarim, z0: p[1] - yarim, z1: p[1] + yarim }
      : { x0: p[0] - yarim, x1: p[0] + yarim, z0: Math.min(p[1], q[1]) - yarim, z1: Math.max(p[1], q[1]) + yarim };
    return { ...t, z1: Math.min(t.z1, ICHKI.z1) };
  }).filter((t) => t.z1 > t.z0), []);
  return (
    <>
      {/* Plita ombori chegarasi */}
      <Chegara t={OMBOR} y={Y2} mat={m.sariq} w={0.12} />
      {/* Piyoda yo'laklari: yashil, oq chetlar */}
      {PIYODA_YOLAGI.map((t, i) => (
        <group key={`py${i}`}>
          <Maydon t={t} y={Y1} mat={m.yolakYashil} />
          <Chegara t={t} y={Y2} mat={m.oq} w={0.07} />
        </group>
      ))}
      {/* AGV yo'llari (ko'k), bekatlar (oq ramka) */}
      {agvBolaklari.map((t, i) => <Maydon key={`ag${i}`} t={t} y={Y1 + 0.002} mat={a.agvYolak} />)}
      {AGV_BEKATLAR.filter((b) => b.nuqta[1] < ICHKI.z1).map((b) => (
        <Chegara key={b.nom} t={{ x0: b.nuqta[0] - 0.8, x1: b.nuqta[0] + 0.8, z0: b.nuqta[1] - 1.0, z1: b.nuqta[1] + 1.0 }} y={Y3} mat={m.oq} w={0.06} />
      ))}
      {/* To'siqlar atrofidagi sariq chiziq va yorug'lik pardalari oldidagi xavf zonalari */}
      {TOSIQLAR.map((s) => <Chegara key={s.id} t={{ x0: s.t.x0 - 0.3, x1: s.t.x1 + 0.3, z0: s.t.z0 - 0.3, z1: s.t.z1 + 0.3 }} y={Y2} mat={m.sariq} />)}
      {NUR_PARDALARI.map((n, i) => {
        const s = TOSIQLAR.find((x) => x.id === n.tosiq);
        if (!s) return null;
        const boylabX = n.yon === "z0" || n.yon === "z1";
        const chet = n.yon === "x0" ? s.t.x0 : n.yon === "x1" ? s.t.x1 : n.yon === "z0" ? s.t.z0 : s.t.z1;
        const tashqariga = n.yon === "x0" || n.yon === "z0" ? -1 : 1;
        const soni = Math.max(4, Math.round(n.eni / 0.3));
        return (
          <group key={`np${i}`}>
            {Array.from({ length: soni }, (_, k) => {
              const u = n.u - n.eni / 2 + (n.eni / soni) * (k + 0.5);
              const p: V3 = boylabX ? [u, Y3, chet + tashqariga * 0.35] : [chet + tashqariga * 0.35, Y3, u];
              return <Tekis key={k} o={boylabX ? [n.eni / soni, 0.5] : [0.5, n.eni / soni]} p={p} mat={k % 2 ? m.qora : m.sariq} />;
            })}
          </group>
        );
      })}
      {/* Ochiqlar oldi: o'tish chizig'i */}
      {[-12, 12].map((x) => <Tekis key={`oc${x}`} o={[8, 0.12]} p={[x, Y2, ICHKI.z1 - 0.5]} mat={m.sariq} />)}
    </>
  );
}

// ── Plita ombori (statik qismi): relslar, ustunlar, taxlamlar ──

function OmborStatik({ m }: { m: Materiallar }) {
  const varaqlar = [m.lmdp, m.lmdpOq, m.lmdpYongoq, m.lmdpKul];
  const relsUz = PORTAL.relsX1 - PORTAL.relsX0;
  const relsM = (PORTAL.relsX0 + PORTAL.relsX1) / 2;
  return (
    <>
      {PORTAL.relsZ.map((z) => (
        <group key={`r${z}`}>
          <Quti o={[relsUz, 0.4, 0.3]} p={[relsM, PORTAL.relsY - 0.2, z]} mat={m.sariq} />
          <Quti o={[relsUz, 0.06, 0.07]} p={[relsM, PORTAL.relsY + 0.03, z]} mat={m.polat} />
          {PORTAL.ustunlarX.map((x) => (
            <group key={x} position={[x, 0, z]}>
              <Quti o={[PORTAL.ustunKesimi, PORTAL.relsY - 0.4, PORTAL.ustunKesimi]} p={[0, (PORTAL.relsY - 0.4) / 2, 0]} mat={m.sariq} />
              <Quti o={[0.6, 0.03, 0.6]} p={[0, 0.015, 0]} mat={m.polatQora} />
            </group>
          ))}
          {[PORTAL.relsX0 + 0.15, PORTAL.relsX1 - 0.15].map((x) => <Quti key={`t${x}`} o={[0.2, 0.3, 0.32]} p={[x, PORTAL.relsY + 0.15, z]} mat={m.qizil} />)}
        </group>
      ))}
      {TAXLAMLAR.map((s, i) => (
        <group key={`tx${i}`} position={[s.x, 0, s.z]}>
          {[-1.15, 0, 1.15].map((d) => <Quti key={d} o={[0.1, TAGLIK, PLITA.eni]} p={[d, TAGLIK / 2, 0]} mat={m.palet} />)}
          {Array.from({ length: s.pachka }, (_, k) => (
            <Quti key={k} o={[PLITA.uzunlik, PACHKA - 0.006, PLITA.eni]} p={[((k + i) % 3) * 0.01 - 0.01, TAGLIK + k * PACHKA + PACHKA / 2, 0]} mat={varaqlar[(s.rang + k) % varaqlar.length]} />
          ))}
        </group>
      ))}
    </>
  );
}

/** Portal (gantry): ko'prik x bo'ylab, arava z bo'ylab, vakuum ramasi y bo'ylab; plita so'rg'ichlarda olib o'tiladi. */
function Portal({ m }: { m: Materiallar }) {
  const koprik = useRef<THREE.Group>(null);
  const arava = useRef<THREE.Group>(null);
  const rama = useRef<THREE.Group>(null);
  const tros = useRef<THREE.Group>(null);
  const plita = useRef<THREE.Group>(null);
  const [za, zb] = PORTAL.relsZ;
  const zm = (za + zb) / 2;
  const aravaY = PORTAL.koprikY + 0.45;
  useFrame(({ clock }) => {
    const h = portalHolati(clock.elapsedTime);
    if (koprik.current) koprik.current.position.x = h.x;
    if (arava.current) arava.current.position.z = h.z;
    if (rama.current) rama.current.position.y = h.y;
    if (tros.current) {
      tros.current.position.y = h.y + 0.32;
      tros.current.scale.y = Math.max(0.05, aravaY - 0.2 - (h.y + 0.32));
    }
    if (plita.current) plita.current.visible = h.yuk;
  });
  return (
    <group ref={koprik} position={[CNC.kirishX, 0, 0]}>
      <StatikGuruh>
        {/* Qutisimon ko'prik va torets aravalari (relslarda) */}
        <Quti o={[0.5, 0.45, zb - za + 0.5]} p={[0, PORTAL.koprikY, zm]} mat={m.sariq} />
        <Quti o={[0.06, 0.05, zb - za]} p={[-0.15, PORTAL.koprikY + 0.25, zm]} mat={m.polat} />
        <Quti o={[0.06, 0.05, zb - za]} p={[0.15, PORTAL.koprikY + 0.25, zm]} mat={m.polat} />
        {[za, zb].map((z) => (
          <group key={z} position={[0, 0, z]}>
            <Quti o={[1.3, 0.3, 0.42]} p={[0, PORTAL.relsY + 0.15, 0]} mat={m.sariq} />
            <Quti o={[0.36, 0.3, 0.3]} p={[0.45, PORTAL.relsY + 0.45, 0]} mat={m.korpusQora} />
            {[-0.45, 0.45].map((x) => <Silindr key={x} r={0.1} h={0.1} p={[x, PORTAL.relsY + 0.1, 0]} rot={[Math.PI / 2, 0, 0]} mat={m.polatQora} seg={14} />)}
          </group>
        ))}
        {/* Kabel zanjiri (ko'prik bo'ylab) */}
        <Quti o={[0.16, 0.12, zb - za - 1]} p={[0.36, PORTAL.koprikY + 0.1, zm]} mat={m.korpusQora} />
      </StatikGuruh>
      <group ref={arava} position={[0, 0, zm]}>
        <StatikGuruh>
          <Quti o={[0.9, 0.42, 0.8]} p={[0, aravaY, 0]} mat={m.korpusQora} />
          <Silindr r={0.13} h={0.4} p={[0.45, aravaY + 0.05, 0]} rot={[0, 0, Math.PI / 2]} mat={m.cncRang} seg={14} />
          <Quti o={[0.5, 0.25, 0.4]} p={[-0.25, aravaY + 0.3, 0.1]} mat={m.korpus} />
        </StatikGuruh>
        {/* To'rtta tros (uzunligi kadrda o'zgaradi) */}
        <group ref={tros} position={[0, PORTAL.yuqori + 0.32, 0]}>
          <StatikGuruh>
            {[[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]].map(([x, z]) => (
              <mesh key={`${x}${z}`} position={[x, 0.5, z]} material={m.polatQora}>
                <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
              </mesh>
            ))}
          </StatikGuruh>
        </group>
        <group ref={rama} position={[0, PORTAL.yuqori, 0]}>
          <StatikGuruh>
            {/* Vakuum ramasi: bo'ylama va ko'ndalang to'sinlar, so'rg'ichlar, vakuum nasosi va shlang */}
            {[-0.6, 0.6].map((z) => <Quti key={z} o={[2.6, 0.1, 0.1]} p={[0, 0.2, z]} mat={m.sariq} />)}
            {[-1.1, -0.35, 0.35, 1.1].map((x) => <Quti key={x} o={[0.08, 0.08, 1.4]} p={[x, 0.27, 0]} mat={m.sariq} />)}
            {[-1.1, -0.35, 0.35, 1.1].flatMap((x) => [-0.6, 0.6].map((z) => (
              <group key={`${x}${z}`}>
                <Silindr r={0.02} h={0.12} p={[x, 0.1, z]} mat={m.polatQora} seg={8} />
                <Silindr r={0.07} h={0.05} p={[x, 0.025, z]} mat={m.rezina} seg={14} />
              </group>
            )))}
            <Quti o={[0.5, 0.25, 0.35]} p={[0, 0.45, 0]} mat={m.korpusQora} />
            <Quti o={[0.9, 0.06, 0.6]} p={[0, 0.32, 0]} mat={m.polatQora} />
          </StatikGuruh>
          <group ref={plita} visible={false}>
            <Quti o={[PLITA.uzunlik, PLITA.qalinlik, PLITA.eni]} p={[0, -PLITA.qalinlik / 2, 0]} mat={m.lmdpOq} />
          </group>
        </group>
      </group>
    </group>
  );
}

// ── CNC nesting ──

function CncStatik({ m, a, z }: { m: Materiallar; a: AvtoMat; z: number }) {
  const st = CNC_STANOGI(z);
  const kirish = CNC_KIRISH_STOLI(z);
  const chiqish = CNC_CHIQISH_STOLI(z);
  const sx = CNC.stolX;
  return (
    <>
      {/* Stanina, vakuum stol (spoyler) va yon yo'naltiruvchilar */}
      <Quti o={[st.x1 - st.x0 - 0.6, 0.7, 2.5]} p={[sx, 0.35, z]} mat={m.korpus} />
      <Quti o={[3.4, 0.2, 2.2]} p={[sx, 0.8, z]} mat={a.spoyler} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Quti o={[st.x1 - st.x0, 0.28, 0.26]} p={[sx, 0.86, z + s * 1.36]} mat={m.korpusQora} />
          <Quti o={[st.x1 - st.x0, 0.04, 0.06]} p={[sx, 1.02, z + s * 1.36]} mat={m.polat} />
        </group>
      ))}
      <Quti o={[st.x1 - st.x0 - 0.6, 0.06, 0.02]} p={[sx, 0.5, z + 1.26]} mat={m.cncRang} />
      {/* Boshqaruv pulti (ustunda, ekran — operatorga) */}
      <group position={[st.x0 + 0.35, 0, z + 1.32]}>
        <Quti o={[0.08, 1.3, 0.08]} p={[0, 0.65, 0]} mat={m.polatQora} />
        <Quti o={[0.5, 0.36, 0.12]} p={[0, 1.4, 0.04]} r={[-0.3, 0, 0]} mat={m.korpusQora} />
        <Quti o={[0.42, 0.26, 0.01]} p={[0, 1.42, 0.105]} r={[-0.3, 0, 0]} mat={m.ekran} />
      </group>
      <Andon m={m} a={a} p={[st.x1 - 0.2, z - 1.3]} h={2.4} />
      {/* Kirish (ko'targich) stoli: rama, qaychi mexanizmi, platforma va plitalar taxlami */}
      <Quti o={[kirish.x1 - kirish.x0, 0.12, kirish.z1 - kirish.z0]} p={[CNC.kirishX, 0.06, z]} mat={m.polatQora} />
      {[-1, 1].flatMap((s) => [-1, 1].map((q) => (
        <Quti key={`${s}${q}`} o={[1.9, 0.06, 0.06]} p={[CNC.kirishX, 0.45, z + s * 0.95]} r={[0, 0, q * 0.32]} mat={m.sariq} />
      )))}
      <Quti o={[2.9, 0.06, 2.1]} p={[CNC.kirishX, 0.78, z]} mat={m.polat} />
      <Quti o={[PLITA.uzunlik, CNC.kirishY - 0.81, PLITA.eni]} p={[CNC.kirishX, (CNC.kirishY + 0.81) / 2, z]} mat={m.lmdpOq} />
      {/* Chiqish stoli (lentali) */}
      <Quti o={[chiqish.x1 - chiqish.x0, 0.06, chiqish.z1 - chiqish.z0]} p={[CNC.chiqishX, CNC.stolY - 0.03, z]} mat={m.rezina} />
      <Quti o={[chiqish.x1 - chiqish.x0, 0.14, chiqish.z1 - chiqish.z0 + 0.06]} p={[CNC.chiqishX, CNC.stolY - 0.12, z]} mat={m.korpusQora} />
      {[-1.3, 1.3].flatMap((x) => [-0.95, 0.95].map((dz) => <Quti key={`${x}${dz}`} o={[0.07, CNC.stolY - 0.19, 0.07]} p={[CNC.chiqishX + x, (CNC.stolY - 0.19) / 2, z + dz]} mat={m.polatQora} />))}
      {/* Chang so'rish shlangi (shpindel ustidan shiftga) */}
      <Silindr r={0.09} h={AVTO_FERMA.past - 2.7} p={[sx + 0.6, (AVTO_FERMA.past + 2.7) / 2, z - 1.0]} mat={m.oluk} seg={12} />
    </>
  );
}

function CncHarakat({ m, a, z, faza }: { m: Materiallar; a: AvtoMat; z: number; faza: number }) {
  const portal = useRef<THREE.Group>(null);
  const arava = useRef<THREE.Group>(null);
  const shpindel = useRef<THREE.Group>(null);
  const plitaA = useRef<THREE.Mesh>(null);
  const plitaB = useRef<THREE.Mesh>(null);
  const freza = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    const h = cncHolati(clock.elapsedTime, faza, z);
    if (portal.current) portal.current.position.x = h.portalX;
    if (arava.current) arava.current.position.z = h.aravaZ;
    if (shpindel.current) shpindel.current.position.y = h.shpindelY;
    if (plitaA.current) {
      const u = (h.plitaA - CNC.kirishX) / (CNC.stolX - CNC.kirishX);
      plitaA.current.position.set(h.plitaA, CNC.stolY + (CNC.kirishY - CNC.stolY) * (1 - u) + PLITA.qalinlik / 2, z);
    }
    if (plitaB.current) plitaB.current.position.x = h.plitaB;
    if (freza.current && h.kesmoqda) freza.current.rotation.y += dt * 40;
  });
  const py = CNC.stolY + PLITA.qalinlik / 2;
  return (
    <>
      <mesh ref={plitaA} position={[CNC.stolX, py, z]} material={m.lmdpOq} castShadow receiveShadow>
        <boxGeometry args={[PLITA.uzunlik, PLITA.qalinlik, PLITA.eni]} />
      </mesh>
      <mesh ref={plitaB} position={[CNC.chiqishX, py, z]} material={a.kesilgan} castShadow receiveShadow>
        <boxGeometry args={[PLITA.uzunlik, PLITA.qalinlik, PLITA.eni]} />
      </mesh>
      <group ref={portal} position={[CNC.stolX, 0, 0]}>
        <StatikGuruh>
          {/* Portal: ikki yon ustun (relslarda) va ko'ndalang to'sin */}
          {[-1, 1].map((s) => <Quti key={s} o={[0.42, 1.12, 0.22]} p={[0, 1.6, z + s * 1.36]} mat={m.korpus} />)}
          <Quti o={[0.42, 0.4, 3.0]} p={[0, 2.25, z]} mat={m.cncRang} />
          <Quti o={[0.44, 0.06, 3.02]} p={[0, 2.47, z]} mat={m.korpusQora} />
          <Quti o={[0.06, 0.05, 2.8]} p={[0.23, 2.1, z]} mat={m.polat} />
        </StatikGuruh>
        <group ref={arava} position={[0, 0, z]}>
          <StatikGuruh>
            <Quti o={[0.3, 0.62, 0.42]} p={[0.36, 2.15, 0]} mat={m.korpusQora} />
            <Quti o={[0.04, 0.9, 0.04]} p={[0.5, 1.85, -0.14]} mat={m.polat} />
            <Quti o={[0.04, 0.9, 0.04]} p={[0.5, 1.85, 0.14]} mat={m.polat} />
          </StatikGuruh>
          <group ref={shpindel} position={[0, CNC.shpindelYuqori, 0]}>
            <StatikGuruh>
              <Silindr r={0.11} h={0.5} p={[0.5, 0.42, 0]} mat={m.polat} seg={16} />
              <Silindr r={0.12} h={0.08} p={[0.5, 0.7, 0]} mat={m.korpusQora} seg={16} />
              <Silindr r={0.17} h={0.1} p={[0.5, 0.11, 0]} mat={m.rezina} seg={18} />
            </StatikGuruh>
            <mesh ref={freza} position={[0.5, 0.02, 0]} material={m.polat}>
              <cylinderGeometry args={[0.012, 0.012, 0.1, 6]} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

// ── Robotlar ──

function RobotStatik({ m, a, r }: { m: Materiallar; a: AvtoMat; r: RobotTavsifi }) {
  return (
    <group position={[r.asos[0], 0, r.asos[1]]}>
      <Quti o={[0.8, ROBOT.poydevor - 0.04, 0.8]} p={[0, (ROBOT.poydevor - 0.04) / 2, 0]} mat={m.korpusQora} />
      <Quti o={[0.9, 0.04, 0.9]} p={[0, ROBOT.poydevor - 0.02, 0]} mat={m.polatQora} />
      <Quti o={[1.0, 0.02, 1.0]} p={[0, 0.01, 0]} mat={m.polatQora} />
      <Quti o={[0.82, 0.08, 0.01]} p={[0, 0.3, 0.405]} mat={a.robot} />
    </group>
  );
}

/** 6 o'qli robot: asos (J1, Y), yelka (J2, X), tirsak (J3, X), bilak (J5, X), flanets (J6, Y) — bo'g'imlar alohida guruhlar. */
function Robot({ m, a, r }: { m: Materiallar; a: AvtoMat; r: RobotTavsifi }) {
  const j1 = useRef<THREE.Group>(null);
  const j2 = useRef<THREE.Group>(null);
  const j3 = useRef<THREE.Group>(null);
  const j5 = useRef<THREE.Group>(null);
  const j6 = useRef<THREE.Group>(null);
  const detal = useRef<THREE.Mesh>(null);
  const detalMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f1ede6", roughness: 0.7 }), []);
  useEffect(() => () => detalMat.dispose(), [detalMat]);
  const { L2, L3, Lt, h1, a1 } = ROBOT;
  useFrame(({ clock }) => {
    const h = robotHolati(r, clock.elapsedTime);
    if (j1.current) j1.current.rotation.y = h.q1;
    if (j2.current) j2.current.rotation.x = h.q2;
    if (j3.current) j3.current.rotation.x = h.q3;
    if (j5.current) j5.current.rotation.x = h.q5;
    if (j6.current) j6.current.rotation.y = h.q6;
    if (detal.current) detal.current.visible = h.ushlagan;
    detalMat.color.copy(DETAL_RANGLARI[qoldiq(h.k, DETAL_RANGLARI.length)]);
  });
  const x = [0, 0, Math.PI / 2] as V3;
  return (
    <group position={[r.asos[0], ROBOT.poydevor, r.asos[1]]}>
      <group ref={j1}>
        <StatikGuruh>
          <Silindr r={0.42} h={0.1} p={[0, 0.05, 0]} mat={a.robotQora} seg={22} />
          <Silindr r={0.36} h={0.42} p={[0, 0.31, 0]} mat={a.robot} seg={22} />
          <Quti o={[0.6, 0.5, 0.66]} p={[0, h1 - 0.12, a1 * 0.45]} mat={a.robot} />
          <Silindr r={0.15} h={0.2} p={[0.38, h1, a1]} rot={x} mat={a.robotQora} seg={16} />
          <Quti o={[0.22, 0.3, 0.24]} p={[-0.32, 0.5, -0.18]} mat={a.robotQora} />
        </StatikGuruh>
        <group ref={j2} position={[0, h1, a1]}>
          <StatikGuruh>
            <Silindr r={0.24} h={0.52} p={[0, 0, 0]} rot={x} mat={a.robot} seg={22} />
            <Quti o={[0.3, L2, 0.36]} p={[0, L2 / 2, 0]} mat={a.robot} />
            <Quti o={[0.32, 0.5, 0.3]} p={[0, L2 * 0.22, -0.06]} mat={a.robot} />
            <Silindr r={0.05} h={L2 * 0.65} p={[0.22, L2 * 0.42, -0.17]} mat={a.robotQora} seg={10} />
          </StatikGuruh>
          <group ref={j3} position={[0, L2, 0]}>
            <StatikGuruh>
              <Silindr r={0.2} h={0.44} p={[0, 0, 0]} rot={x} mat={a.robot} seg={20} />
              <Quti o={[0.36, 0.42, 0.34]} p={[0, -0.1, 0]} mat={a.robot} />
              <Quti o={[0.26, 0.28, 0.26]} p={[0, -0.42, 0]} mat={a.robotQora} />
              <Quti o={[0.24, L3 - 0.12, 0.26]} p={[0, (L3 - 0.12) / 2 + 0.06, 0]} mat={a.robot} />
              <Silindr r={0.14} h={0.06} p={[0, L3 * 0.5, 0]} mat={a.robotQora} seg={16} />
            </StatikGuruh>
            <group ref={j5} position={[0, L3, 0]}>
              <StatikGuruh>
                <Silindr r={0.11} h={0.3} p={[0, 0, 0]} rot={x} mat={a.robotQora} seg={16} />
                <Silindr r={0.075} h={0.14} p={[0, 0.1, 0]} mat={a.robot} seg={14} />
              </StatikGuruh>
              <group ref={j6}>
                <StatikGuruh>
                  <Silindr r={0.08} h={0.04} p={[0, 0.19, 0]} mat={m.polat} seg={14} />
                  <Quti o={[0.12, 0.22, 0.12]} p={[0, 0.31, 0]} mat={m.korpusQora} />
                  <Quti o={[0.72, 0.04, 0.44]} p={[0, Lt - 0.07, 0]} mat={m.korpusQora} />
                  {[-0.26, 0.26].flatMap((dx) => [-0.14, 0.14].map((dz) => <Silindr key={`${dx}${dz}`} r={0.05} h={0.05} p={[dx, Lt - 0.025, dz]} mat={m.rezina} seg={12} />))}
                  <Quti o={[0.03, 0.25, 0.03]} p={[0.08, 0.38, 0.08]} mat={m.korpusQora} />
                </StatikGuruh>
                <mesh ref={detal} position={[0, Lt + DETAL.qalinlik / 2, 0]} material={detalMat} visible={false} castShadow>
                  <boxGeometry args={[DETAL.uzunlik, DETAL.qalinlik, DETAL.eni]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

// ── Xavfsizlik to'siqlari va yorug'lik pardalari ──

/** To'r panel: soya tashlamaydi (shaffof to'r yaxlit soya bermasin), faqat qabul qiladi. */
function SetkaPanel({ o, p, mat }: { o: V3; p: V3; mat: THREE.Material }) {
  return (
    <mesh position={p} material={mat} receiveShadow>
      <boxGeometry args={o} />
    </mesh>
  );
}

function Tosiqlar({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const tomonlar = useMemo(() => TOSIQLAR.flatMap((s) => {
    const ochiqlar = (yon: "x0" | "x1" | "z0" | "z1") => [
      ...NUR_PARDALARI.filter((n) => n.tosiq === s.id && n.yon === yon).map((n) => ({ markaz: n.u, eni: n.eni })),
      ...(s.eshik.yon === yon ? [{ markaz: s.eshik.u, eni: 1.0 }] : []),
    ];
    return (["x0", "x1", "z0", "z1"] as const).map((yon) => {
      const boylabX = yon === "z0" || yon === "z1";
      const [a0, b0] = boylabX ? [s.t.x0, s.t.x1] : [s.t.z0, s.t.z1];
      const doimiy = yon === "x0" ? s.t.x0 : yon === "x1" ? s.t.x1 : yon === "z0" ? s.t.z0 : s.t.z1;
      return { kalit: `${s.id}${yon}`, boylabX, doimiy, bolaklar: bolaklar(a0, b0, ochiqlar(yon)) };
    });
  }), []);
  const joy = (boylabX: boolean, u: number, doimiy: number, y: number): V3 => (boylabX ? [u, y, doimiy] : [doimiy, y, u]);
  const ol = (boylabX: boolean, uz: number, h: number, q: number): V3 => (boylabX ? [uz, h, q] : [q, h, uz]);
  const ph = TOSIQ_H - 0.25;
  return (
    <>
      {tomonlar.map((tm) => tm.bolaklar.map(([u0, u1]) => {
        const soni = Math.max(1, Math.ceil((u1 - u0) / 1.4));
        const w = (u1 - u0) / soni;
        return (
          <group key={`${tm.kalit}${u0}`}>
            {Array.from({ length: soni + 1 }, (_, i) => (
              <group key={i}>
                <Quti o={[0.06, TOSIQ_H, 0.06]} p={joy(tm.boylabX, u0 + i * w, tm.doimiy, TOSIQ_H / 2)} mat={m.sariq} />
                <Quti o={[0.14, 0.02, 0.14]} p={joy(tm.boylabX, u0 + i * w, tm.doimiy, 0.01)} mat={m.polatQora} />
              </group>
            ))}
            {Array.from({ length: soni }, (_, i) => (
              <SetkaPanel key={`p${i}`} o={ol(tm.boylabX, w - 0.08, ph, 0.02)} p={joy(tm.boylabX, u0 + (i + 0.5) * w, tm.doimiy, 0.15 + ph / 2)} mat={a.setka} />
            ))}
            <Quti o={ol(tm.boylabX, u1 - u0, 0.04, 0.04)} p={joy(tm.boylabX, (u0 + u1) / 2, tm.doimiy, TOSIQ_H - 0.02)} mat={m.sariq} />
          </group>
        );
      }))}
      {/* Kirish eshiklari (yopiq): sariq rom, to'r, xavfsizlik qulfi */}
      {TOSIQLAR.map((s) => {
        const boylabX = s.eshik.yon === "z0" || s.eshik.yon === "z1";
        const doimiy = s.eshik.yon === "x0" ? s.t.x0 : s.eshik.yon === "x1" ? s.t.x1 : s.eshik.yon === "z0" ? s.t.z0 : s.t.z1;
        return (
          <group key={`e${s.id}`}>
            <SetkaPanel o={ol(boylabX, 0.92, ph, 0.02)} p={joy(boylabX, s.eshik.u, doimiy, 0.15 + ph / 2)} mat={a.setka} />
            <Quti o={ol(boylabX, 0.96, 0.05, 0.05)} p={joy(boylabX, s.eshik.u, doimiy, 0.15)} mat={m.sariq} />
            <Quti o={ol(boylabX, 0.96, 0.05, 0.05)} p={joy(boylabX, s.eshik.u, doimiy, 0.15 + ph)} mat={m.sariq} />
            <Quti o={ol(boylabX, 0.12, 0.2, 0.1)} p={joy(boylabX, s.eshik.u + 0.55, doimiy, 1.1)} mat={m.qizil} />
          </group>
        );
      })}
      {/* Yorug'lik pardalari: ikki tomonda ustuncha (qora korpus, sariq qalpoq) va orasida qizil nurlar */}
      {NUR_PARDALARI.map((n, i) => {
        const s = TOSIQLAR.find((x) => x.id === n.tosiq);
        if (!s) return null;
        const boylabX = n.yon === "z0" || n.yon === "z1";
        const doimiy = n.yon === "x0" ? s.t.x0 : n.yon === "x1" ? s.t.x1 : n.yon === "z0" ? s.t.z0 : s.t.z1;
        return (
          <group key={`n${i}`}>
            {[-1, 1].map((t) => (
              <group key={t}>
                <Quti o={[0.07, 1.8, 0.07]} p={joy(boylabX, n.u + t * (n.eni / 2 - 0.05), doimiy, 0.9)} mat={m.korpusQora} />
                <Quti o={[0.08, 0.06, 0.08]} p={joy(boylabX, n.u + t * (n.eni / 2 - 0.05), doimiy, 1.83)} mat={m.sariq} />
              </group>
            ))}
            {[1.15, 1.35, 1.55, 1.75].map((y) => <Quti key={y} o={ol(boylabX, n.eni - 0.1, 0.008, 0.008)} p={joy(boylabX, n.u, doimiy, y)} mat={a.nur} />)}
          </group>
        );
      })}
    </>
  );
}

// ── Konveyerlar, kromka liniyasi, burg'ilash ──

function KonveyerlarStatik({ m }: { m: Materiallar }) {
  return (
    <>
      {KONVEYERLAR.filter((k) => !k.id.startsWith("cnc")).map((k) => {
        const boylabX = k.oqi === "x";
        const uz = boylabX ? k.t.x1 - k.t.x0 : k.t.z1 - k.t.z0;
        const en = boylabX ? k.t.z1 - k.t.z0 : k.t.x1 - k.t.x0;
        const mx = (k.t.x0 + k.t.x1) / 2;
        const mz = (k.t.z0 + k.t.z1) / 2;
        const ol = (a: number, h: number, b: number): V3 => (boylabX ? [a, h, b] : [b, h, a]);
        const yon = (u: number, v: number, y: number): V3 => (boylabX ? [mx + u, y, mz + v] : [mx + v, y, mz + u]);
        const oyoqlar = Math.max(2, Math.ceil(uz / 1.6) + 1);
        return (
          <group key={k.id}>
            {[-1, 1].map((s) => <Quti key={s} o={ol(uz, 0.12, 0.05)} p={yon(0, s * (en / 2 - 0.025), KONVEYER_Y - 0.05)} mat={m.polat} />)}
            {Array.from({ length: oyoqlar }, (_, i) => -uz / 2 + 0.1 + (i * (uz - 0.2)) / (oyoqlar - 1)).flatMap((u) => [-1, 1].map((s) => (
              <Quti key={`${u}${s}`} o={[0.06, KONVEYER_Y - 0.1, 0.06]} p={yon(u, s * (en / 2 - 0.06), (KONVEYER_Y - 0.1) / 2)} mat={m.polatQora} />
            )))}
            <Quti o={ol(uz, 0.04, en - 0.1)} p={yon(0, 0, 0.25)} mat={m.polatQora} />
            {k.tur === "lenta" && <Quti o={ol(uz, 0.05, en - 0.1)} p={yon(0, 0, KONVEYER_Y - 0.025)} mat={m.rezina} />}
            {k.tur === "lenta" && <Quti o={ol(0.3, 0.2, en - 0.1)} p={yon(-uz / 2 + 0.15, 0, KONVEYER_Y - 0.2)} mat={m.korpusQora} />}
          </group>
        );
      })}
      {/* Tirgaklar (detal robot olishini kutadi) */}
      <Quti o={[0.06, 0.12, 0.8]} p={[KONVEYERLAR[0].t.x1 - 0.03, KONVEYER_Y + 0.05, LINIYA_Z]} mat={m.sariq} />
      <Quti o={[0.8, 0.12, 0.06]} p={[BURILISH_X, KONVEYER_Y + 0.05, C3_OXIRI_Z + 0.5 - 0.03]} mat={m.sariq} />
    </>
  );
}

/** Roliklar — bitta InstancedMesh (qimirlamaydi). */
function Roliklar({ m }: { m: Materiallar }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const royxat = useMemo(() => roliklar(), []);
  const geo = useMemo(() => new THREE.CylinderGeometry(0.035, 0.035, 1, 10), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    royxat.forEach((r, i) => {
      o.position.set(r.x, KONVEYER_Y - 0.035, r.z);
      o.rotation.set(r.oqi === "x" ? Math.PI / 2 : 0, 0, r.oqi === "z" ? Math.PI / 2 : 0);
      o.scale.set(1, r.uzunlik, 1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [royxat]);
  return <instancedMesh ref={ref} args={[geo, m.polat, royxat.length]} receiveShadow />;
}

function KromkaStatik({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const t = KROMKA_STANOGI;
  const uz = t.x1 - t.x0;
  const mx = (t.x0 + t.x1) / 2;
  return (
    <>
      {/* Pastki shkaf, zanjirli konveyer, orqa agregatlar korpusi, yuqori bosuvchi to'sin, shisha qopqoq */}
      <Quti o={[uz, 0.78, 1.2]} p={[mx, 0.39, LINIYA_Z - 0.2]} mat={m.korpus} />
      <Quti o={[uz, 0.12, 0.5]} p={[mx, KONVEYER_Y - 0.06, LINIYA_Z]} mat={m.rezina} />
      <Quti o={[uz, 0.07, 0.012]} p={[mx, 0.55, LINIYA_Z + 0.405]} mat={m.qirraRang} />
      <Quti o={[uz, 1.75, 0.3]} p={[mx, 0.875, t.z0 + 0.15]} mat={m.korpus} />
      <Quti o={[uz, 0.1, 0.31]} p={[mx, 1.4, t.z0 + 0.15]} mat={m.qirraRang} />
      <Quti o={[uz, 0.18, 0.32]} p={[mx, 1.17, LINIYA_Z]} mat={m.polatQora} />
      {Array.from({ length: 6 }, (_, i) => t.x0 + 0.8 + i * 1.7).map((x) => <Quti key={`k${x}`} o={[0.1, 0.1, 0.55]} p={[x, 1.17, LINIYA_Z - 0.4]} mat={m.polatQora} />)}
      <Quti o={[uz, 0.8, 0.02]} p={[mx, 1.27, LINIYA_Z + 0.5]} mat={m.oyna} />
      <Quti o={[uz, 0.02, 1.2]} p={[mx, 1.68, LINIYA_Z - 0.1]} mat={m.oyna} />
      {/* Agregatlar (frezer, frez-kopir, sikli) motorlari va elim idishi */}
      {[t.x0 + 2.6, t.x0 + 4.4, t.x0 + 6.0, t.x0 + 7.6].map((x) => <Silindr key={x} r={0.12} h={0.36} p={[x, 1.95, t.z0 + 0.2]} mat={m.polat} seg={14} />)}
      <Quti o={[0.55, 0.42, 0.45]} p={[t.x0 + 1.3, 1.96, t.z0 + 0.25]} mat={m.elim} />
      {/* Boshqaruv pulti */}
      <group position={[t.x0 + 0.6, 0, t.z1 - 0.2]}>
        <Quti o={[0.5, 1.1, 0.3]} p={[0, 0.55, 0]} mat={m.korpusQora} />
        <Quti o={[0.42, 0.3, 0.01]} p={[0, 1.0, 0.155]} mat={m.ekran} />
        <Silindr r={0.04} h={0.03} p={[0.12, 0.7, 0.16]} rot={[Math.PI / 2, 0, 0]} mat={m.qizilTugma} seg={10} />
      </group>
      <Andon m={m} a={a} p={[t.x1 - 0.2, t.z0 + 0.15]} h={2.5} />
    </>
  );
}

/** Kromka lentasi g'altagi (aylanadi) — kromka stanogi kirishida, orqa korpus ustida. */
function KromkaGaltak({ m }: { m: Materiallar }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.6;
  });
  const t = KROMKA_STANOGI;
  return (
    <group ref={ref} position={[t.x0 + 0.55, 1.83, t.z0 + 0.35]}>
      <StatikGuruh>
        <Silindr r={0.36} h={0.05} p={[0, 0, 0]} mat={m.oq} seg={24} />
        <Silindr r={0.12} h={0.07} p={[0, 0, 0]} mat={m.polatQora} seg={16} />
        <Quti o={[0.6, 0.012, 0.04]} p={[0, 0.03, 0]} mat={m.polatQora} />
      </StatikGuruh>
    </group>
  );
}

function BurgilashStatik({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const t = BURGILASH_STANOGI;
  const uz = t.z1 - t.z0;
  const mz = (t.z0 + t.z1) / 2;
  return (
    <>
      <Quti o={[t.x1 - t.x0, 0.78, uz]} p={[BURILISH_X, 0.39, mz]} mat={m.korpus} />
      <Quti o={[1.0, 0.12, uz]} p={[BURILISH_X, KONVEYER_Y - 0.06, mz]} mat={m.rezina} />
      <Quti o={[0.012, 0.07, uz]} p={[t.x1 + 0.005, 0.55, mz]} mat={m.burgRang} />
      {/* Portal (kallak ramasi) */}
      {[-1, 1].map((s) => <Quti key={s} o={[0.25, 1.5, 0.5]} p={[BURILISH_X + s * 1.25, 1.53, BURGILASH.ishZ]} mat={m.burgRang} />)}
      <Quti o={[2.8, 0.36, 0.6]} p={[BURILISH_X, 2.3, BURGILASH.ishZ]} mat={m.burgRang} />
      <Quti o={[2.82, 0.05, 0.62]} p={[BURILISH_X, 2.5, BURGILASH.ishZ]} mat={m.korpusQora} />
      {/* Yon shisha panellar */}
      {[-1, 1].map((s) => <Quti key={`o${s}`} o={[0.02, 0.8, uz - 0.4]} p={[BURILISH_X + s * 1.38, 1.3, mz]} mat={m.oyna} />)}
      {/* Boshqaruv pulti va signal ustuni */}
      <Quti o={[0.3, 1.1, 0.5]} p={[t.x1 - 0.2, 0.55, t.z0 + 0.4]} mat={m.korpusQora} />
      <Quti o={[0.01, 0.3, 0.4]} p={[t.x1 - 0.045, 1.0, t.z0 + 0.4]} mat={m.ekran} />
      <Andon m={m} a={a} p={[t.x0 + 0.15, t.z1 - 0.15]} h={2.4} />
    </>
  );
}

function BurgilashKallagi({ m }: { m: Materiallar }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 1.45 - 0.42 * burgilashHolati(clock.elapsedTime);
  });
  return (
    <group ref={ref} position={[BURILISH_X, 1.45, BURGILASH.ishZ]}>
      <StatikGuruh>
        <Quti o={[0.95, 0.32, 0.45]} p={[0, 0.16, 0]} mat={m.korpusQora} />
        <Quti o={[0.3, 0.5, 0.3]} p={[0, 0.55, 0]} mat={m.polat} />
        {Array.from({ length: 8 }, (_, i) => <Silindr key={i} r={0.012} h={0.1} p={[-0.35 + i * 0.1, -0.05, 0]} mat={m.polat} seg={6} />)}
      </StatikGuruh>
    </group>
  );
}

// ── Detallar (konveyerlarda — instancing) va paletlar ──

function Detallar({ a }: { a: AvtoMat }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const paletA = useRef<THREE.Mesh>(null);
  const paletB = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.BoxGeometry(DETAL.uzunlik, DETAL.qalinlik, DETAL.eni), []);
  const yukGeo = useMemo(() => new THREE.BoxGeometry(DETAL.uzunlik, 1, DETAL.eni), []);
  useEffect(() => () => { geo.dispose(); yukGeo.dispose(); }, [geo, yukGeo]);
  const obj = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const mesh = ref.current;
    if (mesh) {
      const royxat = detallarHolati(t);
      royxat.forEach((d, i) => {
        obj.position.set(d.p[0], d.p[1], d.p[2]);
        obj.updateMatrix();
        mesh.setMatrixAt(i, obj.matrix);
        mesh.setColorAt(i, DETAL_RANGLARI[qoldiq(d.k, DETAL_RANGLARI.length)]);
      });
      mesh.count = royxat.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    const q = paletQatlamlari(t);
    [paletA.current, paletB.current].forEach((p, i) => {
      if (!p) return;
      const h = q[i] * DETAL.qalinlik;
      p.scale.y = Math.max(0.001, h);
      p.position.y = PALET_Y + h / 2;
    });
  });
  return (
    <>
      <instancedMesh ref={ref} args={[geo, a.detal, DETAL_MAX]} frustumCulled={false} castShadow receiveShadow />
      {PALETLAR.map(([x, z], i) => (
        <mesh key={`${x}${z}`} ref={i === 0 ? paletA : paletB} geometry={yukGeo} material={a.paletYuk} position={[x, PALET_Y, z]} castShadow receiveShadow />
      ))}
    </>
  );
}

// ── AGV ──

function Agv({ m, a, i, jadval }: { m: Materiallar; a: AvtoMat; i: number; jadval: ReturnType<typeof agvJadvali> }) {
  const ref = useRef<THREE.Group>(null);
  const yuk1 = useRef<THREE.Group>(null);
  const yuk2 = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const h = agvHolati(jadval, i, clock.elapsedTime);
    if (ref.current) {
      ref.current.position.set(h.x, 0, h.z);
      ref.current.rotation.y = h.burchak;
    }
    if (yuk1.current) yuk1.current.visible = h.yuk === 1;
    if (yuk2.current) yuk2.current.visible = h.yuk === 2;
  });
  const { eni, uzunlik } = AGV;
  return (
    <group ref={ref}>
      <StatikGuruh>
        <Quti o={[eni, 0.26, uzunlik]} p={[0, 0.17, 0]} mat={a.agvKorpus} />
        <Quti o={[eni - 0.04, 0.04, uzunlik - 0.08]} p={[0, 0.32, 0]} mat={m.polatQora} />
        {[-1, 1].map((s) => <Quti key={s} o={[eni + 0.02, 0.1, 0.05]} p={[0, 0.12, s * (uzunlik / 2 + 0.01)]} mat={m.rezina} />)}
        {[-1, 1].map((s) => <Quti key={`c${s}`} o={[0.012, 0.04, uzunlik - 0.2]} p={[s * (eni / 2 + 0.004), 0.22, 0]} mat={a.agvChiroq} />)}
        <Quti o={[eni - 0.2, 0.04, 0.012]} p={[0, 0.22, uzunlik / 2 + 0.04]} mat={a.agvChiroq} />
        <Silindr r={0.07} h={0.08} p={[0, 0.38, uzunlik / 2 - 0.15]} mat={m.rezina} seg={14} />
        {[-1, 1].map((s) => <Silindr key={`g${s}`} r={0.07} h={0.06} p={[s * (eni / 2 - 0.08), 0.07, 0]} rot={[0, 0, Math.PI / 2]} mat={m.rezina} seg={12} />)}
      </StatikGuruh>
      {/* Yuk 1: aravacha va detallar taxlami */}
      <group ref={yuk1} visible={false}>
        <StatikGuruh>
          <Quti o={[0.82, 0.04, 1.2]} p={[0, 0.38, 0]} mat={m.polat} />
          {[-1, 1].map((s) => <Quti key={s} o={[0.04, 0.9, 0.04]} p={[s * 0.38, 0.8, -0.56]} mat={m.polat} />)}
          <Quti o={[0.8, 0.04, 0.04]} p={[0, 1.24, -0.56]} mat={m.polat} />
          <Quti o={[0.55, 0.42, 0.9]} p={[0, 0.61, 0.05]} mat={m.lmdpOq} />
          <Quti o={[0.55, 0.14, 0.9]} p={[0, 0.89, 0.05]} mat={m.lmdp} />
        </StatikGuruh>
      </group>
      {/* Yuk 2: bo'sh paletlar */}
      <group ref={yuk2} visible={false}>
        <StatikGuruh>
          {[0, 1, 2].map((k) => <Quti key={k} o={[0.8, 0.13, 1.2]} p={[0, 0.41 + k * 0.145, 0]} mat={m.palet} />)}
        </StatikGuruh>
      </group>
    </group>
  );
}

// ── SCADA xonasi ──

/** Shisha devor bo'lagi (pastki panel + shisha + rom). `boylabX` — devor x bo'ylab, `doimiy` — devor tekisligi. */
function ShishaDevor({ m, boylabX, doimiy, u0, u1 }: { m: Materiallar; boylabX: boolean; doimiy: number; u0: number; u1: number }) {
  const panel = 0.9;
  const h = XONA_H;
  const y0 = XONA_POL;
  const uz = u1 - u0;
  const um = (u0 + u1) / 2;
  const joy = (y: number): V3 => (boylabX ? [um, y, doimiy] : [doimiy, y, um]);
  const ol = (hh: number, q: number): V3 => (boylabX ? [uz, hh, q] : [q, hh, uz]);
  return (
    <>
      <Quti o={ol(panel, 0.08)} p={joy(y0 + panel / 2)} mat={m.shkaf} />
      <Quti o={ol(h - panel, 0.03)} p={joy(y0 + panel + (h - panel) / 2)} mat={m.oyna} />
      <Quti o={ol(0.06, 0.1)} p={joy(y0 + panel)} mat={m.polatQora} />
    </>
  );
}

function BoshqaruvXonasi({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const t = BOSHQARUV_XONASI;
  const e = t.x1 - t.x0;
  const c = t.z1 - t.z0;
  const mx = (t.x0 + t.x1) / 2;
  const mz = (t.z0 + t.z1) / 2;
  const h = XONA_H;
  const y0 = XONA_POL;
  return (
    <>
      <Quti o={[e, y0, c]} p={[mx, y0 / 2, mz]} mat={m.shkaf} />
      <Quti o={[e - 0.2, 0.01, c - 0.2]} p={[mx, y0 + 0.005, mz]} mat={m.korpusQora} />
      {/* Karkas */}
      {[[t.x0, t.z0], [t.x1, t.z0], [t.x0, t.z1], [t.x1, t.z1], [mx, t.z0], [mx, t.z1], [t.x1, mz]].map(([x, z]) => <Quti key={`${x}${z}`} o={[0.1, h, 0.1]} p={[x, y0 + h / 2, z]} mat={m.polatQora} />)}
      <Quti o={[e, 0.12, 0.1]} p={[mx, y0 + h, t.z0]} mat={m.polatQora} />
      <Quti o={[e, 0.12, 0.1]} p={[mx, y0 + h, t.z1]} mat={m.polatQora} />
      <Quti o={[0.1, 0.12, c]} p={[t.x1, y0 + h, mz]} mat={m.polatQora} />
      <Quti o={[0.1, 0.12, c]} p={[t.x0, y0 + h, mz]} mat={m.polatQora} />
      {/* G'arbiy devor (yaxlit — ekranlar shunda), shimol, janub va sharq — shisha; eshiklar ochiq */}
      <Quti o={[0.1, h, c]} p={[t.x0 + 0.05, y0 + h / 2, mz]} mat={m.shkaf} />
      <ShishaDevor m={m} boylabX doimiy={t.z1} u0={t.x0} u1={t.x1} />
      {bolaklar(t.x0, t.x1, [{ markaz: -25, eni: 1.0 }]).map(([u0, u1]) => <ShishaDevor key={`j${u0}`} m={m} boylabX doimiy={t.z0} u0={u0} u1={u1} />)}
      {bolaklar(t.z0, t.z1, [{ markaz: -21, eni: 1.0 }]).map(([u0, u1]) => <ShishaDevor key={`s${u0}`} m={m} boylabX={false} doimiy={t.x1} u0={u0} u1={u1} />)}
      {/* Shisha tom (ichi yuqoridan ko'rinadi) va konditsioner */}
      <Quti o={[e, 0.03, c]} p={[mx, y0 + h + 0.07, mz]} mat={m.oyna} />
      <Quti o={[1.0, 0.5, 0.6]} p={[t.x0 + 0.8, y0 + h + 0.33, t.z1 - 0.6]} mat={m.korpus} />
      {/* Video devor: 3 ta katta ekran (SCADA) */}
      <Quti o={[0.08, 1.85, 5.7]} p={[t.x0 + 0.14, y0 + 2.0, mz]} mat={m.qora} />
      <mesh position={[t.x0 + 0.185, y0 + 2.0, mz]} rotation={[0, Math.PI / 2, 0]} material={a.scada}>
        <planeGeometry args={[5.4, 1.6]} />
      </mesh>
      {/* Pult: uzun stol, monitorlar, klaviaturalar, kreslolar */}
      <Quti o={[0.9, 0.05, 4.2]} p={[-29.4, y0 + 0.75, mz]} mat={m.lmdpKul} />
      <Quti o={[0.8, 0.7, 4.0]} p={[-29.45, y0 + 0.37, mz]} mat={m.korpusQora} />
      {[-1.5, -0.5, 0.5, 1.5].map((d) => (
        <group key={d}>
          <Quti o={[0.03, 0.4, 0.68]} p={[-29.75, y0 + 1.07, mz + d]} mat={m.ekran} />
          <Quti o={[0.06, 0.2, 0.06]} p={[-29.8, y0 + 0.86, mz + d]} mat={m.polatQora} />
          <Quti o={[0.18, 0.02, 0.45]} p={[-29.2, y0 + 0.785, mz + d]} mat={m.qora} />
        </group>
      ))}
      {[-1.0, 1.0].map((d) => (
        <group key={`k${d}`} position={[-28.3, y0, mz + d]}>
          <Quti o={[0.48, 0.08, 0.48]} p={[0, 0.48, 0]} mat={m.qora} />
          <Quti o={[0.07, 0.6, 0.48]} p={[0.24, 0.85, 0]} mat={m.qora} />
          <Silindr r={0.03} h={0.4} p={[0, 0.25, 0]} mat={m.polatQora} seg={10} />
        </group>
      ))}
      {/* Server shkafi va printer */}
      <Quti o={[0.7, 2.0, 0.9]} p={[t.x0 + 0.5, y0 + 1.0, t.z0 + 0.6]} mat={m.korpusQora} />
      <Quti o={[0.02, 1.7, 0.7]} p={[t.x0 + 0.86, y0 + 1.0, t.z0 + 0.6]} mat={m.ekran} />
      <Quti o={[0.6, 0.8, 0.5]} p={[t.x1 - 0.5, y0 + 0.4, t.z1 - 0.5]} mat={m.shkaf} />
    </>
  );
}

/** SCADA ekranini soniyasiga bir marta qayta chizadi (canvas tekstura). */
function ScadaYangilagich({ r }: { r: AvtoResurslar }) {
  const oxirgi = useRef(-1);
  useFrame(({ clock }) => {
    const s = Math.floor(clock.elapsedTime);
    if (s === oxirgi.current || !r.scadaCanvas || !r.scada) return;
    oxirgi.current = s;
    const ctx = r.scadaCanvas.getContext("2d");
    if (!ctx) return;
    scadaChiz(ctx, r.scadaCanvas.width, r.scadaCanvas.height, clock.elapsedTime);
    r.scada.needsUpdate = true;
  });
  return null;
}

/** Signal chiroqlari: sariq andon miltillaydi, AGV chiroqlari va yorug'lik pardalari pulsatsiya qiladi (materiallar umumiy — draw call qo'shilmaydi). */
function Signallar({ a }: { a: AvtoMat }) {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    a.andonSariq.emissiveIntensity = Math.floor(t * 1.6) % 2 === 0 ? 1.8 : 0.15;
    a.agvChiroq.emissiveIntensity = 1.0 + 0.9 * Math.sin(t * 5);
    a.nur.opacity = 0.35 + 0.25 * Math.sin(t * 11);
  });
  return null;
}

/** Elektr shkaflar, kompressor va robot boshqaruv shkaflari. */
function Shkaflar({ m, a }: { m: Materiallar; a: AvtoMat }) {
  const qator = (t: Tortburchak, kalit: string) => {
    const soni = Math.max(1, Math.round((t.x1 - t.x0) / 0.8));
    const w = (t.x1 - t.x0) / soni;
    const d = t.z1 - t.z0;
    return Array.from({ length: soni }, (_, i) => (
      <group key={`${kalit}${i}`} position={[t.x0 + w * (i + 0.5), 0, (t.z0 + t.z1) / 2]}>
        <Quti o={[w - 0.02, 2.0, d]} p={[0, 1.0, 0]} mat={m.shkaf} />
        <Quti o={[0.01, 1.85, 0.01]} p={[0, 1.0, d / 2 + 0.005]} mat={m.qora} />
        <Quti o={[0.18, 0.1, 0.02]} p={[w / 4, 1.65, d / 2 + 0.01]} mat={m.ekran} />
      </group>
    ));
  };
  const k = KOMPRESSOR;
  return (
    <>
      {qator(MCC_SHKAFLARI, "mcc")}
      {qator(CNC_SHKAFLARI, "cnc")}
      {/* Kompressor (vintli) va resiver */}
      <Quti o={[1.6, 1.6, 1.2]} p={[k.x0 + 1.0, 0.8, (k.z0 + k.z1) / 2]} mat={m.qirraRang} />
      <Quti o={[1.62, 0.1, 1.22]} p={[k.x0 + 1.0, 1.62, (k.z0 + k.z1) / 2]} mat={m.korpusQora} />
      <Silindr r={0.5} h={1.9} p={[k.x1 - 1.0, 1.15, (k.z0 + k.z1) / 2]} mat={m.korpus} seg={20} />
      <Silindr r={0.5} h={0.2} p={[k.x1 - 1.0, 0.1, (k.z0 + k.z1) / 2]} mat={m.polatQora} seg={20} />
      {ROBOT_SHKAFLARI.map((t, i) => (
        <group key={`rs${i}`} position={[(t.x0 + t.x1) / 2, 0, (t.z0 + t.z1) / 2]}>
          <Quti o={[t.x1 - t.x0, 1.3, t.z1 - t.z0]} p={[0, 0.65, 0]} mat={m.korpusQora} />
          <Quti o={[0.3, 0.2, 0.05]} p={[0, 1.05, (t.z1 - t.z0) / 2 + 0.03]} mat={m.ekran} />
          <Andon m={m} a={a} p={[0, 0]} h={1.75} />
        </group>
      ))}
      {/* Paletlar (R3 ostida) */}
      {PALETLAR.map(([x, z]) => (
        <group key={`pl${x}${z}`} position={[x, 0, z]}>
          <Quti o={[1.2, 0.025, 0.8]} p={[0, PALET_Y - 0.0125, 0]} mat={m.palet} />
          {[-0.35, 0, 0.35].map((d) => <Quti key={d} o={[1.2, 0.1, 0.1]} p={[0, 0.06, d]} mat={m.palet} />)}
        </group>
      ))}
    </>
  );
}

// ── Asosiy komponent ──

export default function AvtoSex({ m }: { m: Materiallar }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const r = useAvtoMateriallari();
  const a = r.mat;
  const jadval = useMemo(() => agvJadvali(), []);
  return (
    <>
      {/* Qimirlamaydigan qismlar — bitta guruhda, material bo'yicha birlashtiriladi */}
      <StatikGuruh>
        <Bino m={m} a={a} />
        <PolBelgilari m={m} a={a} />
        <OmborStatik m={m} />
        {CNC_QATORLARI.map((q) => <CncStatik key={q.id} m={m} a={a} z={q.z} />)}
        {ROBOTLAR.map((rb) => <RobotStatik key={rb.id} m={m} a={a} r={rb} />)}
        <Tosiqlar m={m} a={a} />
        <KonveyerlarStatik m={m} />
        <KromkaStatik m={m} a={a} />
        <BurgilashStatik m={m} a={a} />
        <BoshqaruvXonasi m={m} a={a} />
        <Shkaflar m={m} a={a} />
      </StatikGuruh>
      <Roliklar m={m} />
      {/* Harakatlanuvchi qismlar */}
      <Portal m={m} />
      {CNC_QATORLARI.map((q) => <CncHarakat key={q.id} m={m} a={a} z={q.z} faza={q.faza} />)}
      {ROBOTLAR.map((rb) => <Robot key={rb.id} m={m} a={a} r={rb} />)}
      <KromkaGaltak m={m} />
      <BurgilashKallagi m={m} />
      <Detallar a={a} />
      {Array.from({ length: AGV_SONI }, (_, i) => <Agv key={i} m={m} a={a} i={i} jadval={jadval} />)}
      <ScadaYangilagich r={r} />
      <Signallar a={a} />
      {/* Operatorlar va muhandis (GLB modellar yuklanguncha ko'rinmaydi) */}
      <Suspense fallback={null}>
        {TURGAN_ODAMLAR.map((o, i) => <GlbOdam key={`o${i}`} tur={o.tur} harakat="ishlash" p={o.p} burilish={o.burilish} faza={i * 0.27} />)}
        {ODAM_YOLLARI.map((o, i) => <YuruvchiGlbOdam key={`y${i}`} tur={o.tur} nuqtalar={o.nuqtalar} tezlik={o.tezlik} faza={o.faza} toxtash={2} toxtashHarakati="ishlash" />)}
      </Suspense>
      <ZonaYorligi p={[0, 7.0, ORTA_Z]} matn={t("zones.automated", "Avtomatlashtirilgan liniya")} rang="#7c3aed" />
    </>
  );
}
