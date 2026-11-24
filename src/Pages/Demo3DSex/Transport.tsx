import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import type { Materiallar } from "./materiallar";
import { raqamTeksturasi, type ShaharMateriallari } from "./shaharMateriallari";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { Ishchi, PogruzchikModeli } from "./Ishchilar";
import { KPP, RAMPALAR, type RampaRaqami } from "./hudud";
import { MARSHRUTLAR, RAMPA_HOLATI, SHLAGBAUM_VAQTLARI, marshrutHolati, yangiHolat } from "./yollar";
import type { Reys } from "./sexModeli";
import {
  YUK,
  KUTAYOTGAN_MASHINALAR,
  PALET_JOYLARI,
  SHLAGBAUMLAR,
  STRELA,
  eshikOchiqmi,
  yukGeometriyalari,
  kuzovdagiPalet,
  materiallarniTozala,
  orqagaBoshlanishi,
  reysKorinishi,
  shlagbaumOchiqmi,
  strelaBurchagi,
  strelaQadami,
  transportMateriallari,
  yangiReestr,
  type YukKorinishi,
  type ShlagbaumMashinasi,
  type ShlagbaumTavsifi,
  type TransportMateriallari,
  type TransportReestri,
  type YukMashinaIzi,
} from "./avtomobilModellari";
import Avtomobillar, { Avtobus } from "./Avtomobillar";

// Hudud logistikasi: KAMAZ-uslubidagi yuk mashinalari (reys ma'lumotidan; 4 ta rampa), kutish joyidagi mashinalar, rampa pogruzchiklari,
// chap devordagi rolik darvozalar, KPP'dagi ikki shlagbaum (kirish va chiqish) va qorovul, old rampalardagi signalchilar,
// ko'chadagi va turargohdagi yengil avtomobillar (GLB, o'z Suspense'i bilan — yuk mashinalari modelni kutmaydi) hamda xizmat avtobusi.
// Mashina harakati reys bosqichi va `boshlangan` vaqtidan hisoblanadi (yollar.ts marshrutlari).

const otganSoniya = (reys: Reys) => (Date.now() - reys.boshlangan) / 1000;
const silliq = (u: number) => u * u * (3 - 2 * u);
const oraliq = (u: number) => Math.min(1, Math.max(0, u));

/** Ichidagi meshlar soya tashlamaydi (kabinadagi haydovchi, pogruzchik haydovchisi — soyasi ko'rinmaydi, draw call tejaladi). */
function Soyasiz({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => { o.castShadow = false; });
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Harakatlanuvchi guruh ichidagi mayda qismlar material bo'yicha birlashtiriladi (eshik, bort, strela). `yoq` — tashqaridagi
 * StatikGuruh allaqachon birlashtiradi (ichma-ich StatikGuruh yashirin asl meshlarni ikkinchi marta qo'shib yuboradi).
 */
function Birlashgan({ yoq, children }: { yoq?: boolean; children: ReactNode }) {
  return yoq ? <>{children}</> : <StatikGuruh>{children}</StatikGuruh>;
}

// ── Yuk mashinasi modeli ──

type HarakatRefs = {
  oqlar: Array<RefObject<THREE.Mesh | null>>;
  eshikChap: RefObject<THREE.Group | null>;
  eshikOng: RefObject<THREE.Group | null>;
  /** Tentli kuzovning orqa borti (pastga ochiladi). */
  bort: RefObject<THREE.Group | null>;
};

/**
 * KAMAZ-uslubidagi 6×4 yuk mashinasi (umumiy, belgisiz): kabina dvigatel ustida, qiya old oyna, quyosh to'sig'i, tom spoyleri,
 * richaglardagi ko'zgular, zinapoyalar, panjara, chiroqli bamper, yoqilg'i baki, vertikal chiqindi quvuri, havo olgich, loydonlar.
 * Kuzov: furgon (orqa eshiklari ochiladi) yoki tent (pardalar va bort ochiladi). Qimirlamaydigan qismlar — StatikGuruh.
 * `harakat` berilmasa (to'xtab turgan mashina) eshiklar yopiq holda statik qismga qo'shiladi.
 */
function YukMashinaModeli({ m, tm, korinish, raqamMat, harakat, children }: {
  m: Materiallar;
  tm: TransportMateriallari;
  korinish: YukKorinishi;
  raqamMat: THREE.Material;
  harakat?: HarakatRefs;
  children?: ReactNode;
}) {
  const geo = yukGeometriyalari();
  const k = YUK.kabina;
  const W = k.yarimEni;
  const kz = YUK.kuzov;
  const H = kz.balandlik;
  const kuzovZ = (kz.orqa + kz.old) / 2;
  const kuzovUz = kz.old - kz.orqa;
  const kabinaMat = tm.kabina[korinish.kabina];
  const tentMat = tm.tent[korinish.tent];
  const tent = korinish.kuzov === "tent";
  const r = YUK.goldirak.r;
  const bortY = kz.pol;
  const pardaY = kz.pol + 0.55 + (H - 0.6) / 2;

  const eshiklar = (
    <>
      {/* Orqa eshiklar (furgon) yoki tent pardalari: ilgaklari tashqi burchaklarda, 270° ochilib yon devorga yotadi */}
      <group ref={harakat?.eshikChap} position={[YUK.yarimEni + 0.06, tent ? pardaY : kz.pol + H / 2, kz.orqa]}>
        <Birlashgan yoq={!harakat}>
          {tent ? (
            <>
              <Quti o={[1.25, H - 0.62, 0.03]} p={[-0.67, 0, -0.03]} mat={tentMat} />
              <Quti o={[0.04, H - 0.66, 0.04]} p={[-1.24, 0, -0.05]} mat={tm.rama} />
            </>
          ) : (
            <>
              <Quti o={[1.27, H - 0.14, 0.04]} p={[-0.665, 0, -0.03]} mat={tm.furgonOq} />
              {[-0.38, -0.98].map((x) => <Quti key={x} o={[0.035, H - 0.22, 0.035]} p={[x, 0, -0.07]} mat={tm.xrom} />)}
              <Quti o={[0.14, 0.04, 0.05]} p={[-0.38, -0.25, -0.1]} mat={tm.xrom} />
              {[-0.9, 0, 0.9].map((y) => <Quti key={y} o={[0.1, 0.12, 0.05]} p={[-0.04, y, -0.05]} mat={tm.alyumin} />)}
            </>
          )}
        </Birlashgan>
      </group>
      <group ref={harakat?.eshikOng} position={[-YUK.yarimEni - 0.06, tent ? pardaY : kz.pol + H / 2, kz.orqa]}>
        <Birlashgan yoq={!harakat}>
          {tent ? (
            <>
              <Quti o={[1.25, H - 0.62, 0.03]} p={[0.67, 0, -0.03]} mat={tentMat} />
              <Quti o={[0.04, H - 0.66, 0.04]} p={[1.24, 0, -0.05]} mat={tm.rama} />
            </>
          ) : (
            <>
              <Quti o={[1.27, H - 0.14, 0.04]} p={[0.665, 0, -0.03]} mat={tm.furgonOq} />
              {[0.38, 0.98].map((x) => <Quti key={x} o={[0.035, H - 0.22, 0.035]} p={[x, 0, -0.07]} mat={tm.xrom} />)}
              <Quti o={[0.14, 0.04, 0.05]} p={[0.38, -0.25, -0.1]} mat={tm.xrom} />
              {[-0.9, 0, 0.9].map((y) => <Quti key={y} o={[0.1, 0.12, 0.05]} p={[0.04, y, -0.05]} mat={tm.alyumin} />)}
            </>
          )}
        </Birlashgan>
      </group>
      {tent && (
        <group ref={harakat?.bort} position={[0, bortY, kz.orqa]}>
          <Birlashgan yoq={!harakat}>
            <Quti o={[2.46, 0.55, 0.05]} p={[0, 0.275, -0.03]} mat={tm.alyumin} />
            {[0.12, 0.43].map((y) => <Quti key={y} o={[2.47, 0.03, 0.06]} p={[0, y, -0.035]} mat={tm.rama} />)}
            {[-0.9, 0.9].map((x) => <Quti key={x} o={[0.1, 0.06, 0.07]} p={[x, 0.5, -0.04]} mat={tm.xrom} />)}
          </Birlashgan>
        </group>
      )}
    </>
  );

  return (
    <group>
      <StatikGuruh>
        {/* ── Shassi: rama, ko'ndalang to'sinlar, ressorlar, o'qlar, transmissiya ── */}
        {[-0.45, 0.45].map((x) => <Quti key={x} o={[0.09, 0.26, 8.25]} p={[x, 0.95, -0.15]} mat={tm.rama} />)}
        {[-4.1, -2.1, 0, 2.0, 3.8].map((z) => <Quti key={z} o={[0.82, 0.12, 0.1]} p={[0, 0.92, z]} mat={tm.rama} />)}
        {[-0.45, 0.45].map((x) => <Quti key={`o${x}`} o={[0.1, 0.16, 6.0]} p={[x, 1.17, kuzovZ]} mat={tm.rama} />)}
        {[-0.45, 0.45].map((x) => <Quti key={`r${x}`} o={[0.08, 0.1, 2.3]} p={[x, 0.72, -2.11]} mat={tm.rama} />)}
        {[-0.45, 0.45].map((x) => <Quti key={`f${x}`} o={[0.08, 0.1, 1.3]} p={[x, 0.74, YUK.goldirak.oldZ]} mat={tm.rama} />)}
        {YUK.goldirak.orqaZ.map((z) => (
          <group key={z}>
            <Quti o={[1.5, 0.15, 0.15]} p={[0, r, z]} mat={tm.rama} />
            <Silindr r={0.24} h={0.36} p={[0, r, z]} rot={[Math.PI / 2, 0, 0]} mat={tm.rama} seg={16} />
          </group>
        ))}
        <Quti o={[1.7, 0.12, 0.12]} p={[0, r, YUK.goldirak.oldZ]} mat={tm.rama} />
        <Quti o={[0.8, 0.55, 1.6]} p={[0, 0.85, 3.0]} mat={tm.qoraPlastik} />
        <Silindr r={0.05} h={3.6} p={[0, 0.6, 0.35]} rot={[Math.PI / 2, 0, 0]} mat={tm.rama} seg={10} />
        {/* Yoqilg'i baki (chapda), akkumulyator qutisi (o'ngda), havo ballonlari, glushitel */}
        <Silindr r={0.3} h={1.15} p={[0.88, 0.74, 0.75]} rot={[Math.PI / 2, 0, 0]} mat={tm.alyumin} seg={24} />
        {[0.35, 1.15].map((z) => <Silindr key={z} r={0.307} h={0.05} p={[0.88, 0.74, z]} rot={[Math.PI / 2, 0, 0]} mat={tm.rama} seg={24} />)}
        <Silindr r={0.05} h={0.06} p={[0.88, 1.06, 1.1]} mat={tm.rama} seg={12} />
        <Quti o={[0.5, 0.45, 0.7]} p={[-0.92, 0.78, 0.9]} mat={tm.rama} />
        <Quti o={[0.52, 0.04, 0.72]} p={[-0.92, 1.02, 0.9]} mat={tm.qoraPlastik} />
        {[-0.62, 0.62].map((x) => <Silindr key={x} r={0.12} h={0.9} p={[x, 0.62, -0.3]} rot={[Math.PI / 2, 0, 0]} mat={tm.rama} seg={14} />)}
        <Silindr r={0.2} h={0.85} p={[-0.62, 0.72, 1.6]} rot={[0, 0, Math.PI / 2]} mat={tm.alyumin} seg={18} />
        {/* Chiqindi quvuri (kabina orqasida, o'ngda) issiqlik to'sig'i bilan va havo olgich (chapda) */}
        <Silindr r={0.065} h={2.2} p={[-1.02, 2.35, 1.85]} mat={tm.rama} seg={12} />
        <Silindr r={0.085} h={0.9} p={[-1.02, 2.65, 1.85]} mat={tm.xrom} seg={14} />
        <Silindr r={0.065} h={0.22} p={[-1.02, 3.48, 1.9]} rot={[0.5, 0, 0]} mat={tm.rama} seg={12} />
        <Quti o={[0.32, 1.5, 0.15]} p={[0.98, 2.45, 1.86]} mat={tm.qoraPlastik} />
        <Quti o={[0.38, 0.12, 0.17]} p={[0.98, 3.25, 1.86]} mat={tm.qoraPlastik} />
        {/* Qanotlar va loydonlar */}
        {[-1.03, 1.03].map((x) => <mesh key={x} geometry={geo.oldQanot} material={tm.qoraPlastik} position={[x, r, YUK.goldirak.oldZ]} castShadow receiveShadow />)}
        {[-0.95, 0.95].map((x) => <Quti key={`q${x}`} o={[0.66, 0.04, 2.95]} p={[x, 1.12, -2.115]} mat={tm.qoraPlastik} />)}
        {[-1.03, 1.03].map((x) => <Quti key={`l${x}`} o={[0.38, 0.5, 0.02]} p={[x, 0.5, 2.72]} mat={tm.rezina} />)}
        {[-0.95, 0.95].map((x) => <Quti key={`lo${x}`} o={[0.62, 0.55, 0.02]} p={[x, 0.55, -3.45]} mat={tm.rezina} />)}
        {/* Zinapoyalar (old g'ildirak orqasida, eshik ostida) va tutqichlar */}
        {[-1, 1].map((s) => (
          <group key={`z${s}`}>
            <Quti o={[0.05, 0.75, 0.5]} p={[s * 1.16, 0.72, 2.3]} mat={tm.rama} />
            {[0.48, 0.84].map((y) => <Quti key={y} o={[0.26, 0.04, 0.5]} p={[s * 1.08, y, 2.3]} mat={tm.alyumin} />)}
            <Silindr r={0.02} h={0.7} p={[s * (W + 0.03), 1.75, 2.02]} mat={tm.xrom} seg={8} />
          </group>
        ))}
        {/* Yon himoya to'sinlari (o'ngda to'liq, chapda bak orqasida) */}
        {[0.55, 0.8].map((y) => (
          <group key={`h${y}`}>
            <Quti o={[0.04, 0.08, 2.4]} p={[-1.2, y, 0.3]} mat={tm.alyumin} />
            <Quti o={[0.04, 0.08, 0.95]} p={[1.2, y, -0.45]} mat={tm.alyumin} />
          </group>
        ))}
        {/* Orqa: himoya to'sini, chiroqlar, raqam */}
        <Quti o={[2.3, 0.14, 0.12]} p={[0, 0.5, -4.2]} mat={tm.rama} />
        {[-0.45, 0.45].map((x) => <Quti key={`b${x}`} o={[0.08, 0.6, 0.08]} p={[x, 0.8, -4.18]} mat={tm.rama} />)}
        {[-1, 1].map((s) => (
          <group key={`c${s}`}>
            <Quti o={[0.42, 0.2, 0.04]} p={[s * 0.95, 1.02, -4.3]} mat={tm.rama} />
            <Quti o={[0.26, 0.14, 0.03]} p={[s * 0.89, 1.02, -4.33]} mat={tm.orqaChiroq} />
            <Quti o={[0.1, 0.14, 0.03]} p={[s * 1.08, 1.02, -4.33]} mat={tm.sariqChiroq} />
          </group>
        ))}
        <Quti o={[0.56, 0.16, 0.02]} p={[0, 0.98, -4.32]} mat={tm.rama} />
        <mesh position={[0, 0.98, -4.335]} rotation={[0, Math.PI, 0]} material={raqamMat}>
          <planeGeometry args={[0.52, 0.114]} />
        </mesh>
        {[-3.6, -1.9, -0.2, 1.4].map((z) => [-1, 1].map((s) => <Quti key={`m${z}${s}`} o={[0.02, 0.06, 0.1]} p={[s * 1.26, 1.18, z]} mat={tm.sariqChiroq} />))}

        {/* ── Kabina ── */}
        <mesh geometry={geo.kabinaPast} material={kabinaMat} castShadow receiveShadow />
        <Quti o={[W * 2, k.tom - k.bel, 0.06]} p={[0, (k.bel + k.tom) / 2, k.orqa + 0.03]} mat={kabinaMat} />
        {[-1, 1].map((s) => (
          <group key={`k${s}`}>
            {/* Yotoq qismi yon paneli, eshik oynasi, oyna ramkasi, A-ustun */}
            <Quti o={[0.06, k.tom - k.bel, 1.0]} p={[s * (W - 0.03), (k.bel + k.tom) / 2, k.orqa + 0.5]} mat={kabinaMat} />
            <Quti o={[0.03, 0.74, 1.1]} p={[s * (W - 0.02), 2.45, 3.5]} mat={tm.kabinaOyna} />
            <Quti o={[0.06, 0.05, 1.12]} p={[s * (W - 0.03), 2.84, 3.5]} mat={kabinaMat} />
            <Quti o={[0.08, 0.84, 0.09]} p={[s * (W - 0.04), 2.455, 4.12]} r={[-0.245, 0, 0]} mat={kabinaMat} />
            {/* Eshik choklari va tutqichi */}
            {[2.1, 3.98].map((z) => <Quti key={z} o={[0.012, 0.85, 0.015]} p={[s * (W + 0.004), 1.57, z]} mat={tm.qoraPlastik} />)}
            <Quti o={[0.02, 0.04, 0.16]} p={[s * (W + 0.01), 1.95, 3.25]} mat={tm.xrom} />
            {/* Ko'zgular: richag, tik tayanch, asosiy va keng burchakli ko'zgu */}
            <Quti o={[0.34, 0.035, 0.035]} p={[s * (W + 0.15), 2.62, 4.0]} mat={tm.rama} />
            <Quti o={[0.03, 0.72, 0.03]} p={[s * (W + 0.31), 2.33, 4.0]} mat={tm.rama} />
            <Yumaloq o={[0.08, 0.42, 0.2]} p={[s * (W + 0.31), 2.43, 3.91]} mat={tm.qoraPlastik} radius={0.025} />
            <Quti o={[0.065, 0.37, 0.01]} p={[s * (W + 0.31), 2.43, 3.805]} mat={tm.xrom} />
            <Yumaloq o={[0.08, 0.2, 0.18]} p={[s * (W + 0.31), 2.04, 3.92]} mat={tm.qoraPlastik} radius={0.025} />
            <Quti o={[0.065, 0.17, 0.01]} p={[s * (W + 0.31), 2.04, 3.825]} mat={tm.xrom} />
            {/* Old chiroqlar (bamperda): fara, burilish, tuman chirog'i */}
            <Quti o={[0.46, 0.21, 0.02]} p={[s * 0.8, 0.95, 4.306]} mat={tm.xrom} />
            <Quti o={[0.42, 0.17, 0.03]} p={[s * 0.8, 0.95, 4.316]} mat={tm.oldChiroq} />
            <Quti o={[0.12, 0.17, 0.03]} p={[s * 1.1, 0.95, 4.316]} mat={tm.sariqChiroq} />
            <Silindr r={0.065} h={0.04} p={[s * 0.55, 0.72, 4.31]} rot={[Math.PI / 2, 0, 0]} mat={tm.oldChiroq} seg={14} />
            {/* Oyna tozalagich */}
            <Quti o={[0.62, 0.02, 0.02]} p={[s * 0.38, 2.14, 4.235]} r={[-0.245, 0, s * 0.3]} mat={tm.rama} />
          </group>
        ))}
        {/* Old oyna (qiya), uning ostidagi panel, tom, quyosh to'sig'i va gabarit chiroqlari, spoyler */}
        <Quti o={[W * 2 - 0.16, 0.82, 0.02]} p={[0, 2.455, 4.12]} r={[-0.245, 0, 0]} mat={tm.kabinaOyna} />
        <Quti o={[W * 2 - 0.05, 0.05, 0.12]} p={[0, 2.07, 4.2]} mat={tm.qoraPlastik} />
        <mesh geometry={geo.tom} material={kabinaMat} castShadow receiveShadow />
        <Quti o={[W * 2 - 0.04, 0.05, 0.34]} p={[0, 2.94, 4.18]} r={[0.18, 0, 0]} mat={kabinaMat} />
        {[-0.5, 0, 0.5].map((x) => <Quti key={x} o={[0.13, 0.05, 0.05]} p={[x, 3.0, 4.3]} mat={tm.sariqChiroq} />)}
        <mesh geometry={geo.spoyler} material={kabinaMat} castShadow receiveShadow />
        {/* Panjara (radiator) va xrom planka */}
        <Quti o={[1.7, 0.6, 0.04]} p={[0, 1.6, 4.28]} mat={tm.qoraPlastik} />
        {[1.42, 1.58, 1.74].map((y) => <Quti key={y} o={[1.66, 0.035, 0.03]} p={[0, y, 4.3]} mat={tm.xrom} />)}
        {/* Bamper, shatakka olish ilgagi, old raqam */}
        <Yumaloq o={[2.46, 0.5, 0.3]} p={[0, 0.85, 4.15]} mat={tm.qoraPlastik} radius={0.05} />
        <Quti o={[0.12, 0.07, 0.1]} p={[0, 0.63, 4.32]} mat={m.qizil} />
        <mesh position={[0, 0.76, 4.302]} material={raqamMat}>
          <planeGeometry args={[0.52, 0.114]} />
        </mesh>
        {/* Kabina ichi: qoplama (faqat ichidan ko'rinadi), panel, o'rindiqlar suyanchig'i, rul */}
        <Quti o={[2.26, 0.76, 2.05]} p={[0, 2.47, 3.045]} mat={tm.ichki} />
        <Quti o={[2.2, 0.3, 0.4]} p={[0, 2.0, 3.95]} mat={tm.qoraPlastik} />
        {[-0.55, 0.55].map((x) => <Yumaloq key={x} o={[0.5, 0.62, 0.12]} p={[x, 2.3, 2.95]} r={[-0.12, 0, 0]} mat={tm.orindiq} radius={0.05} />)}
        <Silindr r={0.03} h={0.42} p={[0.55, 2.13, 3.86]} rot={[0.6, 0, 0]} mat={tm.qoraPlastik} seg={8} />
        <mesh position={[0.55, 2.3, 3.72]} rotation={[-0.45, 0, 0]} material={tm.qoraPlastik}>
          <torusGeometry args={[0.2, 0.025, 8, 24]} />
        </mesh>

        {/* ── Kuzov ── */}
        <Quti o={[2.5, 0.12, kuzovUz]} p={[0, kz.pol - 0.06, kuzovZ]} mat={tm.rama} />
        <Quti o={[2.36, H - 0.1, kuzovUz - 0.12]} p={[0, kz.pol + (H - 0.1) / 2 + 0.01, kuzovZ]} mat={tm.furgonIchi} />
        {tent ? (
          <>
            {/* Alyumin bortlar, old bort, tent (brezent) yon, tom va old tomoni, orqa ustunlar */}
            {[-1, 1].map((s) => (
              <group key={`t${s}`}>
                <Quti o={[0.05, 0.55, kuzovUz]} p={[s * 1.225, kz.pol + 0.275, kuzovZ]} mat={tm.alyumin} />
                <Quti o={[0.06, 0.03, kuzovUz]} p={[s * 1.23, kz.pol + 0.12, kuzovZ]} mat={tm.rama} />
                <Quti o={[0.04, H - 0.55, kuzovUz]} p={[s * 1.23, kz.pol + 0.55 + (H - 0.55) / 2, kuzovZ]} mat={tentMat} />
                <Quti o={[0.08, H, 0.08]} p={[s * 1.21, kz.pol + H / 2, kz.orqa + 0.04]} mat={tm.alyumin} />
              </group>
            ))}
            <Quti o={[2.5, 0.55, 0.05]} p={[0, kz.pol + 0.275, kz.old - 0.03]} mat={tm.alyumin} />
            <Quti o={[2.5, H - 0.55, 0.04]} p={[0, kz.pol + 0.55 + (H - 0.55) / 2, kz.old - 0.02]} mat={tentMat} />
            <Yumaloq o={[2.52, 0.1, kuzovUz + 0.02]} p={[0, kz.pol + H, kuzovZ]} mat={tentMat} radius={0.045} />
            <Quti o={[2.5, 0.08, 0.08]} p={[0, kz.pol + H - 0.06, kz.orqa + 0.04]} mat={tm.alyumin} />
          </>
        ) : (
          <>
            {/* Furgon: yon devorlar (rasmli), tom, old devor, alyumin burchaklar va reykalar, orqa portal */}
            {[-1, 1].map((s) => (
              <group key={`f${s}`}>
                <Quti o={[0.04, H, kuzovUz - 0.06]} p={[s * 1.23, kz.pol + H / 2, kuzovZ]} mat={tm.furgonYon} />
                <Quti o={[0.06, 0.08, kuzovUz]} p={[s * 1.24, kz.pol + H - 0.03, kuzovZ]} mat={tm.alyumin} />
                <Quti o={[0.06, 0.14, kuzovUz]} p={[s * 1.24, kz.pol + 0.06, kuzovZ]} mat={tm.alyumin} />
                <Quti o={[0.07, H, 0.07]} p={[s * 1.22, kz.pol + H / 2, kz.old - 0.035]} mat={tm.alyumin} />
                <Quti o={[0.1, H, 0.1]} p={[s * 1.2, kz.pol + H / 2, kz.orqa + 0.05]} mat={tm.alyumin} />
              </group>
            ))}
            <Quti o={[2.5, 0.05, kuzovUz]} p={[0, kz.pol + H, kuzovZ]} mat={tm.furgonOq} />
            <Quti o={[2.5, H, 0.05]} p={[0, kz.pol + H / 2, kz.old - 0.025]} mat={tm.furgonOq} />
            <Quti o={[2.5, 0.16, 0.1]} p={[0, kz.pol + H - 0.08, kz.orqa + 0.05]} mat={tm.alyumin} />
            <Quti o={[2.5, 0.1, 0.1]} p={[0, kz.pol + 0.05, kz.orqa + 0.05]} mat={tm.alyumin} />
          </>
        )}
        {!harakat && eshiklar}
      </StatikGuruh>
      {harakat && eshiklar}
      {/* G'ildiraklar: o'q bo'yicha bitta mesh (oldingi — yakka, orqadagi ikkitasi — juft) */}
      {[YUK.goldirak.oldZ, ...YUK.goldirak.orqaZ].map((z, i) => (
        <mesh key={z} ref={harakat?.oqlar[i]} geometry={i === 0 ? geo.oqOld : geo.oqOrqa} material={tm.goldirak} position={[0, r, z]} castShadow receiveShadow />
      ))}
      {children}
    </group>
  );
}

/** Raqam materiali (har mashinaga o'z teksturasi). */
function useRaqamMateriali(raqam: string) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: raqamTeksturasi(raqam), roughness: 0.4 }), [raqam]);
  useEffect(() => () => { mat.map?.dispose(); mat.dispose(); }, [mat]);
  return mat;
}

/** Yuk: paletlar (jo'natishda — plyonkaga o'ralgan qadoqlangan mebel, qabulda — LDSP listlar). Soni o'zgarganda qayta birlashtiriladi. */
function KuzovYuki({ m, soni, jonatish }: { m: Materiallar; soni: number; jonatish: boolean }) {
  return (
    <StatikGuruh kalit={soni}>
      {PALET_JOYLARI.slice(0, soni).map(([x, z], i) => (
        <group key={i} position={[x, YUK.kuzov.pol, z]}>
          <Quti o={[1.0, 0.12, 1.15]} p={[0, 0.06, 0]} mat={m.palet} />
          {jonatish ? (
            <>
              <Quti o={[0.95, 0.95 - (i % 3) * 0.12, 1.1]} p={[0, 0.6 - (i % 3) * 0.06, 0]} mat={m.karton} />
              <Quti o={[0.98, 0.99 - (i % 3) * 0.12, 1.13]} p={[0, 0.6 - (i % 3) * 0.06, 0]} mat={m.plyonka} />
            </>
          ) : (
            Array.from({ length: 10 }, (_, k) => <Quti key={k} o={[0.95, 0.03, 1.1]} p={[0, 0.14 + k * 0.033, 0]} mat={[m.lmdp, m.lmdpOq, m.lmdpYongoq][(k + i) % 3]} />)
          )}
        </group>
      ))}
    </StatikGuruh>
  );
}

// ── Reys yuk mashinasi (harakatlanadi) ──

const OCHIQ_CHAP = -1.5 * Math.PI + 0.05;

function YukMashinasi({ m, tm, reys, reestr, yorliq }: { m: Materiallar; tm: TransportMateriallari; reys: Reys; reestr: TransportReestri; yorliq: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const ildiz = useRef<THREE.Group>(null);
  const oq0 = useRef<THREE.Mesh>(null);
  const oq1 = useRef<THREE.Mesh>(null);
  const oq2 = useRef<THREE.Mesh>(null);
  const eshikChap = useRef<THREE.Group>(null);
  const eshikOng = useRef<THREE.Group>(null);
  const bort = useRef<THREE.Group>(null);
  const harakat = useMemo<HarakatRefs>(() => ({ oqlar: [oq0, oq1, oq2], eshikChap, eshikOng, bort }), []);
  const holat = useMemo(yangiHolat, []);
  const iz = useMemo<YukMashinaIzi>(() => ({ p: holat.p, burchak: 0, rampa: reys.rampa, bosqich: "yoq", t: 0 }), [holat, reys.rampa]);
  const oxirgiMasofa = useRef<number | null>(null);
  const [korinadi, setKorinadi] = useState(false);
  const marshrut = MARSHRUTLAR[reys.rampa];
  const korinish = useMemo(() => reysKorinishi(reys.rampa, reys.yonalish), [reys.rampa, reys.yonalish]);
  const raqamMat = useRaqamMateriali(reys.raqam);
  useEffect(() => () => { reestr.yukMashinalari[reys.id] = null; }, [reestr, reys.id]);

  useFrame((_, dtXom) => {
    const g = ildiz.current;
    if (!g) return;
    const dt = Math.min(0.1, dtXom);
    const e = Math.max(0, otganSoniya(reys));
    let bor = reys.bosqich !== "yoq";
    if (reys.bosqich === "ketmoqda") {
      if (e > marshrut.ketish.davom) bor = false;
      else marshrutHolati(marshrut.ketish, e, holat);
    } else if (bor) {
      marshrutHolati(marshrut.kelish, reys.bosqich === "rampada" ? marshrut.kelish.davom + 1 : e, holat);
    }
    g.visible = bor;
    if (bor) {
      iz.burchak = holat.burchak;
      iz.bosqich = reys.bosqich;
      iz.t = e;
    }
    reestr.yukMashinalari[reys.id] = bor ? iz : null;
    if (bor !== korinadi) setKorinadi(bor);
    if (!bor) { oxirgiMasofa.current = null; return; }
    g.position.copy(holat.p);
    g.rotation.y = holat.burchak;
    const d = oxirgiMasofa.current === null ? 0 : holat.masofa - oxirgiMasofa.current;
    oxirgiMasofa.current = holat.masofa;
    if (Math.abs(d) < 3) {
      const burilish = (holat.orqaga ? -d : d) / YUK.goldirak.r;
      for (const o of harakat.oqlar) if (o.current) o.current.rotation.x += burilish;
    }
    // Orqa eshiklar / tent pardalari va bort: rampaga kirishdan oldin ochiladi, jo'nagach yopiladi.
    const ochiq = eshikOchiqmi(reys.rampa, reys.bosqich, e) ? 1 : 0;
    if (eshikChap.current) eshikChap.current.rotation.y = THREE.MathUtils.damp(eshikChap.current.rotation.y, OCHIQ_CHAP * ochiq, 1.8, dt);
    if (eshikOng.current) eshikOng.current.rotation.y = THREE.MathUtils.damp(eshikOng.current.rotation.y, -OCHIQ_CHAP * ochiq, 1.8, dt);
    if (bort.current) bort.current.rotation.x = THREE.MathUtils.damp(bort.current.rotation.x, -Math.PI * 0.97 * ochiq, 2.2, dt);
  });

  const palet = kuzovdagiPalet(reys);
  const holatMatni = reys.bosqich === "rampada" ? t(`logistics.rampada_${reys.yonalish}`) : t(`logistics.${reys.bosqich}`);
  return (
    <group ref={ildiz} visible={false}>
      <YukMashinaModeli m={m} tm={tm} korinish={korinish} raqamMat={raqamMat} harakat={harakat}>
        <KuzovYuki m={m} soni={palet} jonatish={reys.yonalish === "jonatish"} />
        {/* Haydovchi (chap o'rindiqda) */}
        <Soyasiz>
          <Ishchi mat={m} p={YUK.haydovchi} harakat="rul" ishlayapti turi={reys.rampa} kiyim="haydovchi" />
        </Soyasiz>
      </YukMashinaModeli>
      {yorliq && korinadi && (
        <Html position={[0, 4.9, 0]} center zIndexRange={[15, 5]} style={{ pointerEvents: "none" }}>
          <span data-reys-yorliq={reys.id} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900/85 px-2 py-1 text-[11px] font-bold leading-4 text-white shadow">
            <span className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] font-black text-slate-900">{reys.raqam}</span>
            {holatMatni}
            {reys.bosqich === "rampada" && <span className="text-sky-300">{t("logistics.pallets", { a: reys.palet, b: reys.jamiPalet })}</span>}
          </span>
        </Html>
      )}
    </group>
  );
}

/** Kutish joyidagi yuk mashinasi (haydovchisiz, eshiklar yopiq — hammasi statik). */
function KutayotganMashina({ m, tm, x, z, raqam, korinish }: { m: Materiallar; tm: TransportMateriallari; x: number; z: number; raqam: string; korinish: YukKorinishi }) {
  const raqamMat = useRaqamMateriali(raqam);
  return (
    <group position={[x, 0, z]}>
      <YukMashinaModeli m={m} tm={tm} korinish={korinish} raqamMat={raqamMat} />
    </group>
  );
}

// ── Rampadagi pogruzchik: reys rampada bo'lsa 3 marta borib keladi (har 7.5 s da), paletni kuzov poliga ko'tarib qo'yadi / oladi ──

const POL = YUK.kuzov.pol;
/** Vilka balandligi (PogruzchikModeli: vilka y = 0.12 + balandlik): tashish, kuzov poli ustida (palet polga tegadi) va undan pastroq. */
const VILKA = { past: 0.05, tashish: 0.22, kuzovda: POL - 0.12 - 0.01, ostida: POL - 0.12 - 0.12 } as const;

function RampaPogruzchigi({ m, reys, boshi, oxiri, burilish, yukla }: {
  m: Materiallar;
  reys?: Reys;
  boshi: [number, number];
  oxiri: [number, number];
  burilish: number;
  /** true — paletni mashinaga olib boradi (jo'natish); false — mashinadan olib chiqadi (qabul). */
  yukla: boolean;
}) {
  const ildiz = useRef<THREE.Group>(null);
  const vilka = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  const yuk = useRef<THREE.Group>(null);
  const oldingiU = useRef(0);
  useFrame(() => {
    const e = reys && reys.bosqich === "rampada" ? otganSoniya(reys) - 0.8 : -1;
    const k = Math.floor(e / 7.5);
    const faol = e >= 0 && k < 3;
    const f = faol ? (e % 7.5) / 7.5 : 0;
    let u = 0;
    let b: number = yukla ? VILKA.tashish : VILKA.past;
    let yukBor = yukla;
    if (faol) {
      if (yukla) {
        // Borish (palet bilan, oxirida kuzov poli balandligiga ko'tariladi) → qo'yish → qaytish (vilka pastga) → navbatdagi paletni olish.
        if (f < 0.32) { u = silliq(f / 0.32); b = VILKA.tashish + (VILKA.kuzovda + 0.06 - VILKA.tashish) * silliq(oraliq((f - 0.12) / 0.17)); }
        else if (f < 0.42) { u = 1; b = VILKA.kuzovda + 0.06 - 0.14 * silliq((f - 0.32) / 0.1); }
        else if (f < 0.78) { u = 1 - silliq((f - 0.42) / 0.36); b = VILKA.ostida - (VILKA.ostida - VILKA.past) * silliq(oraliq((f - 0.46) / 0.16)); }
        else { b = VILKA.past + (VILKA.tashish - VILKA.past) * silliq(oraliq((f - 0.84) / 0.1)); }
        yukBor = f < 0.37 || f >= 0.86;
      } else {
        // Borish (bo'sh vilka kuzov poli ostiga) → paletni ko'tarish → qaytish (tashish balandligiga tushadi) → zonaga qo'yish.
        if (f < 0.32) { u = silliq(f / 0.32); b = VILKA.past + (VILKA.ostida - VILKA.past) * silliq(oraliq((f - 0.1) / 0.18)); }
        else if (f < 0.42) { u = 1; b = VILKA.ostida + (VILKA.kuzovda + 0.04 - VILKA.ostida) * silliq((f - 0.32) / 0.1); }
        else if (f < 0.78) { u = 1 - silliq((f - 0.42) / 0.36); b = VILKA.kuzovda + 0.04 - (VILKA.kuzovda + 0.04 - VILKA.tashish) * silliq(oraliq((f - 0.5) / 0.16)); }
        else { b = VILKA.tashish - (VILKA.tashish - VILKA.past) * silliq(oraliq((f - 0.82) / 0.1)); }
        yukBor = f >= 0.37 && f < 0.88;
      }
    }
    if (ildiz.current) ildiz.current.position.set(boshi[0] + (oxiri[0] - boshi[0]) * u, 0, boshi[1] + (oxiri[1] - boshi[1]) * u);
    if (vilka.current) vilka.current.position.y = 0.12 + b;
    if (yuk.current) yuk.current.visible = yukBor;
    const du = (u - oldingiU.current) * Math.hypot(oxiri[0] - boshi[0], oxiri[1] - boshi[1]);
    oldingiU.current = u;
    goldiraklar.current?.children.forEach((g) => { g.rotation.x += du / 0.25; });
  });
  return (
    <group ref={ildiz} position={[boshi[0], 0, boshi[1]]} rotation={[0, burilish, 0]}>
      <PogruzchikModeli mat={m} vilka={vilka} goldiraklar={goldiraklar} yuk={yuk} yukTuri={yukla ? "karton" : "list"} />
    </group>
  );
}

// ── Chap devordagi (3, 4-rampa) ko'tariluvchi rolik darvoza ──

const DEVOR_X = RAMPALAR[3].x;

function RolikDarvoza({ m, tm, rampa, reys }: { m: Materiallar; tm: TransportMateriallari; rampa: 3 | 4; reys?: Reys }) {
  const parda = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    let ochiq = 0;
    if (reys) {
      const e = otganSoniya(reys);
      if (reys.bosqich === "rampada") ochiq = 1;
      else if (reys.bosqich === "kelmoqda" && e > orqagaBoshlanishi(rampa) - 3) ochiq = 1;
      else if (reys.bosqich === "ketmoqda" && e < 3) ochiq = 1;
    }
    if (parda.current) parda.current.scale.y = THREE.MathUtils.damp(parda.current.scale.y, 1 - 0.93 * ochiq, 1.6, Math.min(dt, 0.1));
  });
  const z = RAMPALAR[rampa].z;
  return (
    <group position={[DEVOR_X + 0.18, 0, z]}>
      <group ref={parda} position={[0, 4.02, 0]}>
        <StatikGuruh>
          {Array.from({ length: 22 }, (_, i) => <Quti key={i} o={[0.05, 0.16, 4.0]} p={[0, -0.09 - i * 0.18, 0]} mat={i % 2 ? m.shkaf : m.oluk} />)}
          <Quti o={[0.07, 0.1, 4.02]} p={[0, -3.98, 0]} mat={tm.rama} />
        </StatikGuruh>
      </group>
      {/* Val qutisi va yon yo'naltirgichlar */}
      <StatikGuruh>
        <Quti o={[0.42, 0.42, 4.3]} p={[0.15, 4.24, 0]} mat={m.shkaf} />
        {[-1, 1].map((s) => <Quti key={s} o={[0.12, 4.05, 0.1]} p={[0.02, 2.02, s * 2.05]} mat={tm.alyumin} />)}
      </StatikGuruh>
    </group>
  );
}

// ── KPP shlagbaumlari (kirish va chiqish) ──

function Shlagbaum({ m, sm, tm, tavsif, reestr }: { m: Materiallar; sm: ShaharMateriallari; tm: TransportMateriallari; tavsif: ShlagbaumTavsifi; reestr: TransportReestri }) {
  const strela = useRef<THREE.Group>(null);
  const qizil = useRef<THREE.Mesh>(null);
  const yashil = useRef<THREE.Mesh>(null);
  const ulush = useRef(0);
  const royxat = useMemo<ShlagbaumMashinasi[]>(() => [], []);
  const yon = Math.sign(tavsif.x - tavsif.ustunX);
  /** Svetofor kelayotgan mashinaga qaragan tomonda: kirishda +z (ko'chadan), chiqishda −z (hovlidan). */
  const old = -tavsif.yon;
  useFrame((_, dt) => {
    royxat.length = 0;
    for (const iz of Object.values(reestr.yukMashinalari)) {
      if (!iz) continue;
      const v = SHLAGBAUM_VAQTLARI[iz.rampa];
      const toxtash = iz.bosqich === "kelmoqda" ? v.kirish : iz.bosqich === "ketmoqda" ? v.chiqish : null;
      if (toxtash) royxat.push({ x: iz.p.x, z: iz.p.z, burchak: iz.burchak, t: iz.t, toxtash });
    }
    const ochiq = shlagbaumOchiqmi(royxat, tavsif);
    ulush.current = strelaQadami(ulush.current, ochiq, Math.min(dt, 0.1));
    if (strela.current) strela.current.rotation.z = yon * strelaBurchagi(ulush.current);
    if (qizil.current) qizil.current.visible = ulush.current < 0.98;
    if (yashil.current) yashil.current.visible = ulush.current >= 0.98;
  });
  const L = STRELA.uzunlik;
  return (
    <group position={[tavsif.ustunX, 0, tavsif.z]}>
      <StatikGuruh>
        {/* Tumba (yuritma), qizil tasma, tagi */}
        <Quti o={[0.5, 0.06, 0.42]} p={[0, 0.03, 0]} mat={tm.rama} />
        <Yumaloq o={[0.36, 1.0, 0.32]} p={[0, 0.53, 0]} mat={sm.kppDevor} radius={0.04} />
        <Quti o={[0.37, 0.1, 0.33]} p={[0, 0.8, 0]} mat={m.qizil} />
        {/* Svetofor ustunchasi */}
        <Quti o={[0.06, 0.5, 0.06]} p={[-yon * 0.1, 1.28, -0.1 * old]} mat={tm.rama} />
        <Yumaloq o={[0.16, 0.3, 0.12]} p={[-yon * 0.1, 1.6, -0.1 * old]} mat={tm.qoraPlastik} radius={0.03} />
        {/* Strela uchi tayanchi (vilka) */}
        <Quti o={[0.08, 0.86, 0.08]} p={[yon * (L - 0.08), 0.43, 0.14]} mat={sm.kppDevor} />
        <Quti o={[0.2, 0.06, 0.2]} p={[yon * (L - 0.08), 0.89, 0.14]} mat={m.qizil} />
      </StatikGuruh>
      <mesh ref={qizil} position={[-yon * 0.1, 1.67, -0.03 * old]} material={tm.orqaChiroq}>
        <sphereGeometry args={[0.045, 12, 8]} />
      </mesh>
      <mesh ref={yashil} position={[-yon * 0.1, 1.53, -0.03 * old]} visible={false}>
        <sphereGeometry args={[0.045, 12, 8]} />
        <meshStandardMaterial color="#16a34a" emissive="#22c55e" emissiveIntensity={1.2} />
      </mesh>
      <group ref={strela} position={[0, STRELA.oqBalandligi, 0]}>
        <StatikGuruh>
          <Quti o={[L - 0.12, 0.09, 0.06]} p={[yon * (L / 2 + 0.06), 0, 0]} mat={sm.shlagbaum} />
          <Silindr r={0.11} h={0.2} p={[0, 0, 0]} rot={[Math.PI / 2, 0, 0]} mat={m.korpusQora} seg={14} />
          <Quti o={[0.32, 0.12, 0.1]} p={[-yon * 0.24, 0, 0]} mat={m.korpusQora} />
          {[1.2, 2.4, 3.6].map((x) => <Quti key={x} o={[0.06, 0.03, 0.065]} p={[yon * x, -0.05, 0]} mat={tm.orqaChiroq} />)}
        </StatikGuruh>
      </group>
    </group>
  );
}

// ── Old rampalar signalchisi: mashina orqa bilan kirayotganda ishora qiladi, yuklashda planshetda tekshiradi ──

type SignalHolati = "ishora" | "planshet" | "kutish";

function Signalchi({ m, rampa, reys, reestr }: { m: Materiallar; rampa: 1 | 2; reys?: Reys; reestr: TransportReestri }) {
  const [holat, setHolat] = useState<SignalHolati>("kutish");
  const nigoh = useMemo<{ current: THREE.Vector3 | null }>(() => ({ current: null }), []);
  useFrame(() => {
    let yangi: SignalHolati = "kutish";
    if (reys?.bosqich === "rampada") yangi = "planshet";
    else if (reys?.bosqich === "kelmoqda") {
      const e = otganSoniya(reys);
      if (e >= orqagaBoshlanishi(rampa) - 1 && e < MARSHRUTLAR[rampa].kelish.davom + 0.5) yangi = "ishora";
    }
    nigoh.current = reys ? reestr.yukMashinalari[reys.id]?.p ?? null : null;
    if (yangi !== holat) setHolat(yangi);
  });
  const { x, z } = RAMPA_HOLATI[rampa];
  const rampaZ = z - YUK.yarimUzunlik;
  return (
    <Ishchi
      mat={m}
      p={[x + 2.75, 0, rampaZ + 1.6]}
      burilish={-0.55}
      harakat={holat === "kutish" ? "kuzatish" : holat}
      ishlayapti={holat !== "kutish"}
      kiyim="usta"
      turi={rampa}
      faza={rampa * 1.7}
      nigoh={holat === "ishora" ? nigoh : undefined}
    />
  );
}

/** Rampa yorlig'i: rampa bo'sh bo'lganda (mashina kelayotganda va turganda uning o'z yorlig'i ko'rinadi). */
function RampaYorligi({ rampa, matn }: { rampa: RampaRaqami; matn: string }) {
  const h = RAMPA_HOLATI[rampa];
  const old = rampa <= 2;
  return (
    <Html position={old ? [h.x, 3.4, h.z - 2] : [h.x + 2.5, 4.9, h.z]} center zIndexRange={[9, 0]} style={{ pointerEvents: "none" }}>
      <span data-rampa-yorliq={rampa} className="whitespace-nowrap rounded-lg bg-teal-700 px-2.5 py-1 text-[12px] font-black uppercase tracking-wide text-white shadow">{matn}</span>
    </Html>
  );
}

const rampaBand = (reys?: Reys) => reys?.bosqich === "kelmoqda" || reys?.bosqich === "rampada";
const KPP_NUQTASI = new THREE.Vector3(KPP.x, 0, (KPP.z0 + KPP.z1) / 2);

/**
 * Hudud logistikasi: reyslar bo'yicha 4 ta yuk mashinasi (rampalar 1–4), kutish joyidagi 3 ta mashina, rampa pogruzchiklari,
 * rolik darvozalar, KPP'dagi kirish va chiqish shlagbaumlari, qorovul, signalchilar, ko'cha va turargoh avtomobillari, avtobus.
 * Yengil avtomobillar GLB'dan — o'z Suspense chegarasida (Avtomobillar.tsx), qolganlari kod bilan yasalgan va darhol chiziladi.
 */
export default function Logistika({ m, sm, reyslar, yorliq }: { m: Materiallar; sm: ShaharMateriallari; reyslar: Reys[]; yorliq: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const reestr = useMemo(yangiReestr, []);
  const tm = useMemo(transportMateriallari, []);
  useEffect(() => () => materiallarniTozala(tm), [tm]);
  const rampada = (n: RampaRaqami) => reyslar.find((r) => r.rampa === n);
  const [r1, r2, r3, r4] = [rampada(1), rampada(2), rampada(3), rampada(4)];

  // Qorovul nigohi: KPP ga eng yaqin (45 m ichida) ko'rinib turgan yuk mashinasi.
  useFrame(() => {
    let eng: THREE.Vector3 | null = null;
    let masofa = 45;
    for (const iz of Object.values(reestr.yukMashinalari)) {
      if (!iz) continue;
      const d = iz.p.distanceTo(KPP_NUQTASI);
      if (d < masofa) { masofa = d; eng = iz.p; }
    }
    reestr.yaqin.current = eng;
  });

  const oldRampa = (n: 1 | 2) => [RAMPA_HOLATI[n].x, RAMPALAR[n].z] as const;
  const chapRampa = (n: 3 | 4) => RAMPALAR[n].z;
  return (
    <group>
      {reyslar.map((reys) => <YukMashinasi key={reys.id} m={m} tm={tm} reys={reys} reestr={reestr} yorliq={yorliq} />)}
      {KUTAYOTGAN_MASHINALAR.map((k) => <KutayotganMashina key={k.raqam} m={m} tm={tm} x={k.x} z={k.z} raqam={k.raqam} korinish={k} />)}
      {/* Jo'natish (1, 2): tayyor mahsulot zonasidan kuzovga; qabul (3, 4): kuzovdan material omboriga */}
      <RampaPogruzchigi m={m} reys={r1} boshi={[oldRampa(1)[0], 9.9]} oxiri={[oldRampa(1)[0], oldRampa(1)[1] - 0.85]} burilish={0} yukla />
      <RampaPogruzchigi m={m} reys={r2} boshi={[oldRampa(2)[0], 10.2]} oxiri={[oldRampa(2)[0], oldRampa(2)[1] - 0.85]} burilish={0} yukla />
      <RampaPogruzchigi m={m} reys={r3} boshi={[-27.2, chapRampa(3)]} oxiri={[DEVOR_X + 0.9, chapRampa(3)]} burilish={-Math.PI / 2} yukla={false} />
      <RampaPogruzchigi m={m} reys={r4} boshi={[-27.2, chapRampa(4)]} oxiri={[DEVOR_X + 0.9, chapRampa(4)]} burilish={-Math.PI / 2} yukla={false} />
      <RolikDarvoza m={m} tm={tm} rampa={3} reys={r3} />
      <RolikDarvoza m={m} tm={tm} rampa={4} reys={r4} />
      {yorliq && ([[1, r1], [2, r2], [3, r3], [4, r4]] as const).map(([n, r]) => !rampaBand(r) && <RampaYorligi key={n} rampa={n} matn={t(`zones.dock${n}`)} />)}
      <Shlagbaum m={m} sm={sm} tm={tm} tavsif={SHLAGBAUMLAR.kirish} reestr={reestr} />
      <Shlagbaum m={m} sm={sm} tm={tm} tavsif={SHLAGBAUMLAR.chiqish} reestr={reestr} />
      {/* Qorovul: KPP yon eshigi oldida (orolda), kelayotgan / ketayotgan mashinaga qaraydi */}
      <Ishchi mat={m} p={[KPP.x - KPP.yarimEni - 0.2, 0.15, 45.6]} burilish={-Math.PI / 2} harakat="kuzatish" ishlayapti kiyim="qorovul" turi={1} nigoh={reestr.yaqin} />
      <Signalchi m={m} rampa={1} reys={r1} reestr={reestr} />
      <Signalchi m={m} rampa={2} reys={r2} reestr={reestr} />
      <Avtobus m={m} tm={tm} reestr={reestr} />
      <Avtomobillar reestr={reestr} />
    </group>
  );
}
