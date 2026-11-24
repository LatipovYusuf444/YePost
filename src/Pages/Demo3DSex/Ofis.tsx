import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { OFIS } from "./hudud";
import type { Materiallar } from "./materiallar";
import { GlbOdam, YuruvchiGlbOdam } from "./Odamlar";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import {
  DEVOR_BALANDLIGI,
  DIREKTOR_STOLI,
  LIFT,
  MAJLIS_STOLI,
  MEBEL_TURLARI,
  MEBEL_URLLARI,
  OFIS_ESHIGI,
  OFIS_ICHI,
  OFIS_MEBELLARI,
  OFIS_ODAMLARI,
  OFIS_POLLARI,
  OFIS_STOL_GURUHLARI,
  OFIS_TEPASI,
  OFIS_TOSIQLARI,
  OFIS_YURUVCHILARI,
  PLITA,
  PODIUM,
  QABUL_PESHTAXTASI,
  STOL,
  TAQDIMOT_EKRANI,
  YADRO,
  YADRO_ESHIKLARI,
  ZINA,
  devorBolaklari,
  materiallarniTozala,
  mebelGeometriyalari,
  ofisMateriallariYarat,
  olchamliQutiGeometriyasi,
  pardozMateriallari,
  type MebelJoyi,
  type MebelTuri,
  type OfisMateriallari,
} from "./mebelModellari";

// Ma'muriy bino (3 qavat, 20 × 16 m): old va o'ng tomoni — shisha parda-devor (ichi ko'rinadi), chap va orqasi — kompozit panel
// va lenta derazalar. Yuqori qavat tomsiz (yuqoridan "qo'g'irchoq uyi" kabi ko'rinadi): direktor kabineti, qabulxona, majlislar zali.
// 1-qavat — ochiq ofis, 0-qavat — vestibyul. Qimirlamaydigan qismlar StatikGuruh da material bo'yicha birlashadi; GLB mebel
// pardoz bo'yicha ≈ 10 ta geometriyaga birlashadi; odamlar — Odamlar.tsx (har biri 1 draw call).

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

const [Y0, Y1, Y2] = OFIS_POLLARI;
const QAVATLAR = [Y0, Y1, Y2];
const H = DEVOR_BALANDLIGI;
const ESHIK_H = 2.2;
/** Fasad tekisligi: old shisha z, o'ng shisha x. */
const OLD_Z = OFIS.z1 - 0.05;
const ONG_X = OFIS.x1 + 0.05;
const OX = (OFIS.x0 + OFIS.x1) / 2;
const OZ = (OFIS.z0 + OFIS.z1) / 2;
const ENI = OFIS.x1 - OFIS.x0;
const CHUQ = OFIS.z1 - OFIS.z0;
/** Soyabon tortqichi: silindr o'qi (0, 1, 0) → fasaddagi nuqtadan soyabon chetiga yo'nalish. */
const TORTQICH = (() => {
  const a = [4.4, OFIS.z1 + 0.05] as const;
  const b = [3.14, OFIS.z1 + 2.65] as const;
  const dy = b[0] - a[0];
  const dz = b[1] - a[1];
  return { uzunlik: Math.hypot(dy, dz), y: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, burchak: Math.atan2(dz, dy) };
})();

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
    // Tik profillar ~1.2 m da
    const n = Math.max(1, Math.round(L / 1.2));
    for (let k = 0; k <= n; k++) {
      const s = joy(o, c, b.a0 + (L * k) / n, y + (b.y0 + b.y1) / 2, 0.045, 0.06, b.y1 - b.y0);
      qismlar.push(<Quti key={`s${i}-${k}`} o={s.o} p={s.p} mat={om.alyumin} />);
    }
  });
  const ust = joy(o, c, (a0 + a1) / 2, y + H - 0.03, a1 - a0, 0.07, 0.06);
  qismlar.push(<Quti key="ust" o={ust.o} p={ust.p} mat={om.alyumin} />);
  // Eshik: rom va yarim ochiq shisha tabaqa
  eshiklar.forEach(([e0, e1], i) => {
    const r = joy(o, c, (e0 + e1) / 2, y + ESHIK_H + 0.03, e1 - e0 + 0.1, 0.07, 0.06);
    qismlar.push(<Quti key={`r${i}`} o={r.o} p={r.p} mat={om.eshikRomi} />);
    const tabaqa = joy(o, c + 0.04, e0 + 0.22, y + ESHIK_H / 2, 0.42, 0.012, ESHIK_H - 0.04);
    qismlar.push(<Oyna key={`e${i}`} o={tabaqa.o} p={tabaqa.p} mat={om.ichkiOyna} />);
    const dastak = joy(o, c + 0.06, e0 + 0.4, y + 1.05, 0.03, 0.03, 0.5);
    qismlar.push(<Quti key={`d${i}`} o={dastak.o} p={dastak.p} mat={om.perila} />);
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

/** Plitalar (har qavat), pol qoplamalari, shift yorug'lik panellari. Zina teshigi plitada qoldiriladi. */
function Plitalar({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  // 0-qavat: poydevor plitasi va granit
  qismlar.push(<Quti key="p0" o={[ENI, 0.16, CHUQ]} p={[OX, -0.04, OZ]} mat={om.plita} />);
  qismlar.push(<Quti key="sokol" o={[ENI + 0.1, 0.17, CHUQ + 0.1]} p={[OX, -0.035, OZ]} mat={om.sokol} />);
  const ichEni = OFIS_ICHI.x1 - OFIS_ICHI.x0 + 0.1;
  const ichChuq = OFIS_ICHI.z1 - OFIS_ICHI.z0 + 0.1;
  const ichX = (OFIS_ICHI.x0 + OFIS_ICHI.x1 + 0.1) / 2;
  const ichZ = (OFIS_ICHI.z0 + OFIS_ICHI.z1 + 0.1) / 2;
  qismlar.push(<OlchamliQuti key="g0" o={[ichEni, 0.012, ichChuq]} p={[ichX, Y0 - 0.006, ichZ]} mat={om.granit} tile={1.6} />);
  // Yuqori plitalar: asosiy qism + zina teshigi yonidagi bo'lak
  [Y1, Y2].forEach((y, k) => {
    const pastki = y - PLITA;
    const asosEni = OFIS.x1 - ZINA.x1;
    qismlar.push(<Quti key={`pa${k}`} o={[asosEni, PLITA - 0.012, CHUQ]} p={[ZINA.x1 + asosEni / 2, pastki + (PLITA - 0.012) / 2, OZ]} mat={om.plita} />);
    const bolakEni = ZINA.x1 - OFIS.x0;
    const bolakChuq = OFIS.z1 - ZINA.marshBoshi;
    qismlar.push(<Quti key={`pb${k}`} o={[bolakEni, PLITA - 0.012, bolakChuq]} p={[OFIS.x0 + bolakEni / 2, pastki + (PLITA - 0.012) / 2, ZINA.marshBoshi + bolakChuq / 2]} mat={om.plita} />);
    // Qoplamalar: 1-qavat — kovrolin; 2-qavat — kabinetlarda parket, majlis/kofe — kovrolin; zina maydonchasi — tosh
    const qy = y - 0.006;
    const x0 = ZINA.x1;
    const x1 = OFIS_ICHI.x1 + 0.1;
    const z1 = OFIS_ICHI.z1 + 0.1;
    const parket = k === 1;
    const orqa = parket ? 33 : z1;
    qismlar.push(<OlchamliQuti key={`qa${k}`} o={[x1 - x0, 0.012, orqa - OFIS_ICHI.z0]} p={[(x0 + x1) / 2, qy, (OFIS_ICHI.z0 + orqa) / 2]} mat={om.kovrolin} tile={2} />);
    if (parket) qismlar.push(<OlchamliQuti key={`qp${k}`} o={[x1 - x0, 0.012, z1 - 33]} p={[(x0 + x1) / 2, qy, (33 + z1) / 2]} mat={om.parket} tile={2} />);
    qismlar.push(<OlchamliQuti key={`qz${k}`} o={[x0 - OFIS_ICHI.x0, 0.012, 33 - ZINA.marshBoshi]} p={[(OFIS_ICHI.x0 + x0) / 2, qy, (ZINA.marshBoshi + 33) / 2]} mat={om.zina} />);
    qismlar.push(<OlchamliQuti key={`qb${k}`} o={[x0 - OFIS_ICHI.x0, 0.012, z1 - 33]} p={[(OFIS_ICHI.x0 + x0) / 2, qy, (33 + z1) / 2]} mat={parket ? om.parket : om.kovrolin} tile={2} />);
    // Pastki qavat shiftidagi LED panellar (zina va lift ustida yo'q)
    for (let x = -56.4; x < OFIS.x1 - 0.5; x += 2.4) {
      for (let z = 27.4; z < OFIS.z1 - 0.5; z += 2.4) {
        if (x < YADRO.x1 + 0.4 && z < YADRO.z1 + 0.4) continue;
        qismlar.push(<Oyna key={`l${k}-${x.toFixed(1)}-${z.toFixed(1)}`} o={[0.6, 0.02, 0.6]} p={[x, pastki - 0.011, z]} mat={om.ledPanel} />);
      }
    }
  });
  return <>{qismlar}</>;
}

/** Old va o'ng shisha parda-devor: shisha, tik va yotiq profillar, qavatlararo panel (spandrel), tepa qoplama, kirish eshigi. */
function PardaDevor({ om }: { om: OfisMateriallari }) {
  const qismlar: ReactNode[] = [];
  const tepasi = OFIS_TEPASI;
  // Shisha (har qavat): pol plitasidan yuqori spandrel ostigacha
  QAVATLAR.forEach((y, k) => {
    const past = k === 0 ? y : y + 0.1;
    const yuqori = k < QAVATLAR.length - 1 ? QAVATLAR[k + 1] - 0.45 : tepasi;
    const h = yuqori - past;
    const cy = (past + yuqori) / 2;
    if (k === 0) {
      // Old: eshik ochig'i, ustida fragmuga
      const chapEni = OFIS_ESHIGI.x0 - OFIS.x0;
      const ongEni = OFIS.x1 - OFIS_ESHIGI.x1;
      qismlar.push(<Oyna key="o0a" o={[chapEni, h, 0.02]} p={[OFIS.x0 + chapEni / 2, cy, OLD_Z]} mat={om.fasadOyna} />);
      qismlar.push(<Oyna key="o0b" o={[ongEni, h, 0.02]} p={[OFIS_ESHIGI.x1 + ongEni / 2, cy, OLD_Z]} mat={om.fasadOyna} />);
      const fh = yuqori - (Y0 + OFIS_ESHIGI.h);
      qismlar.push(<Oyna key="o0c" o={[OFIS_ESHIGI.x1 - OFIS_ESHIGI.x0, fh, 0.02]} p={[OFIS.eshik[0], yuqori - fh / 2, OLD_Z]} mat={om.fasadOyna} />);
    } else {
      qismlar.push(<Oyna key={`o${k}`} o={[ENI, h, 0.02]} p={[OX, cy, OLD_Z]} mat={om.fasadOyna} />);
    }
    qismlar.push(<Oyna key={`r${k}`} o={[0.02, h, CHUQ]} p={[ONG_X, cy, OZ]} mat={om.fasadOyna} />);
    // Yotiq profil (eshik balandligida) va pastki profil
    const ty = y + 2.75;
    qismlar.push(<Quti key={`to${k}`} o={[ENI, 0.06, 0.14]} p={[OX, ty, OLD_Z + 0.02]} mat={om.alyumin} />);
    qismlar.push(<Quti key={`tr${k}`} o={[0.14, 0.06, CHUQ]} p={[ONG_X - 0.02, ty, OZ]} mat={om.alyumin} />);
    if (k > 0) {
      // Qavatlararo spandrel (plita qirrasini yopadi)
      qismlar.push(<Quti key={`so${k}`} o={[ENI + 0.12, 0.55, 0.1]} p={[OX, y - 0.175, OFIS.z1 + 0.03]} mat={om.spandrel} />);
      qismlar.push(<Quti key={`sr${k}`} o={[0.1, 0.55, CHUQ + 0.12]} p={[OFIS.x1 + 0.03, y - 0.175, OZ]} mat={om.spandrel} />);
    }
  });
  // Tik profillar (old: 1.25 m, o'ng: 1.33 m); eshik o'rtasidagisi fragmugadan boshlanadi
  const tikH = tepasi - Y0;
  for (let i = 0; i <= 16; i++) {
    const x = OFIS.x0 + i * 1.25;
    const ichida = x > OFIS_ESHIGI.x0 + 0.1 && x < OFIS_ESHIGI.x1 - 0.1;
    const past = ichida ? Y0 + OFIS_ESHIGI.h : Y0;
    qismlar.push(<Quti key={`mo${i}`} o={[0.06, tepasi - past, 0.18]} p={[x, (past + tepasi) / 2, OLD_Z + 0.03]} mat={om.alyumin} />);
  }
  for (let i = 0; i <= 12; i++) {
    const z = OFIS.z0 + (i * CHUQ) / 12;
    qismlar.push(<Quti key={`mr${i}`} o={[0.18, tikH, 0.06]} p={[ONG_X + 0.03, Y0 + tikH / 2, z]} mat={om.alyumin} />);
  }
  // Burchak ustuni va tepa qoplama (tomsiz qavatning yuqori qirrasi)
  qismlar.push(<Quti key="burchak" o={[0.22, tikH + 0.25, 0.22]} p={[OFIS.x1, Y0 + (tikH + 0.25) / 2, OFIS.z1]} mat={om.spandrel} />);
  qismlar.push(<Quti key="tepaO" o={[ENI + 0.12, 0.25, 0.22]} p={[OX, tepasi + 0.125, OFIS.z1 - 0.02]} mat={om.spandrel} />);
  qismlar.push(<Quti key="tepaR" o={[0.22, 0.25, CHUQ + 0.12]} p={[OFIS.x1 - 0.02, tepasi + 0.125, OZ]} mat={om.spandrel} />);
  // Kirish: avtomatik surma eshik (yarim ochiq), rom, ustida soyabon va yoritilgan nom
  const ex = OFIS.eshik[0];
  const eh = OFIS_ESHIGI.h;
  qismlar.push(<Quti key="eRom" o={[OFIS_ESHIGI.x1 - OFIS_ESHIGI.x0 + 0.1, 0.12, 0.2]} p={[ex, Y0 + eh, OLD_Z + 0.03]} mat={om.eshikRomi} />);
  for (const [k, x] of [["a", ex - 0.95], ["b", ex + 0.95]] as const) {
    qismlar.push(<Oyna key={`tab${k}`} o={[0.7, eh - 0.05, 0.02]} p={[x, Y0 + (eh - 0.05) / 2, OLD_Z + 0.14]} mat={om.ichkiOyna} />);
    qismlar.push(<Quti key={`tabR${k}`} o={[0.7, 0.05, 0.05]} p={[x, Y0 + 0.03, OLD_Z + 0.14]} mat={om.eshikRomi} />);
    qismlar.push(<Quti key={`tabT${k}`} o={[0.04, eh - 0.1, 0.05]} p={[x + (x < ex ? 0.33 : -0.33), Y0 + eh / 2, OLD_Z + 0.14]} mat={om.eshikRomi} />);
  }
  qismlar.push(<Quti key="soyabon" o={[5.2, 0.18, 2.8]} p={[ex, 3.05, OFIS.z1 + 1.4]} mat={om.spandrel} />);
  for (const x of [ex - 2.2, ex - 0.75, ex + 0.75, ex + 2.2]) qismlar.push(<Oyna key={`sl${x}`} o={[0.5, 0.02, 0.5]} p={[x, 2.95, OFIS.z1 + 1.5]} mat={om.ledPanel} />);
  qismlar.push(<Oyna key="nom" o={[3.4, 0.42, 0.02]} p={[ex, Y1 - 0.18, OFIS.z1 + 0.09]} mat={om.logotip} />);
  // Kirish oldidagi gilamcha (ichkarida)
  qismlar.push(<Quti key="gilamcha" o={[2.4, 0.012, 1.4]} p={[ex, Y0 + 0.006, OFIS.z1 - 0.9]} mat={om.sokol} />);
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
    const teshiklar = QAVATLAR.flatMap((y) => d.derazalar.map(([a0, a1]) => ({ a0, a1, y0: y + 0.9, y1: y + 2.75 })));
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
    const ust = joy(d.o, d.c, (d.a0 + d.a1) / 2, OFIS_TEPASI + 0.06, d.a1 - d.a0 + 0.1, 0.34, 0.12);
    qismlar.push(<Quti key={`u${di}`} o={ust.o} p={ust.p} mat={om.alyumin} />);
  });
  return <>{qismlar}</>;
}

/** Zina-lift yadrosi: devorlar, ikki marshli zina (pog'onalar, qiya plita, panjara), lift shaxtasi va eshiklari. */
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
  QAVATLAR.forEach((y, k) => {
    // Yadro devorlari (har qavat)
    qismlar.push(<Devor key={`dz${k}`} o="z" c={YADRO.z1} a0={YADRO.x0} a1={YADRO.x1 + 0.06} y={y} eshiklar={YADRO_ESHIKLARI} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`dx${k}`} o="x" c={YADRO.x1} a0={YADRO.z0} a1={YADRO.z1 - 0.06} y={y} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`dl${k}`} o="x" c={ZINA.x1} a0={ZINA.z0} a1={ZINA.marshBoshi} y={y} mat={om.yadroDevor} om={om} />);
    qismlar.push(<Devor key={`ds${k}`} o="z" c={LIFT.z1} a0={LIFT.x0 + 0.06} a1={LIFT.x1 - 0.06} y={y} eshiklar={[LIFT.eshik]} mat={om.yadroDevor} om={om} />);
    // Lift eshigi (yopiq, ikki tabaqa) va chaqiruv tugmasi
    const lx = (LIFT.eshik[0] + LIFT.eshik[1]) / 2;
    const le = LIFT.eshik[1] - LIFT.eshik[0];
    qismlar.push(<Quti key={`le${k}`} o={[le / 2 - 0.005, 2.1, 0.03]} p={[lx - le / 4, y + 1.05, LIFT.z1 + 0.03]} mat={om.lift} />);
    qismlar.push(<Quti key={`lf${k}`} o={[le / 2 - 0.005, 2.1, 0.03]} p={[lx + le / 4, y + 1.05, LIFT.z1 + 0.03]} mat={om.lift} />);
    qismlar.push(<Quti key={`lr${k}`} o={[le + 0.2, 2.25, 0.02]} p={[lx, y + 1.12, LIFT.z1 + 0.065]} mat={om.eshikRomi} />);
    qismlar.push(<Oyna key={`lt${k}`} o={[0.08, 0.16, 0.02]} p={[LIFT.eshik[1] + 0.25, y + 1.1, LIFT.z1 + 0.07]} mat={om.ledPanel} />);
    if (k === QAVATLAR.length - 1) {
      // Shaxta qopqog'i (tomsiz qavatda lift mashinasi ustida)
      qismlar.push(<Quti key="shaxta" o={[LIFT.x1 - LIFT.x0 + 0.12, 0.2, LIFT.z1 - LIFT.z0 + 0.12]} p={[(LIFT.x0 + LIFT.x1) / 2, OFIS_TEPASI + 0.1, (LIFT.z0 + LIFT.z1) / 2]} mat={om.plita} />);
      // Yuqori qavatda zina teshigi chetidagi to'siq (shisha + poruchen)
      const tx = (ZINA.x0 + ZINA.chap[1] + 0.08) / 2;
      const te = ZINA.chap[1] + 0.08 - ZINA.x0;
      qismlar.push(<Oyna key="tos" o={[te, 0.95, 0.015]} p={[tx, y + 0.5, ZINA.marshBoshi]} mat={om.ichkiOyna} />);
      qismlar.push(<Quti key="tosP" o={[te, 0.05, 0.06]} p={[tx, y + 1.0, ZINA.marshBoshi]} mat={om.perila} />);
      return;
    }
    // Chap marsh: qavat maydonchasidan orqaga (−z) oraliq maydonchaga
    for (let i = 0; i < ZINA.pogona - 1; i++) {
      const tepa = y + (i + 1) * r;
      qismlar.push(<Quti key={`a${k}-${i}`} o={[chapEni, r + 0.08, t]} p={[chapX, tepa - (r + 0.08) / 2, ZINA.marshBoshi - (i + 0.5) * t]} mat={om.zina} />);
    }
    // Oraliq maydoncha
    const oy = y + OFIS.qavatBalandligi / 2;
    qismlar.push(<Quti key={`m${k}`} o={[ZINA.x1 - ZINA.x0, 0.2, ZINA.oraliq - ZINA.z0]} p={[(ZINA.x0 + ZINA.x1) / 2, oy - 0.1, (ZINA.z0 + ZINA.oraliq) / 2]} mat={om.zina} />);
    // O'ng marsh: oraliqdan oldinga (+z) keyingi qavatga
    for (let j = 0; j < ZINA.pogona - 1; j++) {
      const tepa = oy + (j + 1) * r;
      qismlar.push(<Quti key={`b${k}-${j}`} o={[ongEni, r + 0.08, t]} p={[ongX, tepa - (r + 0.08) / 2, ZINA.oraliq + (j + 0.5) * t]} mat={om.zina} />);
    }
    // Qiya plitalar (marsh osti)
    const markazZ = (ZINA.marshBoshi + ZINA.oraliq) / 2;
    qismlar.push(<Quti key={`qa${k}`} o={[chapEni, 0.14, marshUzunligi]} p={[chapX, y + OFIS.qavatBalandligi / 4 - 0.16, markazZ]} r={[qiyalik, 0, 0]} mat={om.yadroDevor} />);
    qismlar.push(<Quti key={`qb${k}`} o={[ongEni, 0.14, marshUzunligi]} p={[ongX, oy + OFIS.qavatBalandligi / 4 - 0.16, markazZ]} r={[-qiyalik, 0, 0]} mat={om.yadroDevor} />);
    // Marshlar orasidagi panjara: qiya poruchenlar va tik ustunchalar
    for (const [kalit, asos, burchak] of [["a", y, qiyalik], ["b", oy, -qiyalik]] as const) {
      qismlar.push(<Quti key={`pr${kalit}${k}`} o={[0.05, 0.05, marshUzunligi]} p={[panjaraX, asos + OFIS.qavatBalandligi / 4 + 0.95, markazZ]} r={[burchak, 0, 0]} mat={om.perila} />);
      qismlar.push(<Quti key={`pq${kalit}${k}`} o={[0.025, 0.025, marshUzunligi]} p={[panjaraX, asos + OFIS.qavatBalandligi / 4 + 0.5, markazZ]} r={[burchak, 0, 0]} mat={om.perila} />);
      for (let s = 0; s < 5; s++) {
        const z = ZINA.oraliq + 0.2 + (s * (ZINA.marshBoshi - ZINA.oraliq - 0.4)) / 4;
        const ulush = (z - ZINA.oraliq) / (ZINA.marshBoshi - ZINA.oraliq);
        const pogona = asos + (kalit === "a" ? 1 - ulush : ulush) * (OFIS.qavatBalandligi / 2);
        qismlar.push(<Quti key={`ps${kalit}${k}-${s}`} o={[0.035, 0.95, 0.035]} p={[panjaraX, pogona + 0.475, z]} mat={om.perila} />);
      }
    }
  });
  return <>{qismlar}</>;
}

/** 0-qavat: qabulxona peshtaxtasi, logotip devori, yashil devor, ko'rgazma podiumi, orqa xonalar devori. */
function Vestibyul({ om }: { om: OfisMateriallari }) {
  const q = QABUL_PESHTAXTASI;
  const qx = (q.x0 + q.x1) / 2;
  const qe = q.x1 - q.x0;
  const y = Y0;
  return (
    <>
      {/* Peshtaxta: old panel, yong'oq ustki taxta, ichida past ish stoli, LED chiziq */}
      <Quti o={[qe, 1.03, 0.06]} p={[qx, y + 0.515, q.z1 - 0.03]} mat={om.qabul} />
      <Quti o={[0.06, 1.03, q.z1 - q.z0]} p={[q.x0 + 0.03, y + 0.515, (q.z0 + q.z1) / 2]} mat={om.qabul} />
      <Quti o={[0.06, 1.03, q.z1 - q.z0]} p={[q.x1 - 0.03, y + 0.515, (q.z0 + q.z1) / 2]} mat={om.qabul} />
      <Quti o={[qe + 0.1, 0.04, 0.42]} p={[qx, y + 1.06, q.z1 - 0.17]} mat={om.yongoq} />
      <Quti o={[qe - 0.12, 0.03, q.oldZ - q.z0 + 0.12]} p={[qx, y + 0.735, (q.z0 + q.oldZ) / 2 + 0.06]} mat={om.qabul} />
      <Quti o={[qe - 0.12, 0.3, 0.03]} p={[qx, y + 0.2, q.oldZ]} mat={om.sokol} />
      <Oyna o={[qe - 0.1, 0.025, 0.01]} p={[qx, y + 0.98, q.z1 + 0.005]} mat={om.ledPanel} />
      {/* Logotip devori (yong'oq panel) va yoritilgan belgi */}
      <Quti o={[5.6, H - 0.05, 0.05]} p={[-48.0, y + (H - 0.05) / 2, 33.085]} mat={om.yongoqOch} />
      <Oyna o={[3.2, 0.8, 0.02]} p={[-48.0, y + 2.25, 33.12]} mat={om.logotip} />
      {/* Yashil devor */}
      <Quti o={[5.0, 2.9, 0.08]} p={[-42.8, y + 0.2 + 1.45, 33.1]} mat={om.yashilDevor} />
      <Quti o={[5.1, 0.12, 0.2]} p={[-42.8, y + 0.14, 33.16]} mat={om.korpus} />
      {/* Ko'rgazma podiumi */}
      <Quti o={[PODIUM.x1 - PODIUM.x0, PODIUM.h, PODIUM.z1 - PODIUM.z0]} p={[(PODIUM.x0 + PODIUM.x1) / 2, y + PODIUM.h / 2, (PODIUM.z0 + PODIUM.z1) / 2]} mat={om.qabul} />
      <Oyna o={[0.01, 0.03, PODIUM.z1 - PODIUM.z0 - 0.1]} p={[PODIUM.x1 + 0.005, y + 0.06, (PODIUM.z0 + PODIUM.z1) / 2]} mat={om.ledPanel} />
      {/* Orqa xonalar: arxiv va xodimlar oshxonasi */}
      <Devor o="z" c={YADRO.z1} a0={YADRO.x1 + 0.06} a1={OFIS_ICHI.x1} y={y} eshiklar={[[-51.9, -51.0], [-39.8, -38.9]]} mat={om.devor} om={om} />
      <Devor o="x" c={-46.0} a0={OFIS_ICHI.z0} a1={YADRO.z1 - 0.06} y={y} mat={om.devor} om={om} />
    </>
  );
}

/** 1-qavat: shisha to'siqlar, stol guruhlari orasidagi akustik to'siqlar, printer, kuler, oq doska. */
function OchiqOfis({ om, m }: { om: OfisMateriallari; m: Materiallar }) {
  const y = Y1;
  const tos = (nom: string) => OFIS_TOSIQLARI.find((t) => t.nom === nom);
  const printer = tos("printer");
  const kuler = tos("kuler");
  const doska = tos("doska");
  return (
    <>
      <ShishaTosiq o="z" c={YADRO.z1} a0={YADRO.x1 + 0.06} a1={OFIS_ICHI.x1} y={y} eshiklar={[[-47.2, -46.2], [-44.2, -43.2]]} om={om} />
      <ShishaTosiq o="x" c={-45.0} a0={OFIS_ICHI.z0} a1={YADRO.z1 - 0.04} y={y} om={om} />
      {OFIS_STOL_GURUHLARI.map(({ bolgich: b }, i) => (
        <group key={i}>
          <Quti o={[b.x1 - b.x0, 0.42, 0.014]} p={[(b.x0 + b.x1) / 2, b.y + STOL.balandlik + 0.21, b.z]} mat={om.bolgich} />
          <Quti o={[b.x1 - b.x0, 0.02, 0.02]} p={[(b.x0 + b.x1) / 2, b.y + STOL.balandlik + 0.43, b.z]} mat={om.alyumin} />
        </group>
      ))}
      {printer && (
        <>
          <Yumaloq o={[printer.x1 - printer.x0, 0.82, printer.z1 - printer.z0]} p={[(printer.x0 + printer.x1) / 2, y + 0.41, (printer.z0 + printer.z1) / 2]} mat={om.oqKorpus} radius={0.03} />
          <Yumaloq o={[printer.x1 - printer.x0 - 0.06, 0.16, printer.z1 - printer.z0 - 0.04]} p={[(printer.x0 + printer.x1) / 2, y + 0.9, (printer.z0 + printer.z1) / 2]} mat={om.korpus} radius={0.02} />
          <Oyna o={[0.18, 0.1, 0.02]} p={[(printer.x0 + printer.x1) / 2 - 0.2, y + 0.92, printer.z1 - 0.01]} mat={om.ledPanel} />
        </>
      )}
      {kuler && (
        <>
          <Quti o={[0.36, 0.95, 0.36]} p={[(kuler.x0 + kuler.x1) / 2, y + 0.475, (kuler.z0 + kuler.z1) / 2]} mat={om.oqKorpus} />
          <Silindr r={0.15} h={0.42} p={[(kuler.x0 + kuler.x1) / 2, y + 1.16, (kuler.z0 + kuler.z1) / 2]} mat={om.fasadOyna} seg={16} />
        </>
      )}
      {doska && (
        <>
          <Quti o={[0.03, 1.2, doska.z1 - doska.z0]} p={[doska.x0 + 0.015, y + 1.5, (doska.z0 + doska.z1) / 2]} mat={om.oqDoska} />
          <Quti o={[0.05, 0.04, doska.z1 - doska.z0]} p={[doska.x0 + 0.04, y + 0.9, (doska.z0 + doska.z1) / 2]} mat={om.alyumin} />
        </>
      )}
      {/* O't o'chirgich (yadro devori yonida) */}
      <Silindr r={0.08} h={0.5} p={[-52.25, y + 0.45, 33.25]} mat={m.qizil} seg={12} />
    </>
  );
}

/** 2-qavat: direktor kabineti, qabulxona, majlislar zali, kofe burchagi (devorlar va kod bilan yasalgan mebel). */
function DirektorQavati({ om, m }: { om: OfisMateriallari; m: Materiallar }) {
  const y = Y2;
  const d = DIREKTOR_STOLI;
  const mz = MAJLIS_STOLI;
  const tos = (nom: string) => OFIS_TOSIQLARI.find((t) => t.nom === nom);
  const kredensa = tos("kredensa");
  const tv = tos("tvTumba");
  const ekran = tos("ekranTumba");
  const bar = tos("barStol");
  return (
    <>
      {/* Devorlar: direktor kabineti (shisha + yong'oq panel), majlislar zali */}
      <ShishaTosiq o="x" c={-47.0} a0={YADRO.z1 + 0.06} a1={38.0} y={y} eshiklar={[[36.2, 37.2]]} om={om} />
      <Devor o="x" c={-47.0} a0={38.0} a1={OFIS_ICHI.z1} y={y} mat={om.yongoq} om={om} />
      <Devor o="z" c={YADRO.z1} a0={-47.06} a1={OFIS_ICHI.x1} y={y} mat={om.yongoq} om={om} />
      <ShishaTosiq o="x" c={-47.0} a0={OFIS_ICHI.z0} a1={YADRO.z1 - 0.06} y={y} eshiklar={[[31.4, 32.4]]} om={om} />
      {/* Direktor stoli: yong'oq, ikki tumba, old panel, teri qoplama, stol chirog'i */}
      <Yumaloq o={[d.eni, 0.05, d.chuqurlik]} p={[d.x, y + d.h - 0.025, d.z]} mat={om.yongoq} radius={0.015} />
      <Quti o={[1.0, 0.004, 0.5]} p={[d.x - 0.1, y + d.h + 0.002, d.z - 0.18]} mat={om.teri} />
      <Quti o={[0.5, d.h - 0.05, d.chuqurlik - 0.08]} p={[d.x - d.eni / 2 + 0.27, y + (d.h - 0.05) / 2, d.z]} mat={om.yongoq} />
      <Quti o={[0.5, d.h - 0.05, d.chuqurlik - 0.08]} p={[d.x + d.eni / 2 - 0.27, y + (d.h - 0.05) / 2, d.z]} mat={om.yongoq} />
      <Quti o={[d.eni - 1.04, 0.5, 0.03]} p={[d.x, y + d.h - 0.3, d.z + d.chuqurlik / 2 - 0.06]} mat={om.yongoqOch} />
      <Silindr r={0.07} h={0.02} p={[d.x + 0.75, y + d.h + 0.01, d.z - 0.25]} mat={om.korpus} seg={16} />
      <Silindr r={0.012} h={0.4} p={[d.x + 0.75, y + d.h + 0.2, d.z - 0.25]} mat={om.perila} seg={8} />
      <Silindr r={0.09} h={0.12} p={[d.x + 0.75, y + d.h + 0.42, d.z - 0.2]} mat={om.korpus} seg={16} />
      {kredensa && (
        <>
          <Quti o={[kredensa.x1 - kredensa.x0, kredensa.h, kredensa.z1 - kredensa.z0]} p={[(kredensa.x0 + kredensa.x1) / 2, y + kredensa.h / 2, (kredensa.z0 + kredensa.z1) / 2]} mat={om.yongoq} />
          {[-0.6, 0, 0.6].map((dx) => <Quti key={dx} o={[0.006, kredensa.h - 0.1, 0.01]} p={[(kredensa.x0 + kredensa.x1) / 2 + dx, y + kredensa.h / 2, kredensa.z1 + 0.003]} mat={om.korpus} />)}
          <Silindr r={0.09} h={0.34} p={[kredensa.x0 + 0.35, y + kredensa.h + 0.17, (kredensa.z0 + kredensa.z1) / 2]} mat={om.qabul} seg={16} />
          <Quti o={[0.32, 0.08, 0.24]} p={[kredensa.x1 - 0.4, y + kredensa.h + 0.04, (kredensa.z0 + kredensa.z1) / 2]} mat={om.yongoqOch} />
        </>
      )}
      {tv && <Quti o={[tv.x1 - tv.x0, tv.h, tv.z1 - tv.z0]} p={[(tv.x0 + tv.x1) / 2, y + tv.h / 2, (tv.z0 + tv.z1) / 2]} mat={om.yongoq} />}
      {/* Majlislar stoli: yong'oq ustki taxta, ikki tumba-oyoq, o'rtada kabel qutisi */}
      <Yumaloq o={[mz.eni, 0.05, mz.chuqurlik]} p={[mz.x, y + mz.h - 0.025, mz.z]} mat={om.yongoqOch} radius={0.02} />
      {[-1.3, 1.3].map((dx) => <Quti key={dx} o={[0.5, mz.h - 0.05, 0.7]} p={[mz.x + dx, y + (mz.h - 0.05) / 2, mz.z]} mat={om.korpus} />)}
      <Quti o={[0.3, 0.006, 0.12]} p={[mz.x, y + mz.h + 0.003, mz.z]} mat={om.korpus} />
      {ekran && <Quti o={[ekran.x1 - ekran.x0, ekran.h, ekran.z1 - ekran.z0]} p={[(ekran.x0 + ekran.x1) / 2, y + ekran.h / 2, (ekran.z0 + ekran.z1) / 2]} mat={om.korpus} />}
      <mesh position={[TAQDIMOT_EKRANI.x, TAQDIMOT_EKRANI.y, TAQDIMOT_EKRANI.z]} rotation={[0, Math.PI / 2, 0]} material={om.taqdimot}>
        <planeGeometry args={[TAQDIMOT_EKRANI.eni, TAQDIMOT_EKRANI.balandlik]} />
      </mesh>
      {/* Kofe burchagi: bar stoli, osma shkaflar */}
      {bar && (
        <>
          <Silindr r={0.4} h={0.04} p={[(bar.x0 + bar.x1) / 2, y + bar.h - 0.02, (bar.z0 + bar.z1) / 2]} mat={om.yongoqOch} seg={28} />
          <Silindr r={0.035} h={bar.h - 0.04} p={[(bar.x0 + bar.x1) / 2, y + (bar.h - 0.04) / 2, (bar.z0 + bar.z1) / 2]} mat={om.perila} seg={10} />
          <Silindr r={0.26} h={0.03} p={[(bar.x0 + bar.x1) / 2, y + 0.015, (bar.z0 + bar.z1) / 2]} mat={om.korpus} seg={24} />
        </>
      )}
      <Quti o={[3.44, 0.7, 0.35]} p={[-50.66, y + 1.85, OFIS_ICHI.z0 + 0.175]} mat={om.oqKorpus} />
      <Quti o={[3.44, 0.6, 0.02]} p={[-50.66, y + 1.2, OFIS_ICHI.z0 + 0.01]} mat={om.qabul} />
      <Silindr r={0.08} h={0.5} p={[-52.3, y + 0.45, 32.6]} mat={m.qizil} seg={12} />
    </>
  );
}

/** Ma'muriy bino (ofis): uch qavat, shisha fasad, tomsiz yuqori qavat, ichida mebel va xodimlar. */
export default function Ofis({ m }: { m: Materiallar }) {
  const om = useMemo(() => ofisMateriallariYarat(), []);
  useEffect(() => () => materiallarniTozala(om), [om]);
  return (
    <group>
      <StatikGuruh>
        <Plitalar om={om} />
        <PardaDevor om={om} />
        <PanelDevorlar om={om} />
        <Yadro om={om} />
        <Vestibyul om={om} />
        <OchiqOfis om={om} m={m} />
        <DirektorQavati om={om} m={m} />
        {/* Soyabon tortqichlari: fasaddan (y 4.4) soyabon old chetiga (y 3.14) */}
        {[OFIS.eshik[0] - 2.3, OFIS.eshik[0] + 2.3].map((x) => (
          <Silindr key={x} r={0.02} h={TORTQICH.uzunlik} p={[x, TORTQICH.y, TORTQICH.z]} rot={[TORTQICH.burchak, 0, 0]} mat={m.polatQora} seg={8} />
        ))}
      </StatikGuruh>
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
    </group>
  );
}
