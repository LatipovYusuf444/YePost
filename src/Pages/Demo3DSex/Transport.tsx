import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { SEX_ENI, urugli, type Materiallar } from "./materiallar";
import { raqamTeksturasi, type ShaharMateriallari } from "./shaharMateriallari";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { Ishchi, PogruzchikModeli } from "./Ishchilar";
import { ZonaYorligi } from "./SexMuhiti";
import { ASOSIY_YOL, DARVOZA, KPP, ORQA_YOL, RAMPA1, RAMPA2, SHLAGBAUM, TURARGOH } from "./hudud";
import { avtomobilGeometriyasi } from "./geometriyalar";
import { MARSHRUTLAR, marshrutHolati, yangiHolat } from "./yollar";
import type { Reys } from "./sexModeli";

// Hudud logistikasi: yuk mashinalari (reys ma'lumotidan), rampadagi pogruzchiklar, KPP shlagbaumi va qorovul,
// chap darvoza (2-rampa), turargoh va ko'chadagi avtomobillar. Mashina harakati reys bosqichi va `boshlangan` vaqtidan hisoblanadi.

type Reestr = {
  /** Ko'rinib turgan yuk mashinalarining joyi (shlagbaum, qorovul nigohi va ko'chadagi avtomobillar uchun). */
  mashinalar: Record<string, THREE.Vector3 | null>;
  /** Shlagbaumga eng yaqin mashina. */
  yaqin: { current: THREE.Vector3 | null };
};

const otganSoniya = (reys: Reys) => (Date.now() - reys.boshlangan) / 1000;

/** Furgondagi paletlar soni: jo'natishda yuklangan, qabulda hali tushirilmagan. */
function furgondagiPalet(reys: Reys) {
  if (reys.yonalish === "jonatish") return reys.bosqich === "rampada" ? reys.palet : reys.bosqich === "ketmoqda" ? reys.jamiPalet : 0;
  return reys.bosqich === "kelmoqda" ? reys.jamiPalet : reys.bosqich === "rampada" ? reys.jamiPalet - reys.palet : 0;
}

// ── Yuk mashinasi (furgonli, ~8.6 m; markaz — uzunlik o'rtasi, oldi +z) ──

const FURGON = { orqa: -4.3, old: 1.6, eni: 2.45, balandlik: 2.6, pol: 1.08 } as const;
const PALET_JOYI: Array<[number, number]> = [[-0.6, 0.95], [0.6, 0.95], [-0.6, -0.35], [0.6, -0.35], [-0.6, -1.65], [0.6, -1.65]];

function YukMashinasi({ m, sm, reys, reestr, yorliq }: { m: Materiallar; sm: ShaharMateriallari; reys: Reys; reestr: Reestr; yorliq: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const ildiz = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  const eshikChap = useRef<THREE.Group>(null);
  const eshikOng = useRef<THREE.Group>(null);
  const holat = useMemo(yangiHolat, []);
  const oxirgiMasofa = useRef<number | null>(null);
  const [korinadi, setKorinadi] = useState(false);
  const marshrut = MARSHRUTLAR[reys.rampa];
  const raqamMat = useMemo(() => new THREE.MeshStandardMaterial({ map: raqamTeksturasi(reys.raqam), roughness: 0.4 }), [reys.raqam]);
  useEffect(() => () => { raqamMat.map?.dispose(); raqamMat.dispose(); }, [raqamMat]);

  useFrame((_, dt) => {
    const g = ildiz.current;
    if (!g) return;
    const e = Math.max(0, otganSoniya(reys));
    let bor = reys.bosqich !== "yoq";
    if (reys.bosqich === "ketmoqda") {
      if (e > marshrut.ketish.davom) bor = false;
      else marshrutHolati(marshrut.ketish, e, holat);
    } else if (bor) {
      marshrutHolati(marshrut.kelish, reys.bosqich === "rampada" ? marshrut.kelish.davom + 1 : e, holat);
    }
    g.visible = bor;
    reestr.mashinalar[reys.id] = bor ? holat.p : null;
    if (bor !== korinadi) setKorinadi(bor);
    if (!bor) { oxirgiMasofa.current = null; return; }
    g.position.copy(holat.p);
    g.rotation.y = holat.burchak;
    const d = oxirgiMasofa.current === null ? 0 : holat.masofa - oxirgiMasofa.current;
    oxirgiMasofa.current = holat.masofa;
    if (Math.abs(d) < 3) goldiraklar.current?.children.forEach((w) => { w.rotation.x += (holat.orqaga ? -d : d) / 0.5; });
    // Orqa eshiklar rampada ochiladi.
    const ochiq = reys.bosqich === "rampada" ? 1 : 0;
    if (eshikChap.current) eshikChap.current.rotation.y = THREE.MathUtils.damp(eshikChap.current.rotation.y, -2.75 * ochiq, 3, dt);
    if (eshikOng.current) eshikOng.current.rotation.y = THREE.MathUtils.damp(eshikOng.current.rotation.y, 2.75 * ochiq, 3, dt);
  });

  const palet = furgondagiPalet(reys);
  const furgonUzunligi = FURGON.old - FURGON.orqa;
  const furgonZ = (FURGON.old + FURGON.orqa) / 2;
  const furgonY = FURGON.pol + FURGON.balandlik / 2;
  const holatMatni = reys.bosqich === "rampada" ? t(`logistics.rampada_${reys.yonalish}`) : t(`logistics.${reys.bosqich}`);
  return (
    <group ref={ildiz} visible={false}>
      <StatikGuruh>
      {/* Rama va furgon */}
      <Quti o={[0.95, 0.22, 7.9]} p={[0, 0.78, -0.2]} mat={sm.rama} />
      <Quti o={[FURGON.eni, 0.1, furgonUzunligi]} p={[0, FURGON.pol - 0.05, furgonZ]} mat={sm.rama} />
      {[-1, 1].map((yon) => <Quti key={yon} o={[0.05, FURGON.balandlik, furgonUzunligi]} p={[(yon * FURGON.eni) / 2, furgonY, furgonZ]} mat={sm.furgon} />)}
      <Quti o={[FURGON.eni, 0.06, furgonUzunligi]} p={[0, FURGON.pol + FURGON.balandlik, furgonZ]} mat={sm.furgonOq} />
      <Quti o={[FURGON.eni, FURGON.balandlik, 0.06]} p={[0, furgonY, FURGON.old]} mat={sm.furgonOq} />
      {/* Ichki qoplama (orqa eshik ochilganda ko'rinadi) */}
      <mesh position={[0, furgonY, furgonZ]} material={sm.furgonIchi}>
        <boxGeometry args={[FURGON.eni - 0.1, FURGON.balandlik - 0.1, furgonUzunligi - 0.1]} />
      </mesh>
      {/* Orqa rom, eshiklar (ilgak burchaklarda), chiroqlar, raqam */}
      <Quti o={[FURGON.eni + 0.04, 0.1, 0.08]} p={[0, FURGON.pol + FURGON.balandlik - 0.02, FURGON.orqa]} mat={sm.rama} />
      {[-1.0, 1.0].map((x) => <Quti key={x} o={[0.3, 0.14, 0.05]} p={[x, 0.95, FURGON.orqa - 0.02]} mat={sm.orqaChiroq} />)}
      <mesh position={[0, 0.72, FURGON.orqa - 0.05]} rotation={[0, Math.PI, 0]} material={raqamMat}>
        <planeGeometry args={[0.52, 0.114]} />
      </mesh>
      {/* Kabina */}
      <Yumaloq o={[2.3, 1.55, 2.35]} p={[0, 1.78, 2.95]} mat={reys.rampa === 1 ? sm.kabinaKok : sm.kabina} radius={0.22} />
      <Yumaloq o={[2.3, 0.75, 2.4]} p={[0, 0.98, 2.98]} mat={sm.kabina} radius={0.12} />
      <Yumaloq o={[2.1, 0.5, 1.6]} p={[0, 2.72, 2.6]} r={[0.12, 0, 0]} mat={reys.rampa === 1 ? sm.kabinaKok : sm.kabina} radius={0.15} />
      <Quti o={[2.0, 0.85, 0.04]} p={[0, 2.08, 4.13]} r={[-0.08, 0, 0]} mat={sm.mashinaOyna} />
      {[-1, 1].map((yon) => (
        <group key={yon}>
          <Quti o={[0.04, 0.62, 1.0]} p={[yon * 1.16, 2.1, 3.25]} mat={sm.mashinaOyna} />
          <Quti o={[0.06, 0.32, 0.06]} p={[yon * 1.36, 2.15, 3.95]} mat={sm.rama} />
          <Quti o={[0.06, 0.32, 0.16]} p={[yon * 1.42, 2.15, 3.85]} mat={sm.mashinaOyna} />
          <Quti o={[0.45, 0.16, 0.05]} p={[yon * 0.82, 1.05, 4.18]} mat={sm.oldChiroq} />
          <Quti o={[0.4, 0.05, 0.25]} p={[yon * 0.95, 0.55, 2.2]} mat={sm.rama} />
        </group>
      ))}
      <Quti o={[1.3, 0.45, 0.05]} p={[0, 1.42, 4.17]} mat={sm.rama} />
      <Quti o={[2.4, 0.3, 0.22]} p={[0, 0.66, 4.2]} mat={sm.rama} />
      <mesh position={[0, 0.66, 4.32]} material={raqamMat}>
        <planeGeometry args={[0.52, 0.114]} />
      </mesh>
      <mesh position={[0.55, 1.95, 3.85]} rotation={[0.9, 0, 0]} material={sm.rama}>
        <torusGeometry args={[0.2, 0.025, 8, 24]} />
      </mesh>
      {[-1.1, 1.1].map((x) => <Quti key={x} o={[0.55, 0.45, 0.03]} p={[x, 0.45, -3.05]} mat={sm.rama} />)}
      </StatikGuruh>
      <group ref={eshikChap} position={[FURGON.eni / 2, furgonY, FURGON.orqa - 0.03]}>
        <Quti o={[1.2, FURGON.balandlik - 0.12, 0.04]} p={[-0.6, 0, 0]} mat={sm.furgonOq} />
        <Quti o={[0.04, FURGON.balandlik - 0.3, 0.05]} p={[-0.3, 0, -0.03]} mat={m.polat} />
      </group>
      <group ref={eshikOng} position={[-FURGON.eni / 2, furgonY, FURGON.orqa - 0.03]}>
        <Quti o={[1.2, FURGON.balandlik - 0.12, 0.04]} p={[0.6, 0, 0]} mat={sm.furgonOq} />
        <Quti o={[0.04, FURGON.balandlik - 0.3, 0.05]} p={[0.3, 0, -0.03]} mat={m.polat} />
      </group>
      {/* Yuk: paletlar (jo'natishda — qadoqlangan mebel, qabulda — LDSP listlar) */}
      {PALET_JOYI.slice(0, palet).map(([x, z], i) => (
        <group key={i} position={[x, FURGON.pol, z]}>
          <Quti o={[1.0, 0.12, 1.15]} p={[0, 0.06, 0]} mat={m.palet} />
          {reys.yonalish === "jonatish" ? (
            <>
              <Quti o={[0.95, 0.9, 1.1]} p={[0, 0.58, 0]} mat={m.karton} />
              <Quti o={[0.98, 0.94, 1.13]} p={[0, 0.58, 0]} mat={m.plyonka} />
            </>
          ) : (
            Array.from({ length: 10 }, (_, k) => <Quti key={k} o={[0.95, 0.03, 1.1]} p={[0, 0.14 + k * 0.033, 0]} mat={[m.lmdp, m.lmdpOq, m.lmdpYongoq][k % 3]} />)
          )}
        </group>
      ))}
      {/* Haydovchi (chap tomonda) */}
      <Ishchi mat={m} p={[0.55, 0.78, 3.3]} harakat="rul" ishlayapti turi={reys.rampa} kiyim="haydovchi" />
      {/* G'ildiraklar: oldi bitta, orqasi juft */}
      <group ref={goldiraklar}>
        {[[-1.05, 3.1], [1.05, 3.1], [-0.92, -2.4], [0.92, -2.4], [-1.22, -2.4], [1.22, -2.4]].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x, 0.5, z]}>
            <Silindr r={0.5} h={0.28} p={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={m.rezina} seg={22} />
            <Silindr r={0.27} h={0.29} p={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={m.polat} seg={16} />
          </group>
        ))}
      </group>
      {yorliq && korinadi && (
        <Html position={[0, 4.6, 0]} center zIndexRange={[15, 5]} style={{ pointerEvents: "none" }}>
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

// ── Rampadagi pogruzchik: reys rampada bo'lsa 3 marta borib keladi (har 7.5 s da 2 palet) ──

const silliq = (u: number) => u * u * (3 - 2 * u);

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
    let balandlik = yukla ? 0.25 : 0.05;
    let yukBor = yukla;
    if (faol) {
      if (f < 0.4) u = silliq(f / 0.4);
      else if (f < 0.5) {
        u = 1;
        const q = (f - 0.4) / 0.1;
        balandlik = yukla ? 0.25 - q * 0.2 : 0.05 + q * 0.25;
      } else if (f < 0.9) {
        u = 1 - silliq((f - 0.5) / 0.4);
        balandlik = yukla ? 0.05 : 0.3;
      } else {
        const q = (f - 0.9) / 0.1;
        balandlik = yukla ? 0.05 + q * 0.2 : 0.3 - q * 0.25;
      }
      yukBor = yukla ? f < 0.45 || f >= 0.9 : f >= 0.45 && f < 0.95;
    }
    if (ildiz.current) ildiz.current.position.set(boshi[0] + (oxiri[0] - boshi[0]) * u, 0, boshi[1] + (oxiri[1] - boshi[1]) * u);
    if (vilka.current) vilka.current.position.y = 0.12 + balandlik;
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

// ── 2-rampa: chap devordagi ko'tariluvchi (rolik) darvoza ──

const DEVOR_X = -SEX_ENI / 2;

function RolikDarvoza({ m, reys }: { m: Materiallar; reys?: Reys }) {
  const parda = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    let ochiq = 0;
    if (reys) {
      const e = otganSoniya(reys);
      if (reys.bosqich === "rampada") ochiq = 1;
      else if (reys.bosqich === "kelmoqda" && e > MARSHRUTLAR[2].kelish.davom - 5) ochiq = 1;
      else if (reys.bosqich === "ketmoqda" && e < 1.5) ochiq = 1;
    }
    if (parda.current) parda.current.scale.y = THREE.MathUtils.damp(parda.current.scale.y, 1 - 0.93 * ochiq, 1.6, dt);
  });
  return (
    <group ref={parda} position={[DEVOR_X + 0.18, 4.02, RAMPA2.z]}>
      <StatikGuruh>
        {Array.from({ length: 22 }, (_, i) => <Quti key={i} o={[0.05, 0.16, 4.0]} p={[0, -0.09 - i * 0.18, 0]} mat={i % 2 ? m.shkaf : m.oluk} />)}
      </StatikGuruh>
    </group>
  );
}

// ── KPP shlagbaumi ──

function Shlagbaum({ sm, m, reestr }: { sm: ShaharMateriallari; m: Materiallar; reestr: Reestr }) {
  const strela = useRef<THREE.Group>(null);
  const nuqta = useMemo(() => new THREE.Vector3(DARVOZA.x, 0, 27.5), []);
  useFrame((_, dt) => {
    let eng: THREE.Vector3 | null = null;
    let masofa = Infinity;
    for (const p of Object.values(reestr.mashinalar)) {
      if (!p) continue;
      const d = p.distanceTo(nuqta);
      if (d < masofa) { masofa = d; eng = p; }
    }
    reestr.yaqin.current = masofa < 45 ? eng : null;
    if (strela.current) strela.current.rotation.z = THREE.MathUtils.damp(strela.current.rotation.z, masofa < 13 ? -1.45 : 0, 2.2, dt);
  });
  return (
    <group position={[SHLAGBAUM.x, 0, SHLAGBAUM.z]}>
      <Yumaloq o={[0.42, 1.05, 0.42]} p={[0, 0.525, 0]} mat={sm.kppDevor} radius={0.05} />
      <Quti o={[0.44, 0.12, 0.44]} p={[0, 0.85, 0]} mat={m.qizil} />
      <group ref={strela} position={[0, 0.95, 0]}>
        <Quti o={[SHLAGBAUM.uzunlik, 0.1, 0.07]} p={[-SHLAGBAUM.uzunlik / 2 - 0.1, 0, 0]} mat={sm.shlagbaum} />
        <Silindr r={0.12} h={0.2} p={[0.1, 0, 0]} rot={[Math.PI / 2, 0, 0]} mat={m.korpusQora} seg={14} />
      </group>
      {/* Strela uchi tayanchi */}
      <Quti o={[0.08, 0.9, 0.08]} p={[-SHLAGBAUM.uzunlik - 0.2, 0.45, 0]} mat={sm.kppDevor} />
      <Quti o={[0.2, 0.06, 0.12]} p={[-SHLAGBAUM.uzunlik - 0.2, 0.9, 0]} mat={m.qizil} />
    </group>
  );
}

// ── Yengil avtomobillar: turargohdagilar va ko'chadagilar (instancing — barcha mashina 5 ta draw call) ──
// Ko'chadagilar qatorda bir-biriga va yuk mashinasiga yaqinlashsa sekinlashadi / to'xtaydi.

type Qator = { z: number; yon: number };
const QATORLAR: Qator[] = [...ASOSIY_YOL.qatorlar, ...ORQA_YOL.qatorlar];
const CHEGARA = 240;
const KUZOV_RANGLARI = ["#f8fafc", "#eef2f6", "#e5e7eb", "#9ca3af", "#111827", "#1f2937", "#b91c1c", "#1d4ed8", "#f8fafc", "#d1d5db"];
const AVTOMOBILLAR = Array.from({ length: 14 }, (_, i) => ({
  qator: QATORLAR[i < 4 ? 0 : i < 8 ? 1 : i < 11 ? 2 : 3],
  x0: -CHEGARA + ((i * 131) % (CHEGARA * 2)),
  tezlik: 9 + ((i * 37) % 50) / 10,
  rang: (i * 7) % KUZOV_RANGLARI.length,
}));

/** Xodimlar avtoturargohi: 2 qator × 7 joy, ba'zilari band. */
function turargohMashinalari() {
  const rnd = urugli(77);
  const joylar: Array<{ x: number; z: number; burchak: number; rang: number }> = [];
  TURARGOH.qatorlar.forEach((dz, q) => {
    for (let i = 0; i < TURARGOH.joylar; i++) {
      if (rnd() < 0.3) continue;
      joylar.push({ x: TURARGOH.x - ((TURARGOH.joylar - 1) * TURARGOH.qadam) / 2 + i * TURARGOH.qadam, z: TURARGOH.z + dz * 1.55, burchak: q === 0 ? 0 : Math.PI, rang: Math.floor(rnd() * KUZOV_RANGLARI.length) });
    }
  });
  return joylar;
}

const Y_OQI = new THREE.Vector3(0, 1, 0);
const BIRLIK = new THREE.Vector3(1, 1, 1);

function Avtomobillar({ sm, reestr }: { sm: ShaharMateriallari; reestr: Reestr }) {
  const turgan = useMemo(turargohMashinalari, []);
  const qismlar = useMemo(() => {
    const g = avtomobilGeometriyasi();
    const soni = turgan.length + AVTOMOBILLAR.length;
    const yasa = (geo: THREE.BufferGeometry, material: THREE.Material) => {
      const im = new THREE.InstancedMesh(geo, material, soni);
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      return im;
    };
    const kuzov = yasa(g.kuzov, sm.kuzovOq);
    const hammasi = [kuzov, yasa(g.oyna, sm.mashinaOyna), yasa(g.oldChiroq, sm.oldChiroq), yasa(g.orqaChiroq, sm.orqaChiroq), yasa(g.rama, sm.rama)];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const rang = new THREE.Color();
    turgan.forEach((t, i) => {
      m4.compose(new THREE.Vector3(t.x, 0, t.z), q.setFromAxisAngle(Y_OQI, t.burchak), BIRLIK);
      hammasi.forEach((im) => im.setMatrixAt(i, m4));
      kuzov.setColorAt(i, rang.set(KUZOV_RANGLARI[t.rang]));
    });
    AVTOMOBILLAR.forEach((a, k) => kuzov.setColorAt(turgan.length + k, rang.set(KUZOV_RANGLARI[a.rang])));
    return hammasi;
  }, [sm, turgan]);
  useEffect(() => () => qismlar.forEach((im) => im.dispose()), [qismlar]);
  const holatlar = useRef(AVTOMOBILLAR.map((a) => ({ x: a.x0, v: a.tezlik })));
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const aylanish = useMemo(() => [new THREE.Quaternion().setFromAxisAngle(Y_OQI, -Math.PI / 2), new THREE.Quaternion().setFromAxisAngle(Y_OQI, Math.PI / 2)], []);
  const joy = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dtXom) => {
    const dt = Math.min(0.1, dtXom);
    const h = holatlar.current;
    AVTOMOBILLAR.forEach((a, i) => {
      const { z, yon } = a.qator;
      let bosh = Infinity;
      AVTOMOBILLAR.forEach((c, j) => {
        if (j === i || c.qator !== a.qator) return;
        let d = (h[j].x - h[i].x) * yon;
        if (d <= 0) d += CHEGARA * 2;
        bosh = Math.min(bosh, d);
      });
      for (const p of Object.values(reestr.mashinalar)) {
        if (!p || Math.abs(p.z - z) > 2.6) continue;
        const d = (p.x - h[i].x) * yon;
        if (d > 0) bosh = Math.min(bosh, d - 3);
      }
      const maqsad = a.tezlik * THREE.MathUtils.clamp((bosh - 7) / 12, 0, 1);
      h[i].v = THREE.MathUtils.damp(h[i].v, maqsad, maqsad < h[i].v ? 4 : 1.2, dt);
      h[i].x += yon * h[i].v * dt;
      if (h[i].x > CHEGARA) h[i].x -= CHEGARA * 2;
      if (h[i].x < -CHEGARA) h[i].x += CHEGARA * 2;
      m4.compose(joy.set(h[i].x, 0, z), aylanish[yon > 0 ? 1 : 0], BIRLIK);
      qismlar.forEach((im) => im.setMatrixAt(turgan.length + i, m4));
    });
    qismlar.forEach((im) => { im.instanceMatrix.needsUpdate = true; });
  });
  return (
    <>
      {qismlar.map((im, i) => <primitive key={i} object={im} />)}
    </>
  );
}

const rampaBand = (reys?: Reys) => reys?.bosqich === "kelmoqda" || reys?.bosqich === "rampada";

/** Hudud logistikasi: reyslar bo'yicha yuk mashinalari, rampa pogruzchiklari, shlagbaum, qorovul, signalchi, darvoza, ko'cha harakati. */
export default function Logistika({ m, sm, reyslar, yorliq }: { m: Materiallar; sm: ShaharMateriallari; reyslar: Reys[]; yorliq: boolean }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const reestr = useMemo<Reestr>(() => ({ mashinalar: {}, yaqin: { current: null } }), []);
  const rampa1 = reyslar.find((r) => r.rampa === 1);
  const rampa2 = reyslar.find((r) => r.rampa === 2);
  const signal = rampa1?.bosqich === "kelmoqda" || rampa1?.bosqich === "rampada";
  return (
    <group>
      {reyslar.map((reys) => <YukMashinasi key={reys.id} m={m} sm={sm} reys={reys} reestr={reestr} yorliq={yorliq} />)}
      <RampaPogruzchigi m={m} reys={rampa1} boshi={[RAMPA1.x, 4.4]} oxiri={[RAMPA1.x, RAMPA1.z - 0.65]} burilish={0} yukla />
      <RampaPogruzchigi m={m} reys={rampa2} boshi={[-12.2, RAMPA2.z]} oxiri={[RAMPA2.x + 0.1, RAMPA2.z]} burilish={-Math.PI / 2} yukla={false} />
      <RolikDarvoza m={m} reys={rampa2} />
      {/* Rampa yorlig'i — rampa bo'sh bo'lganda (mashina kelayotganda va turganda uning o'z yorlig'i ko'rinadi) */}
      {!rampaBand(rampa1) && <ZonaYorligi p={[RAMPA1.x, 3.6, RAMPA1.z + 1.2]} matn={t("zones.dock1")} rang="#0f766e" />}
      {!rampaBand(rampa2) && <ZonaYorligi p={[RAMPA2.x - 2, 5.2, RAMPA2.z]} matn={t("zones.dock2")} rang="#0f766e" />}
      <Shlagbaum sm={sm} m={m} reestr={reestr} />
      {/* Qorovul: KPP eshigi oldida, kelayotgan mashinaga qaraydi */}
      <Ishchi mat={m} p={[KPP.x - 1.9, 0, KPP.z + 1.2]} burilish={-Math.PI / 2} harakat="kuzatish" ishlayapti kiyim="qorovul" turi={1} nigoh={reestr.yaqin} />
      {/* 1-rampa signalchisi: mashina orqaga kirayotganda ishora qiladi, yuklashda planshetda tekshiradi */}
      <Ishchi mat={m} p={[RAMPA1.x - 2.9, 0, RAMPA1.z + 1.3]} burilish={Math.PI / 2} harakat={rampa1?.bosqich === "kelmoqda" ? "ishora" : "planshet"} ishlayapti={signal} kiyim="usta" turi={2} />
      <Avtomobillar sm={sm} reestr={reestr} />
    </group>
  );
}
