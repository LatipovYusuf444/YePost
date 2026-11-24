import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { GALEREYA, MAISHIY } from "./hudud";
import type { Materiallar } from "./materiallar";
import { GlbOdam, YuruvchiGlbOdam } from "./Odamlar";
import { MebelToplami, OlchamliQuti, Oyna } from "./Ofis";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import {
  MAISHIY_ESHIKLARI,
  MAISHIY_ICHI,
  MAISHIY_ICHKI_DEVOR,
  MAISHIY_ICHKI_DEVORLARI,
  MAISHIY_MEBELLARI,
  MAISHIY_ODAMLARI,
  MAISHIY_POLI,
  MAISHIY_TOSIQLARI,
  MAISHIY_XONALARI,
  MAISHIY_YURUVCHILARI,
  PATNISLAR,
  SHKAFCHA_QATORLARI,
  SKAMEYKALAR,
  WC_KABINALARI,
  devorBolaklari,
  maishiyMateriallariYarat,
  materiallarniTozala,
  shkafchaGeometriyalari,
  type MaishiyMateriallari,
  type MaishiyXonasi,
  type Teshik,
  type Tortburchak,
} from "./mebelModellari";

// Maishiy blok (18 × 22 m, 1 qavat, tomsiz — yuqoridan ichi ko'rinadi): erkaklar va ayollar kiyinish xonalari (raqamli metall
// shkafchalar, o'rindiqlar), dush xonalari, hojatxonalar, tibbiyot xonasi, oshxona (tarqatish peshtaxtasi, stollar) va
// sexga olib boruvchi yopiq galereya. Qimirlamaydigan qismlar StatikGuruh da birlashadi; shkafchalar — 3 ta geometriya.

type V3 = [number, number, number];
type Yon = "x" | "z";

const Y = MAISHIY_POLI;
const ICHKI_H = 3.0;
const ESHIK_H = 2.1;
const KAFEL_H = 2.1;
const MX = (MAISHIY.x0 + MAISHIY.x1) / 2;
const MZ = (MAISHIY.z0 + MAISHIY.z1) / 2;

/** Devor chizig'i bo'ylab joylashtirish (o = "z": devor z = c da, x bo'ylab; "x": x = c da, z bo'ylab). */
function joy(o: Yon, c: number, a: number, y: number, uzunlik: number, qalinlik: number, balandlik: number): { o: V3; p: V3 } {
  return o === "z" ? { o: [uzunlik, balandlik, qalinlik], p: [a, y, c] } : { o: [qalinlik, balandlik, uzunlik], p: [c, y, a] };
}

type TashqiTeshik = Teshik & { eshik?: boolean };
/** Tashqi devorlar: shimolda va g'arbda kiyinish xonalari ustida baland lenta derazalar, janub va sharqda oshxona derazalari. */
const TASHQI_DEVORLAR: { o: Yon; c: number; a0: number; a1: number; tashqi: 1 | -1; teshiklar: TashqiTeshik[] }[] = [
  {
    o: "z", c: MAISHIY.z0 + 0.125, a0: MAISHIY.x0, a1: MAISHIY.x1, tashqi: -1,
    teshiklar: [{ a0: 41.0, a1: 47.0, y0: 2.0, y1: 2.9 }, { a0: 48.0, a1: 51.0, y0: 2.0, y1: 2.9 }, { a0: 52.0, a1: 55.3, y0: 2.0, y1: 2.9 }, { a0: 56.0, a1: 57.4, y0: 2.0, y1: 2.9 }],
  },
  {
    o: "z", c: MAISHIY.z1 - 0.125, a0: MAISHIY.x0, a1: MAISHIY.x1, tashqi: 1,
    teshiklar: [{ a0: 40.8, a1: 44.0, y0: 1.2, y1: 2.6 }, { a0: 47.0, a1: 57.4, y0: 0.9, y1: 2.7 }],
  },
  {
    o: "x", c: MAISHIY.x0 + 0.125, a0: MAISHIY.z0 + 0.25, a1: MAISHIY.z1 - 0.25, tashqi: -1,
    teshiklar: [
      { a0: -15.4, a1: -10.2, y0: 2.0, y1: 2.9 },
      { a0: MAISHIY_ESHIKLARI.galereya.z0, a1: MAISHIY_ESHIKLARI.galereya.z1, y0: 0, y1: 2.4, eshik: true },
      { a0: -6.2, a1: -2.0, y0: 2.1, y1: 2.8 },
      { a0: -0.9, a1: 5.4, y0: 2.0, y1: 2.8 },
    ],
  },
  {
    o: "x", c: MAISHIY.x1 - 0.125, a0: MAISHIY.z0 + 0.25, a1: MAISHIY.z1 - 0.25, tashqi: 1,
    teshiklar: [
      { a0: -15.4, a1: -10.2, y0: 2.0, y1: 2.9 },
      { a0: -9.2, a1: -6.6, y0: 1.0, y1: 2.6 },
      { a0: MAISHIY_ESHIKLARI.kirish.z0, a1: MAISHIY_ESHIKLARI.kirish.z1, y0: 0, y1: 2.5, eshik: true },
      { a0: -3.6, a1: -2.0, y0: 1.2, y1: 2.6 },
      { a0: -1.0, a1: 5.4, y0: 0.9, y1: 2.7 },
    ],
  },
];

/**
 * Ichki eshik tabaqasi qaysi tomonga ochilgan (devorga perpendikulyar, ilgagi eshikning boshida): kiyinish xonalariga (−z),
 * qolganlari +z/+x tomonga; oshxonaga keng o'tish — tabaqasiz.
 */
function tabaqaTomoni(d: { o: Yon; c: number }): 1 | -1 | null {
  if (d.o === "z" && d.c === -1.5) return null;
  return d.o === "z" && d.c === -9.6 ? -1 : 1;
}

/** Pol: beton plita va har xona qoplamasi. */
function Pollar({ mm }: { mm: MaishiyMateriallari }) {
  const qoplama: Record<MaishiyXonasi, [THREE.Material, number]> = {
    erkaklar: [mm.linoleum, 2],
    erkaklarDushi: [mm.kafelPol, 1.2],
    ayollar: [mm.linoleum, 2],
    yolak: [mm.linoleum, 2],
    vestibyul: [mm.kafelPol, 1.2],
    wcErkak: [mm.kafelPol, 1.2],
    wcAyol: [mm.kafelPol, 1.2],
    tibbiyot: [mm.linoleum, 2],
    oshxona: [mm.oshxonaPol, 1.2],
  };
  return (
    <>
      <Quti o={[MAISHIY.x1 - MAISHIY.x0, 0.14, MAISHIY.z1 - MAISHIY.z0]} p={[MX, Y - 0.012 - 0.07, MZ]} mat={mm.plita} />
      {(Object.keys(MAISHIY_XONALARI) as MaishiyXonasi[]).map((nom) => {
        const x = MAISHIY_XONALARI[nom];
        const [mat, tile] = qoplama[nom];
        return <OlchamliQuti key={nom} o={[x.x1 - x.x0, 0.012, x.z1 - x.z0]} p={[(x.x0 + x.x1) / 2, Y - 0.006, (x.z0 + x.z1) / 2]} mat={mat} tile={tile} soya={false} />;
      })}
    </>
  );
}

/** Tashqi devorlar: suvoq, sokol, derazalar (alyumin impostli), parapet qoplamasi, eshiklar va kirish soyaboni. */
function TashqiDevorlar({ mm }: { mm: MaishiyMateriallari }) {
  const qismlar: ReactNode[] = [];
  TASHQI_DEVORLAR.forEach((d, di) => {
    devorBolaklari(d.a0, d.a1, Y - 0.05, MAISHIY.balandlik, d.teshiklar.map((t) => ({ ...t, y0: Y + t.y0, y1: Y + t.y1 }))).forEach((b, i) => {
      const g = joy(d.o, d.c, (b.a0 + b.a1) / 2, (b.y0 + b.y1) / 2, b.a1 - b.a0, 0.25, b.y1 - b.y0);
      qismlar.push(<Quti key={`d${di}-${i}`} o={g.o} p={g.p} mat={mm.tashqiDevor} />);
    });
    // Sokol (tashqi tomonda, eshiklar oralig'ida uzilgan)
    const eshiklar = d.teshiklar.filter((t) => t.eshik);
    devorBolaklari(d.a0, d.a1, 0, 0.45, eshiklar.map((t) => ({ ...t, y0: 0, y1: 1 }))).forEach((b, i) => {
      const g = joy(d.o, d.c + d.tashqi * 0.14, (b.a0 + b.a1) / 2, 0.225, b.a1 - b.a0, 0.03, 0.45);
      qismlar.push(<Quti key={`s${di}-${i}`} o={g.o} p={g.p} mat={mm.sokol} />);
    });
    const parapet = joy(d.o, d.c, (d.a0 + d.a1) / 2, MAISHIY.balandlik + 0.03, d.a1 - d.a0 + (d.o === "z" ? 0.06 : 0), 0.33, 0.06);
    qismlar.push(<Quti key={`p${di}`} o={parapet.o} p={parapet.p} mat={mm.parapet} />);
    for (const t of d.teshiklar) {
      const L = t.a1 - t.a0;
      const a = (t.a0 + t.a1) / 2;
      if (t.eshik) {
        // Eshik romi
        const ust = joy(d.o, d.c, a, Y + t.y1 + 0.04, L + 0.12, 0.27, 0.08);
        qismlar.push(<Quti key={`er${di}-${a}`} o={ust.o} p={ust.p} mat={mm.alyumin} />);
        for (const s of [t.a0 - 0.04, t.a1 + 0.04]) {
          const j = joy(d.o, d.c, s, Y + t.y1 / 2, 0.08, 0.27, t.y1);
          qismlar.push(<Quti key={`ej${di}-${s}`} o={j.o} p={j.p} mat={mm.alyumin} />);
        }
        continue;
      }
      const g = joy(d.o, d.c, a, Y + (t.y0 + t.y1) / 2, L, 0.02, t.y1 - t.y0);
      qismlar.push(<Oyna key={`w${di}-${a}`} o={g.o} p={g.p} mat={mm.oyna} />);
      const tokcha = joy(d.o, d.c + d.tashqi * 0.04, a, Y + t.y0 - 0.025, L + 0.06, 0.36, 0.05);
      qismlar.push(<Quti key={`t${di}-${a}`} o={tokcha.o} p={tokcha.p} mat={mm.alyumin} />);
      const rom = joy(d.o, d.c, a, Y + t.y1 - 0.025, L, 0.08, 0.05);
      qismlar.push(<Quti key={`r${di}-${a}`} o={rom.o} p={rom.p} mat={mm.alyumin} />);
      const n = Math.max(1, Math.round(L / 1.4));
      for (let k = 0; k <= n; k++) {
        const s = joy(d.o, d.c, t.a0 + (L * k) / n, Y + (t.y0 + t.y1) / 2, 0.05, 0.08, t.y1 - t.y0);
        qismlar.push(<Quti key={`m${di}-${a}-${k}`} o={s.o} p={s.p} mat={mm.alyumin} />);
      }
    }
  });
  // Asosiy kirish (sharq): yopiq ikki tabaqali shisha eshik, ostona, soyabon
  const k = MAISHIY_ESHIKLARI.kirish;
  const kz = (k.z0 + k.z1) / 2;
  const ke = k.z1 - k.z0;
  for (const s of [-1, 1]) {
    qismlar.push(<Oyna key={`kt${s}`} o={[0.02, 2.42, ke / 2 - 0.06]} p={[k.x - 0.125, Y + 1.21, kz + (s * ke) / 4]} mat={mm.oyna} />);
    qismlar.push(<Quti key={`kr${s}`} o={[0.05, 2.46, 0.05]} p={[k.x - 0.125, Y + 1.23, kz + s * 0.03]} mat={mm.alyumin} />);
    qismlar.push(<Quti key={`kd${s}`} o={[0.04, 0.4, 0.03]} p={[k.x - 0.08, Y + 1.05, kz + s * 0.12]} mat={mm.polat} />);
  }
  qismlar.push(<Quti key="kp" o={[0.05, 0.1, ke]} p={[k.x - 0.125, Y + 0.05, kz]} mat={mm.alyumin} />);
  qismlar.push(<Quti key="ostona" o={[1.4, 0.05, ke + 0.8]} p={[k.x + 0.7, 0.025, kz]} mat={mm.sokol} />);
  qismlar.push(<Quti key="soyabon" o={[1.7, 0.16, ke + 1.4]} p={[k.x + 0.85, 2.95, kz]} mat={mm.parapet} />);
  qismlar.push(<Oyna key="soyabonLed" o={[0.5, 0.02, 0.5]} p={[k.x + 0.85, 2.86, kz]} mat={mm.ledPanel} />);
  return <>{qismlar}</>;
}

/** Ichki devorlar (eshik ochiqlari, romlar va ochiq turgan tabaqalar bilan). */
function IchkiDevorlar({ mm }: { mm: MaishiyMateriallari }) {
  const t = MAISHIY_ICHKI_DEVOR;
  return (
    <>
      {MAISHIY_ICHKI_DEVORLARI.map((d, di) => (
        <group key={di}>
          {devorBolaklari(d.a0, d.a1, 0, ICHKI_H, d.eshiklar.map(([e0, e1]) => ({ a0: e0, a1: e1, y0: 0, y1: ESHIK_H }))).map((b, i) => {
            const g = joy(d.o, d.c, (b.a0 + b.a1) / 2, Y + (b.y0 + b.y1) / 2, b.a1 - b.a0, t, b.y1 - b.y0);
            return <Quti key={i} o={g.o} p={g.p} mat={mm.ichkiDevor} />;
          })}
          {d.eshiklar.map(([e0, e1]) => {
            const ust = joy(d.o, d.c, (e0 + e1) / 2, Y + ESHIK_H + 0.025, e1 - e0 + 0.1, t + 0.03, 0.05);
            const tomon = tabaqaTomoni(d);
            const kenglik = e1 - e0 - 0.06;
            const tabaqa = tomon === null ? null : joy(d.o === "z" ? "x" : "z", e0 + 0.03, d.c + tomon * (t / 2 + kenglik / 2), Y + (ESHIK_H - 0.04) / 2, kenglik, 0.04, ESHIK_H - 0.04);
            return (
              <group key={e0}>
                <Quti o={ust.o} p={ust.p} mat={mm.korpus} />
                {[e0 - 0.02, e1 + 0.02].map((s) => {
                  const j = joy(d.o, d.c, s, Y + ESHIK_H / 2, 0.04, t + 0.03, ESHIK_H);
                  return <Quti key={s} o={j.o} p={j.p} mat={mm.korpus} />;
                })}
                {tabaqa && <Quti o={tabaqa.o} p={tabaqa.p} mat={mm.eshik} />}
              </group>
            );
          })}
        </group>
      ))}
    </>
  );
}

/** Ho'l xonalar devorlaridagi kafel (2.1 m balandlikkacha). */
function Kafellar({ mm }: { mm: MaishiyMateriallari }) {
  const q = 0.012;
  const xd = MAISHIY_XONALARI.erkaklarDushi;
  const we = MAISHIY_XONALARI.wcErkak;
  const wa = MAISHIY_XONALARI.wcAyol;
  const ay = MAISHIY_XONALARI.ayollar;
  const ayDush = MAISHIY_TOSIQLARI.find((t) => t.nom === "ayollarDushDevori");
  // [o, c, a0, a1, eshiklar, y0, y1]
  const qatlamlar: [Yon, number, number, number, [number, number][], number, number][] = [
    ["z", xd.z0 + q / 2, xd.x0, xd.x1, [], 0, KAFEL_H],
    ["x", xd.x1 - q / 2, xd.z0, xd.z1, [], 0, KAFEL_H],
    ["z", xd.z1 - q / 2, xd.x0, xd.x1, [], 0, KAFEL_H],
    ["x", xd.x0 + q / 2, xd.z0, xd.z1, [[-11.0, -10.1]], 0, KAFEL_H],
    ["z", ay.z0 + q / 2, (ayDush?.x1 ?? 55.66), ay.x1, [], 0, KAFEL_H],
    ["x", ay.x1 - q / 2, ay.z0, -14.2, [], 0, KAFEL_H],
    ...[we, wa].flatMap((w, i): [Yon, number, number, number, [number, number][], number, number][] => [
      ["x", w.x0 + q / 2, w.z0, w.z1, [], 0, KAFEL_H],
      ["x", w.x1 - q / 2, w.z0, w.z1, [], 0, KAFEL_H],
      ["z", w.z1 - q / 2, w.x0, w.x1, [], 0, KAFEL_H],
      ["z", w.z0 + q / 2, w.x0, w.x1, [i === 0 ? [41.3, 42.1] : [44.2, 45.0]], 0, KAFEL_H],
    ]),
    // Oshxona: ish stollari ortidagi fartuk
    ["x", MAISHIY_ICHI.x0 + q / 2, MAISHIY_XONALARI.oshxona.z0, MAISHIY_XONALARI.oshxona.z1, [], 0.9, 1.65],
  ];
  return (
    <>
      {qatlamlar.flatMap(([o, c, a0, a1, eshiklar, y0, y1], i) =>
        devorBolaklari(a0, a1, y0, y1, eshiklar.map(([e0, e1]) => ({ a0: e0, a1: e1, y0: 0, y1: ESHIK_H }))).map((b, k) => {
          const g = joy(o, c, (b.a0 + b.a1) / 2, Y + (b.y0 + b.y1) / 2, b.a1 - b.a0, q, b.y1 - b.y0);
          return <OlchamliQuti key={`${i}-${k}`} o={g.o} p={g.p} mat={mm.kafelDevor} tile={1.2} soya={false} />;
        }),
      )}
      {ayDush && (
        <OlchamliQuti o={[ayDush.x1 - ayDush.x0, ayDush.h, ayDush.z1 - ayDush.z0]} p={[(ayDush.x0 + ayDush.x1) / 2, Y + ayDush.h / 2, (ayDush.z0 + ayDush.z1) / 2]} mat={mm.kafelDevor} tile={1.2} />
      )}
    </>
  );
}

/** Kiyinish xonalaridagi o'rindiqlar: uchta yog'och reyka, po'lat ramali oyoqlar. */
function Skameykalar({ mm }: { mm: MaishiyMateriallari }) {
  return (
    <>
      {SKAMEYKALAR.map((s, i) => {
        const boyX = s.x1 - s.x0 >= s.z1 - s.z0;
        const L = boyX ? s.x1 - s.x0 : s.z1 - s.z0;
        const E = boyX ? s.z1 - s.z0 : s.x1 - s.x0;
        const cx = (s.x0 + s.x1) / 2;
        const cz = (s.z0 + s.z1) / 2;
        const qism = (bo: number, en: number): V3 => (boyX ? [bo, 0, en] : [en, 0, bo]);
        const oyoqlar = Math.max(2, Math.round(L / 1.4) + 1);
        return (
          <group key={i} position={[cx, Y, cz]}>
            {[-1, 0, 1].map((k) => {
              const [ox, , oz] = qism(L - 0.02, (E - 0.04) / 3 - 0.012);
              const [px, , pz] = qism(0, (k * (E - 0.04)) / 3);
              return <Quti key={k} o={[ox, 0.03, oz]} p={[px, 0.45, pz]} mat={mm.reyka} />;
            })}
            {Array.from({ length: oyoqlar }, (_, k) => {
              const t = -L / 2 + 0.12 + (k * (L - 0.24)) / (oyoqlar - 1);
              const [ox, , oz] = qism(0.04, E - 0.04);
              const [px, , pz] = qism(t, 0);
              return (
                <group key={`o${k}`}>
                  <Quti o={[ox, 0.04, oz]} p={[px, 0.41, pz]} mat={mm.polat} />
                  {[-1, 1].map((s2) => {
                    const [lx, , lz] = qism(t, (s2 * (E - 0.1)) / 2);
                    return <Quti key={s2} o={[0.035, 0.41, 0.035]} p={[lx, 0.205, lz]} mat={mm.polat} />;
                  })}
                </group>
              );
            })}
          </group>
        );
      })}
    </>
  );
}

/** Hojatxona kabinalari (HPL panellar, eshiklar), pissuarlar va ular orasidagi to'siq, oynalar. */
function Hojatxonalar({ mm }: { mm: MaishiyMateriallari }) {
  const qismlar: ReactNode[] = [];
  const pz = -1.56;
  WC_KABINALARI.forEach((w, wi) => {
    const chegaralar = [w.x0, ...w.xlar];
    w.xlar.forEach((x) => {
      qismlar.push(<Quti key={`p${wi}-${x}`} o={[0.03, 1.85, pz - w.oldZ]} p={[x, Y + 0.15 + 0.925, (pz + w.oldZ) / 2]} mat={mm.hpl} />);
      qismlar.push(<Quti key={`pf${wi}-${x}`} o={[0.04, 0.15, 0.04]} p={[x, Y + 0.075, w.oldZ + 0.05]} mat={mm.polat} />);
    });
    for (let i = 0; i < chegaralar.length - 1; i++) {
      const c0 = chegaralar[i];
      const c1 = chegaralar[i + 1];
      const e0 = c0 + 0.12;
      const e1 = c1 - 0.15;
      qismlar.push(<Quti key={`fa${wi}-${i}`} o={[e0 - c0, 1.85, 0.03]} p={[(c0 + e0) / 2, Y + 1.075, w.oldZ]} mat={mm.hpl} />);
      qismlar.push(<Quti key={`fb${wi}-${i}`} o={[c1 - e1, 1.85, 0.03]} p={[(e1 + c1) / 2, Y + 1.075, w.oldZ]} mat={mm.hpl} />);
      // Eshik tabaqasi ichkariga yarim ochiq
      const en = e1 - e0;
      qismlar.push(
        <Quti key={`e${wi}-${i}`} o={[0.025, 1.7, en]} p={[e0 + 0.03, Y + 0.15 + 0.85, w.oldZ + en / 2]} mat={mm.hpl} />,
      );
    }
    qismlar.push(<Quti key={`rels${wi}`} o={[chegaralar[chegaralar.length - 1] - w.x0, 0.03, 0.03]} p={[(w.x0 + chegaralar[chegaralar.length - 1]) / 2, Y + 2.02, w.oldZ]} mat={mm.polat} />);
  });
  for (const nom of ["pissuar1", "pissuar2"]) {
    const t = MAISHIY_TOSIQLARI.find((x) => x.nom === nom);
    if (!t) continue;
    const cz = (t.z0 + t.z1) / 2;
    qismlar.push(<Yumaloq key={nom} o={[0.32, 0.62, 0.36]} p={[t.x0 + 0.17, Y + 0.85, cz]} mat={mm.sopol} radius={0.1} />);
    qismlar.push(<Silindr key={`${nom}k`} r={0.012} h={0.3} p={[t.x0 + 0.04, Y + 1.32, cz]} mat={mm.polat} seg={8} />);
  }
  qismlar.push(<Quti key="pissuarTosiq" o={[0.45, 0.8, 0.02]} p={[MAISHIY_ICHI.x0 + 0.225, Y + 1.0, -5.0]} mat={mm.hpl} />);
  return <>{qismlar}</>;
}

/** Ko'zgular (qo'l yuvgichlar ustida). */
function Kozgular({ mm }: { mm: MaishiyMateriallari }) {
  const r: { o: V3; p: V3 }[] = [
    { o: [0.01, 0.7, 1.4], p: [43.02, Y + 1.55, -5.0] },
    { o: [0.01, 0.7, 1.4], p: [45.92, Y + 1.55, -5.0] },
    { o: [0.01, 0.7, 1.4], p: [51.42, Y + 1.55, -12.8] },
    { o: [0.01, 0.7, 0.6], p: [57.74, Y + 1.55, -12.6] },
    { o: [0.6, 0.7, 0.01], p: [50.4, Y + 1.55, -6.53] },
    { o: [0.6, 0.7, 0.01], p: [52.6, Y + 1.55, -1.43] },
  ];
  return <>{r.map((k, i) => <Quti key={i} o={k.o} p={k.p} mat={mm.kozgu} />)}</>;
}

/** Tibbiyot xonasi: kushetka, dori shkafi, buklanadigan parda, eshik ustida qizil xoch. */
function Tibbiyot({ mm }: { mm: MaishiyMateriallari }) {
  const t = (nom: string) => MAISHIY_TOSIQLARI.find((x) => x.nom === nom);
  const k = t("kushetka");
  const d = t("doriShkafi");
  const p = t("tibbiyTosiq");
  return (
    <>
      {k && (
        <>
          {[k.x0 + 0.08, k.x1 - 0.08].flatMap((x) => [k.z0 + 0.08, k.z1 - 0.08].map((z) => <Quti key={`${x}${z}`} o={[0.04, 0.5, 0.04]} p={[x, Y + 0.25, z]} mat={mm.polat} />))}
          <Quti o={[k.x1 - k.x0, 0.06, k.z1 - k.z0]} p={[(k.x0 + k.x1) / 2, Y + 0.5, (k.z0 + k.z1) / 2]} mat={mm.oqMebel} />
          <Yumaloq o={[k.x1 - k.x0 - 0.05, 0.08, k.z1 - k.z0 - 0.05]} p={[(k.x0 + k.x1) / 2, Y + 0.57, (k.z0 + k.z1) / 2]} mat={mm.hpl} radius={0.03} />
          <Yumaloq o={[0.4, 0.08, 0.5]} p={[k.x1 - 0.25, Y + 0.65, (k.z0 + k.z1) / 2]} mat={mm.sopol} radius={0.035} />
        </>
      )}
      {d && (
        <>
          <Quti o={[d.x1 - d.x0, d.h, d.z1 - d.z0]} p={[(d.x0 + d.x1) / 2, Y + d.h / 2, (d.z0 + d.z1) / 2]} mat={mm.oqMebel} />
          <Oyna o={[0.01, d.h - 0.9, d.z1 - d.z0 - 0.08]} p={[d.x0 - 0.005, Y + d.h - 0.5, (d.z0 + d.z1) / 2]} mat={mm.oyna} />
          {[0.45, 0.85, 1.25].map((h) => <Quti key={h} o={[0.3, 0.012, d.z1 - d.z0 - 0.1]} p={[(d.x0 + d.x1) / 2, Y + h + 0.6, (d.z0 + d.z1) / 2]} mat={mm.sopol} />)}
          <Quti o={[0.01, 0.24, 0.24]} p={[d.x0 - 0.006, Y + 0.6, (d.z0 + d.z1) / 2]} mat={mm.qizilXoch} />
        </>
      )}
      {p && [0, 1, 2].map((i) => {
        const L = (p.z1 - p.z0) / 3;
        const z = p.z0 + L * (i + 0.5);
        return (
          <group key={i}>
            <Quti o={[0.02, p.h - 0.1, L - 0.03]} p={[(p.x0 + p.x1) / 2 + (i % 2 ? 0.03 : -0.03), Y + 0.1 + (p.h - 0.1) / 2, z]} mat={mm.sopol} />
            <Quti o={[0.03, p.h, 0.03]} p={[(p.x0 + p.x1) / 2, Y + p.h / 2, p.z0 + L * i + 0.015]} mat={mm.polat} />
          </group>
        );
      })}
      {/* Eshik ustidagi belgi (yo'lak tomonda) */}
      <Quti o={[0.42, 0.42, 0.02]} p={[48.85, Y + 2.5, -6.68]} mat={mm.qizilXoch} />
    </>
  );
}

/** Oshxona: plita va so'rg'ich, ish oroli, tarqatish peshtaxtasi (gastroyomkostlar, himoya oynasi), patnis relsi, patnis javoni, menyu. */
function Oshxona({ mm }: { mm: MaishiyMateriallari }) {
  const t = (nom: string) => MAISHIY_TOSIQLARI.find((x) => x.nom === nom);
  const plita = t("plita");
  const orol = t("oshxonaOroli");
  const tq = t("tarqatish");
  const rels = t("patnisRelsi");
  const javon = t("patnisJavoni");
  const markaz = (b: Tortburchak) => [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2] as const;
  return (
    <>
      {plita && (() => {
        const [cx, cz] = markaz(plita);
        return (
          <>
            <Quti o={[plita.x1 - plita.x0, plita.h - 0.04, plita.z1 - plita.z0]} p={[cx, Y + (plita.h - 0.04) / 2, cz]} mat={mm.zanglamas} />
            <Quti o={[plita.x1 - plita.x0, 0.04, plita.z1 - plita.z0]} p={[cx, Y + plita.h - 0.02, cz]} mat={mm.korpus} />
            {[-0.2, 0.2].flatMap((dx) => [-0.22, 0.22].map((dz) => <Silindr key={`${dx}${dz}`} r={0.1} h={0.015} p={[cx + dx, Y + plita.h + 0.008, cz + dz]} mat={mm.polat} seg={16} />))}
            <Silindr r={0.16} h={0.24} p={[cx - 0.2, Y + plita.h + 0.13, cz - 0.22]} mat={mm.zanglamas} seg={20} />
            <Silindr r={0.13} h={0.14} p={[cx + 0.2, Y + plita.h + 0.08, cz + 0.22]} mat={mm.zanglamas} seg={20} />
            {/* So'rg'ich (devorga osilgan) va havo quvuri */}
            <Quti o={[0.75, 0.35, 1.1]} p={[MAISHIY_ICHI.x0 + 0.375, Y + 2.15, cz]} mat={mm.zanglamas} />
            <Quti o={[0.3, 0.8, 0.3]} p={[MAISHIY_ICHI.x0 + 0.15, Y + 2.7, cz]} mat={mm.zanglamas} />
          </>
        );
      })()}
      {orol && (() => {
        const [cx, cz] = markaz(orol);
        const L = orol.z1 - orol.z0;
        const E = orol.x1 - orol.x0;
        return (
          <>
            <Quti o={[E, 0.04, L]} p={[cx, Y + orol.h - 0.02, cz]} mat={mm.zanglamas} />
            <Quti o={[E - 0.06, 0.025, L - 0.06]} p={[cx, Y + 0.2, cz]} mat={mm.zanglamas} />
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Quti key={`${sx}${sz}`} o={[0.04, orol.h - 0.04, 0.04]} p={[cx + sx * (E / 2 - 0.04), Y + (orol.h - 0.04) / 2, cz + sz * (L / 2 - 0.04)]} mat={mm.zanglamas} />))}
            <Quti o={[0.35, 0.03, 0.5]} p={[cx, Y + orol.h + 0.015, cz - 0.6]} mat={mm.reyka} />
            <Silindr r={0.17} h={0.12} p={[cx, Y + orol.h + 0.06, cz + 0.5]} mat={mm.sopol} seg={20} />
          </>
        );
      })()}
      {tq && (() => {
        const [cx, cz] = markaz(tq);
        const L = tq.z1 - tq.z0;
        const E = tq.x1 - tq.x0;
        return (
          <>
            <Quti o={[E, tq.h - 0.04, L]} p={[cx, Y + (tq.h - 0.04) / 2, cz]} mat={mm.zanglamas} />
            <Quti o={[0.02, tq.h - 0.2, L]} p={[tq.x1 + 0.01, Y + 0.1 + (tq.h - 0.2) / 2, cz]} mat={mm.reyka} />
            <Quti o={[E + 0.04, 0.04, L + 0.04]} p={[cx, Y + tq.h - 0.02, cz]} mat={mm.zanglamas} />
            {/* Gastroyomkostlar: issiq taomlar (rangli) */}
            {Array.from({ length: 6 }, (_, i) => (
              <group key={i}>
                <Quti o={[0.5, 0.012, 0.62]} p={[cx, Y + tq.h + 0.003, tq.z0 + 0.45 + i * 0.7]} mat={mm.polat} />
                <Quti o={[0.44, 0.03, 0.56]} p={[cx, Y + tq.h + 0.012, tq.z0 + 0.45 + i * 0.7]} mat={mm.ovqat[i % mm.ovqat.length]} />
              </group>
            ))}
            {/* Himoya oynasi va ustunchalar */}
            <Oyna o={[0.02, 0.4, L - 0.2]} p={[tq.x1 - 0.12, Y + tq.h + 0.32, cz]} mat={mm.oyna} />
            <Oyna o={[0.45, 0.015, L - 0.2]} p={[cx + 0.08, Y + tq.h + 0.53, cz]} mat={mm.oyna} />
            {[tq.z0 + 0.15, cz, tq.z1 - 0.15].map((z) => <Silindr key={z} r={0.015} h={0.55} p={[tq.x1 - 0.12, Y + tq.h + 0.27, z]} mat={mm.zanglamas} seg={8} />)}
          </>
        );
      })()}
      {rels && [0.07, 0.15, 0.23].map((dx) => (
        <Silindr key={dx} r={0.014} h={rels.z1 - rels.z0} p={[rels.x0 + dx, Y + rels.h, (rels.z0 + rels.z1) / 2]} rot={[Math.PI / 2, 0, 0]} mat={mm.zanglamas} seg={8} />
      ))}
      {rels && [rels.z0 + 0.2, (rels.z0 + rels.z1) / 2, rels.z1 - 0.2].map((z) => <Quti key={z} o={[0.3, 0.03, 0.03]} p={[(rels.x0 + rels.x1) / 2, Y + rels.h - 0.03, z]} mat={mm.zanglamas} />)}
      {javon && (() => {
        const [cx, cz] = markaz(javon);
        const L = javon.z1 - javon.z0;
        const E = javon.x1 - javon.x0;
        return (
          <>
            {[-1, 1].flatMap((sz) => [-1, 1].map((sx) => <Quti key={`${sx}${sz}`} o={[0.03, javon.h, 0.03]} p={[cx + sx * (E / 2 - 0.02), Y + javon.h / 2, cz + sz * (L / 2 - 0.02)]} mat={mm.zanglamas} />))}
            {[0.25, 0.6, 0.95, 1.3].map((h, i) => (
              <group key={h}>
                <Quti o={[E, 0.02, L]} p={[cx, Y + h, cz]} mat={mm.zanglamas} />
                {i % 2 === 0 && <Quti o={[0.32, 0.025, 0.42]} p={[cx, Y + h + 0.022, cz - 0.3 + i * 0.15]} mat={mm.patnis} />}
              </group>
            ))}
          </>
        );
      })()}
      {/* Menyu taxtasi (shimoliy devorda) */}
      <Quti o={[2.4, 0.8, 0.03]} p={[42.7, Y + 1.95, MAISHIY_XONALARI.oshxona.z0 + 0.015]} mat={mm.menyu} />
      {/* Ovqatlanayotganlar oldidagi patnislar */}
      {PATNISLAR.map(([x, y, z], i) => (
        <group key={i}>
          <Quti o={[0.42, 0.02, 0.32]} p={[x, y + 0.01, z]} mat={mm.patnis} />
          <Silindr r={0.11} h={0.02} p={[x - 0.06, y + 0.03, z]} mat={mm.sopol} seg={20} />
          <Silindr r={0.08} h={0.03} p={[x - 0.06, y + 0.045, z]} mat={mm.ovqat[i % mm.ovqat.length]} seg={16} />
          <Silindr r={0.035} h={0.08} p={[x + 0.13, y + 0.06, z - 0.06]} mat={mm.sopol} seg={12} />
          <Quti o={[0.12, 0.04, 0.08]} p={[x + 0.12, y + 0.04, z + 0.07]} mat={mm.reyka} />
        </group>
      ))}
    </>
  );
}

/** Vestibyul: tabel (yuzni tanish) terminali, suv kuleri, e'lonlar taxtasi, o't o'chirgichlar. */
function Vestibyul({ mm, m }: { mm: MaishiyMateriallari; m: Materiallar }) {
  const t = (nom: string) => MAISHIY_TOSIQLARI.find((x) => x.nom === nom);
  const term = t("terminal");
  const kuler = t("kuler");
  return (
    <>
      {term && (
        <>
          <Quti o={[0.3, 0.04, 0.3]} p={[(term.x0 + term.x1) / 2, Y + 0.02, (term.z0 + term.z1) / 2]} mat={mm.korpus} />
          <Quti o={[0.08, 1.2, 0.08]} p={[(term.x0 + term.x1) / 2, Y + 0.6, (term.z0 + term.z1) / 2]} mat={mm.korpus} />
          <Yumaloq o={[0.06, 0.3, 0.2]} p={[(term.x0 + term.x1) / 2, Y + 1.32, (term.z0 + term.z1) / 2]} mat={mm.korpus} radius={0.02} />
          <Quti o={[0.01, 0.2, 0.14]} p={[term.x0 + 0.115, Y + 1.32, (term.z0 + term.z1) / 2]} mat={m.ekran} />
        </>
      )}
      {kuler && (
        <>
          <Quti o={[0.36, 0.95, 0.36]} p={[(kuler.x0 + kuler.x1) / 2, Y + 0.475, (kuler.z0 + kuler.z1) / 2]} mat={mm.oqMebel} />
          <Silindr r={0.15} h={0.42} p={[(kuler.x0 + kuler.x1) / 2, Y + 1.16, (kuler.z0 + kuler.z1) / 2]} mat={mm.oyna} seg={16} />
        </>
      )}
      <Quti o={[0.02, 1.0, 1.6]} p={[52.07, Y + 1.5, -4.0]} mat={mm.taxta} />
      {[[-4.5, 1.7], [-3.9, 1.65], [-3.4, 1.75], [-4.3, 1.25], [-3.7, 1.3]].map(([z, h]) => <Quti key={`${z}${h}`} o={[0.005, 0.28, 0.21]} p={[52.082, Y + h, z]} mat={mm.sopol} />)}
      <Silindr r={0.08} h={0.5} p={[52.25, Y + 0.45, -7.0]} mat={m.qizil} seg={12} />
      <Silindr r={0.08} h={0.5} p={[40.45, Y + 0.45, -7.0]} mat={m.qizil} seg={12} />
    </>
  );
}

/** Yopiq galereya (maishiy blok ↔ sex): beton pol, pastki panel, lenta oyna, tekis tom, ichida LED chiroqlar. */
function Galereya({ mm }: { mm: MaishiyMateriallari }) {
  const g = GALEREYA;
  const L = g.x1 - g.x0;
  const cx = (g.x0 + g.x1) / 2;
  const cz = (g.z0 + g.z1) / 2;
  const tomY = 3.0;
  return (
    <>
      <OlchamliQuti o={[L, 0.05, g.z1 - g.z0]} p={[cx, 0.025, cz]} mat={mm.linoleum} tile={2} />
      {[g.z0 + 0.06, g.z1 - 0.06].map((z) => (
        <group key={z}>
          <Quti o={[L, 0.9, 0.12]} p={[cx, 0.45, z]} mat={mm.tashqiDevor} />
          <Oyna o={[L, 1.6, 0.02]} p={[cx, 0.9 + 0.8, z]} mat={mm.oyna} />
          <Quti o={[L, tomY - 2.5, 0.12]} p={[cx, 2.5 + (tomY - 2.5) / 2, z]} mat={mm.tashqiDevor} />
          <Quti o={[L, 0.04, 0.2]} p={[cx, 0.92, z]} mat={mm.alyumin} />
          {Array.from({ length: 6 }, (_, i) => <Quti key={i} o={[0.06, 1.6, 0.1]} p={[g.x0 + (i * L) / 5, 1.7, z]} mat={mm.alyumin} />)}
          <Quti o={[L, 0.3, 0.03]} p={[cx, 0.15, z + (z < cz ? -0.075 : 0.075)]} mat={mm.sokol} />
        </group>
      ))}
      <Quti o={[L, 0.2, g.z1 - g.z0 + 0.5]} p={[cx, tomY + 0.1, cz]} mat={mm.tom} />
      {[g.z0 - 0.25, g.z1 + 0.25].map((z) => <Quti key={z} o={[L, 0.3, 0.05]} p={[cx, tomY + 0.1, z]} mat={mm.parapet} />)}
      {[g.x0 + 1.5, cx, g.x1 - 1.5].map((x) => <Oyna key={x} o={[1.2, 0.02, 0.3]} p={[x, tomY - 0.011, cz]} mat={mm.ledPanel} />)}
    </>
  );
}

/** Maishiy blok: kiyinish xonalari, dush, hojatxona, tibbiyot, oshxona va galereya; ichida mebel va odamlar. */
export default function Maishiy({ m }: { m: Materiallar }) {
  const mm = useMemo(() => maishiyMateriallariYarat(), []);
  useEffect(() => () => materiallarniTozala(mm), [mm]);
  const shkaf = useMemo(() => shkafchaGeometriyalari(SHKAFCHA_QATORLARI, Y), []);
  useEffect(() => () => Object.values(shkaf).forEach((g) => g.dispose()), [shkaf]);
  return (
    <group>
      <StatikGuruh>
        <Pollar mm={mm} />
        <TashqiDevorlar mm={mm} />
        <IchkiDevorlar mm={mm} />
        <Kafellar mm={mm} />
        <Skameykalar mm={mm} />
        <Hojatxonalar mm={mm} />
        <Kozgular mm={mm} />
        <Tibbiyot mm={mm} />
        <Oshxona mm={mm} />
        <Vestibyul mm={mm} m={m} />
        <Galereya mm={mm} />
      </StatikGuruh>
      {/* Raqamli metall shkafchalar: korpus, eshiklar (atlas tekstura), sokol */}
      <mesh geometry={shkaf.korpus} material={mm.shkafKorpus} castShadow receiveShadow />
      <mesh geometry={shkaf.eshik} material={mm.shkafEshik} castShadow receiveShadow />
      <mesh geometry={shkaf.tag} material={mm.shkafTag} receiveShadow />
      <Suspense fallback={null}>
        <MebelToplami joylar={MAISHIY_MEBELLARI} />
      </Suspense>
      <Suspense fallback={null}>
        {MAISHIY_ODAMLARI.map((o, i) => (
          <GlbOdam key={i} tur={o.tur} harakat={o.harakat} p={o.p} burilish={o.burilish} faza={o.faza} orindiq={o.orindiq} />
        ))}
        {MAISHIY_YURUVCHILARI.map((y, i) => (
          <YuruvchiGlbOdam key={`y${i}`} tur={y.tur} nuqtalar={y.nuqtalar} y={y.y} tezlik={y.tezlik} toxtash={y.toxtash} toxtashHarakati={y.toxtashHarakati} faza={y.faza} />
        ))}
      </Suspense>
    </group>
  );
}
