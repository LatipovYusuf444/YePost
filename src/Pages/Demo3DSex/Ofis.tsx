import { Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { OFIS } from "./hudud";
import type { Materiallar } from "./materiallar";
import { GlbOdam, YuruvchiGlbOdam } from "./Odamlar";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import DirektorMashinasi from "./DirektorMashinasi";
import {
  MEBEL_TURLARI,
  MEBEL_URLLARI,
  STOL,
  devorBolaklari,
  materiallarniTozala,
  mebelGeometriyalari,
  ofisMateriallariYarat,
  olchamliQutiGeometriyasi,
  pardozMateriallari,
  type MebelJoyi,
  type MebelTuri,
  type OfisMateriallari,
  type Tosiq,
} from "./mebelModellari";
import {
  DEVOR_BALANDLIGI,
  DIREKTOR_STOLI,
  KITOB_QATORLARI,
  LENTA_BALANDLIGI,
  LIFT,
  LIKOPCHALAR,
  MAKET_STOLI,
  MOODBOARD,
  OFIS_DEVORLARI,
  OFIS_ESHIGI,
  OFIS_ICHI,
  OFIS_MEBELLARI,
  OFIS_ODAMLARI,
  OFIS_POLLARI,
  OFIS_POL_QOPLAMALARI,
  OFIS_STOL_GURUHLARI,
  OFIS_TEPASI,
  OFIS_TOSIQLARI,
  OFIS_YURUVCHILARI,
  OYIN_EKRANI,
  OYIN_PULTLARI,
  PANORAMA_LIFT,
  PLITA,
  QABUL_PESHTAXTASI,
  QAVAT_SONI,
  QOL_KITOBLARI,
  TAQDIMOT_EKRANLARI,
  TENNIS_ORALIGI,
  TENNIS_STOLI,
  TENNIS_STOLLARI,
  YADRO,
  YADRO_ESHIKLARI,
  ZINA,
  liftHolati,
  liftJadvali,
  tennisTopi,
  type Ekran,
  type PolTuri,
} from "./ofisRejasi";

// Ma'muriy bino — zamonaviy 8 qavatli ofis (20 × 16 m, 3.6 m qavat, ≈ 28.6 m). Kamera tomonidagi old (z = 42) va o'ng (x = −38)
// fasadlar — shisha parda-devor (tik profillar, oq plita qirralari), chap va orqasi — kompozit panel va lenta derazalar. Old
// fasadda shisha shaxtali panorama lift (kabina qavatlar orasida yuradi). Yuqori (8-) qavat tomsiz — yuqoridan "qo'g'irchoq
// uyi" kabi ko'rinadi, chetida panjara. Qavatlar: vestibyul + restoran, 2 ta ochiq ofis, kutubxona + o'yin xonasi, stol
// tennisi + sport, majlislar + HR, dizayn studiyasi, direktor qavati. Qimirlamaydigan qismlar StatikGuruh da material bo'yicha
// birlashadi; GLB mebel pardoz bo'yicha ≈ 10 ta geometriyaga birlashadi; odamlar — Odamlar.tsx (har biri 1 draw call).

type V3 = [number, number, number];
type Yon = "x" | "z";

// Barcha mebel modellari bitta ro'yxat bilan yuklanadi (ofis va maishiy blok bir xil kesh kalitini ishlatadi)
useGLTF.preload(MEBEL_URLLARI as string[], false, false);

/** Soya tashlamaydigan quti (shisha, yorug'lik panellari, yupqa qoplamalar). */
export function Oyna({ o, p, mat, r }: { o: V3; p: V3; mat: THREE.Material; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={mat} receiveShadow>
      <boxGeometry args={o} />
    </mesh>
  );
}

/** Teksturali quti: UV lar metrda (`tile` — bitta tekstura necha metr), tekstura cho'zilmaydi. */
export function OlchamliQuti({ o, p, mat, tile = 1, soya = true }: { o: V3; p: V3; mat: THREE.Material; tile?: number; soya?: boolean }) {
  const [w, h, d] = o;
  const geo = useMemo(() => olchamliQutiGeometriyasi(w, h, d, tile), [w, h, d, tile]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={p} material={mat} castShadow={soya} receiveShadow />;
}

/**
 * Binodagi barcha GLB mebel: pardoz (material turi) bo'yicha bir nechta birlashtirilgan meshga aylanadi — yuzlab nusxa
 * ≈ 10 draw call. Modellar yuklanguncha "suspend" qiladi (Suspense ichida ishlating).
 */
export function MebelToplami({ joylar }: { joylar: readonly MebelJoyi[] }) {
  const gltflar = useGLTF(MEBEL_URLLARI as string[], false, false);
  const materiallar = useMemo(() => pardozMateriallari(), []);
  useEffect(() => () => materiallarniTozala(materiallar), [materiallar]);
  const geometriyalar = useMemo(() => {
    const sahnalar = new Map<MebelTuri, THREE.Object3D>(MEBEL_TURLARI.map((t, i) => [t, gltflar[i].scene]));
    return mebelGeometriyalari(sahnalar, joylar);
  }, [gltflar, joylar]);
  useEffect(() => () => geometriyalar.forEach((g) => g.dispose()), [geometriyalar]);
  return (
    <group>
      {[...geometriyalar].map(([pardoz, g]) => (
        <mesh key={pardoz} geometry={g} material={materiallar[pardoz]} castShadow={pardoz !== "shisha" && pardoz !== "chiroq"} receiveShadow />
      ))}
    </group>
  );
}

const Y = OFIS_POLLARI;
const YUQORI = QAVAT_SONI - 1;
const H = DEVOR_BALANDLIGI;
const ESHIK_H = 2.2;
/** Fasad tekisligi: old shisha z, o'ng shisha x. */
const OLD_Z = OFIS.z1 - 0.05;
const ONG_X = OFIS.x1 + 0.05;
const OX = (OFIS.x0 + OFIS.x1) / 2;
const OZ = (OFIS.z0 + OFIS.z1) / 2;
const ENI = OFIS.x1 - OFIS.x0;
const CHUQ = OFIS.z1 - OFIS.z0;
/** Old fasad tik profillari qadami (16 ta oraliq) va o'ng fasadniki (12 ta). */
const OLD_QADAM = 1.25;
const ONG_QADAM = CHUQ / 12;
/** Kirish soyabonining balandligi (2-qavat plita qirrasidan pastda). */
const SOYABON_Y = 3.0;
/** Soyabon tortqichi: silindr o'qi (0, 1, 0) → fasaddagi nuqtadan soyabon chetiga yo'nalish. */
const TORTQICH = (() => {
  const a = [4.4, OFIS.z1 + 0.05] as const;
  const b = [SOYABON_Y + 0.09, OFIS.z1 + 2.65] as const;
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  return { uzunlik: Math.hypot(dy, dz), y: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, burchak: Math.atan2(dz, dy) };
})();
/** Qavat oralig'i: shu qavat shishasi pastki va yuqori chegarasi (plita qirrasi lentasi orasida). */
const shishaPasti = (k: number) => (k === 0 ? Y[0] : Y[k] + 0.09);
const shishaTepasi = (k: number) => (k < YUQORI ? Y[k + 1] - PLITA - 0.07 : OFIS_TEPASI);

/** Devor chizig'i bo'ylab joylashtirish: o = "z" — devor z = c da x bo'ylab; "x" — x = c da z bo'ylab. */
function joy(o: Yon, c: number, a: number, y: number, uzunlik: number, qalinlik: number, balandlik: number): { o: V3; p: V3 } {
  return o === "z" ? { o: [uzunlik, balandlik, qalinlik], p: [a, y, c] } : { o: [qalinlik, balandlik, uzunlik], p: [c, y, a] };
}

/** Ichki shisha to'siq: alyumin profillar, xira chiziq (ko'z balandligida), eshik ochiqlari romli. */
function ShishaTosiq({ o, c, a0, a1, y, eshiklar = [], om }: { o: Yon; c: number; a0: number; a1: number; y: number; eshiklar?: readonly (readonly [number, number])[]; om: OfisMateriallari }) {
  const bolaklar = devorBolaklari(a0, a1, 0, H, eshiklar.map(([e0, e1]) => ({ a0: e0, a1: e1, y0: 0, y1: ESHIK_H })));
  const qismlar: ReactNode[] = [];
  bolaklar.forEach((b, i) => {
    const L = b.a1 - b.a0;
    const a = (b.a0 + b.a1) / 2;
    const g = joy(o, c, a, y + (b.y0 + b.y1) / 2, L, 0.012, b.y1 - b.y0);
    qismlar.push(<Oyna key={`o${i}`} o={g.o} p={g.p} mat={om.ichkiOyna} />);
    if (b.y0 === 0) {
      const x = joy(o, c, a, y + 1.25, L, 0.016, 0.45);
      qismlar.push(<Oyna key={`x${i}`} o={x.o} p={x.p} mat={om.xiraOyna} />);
      const t = joy(o, c, a, y + 0.03, L, 0.06, 0.06);
      qismlar.push(<Quti key={`t${i}`} o={t.o} p={t.p} mat={om.alyumin} />);
    }
    const n = Math.max(1, Math.round(L / 1.2));
    for (let k = 0; k <= n; k++) {
      const s = joy(o, c, b.a0 + (L * k) / n, y + (b.y0 + b.y1) / 2, 0.045, 0.06, b.y1 - b.y0);
      qismlar.push(<Quti key={`s${i}-${k}`} o={s.o} p={s.p} mat={om.alyumin} />);
    }
  });
  const ust = joy(o, c, (a0 + a1) / 2, y + H - 0.03, a1 - a0, 0.07, 0.06);
  qismlar.push(<Quti key="ust" o={ust.o} p={ust.p} mat={om.alyumin} />);
  eshiklar.forEach(([e0, e1], i) => {
    const r = joy(o, c, (e0 + e1) / 2, y + ESHIK_H + 0.03, e1 - e0 + 0.1, 0.07, 0.06);
    qismlar.push(<Quti key={`r${i}`} o={r.o} p={r.p} mat={om.eshikRomi} />);
    if (e1 - e0 < 1.6) {
      // Yarim ochiq shisha tabaqa va dastak (keng ochiqlarda — tabaqasiz)
      const tabaqa = joy(o, c + 0.04, e0 + 0.22, y + ESHIK_H / 2, 0.42, 0.012, ESHIK_H - 0.04);
      qismlar.push(<Oyna key={`e${i}`} o={tabaqa.o} p={tabaqa.p} mat={om.ichkiOyna} />);
      const dastak = joy(o, c + 0.06, e0 + 0.4, y + 1.05, 0.03, 0.03, 0.5);
      qismlar.push(<Quti key={`d${i}`} o={dastak.o} p={dastak.p} mat={om.perila} />);
    }
  });
  return <>{qismlar}</>;
}

/** Ichki qattiq devor (eshik ochiqlari bilan) va eshik romlari. */
function Devor({ o, c, a0, a1, y, eshiklar = [], mat, om, qalinlik = 0.12, balandlik = H }: { o: Yon; c: number; a0: number; a1: number; y: number; eshiklar?: readonly (readonly [number, number])[]; mat: THREE.Material; om: OfisMateriallari; qalinlik?: number; balandlik?: number }) {
  const bolaklar = devorBolaklari(a0, a1, 0, balandlik, eshiklar.map(([e0, e1]) => ({ a0: e0, a1: e1, y0: 0, y1: ESHIK_H })));
  return (
    <>
      {bolaklar.map((b, i) => {
        const g = joy(o, c, (b.a0 + b.a1) / 2, y + (b.y0 + b.y1) / 2, b.a1 - b.a0, qalinlik, b.y1 - b.y0);
        return <Quti key={i} o={g.o} p={g.p} mat={mat} />;
      })}
      {eshiklar.map(([e0, e1], i) => {
        const ust = joy(o, c, (e0 + e1) / 2, y + ESHIK_H + 0.025, e1 - e0 + 0.12, qalinlik + 0.03, 0.05);
        const chap = joy(o, c, e0 - 0.025, y + ESHIK_H / 2, 0.05, qalinlik + 0.03, ESHIK_H);
        const ong = joy(o, c, e1 + 0.025, y + ESHIK_H / 2, 0.05, qalinlik + 0.03, ESHIK_H);
        return (
          <group key={`e${i}`}>
            <Quti o={ust.o} p={ust.p} mat={om.eshikRomi} />
            <Quti o={chap.o} p={chap.p} mat={om.eshikRomi} />
            <Quti o={ong.o} p={ong.p} mat={om.eshikRomi} />
          </group>
        );
      })}
    </>
  );
}

/** Qoplama turi → material va tekstura qadami (m). */
function polMateriali(om: OfisMateriallari, tur: PolTuri): [THREE.Material, number] {
  switch (tur) {
    case "granit": return [om.granit, 1.6];
    case "kovrolin": return [om.kovrolin, 2];
    case "parket": return [om.parket, 2];
    case "sportPol": return [om.sportPol, 2];
    case "mikrotsement": return [om.mikrotsement, 3];
    default: return [om.zina, 1];
  }
}

/** Plitalar (har qavat, zina teshigi bilan), pol qoplamalari, pastki qavat shiftidagi LED panellar. */
function Plitalar({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  qismlar.push(<Quti key="p0" o={[ENI, 0.16, CHUQ]} p={[OX, -0.04, OZ]} mat={om.plita} />);
  qismlar.push(<Quti key="sokol" o={[ENI + 0.1, 0.17, CHUQ + 0.1]} p={[OX, -0.035, OZ]} mat={om.sokol} />);
  for (let k = 1; k < QAVAT_SONI; k++) {
    const pastki = Y[k] - PLITA;
    const ph = PLITA - 0.012;
    const asosEni = OFIS.x1 - ZINA.x1;
    qismlar.push(<Quti key={`pa${k}`} o={[asosEni, ph, CHUQ]} p={[ZINA.x1 + asosEni / 2, pastki + ph / 2, OZ]} mat={om.plita} />);
    const bolakEni = ZINA.x1 - OFIS.x0;
    const bolakChuq = OFIS.z1 - ZINA.marshBoshi;
    qismlar.push(<Quti key={`pb${k}`} o={[bolakEni, ph, bolakChuq]} p={[OFIS.x0 + bolakEni / 2, pastki + ph / 2, ZINA.marshBoshi + bolakChuq / 2]} mat={om.plita} />);
    // Pastki qavat shiftidagi LED panellar (zina va lift ustida yo'q)
    for (let x = -56.4; x < OFIS.x1 - 0.5; x += 2.4) {
      for (let z = 27.4; z < OFIS.z1 - 0.5; z += 2.4) {
        if (x < YADRO.x1 + 0.4 && z < YADRO.z1 + 0.4) continue;
        qismlar.push(<Oyna key={`l${k}-${x.toFixed(1)}-${z.toFixed(1)}`} o={[0.6, 0.02, 0.6]} p={[x, pastki - 0.011, z]} mat={om.ledPanel} />);
      }
    }
  }
  OFIS_POL_QOPLAMALARI.forEach((q, i) => {
    const [mat, tile] = polMateriali(om, q.tur);
    qismlar.push(<OlchamliQuti key={`q${i}`} o={[q.x1 - q.x0, 0.012, q.z1 - q.z0]} p={[(q.x0 + q.x1) / 2, Y[q.qavat] - 0.006, (q.z0 + q.z1) / 2]} mat={mat} tile={tile} soya={false} />);
  });
  return <>{qismlar}</>;
}

/**
 * Old va o'ng parda-devor: har qavatda shisha (plita qirrasi lentalari orasida), tik profillar (butun balandlik bo'ylab),
 * oq plita qirralari, panorama lift eshiklari (old fasadda), kirish eshigi, soyabon va tepa qoplama.
 */
function PardaDevor({ om, m }: { om: OfisMateriallari; m: Materiallar }) {
  const qismlar: ReactNode[] = [];
  const L = PANORAMA_LIFT;
  for (let k = 0; k < QAVAT_SONI; k++) {
    const past = shishaPasti(k);
    const yuqori = shishaTepasi(k);
    const teshiklar: { a0: number; a1: number; y0: number; y1: number }[] = [{ a0: L.eshik.x0, a1: L.eshik.x1, y0: past, y1: Y[k] + L.eshik.h }];
    if (k === 0) teshiklar.push({ a0: OFIS_ESHIGI.x0, a1: OFIS_ESHIGI.x1, y0: past, y1: Y[0] + OFIS_ESHIGI.h });
    devorBolaklari(OFIS.x0, OFIS.x1, past, yuqori, teshiklar).forEach((b, i) => {
      qismlar.push(<Oyna key={`o${k}-${i}`} o={[b.a1 - b.a0, b.y1 - b.y0, 0.02]} p={[(b.a0 + b.a1) / 2, (b.y0 + b.y1) / 2, OLD_Z]} mat={om.oldOyna} />);
    });
    qismlar.push(<Oyna key={`r${k}`} o={[0.02, yuqori - past, CHUQ]} p={[ONG_X, (past + yuqori) / 2, OZ]} mat={om.oldOyna} />);
    // Yotiq profil (eshik balandligi ustida)
    const ty = Y[k] + 2.6;
    qismlar.push(<Quti key={`to${k}`} o={[ENI, 0.05, 0.1]} p={[OX, ty, OLD_Z + 0.03]} mat={om.mullion} />);
    qismlar.push(<Quti key={`tr${k}`} o={[0.1, 0.05, CHUQ]} p={[ONG_X + 0.03, ty, OZ]} mat={om.mullion} />);
    if (k > 0) {
      // Oq plita qirrasi (tashqariga chiqib turadi, burchakda tutashadi)
      const qy = Y[k] - 0.14;
      qismlar.push(<Quti key={`qo${k}`} o={[ENI + 0.18, 0.46, 0.28]} p={[OX + 0.09, qy, OFIS.z1 + 0.04]} mat={om.plitaQirrasi} />);
      qismlar.push(<Quti key={`qr${k}`} o={[0.28, 0.46, CHUQ]} p={[OFIS.x1 + 0.04, qy, OZ]} mat={om.plitaQirrasi} />);
    }
    // Panorama lift eshigi: rom, ostona ko'prigi (fasaddan kabinagacha), qavat chiroqchasi (o'chiq)
    const ex = (L.eshik.x0 + L.eshik.x1) / 2;
    const ew = L.eshik.x1 - L.eshik.x0;
    qismlar.push(<Quti key={`lr${k}`} o={[ew + 0.14, 0.08, 0.22]} p={[ex, Y[k] + L.eshik.h + 0.04, OLD_Z + 0.04]} mat={om.liftRom} />);
    qismlar.push(<Quti key={`la${k}`} o={[0.06, L.eshik.h, 0.22]} p={[L.eshik.x0 - 0.03, Y[k] + L.eshik.h / 2, OLD_Z + 0.04]} mat={om.liftRom} />);
    qismlar.push(<Quti key={`lb${k}`} o={[0.06, L.eshik.h, 0.22]} p={[L.eshik.x1 + 0.03, Y[k] + L.eshik.h / 2, OLD_Z + 0.04]} mat={om.liftRom} />);
    qismlar.push(<Quti key={`lo${k}`} o={[ew + 0.1, 0.05, L.kabina.z - L.kabina.chuqurlik / 2 - OLD_Z + 0.02]} p={[ex, Y[k] - 0.025, (OLD_Z + L.kabina.z - L.kabina.chuqurlik / 2) / 2]} mat={om.liftRom} />);
    qismlar.push(<Quti key={`lc${k}`} o={[0.16, 0.06, 0.03]} p={[ex, Y[k] + L.eshik.h + 0.14, OLD_Z + 0.16]} mat={om.korpus} />);
  }
  // Tik profillar: old fasad 1.25 m (kirish ochig'ida — fragmugadan), o'ng fasad 1.33 m
  for (let i = 0; i <= 16; i++) {
    const x = OFIS.x0 + i * OLD_QADAM;
    const ichida = x > OFIS_ESHIGI.x0 + 0.05 && x < OFIS_ESHIGI.x1 - 0.05;
    const past = ichida ? Y[0] + OFIS_ESHIGI.h : Y[0];
    qismlar.push(<Quti key={`mo${i}`} o={[0.07, OFIS_TEPASI - past, 0.16]} p={[x, (past + OFIS_TEPASI) / 2, OLD_Z + 0.06]} mat={om.mullion} />);
  }
  for (let i = 0; i <= 12; i++) {
    const z = OFIS.z0 + i * ONG_QADAM;
    qismlar.push(<Quti key={`mr${i}`} o={[0.16, OFIS_TEPASI - Y[0], 0.07]} p={[ONG_X + 0.06, (Y[0] + OFIS_TEPASI) / 2, z]} mat={om.mullion} />);
  }
  // Burchak ustuni va tepa qoplama (tomsiz qavatning yuqori qirrasi)
  const tikH = OFIS_TEPASI - Y[0];
  qismlar.push(<Quti key="burchak" o={[0.26, tikH + 0.3, 0.26]} p={[OFIS.x1 + 0.02, Y[0] + (tikH + 0.3) / 2, OFIS.z1 + 0.02]} mat={om.mullion} />);
  qismlar.push(<Quti key="tepaO" o={[ENI + 0.18, 0.3, 0.32]} p={[OX + 0.09, OFIS_TEPASI + 0.15, OFIS.z1 + 0.02]} mat={om.plitaQirrasi} />);
  qismlar.push(<Quti key="tepaR" o={[0.32, 0.3, CHUQ]} p={[OFIS.x1 + 0.02, OFIS_TEPASI + 0.15, OZ]} mat={om.plitaQirrasi} />);
  // Kirish: avtomatik surma eshik (yarim ochiq), rom, ustida soyabon (LED, yoritilgan nom), tortqichlar
  const ex = OFIS.eshik[0];
  const eh = OFIS_ESHIGI.h;
  qismlar.push(<Quti key="eRom" o={[OFIS_ESHIGI.x1 - OFIS_ESHIGI.x0 + 0.1, 0.12, 0.2]} p={[ex, Y[0] + eh, OLD_Z + 0.03]} mat={om.eshikRomi} />);
  for (const [k, x] of [["a", ex - 0.95], ["b", ex + 0.95]] as const) {
    qismlar.push(<Oyna key={`tab${k}`} o={[0.7, eh - 0.05, 0.02]} p={[x, Y[0] + (eh - 0.05) / 2, OLD_Z + 0.14]} mat={om.ichkiOyna} />);
    qismlar.push(<Quti key={`tabR${k}`} o={[0.7, 0.05, 0.05]} p={[x, Y[0] + 0.03, OLD_Z + 0.14]} mat={om.eshikRomi} />);
    qismlar.push(<Quti key={`tabT${k}`} o={[0.04, eh - 0.1, 0.05]} p={[x + (x < ex ? 0.33 : -0.33), Y[0] + eh / 2, OLD_Z + 0.14]} mat={om.eshikRomi} />);
  }
  qismlar.push(<Quti key="soyabon" o={[5.2, 0.18, 2.8]} p={[ex, SOYABON_Y, OFIS.z1 + 1.4]} mat={om.mullion} />);
  for (const x of [ex - 2.2, ex - 0.75, ex + 0.75, ex + 2.2]) qismlar.push(<Oyna key={`sl${x}`} o={[0.5, 0.02, 0.5]} p={[x, SOYABON_Y - 0.1, OFIS.z1 + 1.5]} mat={om.ledPanel} />);
  qismlar.push(<Oyna key="nom" o={[3.4, 0.42, 0.04]} p={[ex, SOYABON_Y + 0.3, OFIS.z1 + 2.76]} mat={om.logotip} />);
  qismlar.push(<Quti key="gilamcha" o={[2.4, 0.012, 1.4]} p={[ex, Y[0] + 0.006, OFIS.z1 - 0.9]} mat={om.sokol} />);
  for (const x of [ex - 2.3, ex + 2.3]) {
    qismlar.push(<Silindr key={`tq${x}`} r={0.02} h={TORTQICH.uzunlik} p={[x, TORTQICH.y, TORTQICH.z]} rot={[TORTQICH.burchak, 0, 0]} mat={m.polatQora} seg={8} />);
  }
  return <>{qismlar}</>;
}

/** Chap va orqa devor: kompozit panel, har qavatda lenta deraza (alyumin impost va tokcha bilan), tepada qoplama. */
function PanelDevorlar({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  const devorlar: { o: Yon; c: number; a0: number; a1: number; derazalar: [number, number][] }[] = [
    { o: "z", c: OFIS.z0 + 0.125, a0: OFIS.x0, a1: OFIS.x1 - 0.05, derazalar: [[-57.4, -52.9], [-52.1, -38.6]] },
    { o: "x", c: OFIS.x0 + 0.125, a0: OFIS.z0 + 0.25, a1: OFIS.z1 - 0.05, derazalar: [[26.7, 32.6], [33.5, 41.4]] },
  ];
  devorlar.forEach((d, di) => {
    const teshiklar = Y.flatMap((y) => d.derazalar.map(([a0, a1]) => ({ a0, a1, y0: y + 0.9, y1: y + 2.75 })));
    devorBolaklari(d.a0, d.a1, -0.12, OFIS_TEPASI, teshiklar).forEach((b, i) => {
      const g = joy(d.o, d.c, (b.a0 + b.a1) / 2, (b.y0 + b.y1) / 2, b.a1 - b.a0, 0.25, b.y1 - b.y0);
      qismlar.push(<OlchamliQuti key={`d${di}-${i}`} o={g.o} p={g.p} mat={om.kompozit} tile={3} />);
    });
    for (const t of teshiklar) {
      const L = t.a1 - t.a0;
      const a = (t.a0 + t.a1) / 2;
      const g = joy(d.o, d.c, a, (t.y0 + t.y1) / 2, L, 0.02, t.y1 - t.y0);
      qismlar.push(<Oyna key={`w${di}-${a}-${t.y0}`} o={g.o} p={g.p} mat={om.fasadOyna} />);
      const tokcha = joy(d.o, d.c, a, t.y0 - 0.02, L + 0.04, 0.32, 0.04);
      qismlar.push(<Quti key={`t${di}-${a}-${t.y0}`} o={tokcha.o} p={tokcha.p} mat={om.alyumin} />);
      const n = Math.max(1, Math.round(L / 1.5));
      for (let k = 1; k < n; k++) {
        const s = joy(d.o, d.c, t.a0 + (L * k) / n, (t.y0 + t.y1) / 2, 0.05, 0.1, t.y1 - t.y0);
        qismlar.push(<Quti key={`s${di}-${a}-${t.y0}-${k}`} o={s.o} p={s.p} mat={om.alyumin} />);
      }
    }
    const ust = joy(d.o, d.c, (d.a0 + d.a1) / 2, OFIS_TEPASI + 0.15, d.a1 - d.a0 + 0.1, 0.34, 0.3);
    qismlar.push(<Quti key={`u${di}`} o={ust.o} p={ust.p} mat={om.plitaQirrasi} />);
  });
  return <>{qismlar}</>;
}

/** Tom cheti (tomsiz yuqori qavat atrofida): zanglamas ustunchalar, poruchen va shisha panjara. */
function TomPanjarasi({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  const y0 = OFIS_TEPASI + 0.3;
  const h = 1.05;
  const tomonlar: { o: Yon; c: number; a0: number; a1: number }[] = [
    { o: "z", c: OFIS.z1 + 0.02, a0: OFIS.x0, a1: OFIS.x1 + 0.02 },
    { o: "x", c: OFIS.x1 + 0.02, a0: OFIS.z0, a1: OFIS.z1 + 0.02 },
    { o: "z", c: OFIS.z0 + 0.125, a0: OFIS.x0, a1: OFIS.x1 },
    { o: "x", c: OFIS.x0 + 0.125, a0: OFIS.z0, a1: OFIS.z1 },
  ];
  tomonlar.forEach((t, ti) => {
    const L = t.a1 - t.a0;
    const n = Math.round(L / 1.25);
    for (let i = 0; i <= n; i++) {
      const g = joy(t.o, t.c, t.a0 + (L * i) / n, y0 + h / 2, 0.05, 0.05, h);
      qismlar.push(<Quti key={`s${ti}-${i}`} o={g.o} p={g.p} mat={om.perila} />);
    }
    const p = joy(t.o, t.c, (t.a0 + t.a1) / 2, y0 + h, L, 0.07, 0.05);
    qismlar.push(<Quti key={`p${ti}`} o={p.o} p={p.p} mat={om.perila} />);
    const sh = joy(t.o, t.c, (t.a0 + t.a1) / 2, y0 + 0.5, L, 0.015, 0.85);
    qismlar.push(<Oyna key={`g${ti}`} o={sh.o} p={sh.p} mat={om.ichkiOyna} />);
  });
  return <>{qismlar}</>;
}

/** Zina-lift yadrosi: devorlar, ikki marshli zina (pog'onalar, qiya plita, panjara), xizmat lifti shaxtasi va eshiklari. */
function Yadro({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  const r = OFIS.qavatBalandligi / (2 * ZINA.pogona);
  const t = (ZINA.marshBoshi - ZINA.oraliq) / (ZINA.pogona - 1);
  const marshUzunligi = Math.hypot(ZINA.marshBoshi - ZINA.oraliq, OFIS.qavatBalandligi / 2);
  const qiyalik = Math.atan2(OFIS.qavatBalandligi / 2, ZINA.marshBoshi - ZINA.oraliq);
  const chapX = (ZINA.chap[0] + ZINA.chap[1]) / 2;
  const chapEni = ZINA.chap[1] - ZINA.chap[0];
  const ongX = (ZINA.ong[0] + ZINA.ong[1]) / 2;
  const ongEni = ZINA.ong[1] - ZINA.ong[0];
  const panjaraX = (ZINA.chap[1] + ZINA.ong[0]) / 2;
  Y.forEach((y, k) => {
    qismlar.push(<Devor key={`dz${k}`} o="z" c={YADRO.z1} a0={YADRO.x0} a1={YADRO.x1 + 0.06} y={y} eshiklar={YADRO_ESHIKLARI} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`dx${k}`} o="x" c={YADRO.x1} a0={YADRO.z0} a1={YADRO.z1 - 0.06} y={y} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`dl${k}`} o="x" c={ZINA.x1} a0={ZINA.z0} a1={ZINA.marshBoshi} y={y} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`ds${k}`} o="z" c={LIFT.z1} a0={LIFT.x0 + 0.06} a1={LIFT.x1 - 0.06} y={y} eshiklar={[LIFT.eshik]} mat={om.yadroDevor} om={om} />);
    const lx = (LIFT.eshik[0] + LIFT.eshik[1]) / 2;
    const le = LIFT.eshik[1] - LIFT.eshik[0];
    qismlar.push(<Quti key={`le${k}`} o={[le / 2 - 0.005, 2.1, 0.03]} p={[lx - le / 4, y + 1.05, LIFT.z1 + 0.03]} mat={om.lift} />);
    qismlar.push(<Quti key={`lf${k}`} o={[le / 2 - 0.005, 2.1, 0.03]} p={[lx + le / 4, y + 1.05, LIFT.z1 + 0.03]} mat={om.lift} />);
    qismlar.push(<Quti key={`lr${k}`} o={[le + 0.2, 2.25, 0.02]} p={[lx, y + 1.12, LIFT.z1 + 0.065]} mat={om.eshikRomi} />);
    qismlar.push(<Oyna key={`lt${k}`} o={[0.08, 0.16, 0.02]} p={[LIFT.eshik[1] + 0.25, y + 1.1, LIFT.z1 + 0.07]} mat={om.ledPanel} />);
    // Qavat raqami belgisi (yadro old devorida) va o't o'chirgich
    qismlar.push(<Quti key={`qr${k}`} o={[0.5, 0.5, 0.02]} p={[-52.75, y + 1.6, YADRO.z1 + 0.07]} mat={om.korpus} />);
    if (k === YUQORI) {
      qismlar.push(<Quti key="shaxta" o={[LIFT.x1 - LIFT.x0 + 0.12, 0.2, LIFT.z1 - LIFT.z0 + 0.12]} p={[(LIFT.x0 + LIFT.x1) / 2, OFIS_TEPASI + 0.1, (LIFT.z0 + LIFT.z1) / 2]} mat={om.plita} />);
      const tx = (ZINA.x0 + ZINA.chap[1] + 0.08) / 2;
      const te = ZINA.chap[1] + 0.08 - ZINA.x0;
      qismlar.push(<Oyna key="tos" o={[te, 0.95, 0.015]} p={[tx, y + 0.5, ZINA.marshBoshi]} mat={om.ichkiOyna} />);
      qismlar.push(<Quti key="tosP" o={[te, 0.05, 0.06]} p={[tx, y + 1.0, ZINA.marshBoshi]} mat={om.perila} />);
      return;
    }
    for (let i = 0; i < ZINA.pogona - 1; i++) {
      const tepa = y + (i + 1) * r;
      qismlar.push(<Quti key={`a${k}-${i}`} o={[chapEni, r + 0.08, t]} p={[chapX, tepa - (r + 0.08) / 2, ZINA.marshBoshi - (i + 0.5) * t]} mat={om.zina} />);
    }
    const oy = y + OFIS.qavatBalandligi / 2;
    qismlar.push(<Quti key={`m${k}`} o={[ZINA.x1 - ZINA.x0, 0.2, ZINA.oraliq - ZINA.z0]} p={[(ZINA.x0 + ZINA.x1) / 2, oy - 0.1, (ZINA.z0 + ZINA.oraliq) / 2]} mat={om.zina} />);
    for (let j = 0; j < ZINA.pogona - 1; j++) {
      const tepa = oy + (j + 1) * r;
      qismlar.push(<Quti key={`b${k}-${j}`} o={[ongEni, r + 0.08, t]} p={[ongX, tepa - (r + 0.08) / 2, ZINA.oraliq + (j + 0.5) * t]} mat={om.zina} />);
    }
    const markazZ = (ZINA.marshBoshi + ZINA.oraliq) / 2;
    qismlar.push(<Quti key={`qa${k}`} o={[chapEni, 0.14, marshUzunligi]} p={[chapX, y + OFIS.qavatBalandligi / 4 - 0.16, markazZ]} r={[qiyalik, 0, 0]} mat={om.yadroDevor} />);
    qismlar.push(<Quti key={`qb${k}`} o={[ongEni, 0.14, marshUzunligi]} p={[ongX, oy + OFIS.qavatBalandligi / 4 - 0.16, markazZ]} r={[-qiyalik, 0, 0]} mat={om.yadroDevor} />);
    for (const [kalit, asos, burchak] of [["a", y, qiyalik], ["b", oy, -qiyalik]] as const) {
      qismlar.push(<Quti key={`pr${kalit}${k}`} o={[0.05, 0.05, marshUzunligi]} p={[panjaraX, asos + OFIS.qavatBalandligi / 4 + 0.95, markazZ]} r={[burchak, 0, 0]} mat={om.perila} />);
      for (let s = 0; s < 4; s++) {
        const z = ZINA.oraliq + 0.2 + (s * (ZINA.marshBoshi - ZINA.oraliq - 0.4)) / 3;
        const ulush = (z - ZINA.oraliq) / (ZINA.marshBoshi - ZINA.oraliq);
        const pogona = asos + (kalit === "a" ? 1 - ulush : ulush) * (OFIS.qavatBalandligi / 2);
        qismlar.push(<Quti key={`ps${kalit}${k}-${s}`} o={[0.035, 0.95, 0.035]} p={[panjaraX, pogona + 0.475, z]} mat={om.perila} />);
      }
    }
  });
  return <>{qismlar}</>;
}

/** Ichki devorlar (ofisRejasi dagi ro'yxatdan): shisha to'siqlar, qattiq va yong'oq panelli devorlar. */
function IchkiDevorlar({ om }: { om: OfisMateriallari }) {
  return (
    <>
      {OFIS_DEVORLARI.map((d, i) =>
        d.tur === "shisha" ? (
          <ShishaTosiq key={i} o={d.o} c={d.c} a0={d.a0} a1={d.a1} y={Y[d.qavat]} eshiklar={d.eshiklar} om={om} />
        ) : (
          <Devor key={i} o={d.o} c={d.c} a0={d.a0} a1={d.a1} y={Y[d.qavat]} eshiklar={d.eshiklar} mat={d.tur === "yongoq" ? om.yongoq : om.devor} om={om} />
        ),
      )}
    </>
  );
}

/** Stol: ustki taxta va ikki tumba-oyoq. */
function KattaStol({ t, om, ust, oyoq, radius = 0.02 }: { t: Tosiq; om: OfisMateriallari; ust: THREE.Material; oyoq?: THREE.Material; radius?: number }) {
  const cx = (t.x0 + t.x1) / 2;
  const cz = (t.z0 + t.z1) / 2;
  const w = t.x1 - t.x0;
  const d = t.z1 - t.z0;
  const uzun = w >= d;
  const L = uzun ? w : d;
  return (
    <>
      <Yumaloq o={[w, 0.05, d]} p={[cx, t.y + t.h - 0.025, cz]} mat={ust} radius={radius} />
      {[-0.3, 0.3].map((u) => {
        const s = u * L;
        return <Quti key={u} o={uzun ? [0.5, t.h - 0.05, d * 0.55] : [w * 0.55, t.h - 0.05, 0.5]} p={uzun ? [cx + s, t.y + (t.h - 0.05) / 2, cz] : [cx, t.y + (t.h - 0.05) / 2, cz + s]} mat={oyoq ?? om.korpus} />;
      })}
    </>
  );
}

/** Stol tennisi stoli: ko'k ustki plita (chiziqlari bilan), ikki tayanch rama, to'r va ustunchalari, chetda raketkalar. */
function TennisStoli({ x, z, y, om }: { x: number; z: number; y: number; om: OfisMateriallari }) {
  const T = TENNIS_STOLI;
  return (
    <>
      <Quti o={[T.uzunlik, 0.03, T.eni]} p={[x, y + T.balandlik - 0.015, z]} mat={om.tennisStoli} />
      {[-0.95, 0.95].map((dx) => (
        <group key={dx}>
          <Quti o={[0.05, T.balandlik - 0.03, 0.05]} p={[x + dx, y + (T.balandlik - 0.03) / 2, z - 0.6]} mat={om.trenajer} />
          <Quti o={[0.05, T.balandlik - 0.03, 0.05]} p={[x + dx, y + (T.balandlik - 0.03) / 2, z + 0.6]} mat={om.trenajer} />
          <Quti o={[0.05, 0.05, 1.25]} p={[x + dx, y + 0.12, z]} mat={om.trenajer} />
        </group>
      ))}
      <Quti o={[0.06, 0.05, T.eni - 0.1]} p={[x, y + T.balandlik - 0.06, z]} mat={om.trenajer} />
      <Oyna o={[0.008, 0.15, T.eni + 0.3]} p={[x, y + T.balandlik + 0.075, z]} mat={om.tennisTori} />
      <Quti o={[0.012, 0.012, T.eni + 0.3]} p={[x, y + T.balandlik + 0.152, z]} mat={om.oqKorpus} />
      {[-1, 1].map((s) => <Quti key={s} o={[0.03, 0.17, 0.03]} p={[x, y + T.balandlik + 0.085, z + s * (T.eni / 2 + 0.15)]} mat={om.trenajer} />)}
    </>
  );
}

/** O'yinchi qo'lidagi raketka (o'ng qo'l oldida). */
function Raketka({ x, z, y, yon, om }: { x: number; z: number; y: number; yon: 1 | -1; om: OfisMateriallari }) {
  return (
    <group position={[x, y, z]} rotation={[0, yon > 0 ? 0 : Math.PI, 0]}>
      <Silindr r={0.08} h={0.012} p={[0.34, 1.02, 0.28]} rot={[0, 0, Math.PI / 2 - 0.3]} mat={om.raketka} seg={16} />
      <Quti o={[0.1, 0.025, 0.03]} p={[0.27, 0.98, 0.28]} r={[0, 0, -0.3]} mat={om.yongoqOch} />
    </group>
  );
}

/** Yugurish yo'lagi: rama, lenta (alohida — animatsiya), tik ustunlar, pult va ekrani, tutqichlar. */
function YugurishYolagi({ t, om }: { t: Tosiq; om: OfisMateriallari }) {
  const cz = (t.z0 + t.z1) / 2;
  const L = t.x1 - t.x0;
  const W = t.z1 - t.z0;
  return (
    <>
      <Yumaloq o={[L, 0.16, W]} p={[(t.x0 + t.x1) / 2, t.y + 0.08, cz]} mat={om.trenajer} radius={0.04} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Quti o={[0.06, 1.1, 0.06]} p={[t.x1 - 0.18, t.y + 0.7, cz + s * (W / 2 - 0.05)]} mat={om.trenajer} />
          <Quti o={[0.6, 0.04, 0.04]} p={[t.x1 - 0.45, t.y + 1.0, cz + s * (W / 2 - 0.05)]} mat={om.perila} />
        </group>
      ))}
      <Yumaloq o={[0.22, 0.24, W - 0.05]} p={[t.x1 - 0.18, t.y + 1.3, cz]} mat={om.trenajer} radius={0.03} />
      <Oyna o={[0.01, 0.13, 0.3]} p={[t.x1 - 0.295, t.y + 1.32, cz]} mat={om.ledMoviy} />
    </>
  );
}

/** Sport jihozlari (velotrenajer, gantellar, kuler) va gilamchalar. */
function SportJihozlari({ om, y }: { om: OfisMateriallari; y: number }) {
  const tos = (nom: string) => OFIS_TOSIQLARI.find((t) => t.nom === nom && t.y === y);
  const v = tos("velotrenajer");
  const g = tos("gantellar");
  return (
    <>
      {v && (
        <>
          <Quti o={[1.1, 0.06, 0.5]} p={[(v.x0 + v.x1) / 2, y + 0.03, (v.z0 + v.z1) / 2]} mat={om.trenajer} />
          <Silindr r={0.24} h={0.08} p={[v.x0 + 0.3, y + 0.32, (v.z0 + v.z1) / 2]} rot={[Math.PI / 2, 0, 0]} mat={om.gantel} seg={20} />
          <Quti o={[0.07, 0.75, 0.07]} p={[v.x0 + 0.62, y + 0.42, (v.z0 + v.z1) / 2]} r={[0, 0, 0.25]} mat={om.trenajer} />
          <Quti o={[0.26, 0.06, 0.18]} p={[v.x0 + 0.72, y + 0.8, (v.z0 + v.z1) / 2]} mat={om.pult} />
          <Quti o={[0.06, 0.6, 0.06]} p={[v.x1 - 0.2, y + 0.72, (v.z0 + v.z1) / 2]} mat={om.trenajer} />
          <Quti o={[0.08, 0.04, 0.46]} p={[v.x1 - 0.2, y + 1.04, (v.z0 + v.z1) / 2]} mat={om.perila} />
          <Oyna o={[0.02, 0.1, 0.16]} p={[v.x1 - 0.26, y + 1.0, (v.z0 + v.z1) / 2]} mat={om.ledMoviy} />
        </>
      )}
      {g && (
        <>
          <Quti o={[g.x1 - g.x0, 0.05, g.z1 - g.z0]} p={[(g.x0 + g.x1) / 2, y + 0.45, (g.z0 + g.z1) / 2]} mat={om.trenajer} />
          <Quti o={[g.x1 - g.x0, 0.05, g.z1 - g.z0]} p={[(g.x0 + g.x1) / 2, y + 0.8, (g.z0 + g.z1) / 2]} mat={om.trenajer} />
          {[g.x0 + 0.05, g.x1 - 0.05].map((x) => <Quti key={x} o={[0.05, g.h, g.z1 - g.z0]} p={[x, y + g.h / 2, (g.z0 + g.z1) / 2]} mat={om.trenajer} />)}
          {[0, 1, 2, 3, 4].map((i) => (
            <group key={i}>
              <Silindr r={0.06 + i * 0.008} h={0.32} p={[g.x0 + 0.25 + i * 0.37, y + 0.53 + i * 0.005, (g.z0 + g.z1) / 2]} rot={[Math.PI / 2, 0, 0]} mat={om.gantel} seg={12} />
              <Silindr r={0.05 + i * 0.006} h={0.3} p={[g.x0 + 0.25 + i * 0.37, y + 0.87, (g.z0 + g.z1) / 2]} rot={[Math.PI / 2, 0, 0]} mat={om.gantel} seg={12} />
            </group>
          ))}
        </>
      )}
      {[0, 1, 2].map((i) => <Quti key={`mat${i}`} o={[0.62, 0.012, 1.8]} p={[-43.5 + i * 1.2, y + 0.006, 28.3]} mat={om.yogaMat[i]} />)}
      <Silindr r={0.17} h={0.17} p={[-44.6, y + 0.17, 30.2]} mat={om.yogaMat[0]} seg={18} />
      <Silindr r={0.3} h={0.6} p={[-41.6, y + 0.3, 31.6]} mat={om.yogaMat[1]} seg={20} />
    </>
  );
}

/** Kod bilan chiziladigan to'siq-jihozlar (ofisRejasi dagi ro'yxat bo'yicha). */
function TosiqJihozi({ t, om, m }: { t: Tosiq; om: OfisMateriallari; m: Materiallar }) {
  const cx = (t.x0 + t.x1) / 2;
  const cz = (t.z0 + t.z1) / 2;
  const w = t.x1 - t.x0;
  const d = t.z1 - t.z0;
  const y = t.y;
  const qutisi = (mat: THREE.Material) => <Quti o={[w, t.h, d]} p={[cx, y + t.h / 2, cz]} mat={mat} />;
  if (t.nom.startsWith("tennis")) return <TennisStoli x={cx} z={cz} y={y} om={om} />;
  if (t.nom.startsWith("yugurish")) return <YugurishYolagi t={t} om={om} />;
  switch (t.nom) {
    case "qabul": {
      const q = QABUL_PESHTAXTASI;
      const qe = q.x1 - q.x0;
      return (
        <>
          <Quti o={[qe, 1.03, 0.06]} p={[cx, y + 0.515, q.z1 - 0.03]} mat={om.qabul} />
          <Quti o={[0.06, 1.03, d]} p={[q.x0 + 0.03, y + 0.515, cz]} mat={om.qabul} />
          <Quti o={[0.06, 1.03, d]} p={[q.x1 - 0.03, y + 0.515, cz]} mat={om.qabul} />
          <Quti o={[qe + 0.1, 0.04, 0.42]} p={[cx, y + 1.06, q.z1 - 0.17]} mat={om.yongoq} />
          <Quti o={[qe - 0.12, 0.03, q.oldZ - q.z0 + 0.12]} p={[cx, y + 0.735, (q.z0 + q.oldZ) / 2 + 0.06]} mat={om.qabul} />
          <Quti o={[qe - 0.12, 0.3, 0.03]} p={[cx, y + 0.2, q.oldZ]} mat={om.sokol} />
          <Oyna o={[qe - 0.1, 0.025, 0.01]} p={[cx, y + 0.98, q.z1 + 0.005]} mat={om.ledPanel} />
        </>
      );
    }
    case "bufet":
      return (
        <>
          <Quti o={[w, t.h - 0.04, d]} p={[cx, y + (t.h - 0.04) / 2, cz]} mat={om.qabul} />
          <Quti o={[w + 0.06, 0.04, d + 0.06]} p={[cx, y + t.h - 0.02, cz]} mat={om.zanglamas} />
          <Oyna o={[w, 0.03, d]} p={[cx, y + 0.18, cz + 0.01]} mat={om.ledPanel} />
          {[0, 1, 2, 3, 4].map((i) => (
            <group key={i}>
              <Quti o={[0.6, 0.07, 0.42]} p={[t.x0 + 0.5 + i * 0.8, y + t.h + 0.035, cz]} mat={om.zanglamas} />
              <Quti o={[0.54, 0.02, 0.36]} p={[t.x0 + 0.5 + i * 0.8, y + t.h + 0.07, cz]} mat={om.ovqat[i % 3]} />
            </group>
          ))}
          <Oyna o={[w, 0.4, 0.012]} p={[cx, y + t.h + 0.38, t.z1 + 0.02]} r={[-0.25, 0, 0]} mat={om.ichkiOyna} />
          <Quti o={[w, 0.03, 0.03]} p={[cx, y + t.h + 0.6, t.z1 - 0.03]} mat={om.perila} />
        </>
      );
    case "printer":
      return (
        <>
          <Yumaloq o={[w, 0.82, d]} p={[cx, y + 0.41, cz]} mat={om.oqKorpus} radius={0.03} />
          <Yumaloq o={[w - 0.06, 0.16, d - 0.04]} p={[cx, y + 0.9, cz]} mat={om.korpus} radius={0.02} />
          <Oyna o={[0.18, 0.1, 0.02]} p={[cx - 0.2, y + 0.92, t.z1 - 0.01]} mat={om.ledPanel} />
        </>
      );
    case "kuler":
      return (
        <>
          <Quti o={[0.36, 0.95, 0.36]} p={[cx, y + 0.475, cz]} mat={om.oqKorpus} />
          <Silindr r={0.15} h={0.42} p={[cx, y + 1.16, cz]} mat={om.fasadOyna} seg={16} />
        </>
      );
    case "doska":
      return (
        <>
          <Quti o={[0.03, 1.2, d]} p={[t.x0 + 0.05, y + 1.5, cz]} mat={om.oqDoska} />
          <Quti o={[0.05, 0.04, d]} p={[t.x0 + 0.07, y + 0.9, cz]} mat={om.alyumin} />
        </>
      );
    case "tvTumba":
    case "ekranTumba":
      return qutisi(om.yongoq);
    case "velotrenajer":
    case "gantellar":
      return null;
    case "kattaMajlisStoli":
      return <KattaStol t={t} om={om} ust={om.yongoqOch} />;
    case "majlisStoli":
      return (
        <>
          <KattaStol t={t} om={om} ust={om.yongoqOch} />
          <Quti o={[0.3, 0.006, 0.12]} p={[cx, y + t.h + 0.003, cz]} mat={om.korpus} />
        </>
      );
    case "maketStoli": {
      const mk = MAKET_STOLI;
      return (
        <>
          <KattaStol t={t} om={om} ust={om.qabul} oyoq={om.yongoq} radius={0.015} />
          {/* Kichik mebel maketlari: shkaf, divan, stol, kreslo */}
          <Quti o={[0.5, 0.42, 0.22]} p={[mk.x0 + 0.5, y + mk.h + 0.21, mk.z0 + 0.4]} mat={om.maket[1]} />
          <Quti o={[0.48, 0.02, 0.2]} p={[mk.x0 + 0.5, y + mk.h + 0.3, mk.z0 + 0.52]} mat={om.maket[2]} />
          <Quti o={[0.6, 0.12, 0.26]} p={[mk.x0 + 1.4, y + mk.h + 0.06, mk.z0 + 0.5]} mat={om.maket[3]} />
          <Quti o={[0.6, 0.14, 0.06]} p={[mk.x0 + 1.4, y + mk.h + 0.19, mk.z0 + 0.4]} mat={om.maket[3]} />
          <Quti o={[0.5, 0.02, 0.32]} p={[mk.x0 + 2.4, y + mk.h + 0.2, mk.z0 + 0.8]} mat={om.maket[0]} />
          {[-0.2, 0.2].map((dx) => <Quti key={dx} o={[0.03, 0.19, 0.28]} p={[mk.x0 + 2.4 + dx, y + mk.h + 0.095, mk.z0 + 0.8]} mat={om.maket[0]} />)}
          <Quti o={[0.18, 0.14, 0.18]} p={[mk.x0 + 3.1, y + mk.h + 0.07, mk.z0 + 1.1]} mat={om.maket[1]} />
          <Quti o={[0.9, 0.005, 0.6]} p={[mk.x0 + 1.9, y + mk.h + 0.003, mk.z1 - 0.4]} mat={om.oqDoska} />
        </>
      );
    }
    case "moodboard": {
      const mb = MOODBOARD;
      return (
        <>
          <Quti o={[0.03, mb.y1 - mb.y0, mb.z1 - mb.z0]} p={[mb.x + 0.015, (mb.y0 + mb.y1) / 2, (mb.z0 + mb.z1) / 2]} mat={om.moodboard} />
          <Quti o={[0.05, 0.05, mb.z1 - mb.z0 + 0.1]} p={[mb.x + 0.02, mb.y1 + 0.03, (mb.z0 + mb.z1) / 2]} mat={om.yongoq} />
        </>
      );
    }
    case "printer3d":
      return (
        <>
          <Quti o={[w, 0.7, d]} p={[cx, y + 0.35, cz]} mat={om.yongoq} />
          {[-0.4, 0.4].map((dx) => (
            <group key={dx}>
              <Quti o={[0.62, 0.05, 0.55]} p={[cx + dx, y + 0.725, cz]} mat={om.korpus} />
              <Quti o={[0.62, 0.05, 0.55]} p={[cx + dx, y + 1.25, cz]} mat={om.korpus} />
              {[-0.29, 0.29].map((ex) => <Quti key={ex} o={[0.04, 0.5, 0.04]} p={[cx + dx + ex, y + 1.0, cz + 0.25]} mat={om.korpus} />)}
              <Oyna o={[0.56, 0.48, 0.5]} p={[cx + dx, y + 0.99, cz]} mat={om.ichkiOyna} />
              <Quti o={[0.14, 0.12, 0.14]} p={[cx + dx, y + 0.81, cz]} mat={om.printer3d} />
            </group>
          ))}
        </>
      );
    case "direktorStoli": {
      const ds = DIREKTOR_STOLI;
      return (
        <>
          <Yumaloq o={[ds.eni, 0.05, ds.chuqurlik]} p={[ds.x, y + ds.h - 0.025, ds.z]} mat={om.yongoq} radius={0.015} />
          <Quti o={[1.0, 0.004, 0.5]} p={[ds.x - 0.1, y + ds.h + 0.002, ds.z - 0.18]} mat={om.teri} />
          <Quti o={[0.5, ds.h - 0.05, ds.chuqurlik - 0.08]} p={[ds.x - ds.eni / 2 + 0.27, y + (ds.h - 0.05) / 2, ds.z]} mat={om.yongoq} />
          <Quti o={[0.5, ds.h - 0.05, ds.chuqurlik - 0.08]} p={[ds.x + ds.eni / 2 - 0.27, y + (ds.h - 0.05) / 2, ds.z]} mat={om.yongoq} />
          <Quti o={[ds.eni - 1.04, 0.5, 0.03]} p={[ds.x, y + ds.h - 0.3, ds.z + ds.chuqurlik / 2 - 0.06]} mat={om.yongoqOch} />
          <Silindr r={0.07} h={0.02} p={[ds.x + 0.75, y + ds.h + 0.01, ds.z - 0.25]} mat={om.korpus} seg={16} />
          <Silindr r={0.012} h={0.4} p={[ds.x + 0.75, y + ds.h + 0.2, ds.z - 0.25]} mat={om.perila} seg={8} />
          <Silindr r={0.09} h={0.12} p={[ds.x + 0.75, y + ds.h + 0.42, ds.z - 0.2]} mat={om.korpus} seg={16} />
        </>
      );
    }
    case "kredensa":
      return (
        <>
          {qutisi(om.yongoq)}
          {[-0.6, 0, 0.6].map((dx) => <Quti key={dx} o={[0.006, t.h - 0.1, 0.01]} p={[cx + dx, y + t.h / 2, t.z1 + 0.003]} mat={om.korpus} />)}
          <Silindr r={0.09} h={0.34} p={[t.x0 + 0.35, y + t.h + 0.17, cz]} mat={om.qabul} seg={16} />
          <Quti o={[0.32, 0.08, 0.24]} p={[t.x1 - 0.4, y + t.h + 0.04, cz]} mat={om.yongoqOch} />
        </>
      );
    case "barStol":
      return (
        <>
          <Silindr r={0.4} h={0.04} p={[cx, y + t.h - 0.02, cz]} mat={om.yongoqOch} seg={28} />
          <Silindr r={0.035} h={t.h - 0.04} p={[cx, y + (t.h - 0.04) / 2, cz]} mat={om.perila} seg={10} />
          <Silindr r={0.26} h={0.03} p={[cx, y + 0.015, cz]} mat={om.korpus} seg={24} />
        </>
      );
    default:
      return qutisi(m.korpusQora);
  }
}

/** Ekran yuzasi (televizor oldida). */
function EkranYuzasi({ e, mat }: { e: Ekran; mat: THREE.Material }) {
  return (
    <mesh position={[e.x, e.y, e.z]} rotation={[0, e.burchak, 0]} material={mat}>
      <planeGeometry args={[e.eni, e.balandlik]} />
    </mesh>
  );
}

/** Qavatlarga xos mayda jihozlar: logotip va yashil devor, restoran likopchalari va chiroqlari, kitoblar, pultlar, o'yin xonasi. */
function QavatJihozlari({ om, m }: { om: OfisMateriallari; m: Materiallar }) {
  const qismlar: ReactNode[] = [];
  const y0 = Y[0];
  // 1-qavat: logotip devori (oshxona old devorida), yashil devor, restoran osma chiroqlari, likopchalar
  qismlar.push(<Quti key="logoPanel" o={[5.6, H - 0.05, 0.05]} p={[-49.0, y0 + (H - 0.05) / 2, YADRO.z1 + 0.085]} mat={om.yongoqOch} />);
  qismlar.push(<Oyna key="logo" o={[3.2, 0.8, 0.02]} p={[-49.0, y0 + 2.25, YADRO.z1 + 0.12]} mat={om.logotip} />);
  qismlar.push(<Quti key="yashil" o={[0.08, 2.9, 5.6]} p={[OFIS_ICHI.x0 + 0.04, y0 + 0.2 + 1.45, 37.4]} mat={om.yashilDevor} />);
  qismlar.push(<Quti key="yashilT" o={[0.2, 0.12, 5.7]} p={[OFIS_ICHI.x0 + 0.1, y0 + 0.14, 37.4]} mat={om.korpus} />);
  for (const x of [-43.3, -40.1]) {
    for (const z of [30.0, 32.8, 35.6, 38.4]) {
      qismlar.push(<Silindr key={`ch${x}${z}`} r={0.2} h={0.16} p={[x, y0 + 2.45, z]} mat={om.korpus} seg={20} />);
      qismlar.push(<Silindr key={`cn${x}${z}`} r={0.17} h={0.01} p={[x, y0 + 2.365, z]} mat={om.ledPanel} seg={20} />);
      qismlar.push(<Silindr key={`cs${x}${z}`} r={0.008} h={0.75} p={[x, y0 + 2.9, z]} mat={om.perila} seg={6} />);
    }
  }
  LIKOPCHALAR.forEach(([x, y, z], i) => {
    qismlar.push(<Silindr key={`lk${i}`} r={0.12} h={0.015} p={[x, y + 0.008, z]} mat={om.likopcha} seg={18} />);
    qismlar.push(<Silindr key={`ov${i}`} r={0.07} h={0.03} p={[x, y + 0.03, z]} mat={om.ovqat[i % 3]} seg={14} />);
  });
  // 2–3-qavat: stol guruhlari orasidagi akustik to'siqlar
  OFIS_STOL_GURUHLARI.forEach(({ bolgich: b }, i) => {
    qismlar.push(<Quti key={`bg${i}`} o={[b.x1 - b.x0, 0.42, 0.014]} p={[(b.x0 + b.x1) / 2, b.y + STOL.balandlik + 0.21, b.z]} mat={om.bolgich} />);
    qismlar.push(<Quti key={`bp${i}`} o={[b.x1 - b.x0, 0.02, 0.02]} p={[(b.x0 + b.x1) / 2, b.y + STOL.balandlik + 0.43, b.z]} mat={om.alyumin} />);
  });
  // 4-qavat: javonlardagi kitoblar, qo'ldagi kitoblar va pultlar, o'yin xonasi LED chiziqlari va konsol
  KITOB_QATORLARI.forEach((k, i) => {
    qismlar.push(<Quti key={`kt${i}`} o={k.o} p={k.p} r={[0, k.b, 0]} mat={om.kitoblar} />);
  });
  QOL_KITOBLARI.forEach((k, i) => {
    qismlar.push(<Quti key={`qk${i}`} o={[0.16, 0.025, 0.22]} p={k.p} r={[0.5, k.b, 0]} mat={i % 2 ? om.yongoqOch : m.qizil} />);
  });
  OYIN_PULTLARI.forEach((k, i) => {
    qismlar.push(
      <group key={`pl${i}`} position={k.p} rotation={[0.35, k.b, 0]}>
        <Quti o={[0.15, 0.03, 0.07]} p={[0, 0, 0]} mat={om.pult} />
        <Quti o={[0.04, 0.03, 0.06]} p={[-0.065, -0.005, -0.03]} mat={om.pult} />
        <Quti o={[0.04, 0.03, 0.06]} p={[0.065, -0.005, -0.03]} mat={om.pult} />
        <Quti o={[0.03, 0.004, 0.01]} p={[0, 0.017, 0.012]} mat={om.ledMoviy} />
      </group>,
    );
  });
  const e = OYIN_EKRANI;
  const y3 = Y[3];
  for (const dz of [-1.35, 1.35]) qismlar.push(<Oyna key={`ld${dz}`} o={[0.02, 1.7, 0.04]} p={[-45.96, y3 + 1.4, e.z + dz]} mat={om.ledBinafsha} />);
  qismlar.push(<Oyna key="ldU" o={[0.02, 0.04, 2.74]} p={[-45.96, y3 + 2.27, e.z]} mat={om.ledBinafsha} />);
  qismlar.push(<Yumaloq key="konsol" o={[0.3, 0.07, 0.35]} p={[-45.6, y3 + 0.485, e.z + 0.95]} mat={om.oqKorpus} radius={0.02} />);
  qismlar.push(<Oyna key="konsolL" o={[0.005, 0.01, 0.2]} p={[-45.448, y3 + 0.49, e.z + 0.95]} mat={om.ledMoviy} />);
  // 5-qavat: raketkalar o'yinchilar qo'lida
  for (const s of TENNIS_STOLLARI) {
    const d = TENNIS_STOLI.uzunlik / 2 + TENNIS_ORALIGI;
    qismlar.push(<Raketka key={`rk${s.z}a`} x={s.x - d} z={s.z - 0.15} y={s.y} yon={1} om={om} />);
    qismlar.push(<Raketka key={`rk${s.z}b`} x={s.x + d} z={s.z + 0.15} y={s.y} yon={-1} om={om} />);
  }
  // 7-qavat: material namunalari (ochiq javonlarda)
  const y6 = Y[6];
  [-51.8, -51.0].forEach((x) => {
    [0.3, 0.83, 1.36].forEach((ty, j) => {
      [0, 1, 2].forEach((n) => qismlar.push(<Quti key={`nm${x}${j}${n}`} o={[0.2, 0.22, 0.18]} p={[x - 0.24 + n * 0.24, y6 + ty + 0.11, 33.25]} mat={om.maket[(n + j) % 4]} />));
    });
  });
  return <>{qismlar}</>;
}

/** Panorama lift shaxtasi (qimirlamaydi): burchak ustunlari, qavat halqalari, uch tomoni shisha, yo'naltiruvchilar, tepa qopqoq. */
function LiftShaxtasi({ om }: { om: OfisMateriallari }) {
  const L = PANORAMA_LIFT;
  const w = L.x1 - L.x0;
  const d = L.z1 - L.z0;
  const cx = (L.x0 + L.x1) / 2;
  const cz = (L.z0 + L.z1) / 2;
  const qismlar: ReactNode[] = [];
  const balandlik = L.tepasi;
  for (const [x, z] of [[L.x0, L.z0], [L.x1, L.z0], [L.x0, L.z1], [L.x1, L.z1]] as const) {
    qismlar.push(<Quti key={`u${x}${z}`} o={[0.12, balandlik, 0.12]} p={[x, balandlik / 2, z]} mat={om.mullion} />);
  }
  // Qavat halqalari va shisha (old va ikki yon)
  const sathlar = [...Y.map((y) => y - 0.15), OFIS_TEPASI];
  sathlar.forEach((y, i) => {
    qismlar.push(<Quti key={`ho${i}`} o={[w, 0.1, 0.08]} p={[cx, y, L.z1]} mat={om.mullion} />);
    qismlar.push(<Quti key={`ha${i}`} o={[0.08, 0.1, d]} p={[L.x0, y, cz]} mat={om.mullion} />);
    qismlar.push(<Quti key={`hb${i}`} o={[0.08, 0.1, d]} p={[L.x1, y, cz]} mat={om.mullion} />);
    const keyingi = i < sathlar.length - 1 ? sathlar[i + 1] : balandlik - 0.4;
    const past = i === 0 ? 0.15 : y + 0.05;
    const h = keyingi - 0.05 - past;
    if (h <= 0.1) return;
    qismlar.push(<Oyna key={`so${i}`} o={[w - 0.1, h, 0.015]} p={[cx, past + h / 2, L.z1]} mat={om.liftOyna} />);
    qismlar.push(<Oyna key={`sa${i}`} o={[0.015, h, d - 0.1]} p={[L.x0, past + h / 2, cz]} mat={om.liftOyna} />);
    qismlar.push(<Oyna key={`sb${i}`} o={[0.015, h, d - 0.1]} p={[L.x1, past + h / 2, cz]} mat={om.liftOyna} />);
  });
  // Yo'naltiruvchi relslar (kabina ikki yonida), chuqurcha va tepa qopqoq (mashina xonasi)
  for (const s of [-1, 1]) qismlar.push(<Quti key={`rl${s}`} o={[0.05, balandlik - 0.3, 0.08]} p={[L.kabina.x + s * (L.kabina.eni / 2 + 0.07), (balandlik - 0.3) / 2, L.kabina.z]} mat={om.perila} />);
  qismlar.push(<Quti key="chuqur" o={[w + 0.2, 0.16, d + 0.2]} p={[cx, 0.0, cz]} mat={om.sokol} />);
  qismlar.push(<Quti key="qopqoq" o={[w + 0.24, 0.4, d + 0.24]} p={[cx, balandlik + 0.2, cz]} mat={om.mullion} />);
  qismlar.push(<Quti key="mashina" o={[1.0, 0.5, 0.8]} p={[cx, balandlik + 0.65, cz]} mat={om.korpus} />);
  return <>{qismlar}</>;
}

/**
 * Panorama lift kabinasi (harakatlanadi): shisha devorlar, pol, tom, tutqich, ikki tabaqali eshik (to'xtaganda ochiladi),
 * eshik ustidagi chiroq (harakatda — sariq, to'xtaganda — yashil), qarshi yuk, tros, fasaddagi qavat chiroqchasi.
 */
function LiftKabinasi({ om }: { om: OfisMateriallari }) {
  const L = PANORAMA_LIFT;
  const K = L.kabina;
  const jadval = useMemo(() => liftJadvali(), []);
  const kabina = useRef<THREE.Group>(null);
  const chap = useRef<THREE.Mesh>(null);
  const ong = useRef<THREE.Mesh>(null);
  const yuk = useRef<THREE.Mesh>(null);
  const tros = useRef<THREE.Mesh>(null);
  const belgi = useRef<THREE.Mesh>(null);
  const ranglar = useMemo(() => ({ yashil: new THREE.Color("#22c55e"), sariq: new THREE.Color("#f59e0b") }), []);
  const eshikEni = 1.0;
  const orqaZ = -K.chuqurlik / 2;
  useFrame((state) => {
    const h = liftHolati(jadval, state.clock.elapsedTime);
    if (kabina.current) kabina.current.position.y = h.y;
    const siljish = (h.eshik * eshikEni) / 2;
    if (chap.current) chap.current.position.x = -eshikEni / 4 - siljish;
    if (ong.current) ong.current.position.x = eshikEni / 4 + siljish;
    if (yuk.current) yuk.current.position.y = Y[0] + (Y[YUQORI] - h.y) + 1.4;
    if (tros.current) {
      const ust = h.y + K.balandlik + 0.15;
      const uz = Math.max(0.05, L.tepasi - ust);
      tros.current.scale.y = uz;
      tros.current.position.y = ust + uz / 2;
    }
    if (belgi.current) belgi.current.position.y = Y[h.qavat] + L.eshik.h + 0.14;
    const rang = h.harakatda ? ranglar.sariq : ranglar.yashil;
    om.liftChirogi.color.copy(rang);
    om.liftChirogi.emissive.copy(rang);
  });
  const ex = (L.eshik.x0 + L.eshik.x1) / 2;
  return (
    <>
      <group ref={kabina} position={[K.x, Y[0], K.z]}>
        <StatikGuruh>
          <Quti o={[K.eni, 0.1, K.chuqurlik]} p={[0, -0.05, 0]} mat={om.liftRom} />
          <Quti o={[K.eni - 0.04, 0.012, K.chuqurlik - 0.04]} p={[0, 0.006, 0]} mat={om.granit} />
          <Quti o={[K.eni, 0.12, K.chuqurlik]} p={[0, K.balandlik + 0.06, 0]} mat={om.mullion} />
          <Oyna o={[K.eni - 0.3, 0.02, K.chuqurlik - 0.3]} p={[0, K.balandlik - 0.01, 0]} mat={om.ledPanel} />
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
            <Quti key={`${sx}${sz}`} o={[0.06, K.balandlik, 0.06]} p={[(sx * (K.eni - 0.06)) / 2, K.balandlik / 2, (sz * (K.chuqurlik - 0.06)) / 2]} mat={om.liftRom} />
          ))}
          <Oyna o={[K.eni - 0.1, K.balandlik - 0.05, 0.015]} p={[0, K.balandlik / 2, K.chuqurlik / 2 - 0.02]} mat={om.liftOyna} />
          <Oyna o={[0.015, K.balandlik - 0.05, K.chuqurlik - 0.1]} p={[-K.eni / 2 + 0.02, K.balandlik / 2, 0]} mat={om.liftOyna} />
          <Oyna o={[0.015, K.balandlik - 0.05, K.chuqurlik - 0.1]} p={[K.eni / 2 - 0.02, K.balandlik / 2, 0]} mat={om.liftOyna} />
          <Quti o={[K.eni - 0.16, 0.04, 0.04]} p={[0, 0.95, K.chuqurlik / 2 - 0.08]} mat={om.perila} />
          <Quti o={[0.04, 0.04, K.chuqurlik - 0.2]} p={[-K.eni / 2 + 0.08, 0.95, 0]} mat={om.perila} />
          <Quti o={[0.04, 0.04, K.chuqurlik - 0.2]} p={[K.eni / 2 - 0.08, 0.95, 0]} mat={om.perila} />
          {/* Eshik tomoni (−z): yon panellar va eshik ustidagi tokcha */}
          {[-1, 1].map((s) => (
            <Quti key={s} o={[(K.eni - eshikEni) / 2, K.balandlik, 0.04]} p={[(s * (K.eni + eshikEni)) / 4, K.balandlik / 2, orqaZ + 0.02]} mat={om.liftRom} />
          ))}
          <Quti o={[eshikEni, K.balandlik - 2.2, 0.04]} p={[0, 2.2 + (K.balandlik - 2.2) / 2, orqaZ + 0.02]} mat={om.liftRom} />
        </StatikGuruh>
        <mesh ref={chap} position={[-eshikEni / 4, 1.1, orqaZ + 0.05]} material={om.lift} castShadow>
          <boxGeometry args={[eshikEni / 2, 2.2, 0.03]} />
        </mesh>
        <mesh ref={ong} position={[eshikEni / 4, 1.1, orqaZ + 0.05]} material={om.lift} castShadow>
          <boxGeometry args={[eshikEni / 2, 2.2, 0.03]} />
        </mesh>
        <mesh position={[0, 2.32, orqaZ - 0.005]} material={om.liftChirogi}>
          <boxGeometry args={[0.2, 0.06, 0.02]} />
        </mesh>
      </group>
      <mesh ref={yuk} position={[L.x1 - 0.16, Y[YUQORI], K.z + 0.5]} material={om.korpus} castShadow>
        <boxGeometry args={[0.14, 1.2, 0.4]} />
      </mesh>
      <mesh ref={tros} position={[K.x, L.tepasi - 1, K.z]} material={om.korpus}>
        <boxGeometry args={[0.025, 1, 0.025]} />
      </mesh>
      <mesh ref={belgi} position={[ex, Y[0] + L.eshik.h + 0.14, OLD_Z + 0.18]} material={om.liftChirogi}>
        <boxGeometry args={[0.16, 0.06, 0.02]} />
      </mesh>
    </>
  );
}

/** Harakatlanuvchi kichik qismlar: o'yin ekrani (siljiydigan tekstura), yugurish lentasi, stol tennisi to'plari. */
function Jonlantirish({ om }: { om: OfisMateriallari }) {
  const toplar = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const ekran = om.oyinEkrani.map;
    if (ekran) ekran.offset.y = (t * 0.45) % 1;
    om.oyinEkrani.emissiveIntensity = 0.95 + 0.12 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
    const lenta = om.lenta.map;
    if (lenta) lenta.offset.x = (t * 0.9) % 1;
    TENNIS_STOLLARI.forEach((s, i) => {
      const top = toplar.current[i];
      if (!top) return;
      const [dx, y, dz] = tennisTopi(t, i * 0.37);
      top.position.set(s.x + dx, s.y + y, s.z + dz);
    });
  });
  return (
    <>
      <EkranYuzasi e={OYIN_EKRANI} mat={om.oyinEkrani} />
      {OFIS_TOSIQLARI.filter((t) => t.nom.startsWith("yugurish")).map((t) => (
        <mesh key={t.nom} position={[(t.x0 + t.x1) / 2 - 0.12, t.y + LENTA_BALANDLIGI - 0.01, (t.z0 + t.z1) / 2]} material={om.lenta} receiveShadow>
          <boxGeometry args={[t.x1 - t.x0 - 0.5, 0.02, t.z1 - t.z0 - 0.3]} />
        </mesh>
      ))}
      {TENNIS_STOLLARI.map((s, i) => (
        <mesh key={i} ref={(el) => { toplar.current[i] = el; }} position={[s.x, s.y + 1, s.z]} material={om.tennisTopi} castShadow>
          <sphereGeometry args={[0.02, 10, 8]} />
        </mesh>
      ))}
    </>
  );
}

/** Ma'muriy bino (ofis): sakkiz qavat, shisha fasad, panorama lift, tomsiz yuqori qavat, ichida mebel va xodimlar; oldida direktor avtomobili. */
export default function Ofis({ m }: { m: Materiallar }) {
  const om = useMemo(() => ofisMateriallariYarat(), []);
  useEffect(() => () => materiallarniTozala(om), [om]);
  return (
    <group>
      <StatikGuruh>
        <Plitalar om={om} />
        <PardaDevor om={om} m={m} />
        <PanelDevorlar om={om} />
        <TomPanjarasi om={om} />
        <Yadro om={om} />
        <IchkiDevorlar om={om} />
        {OFIS_TOSIQLARI.map((t, i) => <TosiqJihozi key={i} t={t} om={om} m={m} />)}
        <SportJihozlari om={om} y={Y[4]} />
        <QavatJihozlari om={om} m={m} />
        {TAQDIMOT_EKRANLARI.map((e, i) => <EkranYuzasi key={i} e={e} mat={om.taqdimot} />)}
        <LiftShaxtasi om={om} />
      </StatikGuruh>
      <LiftKabinasi om={om} />
      <Jonlantirish om={om} />
      <Suspense fallback={null}>
        <MebelToplami joylar={OFIS_MEBELLARI} />
      </Suspense>
      <Suspense fallback={null}>
        {OFIS_ODAMLARI.map((o, i) => (
          <GlbOdam key={i} tur={o.tur} harakat={o.harakat} p={o.p} burilish={o.burilish} faza={o.faza} orindiq={o.orindiq} />
        ))}
        {OFIS_YURUVCHILARI.map((y, i) => (
          <YuruvchiGlbOdam key={`y${i}`} tur={y.tur} nuqtalar={y.nuqtalar} y={y.y} tezlik={y.tezlik} toxtash={y.toxtash} toxtashHarakati={y.toxtashHarakati} faza={y.faza} />
        ))}
      </Suspense>
      <DirektorMashinasi />
    </group>
  );
}
