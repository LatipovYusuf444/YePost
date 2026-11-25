import { Suspense, useEffect, useMemo } from "react";
import { GlbOdam } from "./Odamlar";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { materiallarniTozala } from "./mebelModellari";
import {
  DIREKTOR_MASHINASI,
  HAYDOVCHI,
  MASHINA,
  MASHINA_OYNALARI,
  TURARGOH_BELGISI,
  TURARGOH_JOYI,
  mashinaGeometriyalari,
  mashinaMateriallariYarat,
  type MashinaMateriallari,
} from "./ofisRejasi";

// Direktor avtomobili: kod bilan yasalgan, umumiy ko'rinishdagi hashamatli uzun sedan (hech qanday brend nomi, logotipi yoki
// emblemasi yo'q). Tik turgan baland xrom panjara (nishonsiz), uzun kapot, ikki rang (qora kuzov, shampan-kumush salon va kapot),
// xrom bezaklar, katta g'ildiraklar, qarama-qarshi ochiladigan eshik chiziqlari, faralar. Ofis oldidagi belgilangan joyda
// (DIREKTOR_JOYI) turadi: atrofida bo'yalgan chiziqlar, yerda "DIREKTOR" yozuvi, belgi ustuni; yonida haydovchi kutmoqda.
// Qimirlamaydi — barcha qismlari StatikGuruh da material bo'yicha birlashadi (≈ 14 draw call).

type V3 = [number, number, number];

const P = Math.PI;
const W = MASHINA.eni;
const IZ = MASHINA.iz / 2;

/** G'ildirak: shina, to'q disk, xrom gardish va 8 ta xrom kegay, o'rtada nishonsiz qopqoq. Lokal z — tashqi tomon belgisi. */
function Gildirak({ x, s, mm }: { x: number; s: 1 | -1; mm: MashinaMateriallari }) {
  const r = MASHINA.gRadius;
  const z = s * IZ;
  const tashqi = s * (IZ + 0.13);
  return (
    <>
      <Silindr r={r} h={0.27} p={[x, r, z]} rot={[P / 2, 0, 0]} mat={mm.rezina} seg={28} />
      <Silindr r={0.31} h={0.02} p={[x, r, tashqi]} rot={[P / 2, 0, 0]} mat={mm.disk} seg={28} />
      <Silindr r={0.32} h={0.012} p={[x, r, tashqi + s * 0.006]} rot={[P / 2, 0, 0]} mat={mm.xrom} seg={28} />
      <Silindr r={0.29} h={0.014} p={[x, r, tashqi + s * 0.008]} rot={[P / 2, 0, 0]} mat={mm.disk} seg={28} />
      {[0, 1, 2, 3].map((i) => (
        <Quti key={i} o={[0.04, 0.56, 0.012]} p={[x, r, tashqi + s * 0.016]} r={[0, 0, (i * P) / 4]} mat={mm.xrom} />
      ))}
      <Silindr r={0.075} h={0.02} p={[x, r, tashqi + s * 0.022]} rot={[P / 2, 0, 0]} mat={mm.qoraPlastik} seg={16} />
    </>
  );
}

/** Mashina kuzovi va bezaklari (lokal: x — oldinga, y — yuqoriga, z — eni bo'ylab). */
function Mashina({ mm }: { mm: MashinaMateriallari }) {
  const g = useMemo(() => mashinaGeometriyalari(), []);
  useEffect(
    () => () => {
      g.kuzov.dispose();
      g.salon.dispose();
      g.yonOyna.dispose();
    },
    [g],
  );
  const old = MASHINA.uzunlik / 2;
  const yonZ = W / 2;
  const sz = g.salonYarimEni;
  const oyna = (k: "old" | "orqa") => {
    const o = MASHINA_OYNALARI[k];
    return <Quti o={[o.uzunlik, 0.012, 2 * sz - 0.1]} p={[o.p[0], o.p[1], 0]} r={[0, 0, o.burchak]} mat={mm.oyna} />;
  };
  const yonlar = [-1, 1] as const;
  return (
    <>
      <mesh geometry={g.kuzov} material={mm.kuzov} castShadow receiveShadow />
      <mesh geometry={g.salon} material={mm.shampan} castShadow receiveShadow />
      {/* Shampan rangli kapot qoplamasi va o'rtadagi xrom chiziq */}
      <Quti o={[1.82, 0.012, 1.62]} p={[1.9, 1.124, 0]} r={[0, 0, -0.028]} mat={mm.shampan} />
      <Quti o={[1.84, 0.016, 0.05]} p={[1.9, 1.132, 0]} r={[0, 0, -0.028]} mat={mm.xrom} />
      {oyna("old")}
      {oyna("orqa")}
      {yonlar.map((s) => (
        <group key={s}>
          {/* Yon oyna (salon yonida), B-ustun, oyna ostidagi xrom belbog' */}
          <mesh geometry={g.yonOyna} material={mm.oyna} position={[0, 0, s > 0 ? sz + 0.001 : -sz - 0.013]} />
          <Quti o={[0.07, 0.38, 0.016]} p={[-0.62, 1.31, s * (sz + 0.01)]} mat={mm.qoraPlastik} />
          <Quti o={[2.9, 0.025, 0.016]} p={[-0.55, 1.1, s * (sz + 0.006)]} mat={mm.xrom} />
          {/* Kuzov bo'ylab xrom chiziq, ostonadagi xrom qoplama */}
          <Quti o={[old * 2 - 0.3, 0.018, 0.01]} p={[0.02, 0.99, s * (yonZ + 0.004)]} mat={mm.xrom} />
          <Quti o={[2.4, 0.06, 0.01]} p={[0.07, 0.4, s * (yonZ + 0.004)]} mat={mm.xrom} />
          {/* Eshik chiziqlari: old eshik oldi, ikki eshik tutashgan joy (qarama-qarshi ochiladi), orqa eshik orqasi */}
          <Quti o={[0.008, 0.66, 0.008]} p={[0.92, 0.73, s * (yonZ + 0.002)]} mat={mm.qoraPlastik} />
          <Quti o={[0.008, 0.7, 0.008]} p={[-0.62, 0.74, s * (yonZ + 0.002)]} mat={mm.qoraPlastik} />
          <Quti o={[0.008, 0.56, 0.008]} p={[-1.2, 0.68, s * (yonZ + 0.002)]} mat={mm.qoraPlastik} />
          <Quti o={[0.76, 0.008, 0.008]} p={[-1.58, 0.97, s * (yonZ + 0.002)]} mat={mm.qoraPlastik} />
          {/* Dastaklar (B-ustun yonida) va yon ko'zgu */}
          <Quti o={[0.13, 0.025, 0.02]} p={[-0.43, 0.96, s * (yonZ + 0.01)]} mat={mm.xrom} />
          <Quti o={[0.13, 0.025, 0.02]} p={[-0.81, 0.96, s * (yonZ + 0.01)]} mat={mm.xrom} />
          <Quti o={[0.06, 0.05, 0.12]} p={[0.8, 1.14, s * (sz + 0.06)]} mat={mm.qoraPlastik} />
          <Yumaloq o={[0.2, 0.12, 0.2]} p={[0.78, 1.2, s * (sz + 0.2)]} mat={mm.shampan} radius={0.04} />
          {/* G'ildiraklar */}
          <Gildirak x={MASHINA.oldOq} s={s} mm={mm} />
          <Gildirak x={MASHINA.orqaOq} s={s} mm={mm} />
          {/* Faralar (ingichka, gorizontal), kunduzgi chiroq, orqa chiroqlar (tik) */}
          <Quti o={[0.05, 0.09, 0.36]} p={[old + 0.005, 0.9, s * 0.62]} mat={mm.farOq} />
          <Quti o={[0.06, 0.02, 0.4]} p={[old + 0.005, 0.83, s * 0.62]} mat={mm.xrom} />
          <Quti o={[0.04, 0.05, 0.22]} p={[old, 0.6, s * 0.66]} mat={mm.farOq} />
          <Quti o={[0.05, 0.32, 0.12]} p={[-old - 0.005, 0.8, s * 0.82]} mat={mm.stopQizil} />
          <Silindr r={0.045} h={0.12} p={[-old + 0.06, 0.37, s * 0.5]} rot={[0, 0, P / 2]} mat={mm.xrom} seg={14} />
        </group>
      ))}
      {/* Tik turgan baland xrom panjara (nishonsiz): orqa qorong'i fon, qalin gardish, tik plastinkalar */}
      <Quti o={[0.05, 0.55, 0.6]} p={[old, 0.78, 0]} mat={mm.qoraPlastik} />
      <Quti o={[0.1, 0.06, 0.74]} p={[old + 0.02, 1.08, 0]} mat={mm.xrom} />
      <Quti o={[0.1, 0.05, 0.74]} p={[old + 0.02, 0.48, 0]} mat={mm.xrom} />
      {[-1, 1].map((s) => <Quti key={s} o={[0.1, 0.65, 0.06]} p={[old + 0.02, 0.78, s * 0.34]} mat={mm.xrom} />)}
      {Array.from({ length: 11 }, (_, i) => (
        <Quti key={`pl${i}`} o={[0.04, 0.55, 0.016]} p={[old + 0.03, 0.78, -0.27 + i * 0.054]} mat={mm.xrom} />
      ))}
      {/* Bamperlar: old pastki xrom chiziq, orqa xrom chiziq; tagidagi qorong'i qism */}
      <Quti o={[0.06, 0.045, 1.7]} p={[old - 0.02, 0.42, 0]} mat={mm.xrom} />
      <Quti o={[0.06, 0.04, 1.5]} p={[-old - 0.01, 0.5, 0]} mat={mm.xrom} />
      <Quti o={[old * 2 - 0.6, 0.1, W - 0.3]} p={[0, 0.3, 0]} mat={mm.qoraPlastik} />
    </>
  );
}

/** Belgilangan turargoh joyi: oq chegara chiziqlari, sariq shtrixlangan bosh qismi, yerda yozuv, belgi ustuni va lavhasi. */
function Turargoh({ mm }: { mm: MashinaMateriallari }) {
  const L = TURARGOH_JOYI.uzunlik;
  const E = TURARGOH_JOYI.eni;
  const y = 0.004;
  const chiziq = 0.12;
  return (
    <>
      {[-1, 1].map((s) => <Quti key={s} o={[L, 0.008, chiziq]} p={[0, y, (s * E) / 2]} mat={mm.chiziqOq} />)}
      <Quti o={[chiziq, 0.008, E]} p={[-L / 2, y, 0]} mat={mm.chiziqOq} />
      {/* Bosh qismida sariq ramka va qiya shtrixlar */}
      <Quti o={[0.08, 0.008, E - 0.3]} p={[L / 2 - 0.25, y, 0]} mat={mm.chiziqSariq} />
      {Array.from({ length: 6 }, (_, i) => (
        <Quti key={i} o={[0.07, 0.008, 0.5]} p={[-L / 2 + 0.35, y, -E / 2 + 0.45 + i * 0.4]} r={[0, 0.6, 0]} mat={mm.chiziqSariq} />
      ))}
      <mesh position={[L / 2 - 0.7, y + 0.006, 0]} rotation={[-P / 2, 0, P / 2]} material={mm.yerYozuvi}>
        <planeGeometry args={[2.2, 0.55]} />
      </mesh>
    </>
  );
}

/** Direktor avtomobili, turargohi, belgisi va haydovchi (ofis oldida, DIREKTOR_JOYI da). */
export default function DirektorMashinasi() {
  const mm = useMemo(() => mashinaMateriallariYarat(), []);
  useEffect(() => () => materiallarniTozala(mm), [mm]);
  const d = DIREKTOR_MASHINASI;
  const b = TURARGOH_BELGISI;
  const lavha: V3 = [b.x, b.balandlik - 0.25, b.z + 0.05];
  return (
    <group>
      <StatikGuruh>
        {/* Guruh burilishi burchak − π/2: lokal +x (oldi) burchak = π/2 da dunyo +x ga qaraydi */}
        <group position={[d.x, 0, d.z]} rotation={[0, d.burchak - P / 2, 0]}>
          <Turargoh mm={mm} />
          <Mashina mm={mm} />
        </group>
        <Silindr r={0.04} h={b.balandlik} p={[b.x, b.balandlik / 2, b.z]} mat={mm.ustun} seg={12} />
        <Quti o={[0.5, 0.62, 0.03]} p={lavha} mat={mm.belgi} />
        <Quti o={[0.54, 0.66, 0.02]} p={[lavha[0], lavha[1], lavha[2] - 0.02]} mat={mm.ustun} />
      </StatikGuruh>
      <Suspense fallback={null}>
        <GlbOdam tur={HAYDOVCHI.tur} harakat={HAYDOVCHI.harakat} p={HAYDOVCHI.p} burilish={HAYDOVCHI.burilish} faza={HAYDOVCHI.faza} />
      </Suspense>
    </group>
  );
}
