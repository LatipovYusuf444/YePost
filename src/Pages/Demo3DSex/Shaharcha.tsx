import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { urugli, type Materiallar } from "./materiallar";
import { FASAD_OLCHAMI, binoGeometriyasi, type ShaharMateriallari } from "./shaharMateriallari";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { ZonaYorligi } from "./SexMuhiti";
import { AVTOBUS_BEKATI, AVTO_SEX, HUDUD, KPP, RAMPALAR } from "./hudud";
import {
  BAYROQLAR,
  BETON_MAYDONLAR,
  BOG_YOLKALARI,
  DARVOZA_USTUNI_X,
  HUDUD_ASFALTI,
  KOCHA_ZEBRASI_X,
  KPP_OROLI,
  KUTISH_CHIZIQLARI,
  NAVIS,
  NAVIS_USTUNLARI,
  ORQA_JIHOZLAR,
  OROL_BALANDLIGI,
  PANJARA_BALANDLIGI,
  PANJARA_KESMALARI,
  PANJARA_QADAMI,
  PIYODA_YOLAKLARI,
  STRELKALAR,
  TASHQI_ASFALT,
  TASHQI_TROTUARLAR,
  TEZLIK_TOSIQLARI,
  TOXTASH_CHIZIQLARI,
  TROTUAR_ENI,
  TURARGOH_ASFALTI,
  XIZMAT_YOLI,
  X_KOCHALAR,
  YER_OLCHAMI,
  ZEBRALAR,
  Z_KOCHALAR,
  chiroqlarRejasi,
  daraxtlarRejasi,
  kochalarRejasi,
  panjaraUstunlari,
  shaharBinolari,
  tb,
  turargohChiziqlari,
  type Bino,
  type BinoTuri,
  type Daraxt,
  type KochaBolagi,
  type Tortburchak,
} from "./shaharRejasi";

// Zavod hududi va atrofdagi shaharcha (hammasi kod bilan): yer qoplamalari va yo'l belgilari, payvandlangan to'r panjara, ikki qatorli KPP
// (navis, turniketlar, kameralar), orqa hovli (kotelxona, mo'ri, transformator, qipiq silosi, gaz quvuri), tashqi avtoturargoh,
// avtobus bekati, ko'chalar, ko'p qavatli uylar, ofislar, omborlar, mahalla uylari, daraxtlar va ko'cha chiroqlari.
// Joylashuv rejasi — shaharRejasi.ts (sof hisob, testlanadi). Qimirlamaydigan qismlar StatikGuruh ichida (material bo'yicha birlashadi),
// uzoq shahar — bir nechta umumiy geometriya, daraxt va chiroqlar — instancing.

type V3 = [number, number, number];

/** Yer ustidagi sathlar (bir-birining ustiga tushadigan qatlamlar "titramasin"). */
const SATH = { asfalt: -0.012, beton: -0.006, piyoda: 0.002, belgi: 0.006 } as const;

/** Tekis yuza (to'rtburchak bo'yicha): UV dunyo koordinatasidan — qo'shni bo'laklarda tekstura uzilmaydi. */
function Yuza({ t, y, mat, tile = 8, soya = true }: { t: Tortburchak; y: number; mat: THREE.Material; tile?: number; soya?: boolean }) {
  const { x0, x1, z0, z1 } = t;
  const g = useMemo(() => {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d);
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      const x = (x0 + x1) / 2 + pos.getX(i);
      const z = (z0 + z1) / 2 - pos.getY(i);
      uv.setXY(i, x / tile, -z / tile);
    }
    return geo;
  }, [x0, x1, z0, z1, tile]);
  useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} material={mat} position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={soya} />;
}

/** Yerga chizilgan belgi (chiziq, zebra bo'lagi): w — x bo'ylab, d — z bo'ylab. */
function Belgi({ x, z, w, d, mat, y = SATH.belgi }: { x: number; z: number; w: number; d: number; mat: THREE.Material; y?: number }) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

/** Ikki nuqta orasidagi quvur yoki tros. */
function Truba({ a, b, r, mat, seg = 10, soya = true }: { a: V3; b: V3; r: number; mat: THREE.Material; seg?: number; soya?: boolean }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const yon = vb.clone().sub(va);
  const l = yon.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), yon.normalize());
  return (
    <mesh position={va.add(vb).multiplyScalar(0.5)} quaternion={q} material={mat} castShadow={soya} receiveShadow>
      <cylinderGeometry args={[r, r, l, seg]} />
    </mesh>
  );
}

/** Fasad teksturasi takrorlanadigan quti (g'isht devor va h.k.). */
function TekstQuti({ o, p, mat, tile }: { o: V3; p: V3; mat: THREE.Material; tile: [number, number] }) {
  const [w, h, d] = o;
  const [tw, th] = tile;
  const g = useMemo(() => binoGeometriyasi(w, h, d, tw, th), [w, h, d, tw, th]);
  useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} position={p} material={mat} castShadow receiveShadow />;
}

// ── Ko'chalar ──

/** To'rtburchak ichidan uzilishlarni chiqarib, qolgan bo'laklar (o'q bo'ylab, ko'cha markaziga nisbatan). */
function bolaklar(k: KochaBolagi, yon: -1 | 1): Array<[number, number]> {
  const markazO = k.boylab === "x" ? k.markaz[0] : k.markaz[1];
  const uz = k.uzilishlar.filter((u) => u.yon === 0 || u.yon === yon).map((u) => [u.a - markazO, u.c - markazO] as [number, number]).sort((a, c) => a[0] - c[0]);
  const natija: Array<[number, number]> = [];
  let bosh = -k.uzunlik / 2;
  for (const [a, c] of uz) {
    if (a > bosh) natija.push([bosh, Math.min(a, k.uzunlik / 2)]);
    bosh = Math.max(bosh, c);
  }
  if (bosh < k.uzunlik / 2) natija.push([bosh, k.uzunlik / 2]);
  return natija.filter(([a, c]) => c - a > 0.3);
}

/** Bitta ko'cha bo'lagi: asfalt, o'rtada uzuq chiziq, chekka chiziqlar, ikki tomonda trotuar va bordyur (chorraha va kirish yo'llarida uziladi). */
function Kocha({ sm, k }: { sm: ShaharMateriallari; k: KochaBolagi }) {
  const [cx, cz] = k.markaz;
  const xB = k.boylab === "x";
  const L = k.uzunlik;
  const yarim = k.eni / 2;
  /** O'q bo'ylab (u0…u1) va ko'ndalang (v0…v1) oraliqdan to'rtburchak. */
  const tort = (u0: number, u1: number, v0: number, v1: number) => (xB ? tb(cx + u0, cx + u1, cz + v0, cz + v1) : tb(cx + v0, cx + v1, cz + u0, cz + u1));
  const uzuqGeo = useMemo(() => {
    // Uzuq chiziq: tekstura uzunlik bo'ylab har 6 m da takrorlanadi.
    const geo = new THREE.PlaneGeometry(xB ? L : 0.15, xB ? 0.15 : L);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ((xB ? uv.getX(i) : uv.getY(i)) * L) / 6, 0.5);
    return geo;
  }, [L, xB]);
  useEffect(() => () => uzuqGeo.dispose(), [uzuqGeo]);
  return (
    <group>
      <Yuza t={tort(-L / 2, L / 2, -yarim, yarim)} y={0.004} mat={sm.yolAsfalt} tile={8} />
      <mesh geometry={uzuqGeo} material={sm.uzuqChiziq} position={[cx, 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]} />
      {([-1, 1] as const).map((yon) => bolaklar(k, yon).map(([a, c]) => {
        const bordyur = tort(a, c, yon * yarim, yon * (yarim + 0.2));
        return (
          <group key={`${yon}${a}`}>
            <Yuza t={tort(a, c, Math.min(yon * (yarim - 0.43), yon * (yarim - 0.28)), Math.max(yon * (yarim - 0.43), yon * (yarim - 0.28)))} y={0.012} mat={sm.belgiOq} />
            <Yuza t={tort(a, c, Math.min(yon * yarim, yon * (yarim + TROTUAR_ENI)), Math.max(yon * yarim, yon * (yarim + TROTUAR_ENI)))} y={0.12} mat={sm.trotuar} tile={2} />
            <mesh position={[(bordyur.x0 + bordyur.x1) / 2, 0.07, (bordyur.z0 + bordyur.z1) / 2]} material={sm.bordyur} receiveShadow>
              <boxGeometry args={[Math.abs(bordyur.x1 - bordyur.x0), 0.15, Math.abs(bordyur.z1 - bordyur.z0)]} />
            </mesh>
          </group>
        );
      }))}
    </group>
  );
}

/** Zebra: chiziqlar harakat yo'nalishiga parallel. `boylab` — chiziqlar qaysi o'q bo'ylab cho'zilgan. */
function Zebra({ t, boylab, mat }: { t: Tortburchak; boylab: "x" | "z"; mat: THREE.Material }) {
  const qadam = 1.0;
  const kenglik = boylab === "z" ? t.x1 - t.x0 : t.z1 - t.z0;
  const son = Math.max(1, Math.floor((kenglik + 0.5) / qadam));
  const bosh = (boylab === "z" ? t.x0 : t.z0) + (kenglik - (son - 1) * qadam) / 2;
  return (
    <>
      {Array.from({ length: son }, (_, i) => {
        const q = bosh + i * qadam;
        return boylab === "z"
          ? <Belgi key={i} x={q} z={(t.z0 + t.z1) / 2} w={0.5} d={t.z1 - t.z0} mat={mat} />
          : <Belgi key={i} x={(t.x0 + t.x1) / 2} z={q} w={t.x1 - t.x0} d={0.5} mat={mat} />;
      })}
    </>
  );
}

function Kochalar({ sm }: { sm: ShaharMateriallari }) {
  const rejasi = useMemo(() => kochalarRejasi(), []);
  const asosiy = X_KOCHALAR[0];
  return (
    <StatikGuruh>
      {rejasi.map((k) => <Kocha key={`${k.boylab}${k.markaz[0]}|${k.markaz[1]}`} sm={sm} k={k} />)}
      {/* Avtobus bekati yonidagi piyodalar o'tish joyi */}
      <Zebra t={tb(KOCHA_ZEBRASI_X - 1.6, KOCHA_ZEBRASI_X + 1.6, asosiy.z - asosiy.eni / 2 + 0.5, asosiy.z + asosiy.eni / 2 - 0.5)} boylab="x" mat={sm.belgiOq} />
      {/* Hudud burchaklaridagi chorrahalarda zebralar (asosiy va orqa ko'cha × ko'ndalang ko'chalar) */}
      {X_KOCHALAR.slice(0, 2).flatMap((xk) => Z_KOCHALAR.slice(0, 2).flatMap((zk) => {
        const qolgan = zk.eni / 2 + TROTUAR_ENI + 1.8;
        const kocha = xk.eni / 2 + TROTUAR_ENI + 1.8;
        return [-1, 1].flatMap((s) => [
          <Zebra key={`a${xk.z}${zk.x}${s}`} t={tb(zk.x + s * qolgan - 1.5, zk.x + s * qolgan + 1.5, xk.z - xk.eni / 2 + 0.5, xk.z + xk.eni / 2 - 0.5)} boylab="x" mat={sm.belgiOq} />,
          <Zebra key={`b${xk.z}${zk.x}${s}`} t={tb(zk.x - zk.eni / 2 + 0.5, zk.x + zk.eni / 2 - 0.5, xk.z + s * kocha - 1.5, xk.z + s * kocha + 1.5)} boylab="z" mat={sm.belgiOq} />,
        ]);
      }))}
      {/* Old bog' yo'lkalari */}
      {BOG_YOLKALARI.map((t, i) => <Yuza key={i} t={t} y={0.02} mat={sm.trotuar} tile={2} />)}
    </StatikGuruh>
  );
}

// ── Hudud yeri: asfalt, beton, piyoda yo'laklari, yo'l belgilari ──

/** Yo'nalish strelkasi geometriyasi (yerda yotadi, −z ga qaraydi; uzunligi 4.6 m). */
function strelkaGeometriyasi() {
  const s = new THREE.Shape();
  s.moveTo(-0.15, -2.4);
  s.lineTo(0.15, -2.4);
  s.lineTo(0.15, 0.6);
  s.lineTo(0.55, 0.6);
  s.lineTo(0, 2.2);
  s.lineTo(-0.55, 0.6);
  s.lineTo(-0.15, 0.6);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

function HududYeri({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const strelka = useMemo(strelkaGeometriyasi, []);
  useEffect(() => () => strelka.dispose(), [strelka]);
  const old = [RAMPALAR[1], RAMPALAR[2]];
  const chap = [RAMPALAR[3], RAMPALAR[4]];
  return (
    <group>
      {HUDUD_ASFALTI.map((t, i) => <Yuza key={`a${i}`} t={t} y={SATH.asfalt} mat={sm.asfalt} />)}
      {TASHQI_ASFALT.map((t, i) => <Yuza key={`t${i}`} t={t} y={SATH.asfalt} mat={sm.asfalt} />)}
      {BETON_MAYDONLAR.map((t, i) => <Yuza key={`b${i}`} t={t} y={SATH.beton} mat={sm.betonMaydon} tile={6} />)}
      {PIYODA_YOLAKLARI.map((t, i) => <Yuza key={`p${i}`} t={t} y={SATH.piyoda} mat={sm.piyoda} tile={2} />)}
      {/* Piyoda yo'laklari chetidagi bordyur toshlari (asfalt bilan chegara) */}
      {PIYODA_YOLAKLARI.slice(0, 1).concat(PIYODA_YOLAKLARI.slice(3, 4)).map((t, i) => [t.z0, t.z1].map((z) => (
        <Belgi key={`pb${i}${z}`} x={(t.x0 + t.x1) / 2} z={z} w={t.x1 - t.x0} d={0.1} mat={sm.bordyur} />
      )))}

      {/* Tashqi trotuarlar (ko'tarilgan): bekatdan va avtoturargohdan KPP ga */}
      {TASHQI_TROTUARLAR.map((t, i) => (
        <group key={`tt${i}`}>
          <Yuza t={t} y={0.12} mat={sm.trotuar} tile={2} />
          <Quti o={[t.x1 - t.x0, 0.12, t.z1 - t.z0]} p={[(t.x0 + t.x1) / 2, 0.055, (t.z0 + t.z1) / 2]} mat={sm.bordyur} />
        </group>
      ))}

      {/* Zebralar: KPP yon eshiklaridan (z = 45.8) va tashqaridan KPP old eshigiga (z = 49.5) */}
      {ZEBRALAR.map((t, i) => <Zebra key={`z${i}`} t={t} boylab="z" mat={sm.belgiOq} />)}
      {/* To'xtash chiziqlari (shlagbaumlar oldida) */}
      {TOXTASH_CHIZIQLARI.map((c) => <Belgi key={`s${c.z}`} x={(c.x0 + c.x1) / 2} z={c.z} w={c.x1 - c.x0} d={0.4} mat={sm.belgiOq} />)}
      {/* Kirish yo'li: chekka chiziqlar va orol davomidagi qo'sh o'q chiziq */}
      {[-8.2, 8.2].map((x) => <Belgi key={`ch${x}`} x={x} z={57.3} w={0.15} d={13.4} mat={sm.belgiOq} />)}
      {[-0.12, 0.12].map((x) => <Belgi key={`oq${x}`} x={x} z={57.3} w={0.1} d={13.4} mat={sm.belgiSariq} />)}
      {/* Yo'nalish strelkalari */}
      {STRELKALAR.map(([x, z, b]) => (
        <group key={`st${x}|${z}`} position={[x, SATH.belgi, z]} rotation={[0, b, 0]}>
          <mesh geometry={strelka} material={sm.belgiOq} receiveShadow />
        </group>
      ))}
      {/* Sun'iy notekisliklar (rezina, sariq-qora bo'laklar) */}
      {TEZLIK_TOSIQLARI.map((t) => {
        const son = Math.round((t.x1 - t.x0) / 0.5);
        return Array.from({ length: son }, (_, i) => (
          <Yumaloq key={`tt${t.z}${i}`} o={[0.49, 0.06, 0.48]} p={[t.x0 + 0.25 + i * 0.5, 0.03, t.z]} mat={i % 2 ? m.qora : m.sariq} radius={0.025} />
        ));
      })}

      {/* Rampalar: sariq yo'naltiruvchi chiziqlar va to'xtash tasmasi (1, 2 — old devorda; 3, 4 — chap devorda) */}
      {old.map((r) => (
        <group key={`ro${r.x}`}>
          {[-1.75, 1.75].map((dx) => <Belgi key={dx} x={r.x + dx} z={r.z + 6.2} w={0.15} d={11.6} mat={sm.belgiSariq} />)}
          <Belgi x={r.x} z={r.z + 1.0} w={3.65} d={0.3} mat={sm.belgiSariq} />
          {[-0.9, 0.9].map((dx) => <Belgi key={`g${dx}`} x={r.x + dx} z={r.z + 3.6} w={0.2} d={1.6} mat={sm.belgiOq} />)}
        </group>
      ))}
      {chap.map((r) => (
        <group key={`rc${r.z}`}>
          {[-1.75, 1.75].map((dz) => <Belgi key={dz} x={r.x - 6.2} z={r.z + dz} w={11.6} d={0.15} mat={sm.belgiSariq} />)}
          <Belgi x={r.x - 1.0} z={r.z} w={0.3} d={3.65} mat={sm.belgiSariq} />
          {[-0.9, 0.9].map((dz) => <Belgi key={`g${dz}`} x={r.x - 3.6} z={r.z + dz} w={1.6} d={0.2} mat={sm.belgiOq} />)}
        </group>
      ))}
      {/* Yuk mashinalari kutish joylari (oldi panjaraga) */}
      {KUTISH_CHIZIQLARI.map((x) => <Belgi key={`k${x}`} x={x} z={39.7} w={0.15} d={9.4} mat={sm.belgiSariq} />)}
      <Belgi x={(KUTISH_CHIZIQLARI[0] + KUTISH_CHIZIQLARI[KUTISH_CHIZIQLARI.length - 1]) / 2} z={44.5} w={KUTISH_CHIZIQLARI[KUTISH_CHIZIQLARI.length - 1] - KUTISH_CHIZIQLARI[0]} d={0.3} mat={sm.belgiSariq} />

      {/* Tashqi avtoturargoh: joy chiziqlari, qatorlar orasidagi chiziq */}
      {turargohChiziqlari().map((c) => <Belgi key={`tg${c.x}|${c.z0}`} x={c.x} z={(c.z0 + c.z1) / 2} w={0.12} d={c.z1 - c.z0} mat={sm.belgiOq} />)}
      {[52.8 - 2.4, 58.7 + 2.4].map((z) => <Belgi key={`tq${z}`} x={(TURARGOH_ASFALTI.x0 + TURARGOH_ASFALTI.x1) / 2} z={z} w={TURARGOH_ASFALTI.x1 - TURARGOH_ASFALTI.x0 - 1} d={0.12} mat={sm.belgiOq} />)}
    </group>
  );
}

// ── Panjara va darvoza ──

/** Bir kesma panjara: beton poydevor (sokol) va payvandlangan to'r panellar (bitta tekislik, tekstura har 2.5 m da takrorlanadi). */
function PanjaraKesmasi({ sm, a, c }: { sm: ShaharMateriallari; a: readonly [number, number]; c: readonly [number, number] }) {
  const uzunlik = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.max(1, Math.round(uzunlik / PANJARA_QADAMI));
  const g = useMemo(() => {
    const geo = new THREE.PlaneGeometry(uzunlik, PANJARA_BALANDLIGI);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * n);
    return geo;
  }, [uzunlik, n]);
  useEffect(() => () => g.dispose(), [g]);
  const burchak = -Math.atan2(c[1] - a[1], c[0] - a[0]);
  const mx = (a[0] + c[0]) / 2;
  const mz = (a[1] + c[1]) / 2;
  return (
    <group position={[mx, 0, mz]} rotation={[0, burchak, 0]}>
      <mesh geometry={g} material={sm.panjara} position={[0, 0.27 + PANJARA_BALANDLIGI / 2, 0]} />
      <Quti o={[uzunlik, 0.25, 0.2]} p={[0, 0.125, 0]} mat={sm.beton} />
    </group>
  );
}

/** Panjara ustunlari (instancing): 60×40 mm profil, ustida qopqoq, panel mahkamlagichlari. */
function PanjaraUstunlari({ sm }: { sm: ShaharMateriallari }) {
  const mesh = useMemo(() => {
    const joylar = panjaraUstunlari();
    const qismlar = [new THREE.BoxGeometry(0.06, 2.45, 0.06).translate(0, 1.225, 0), new THREE.BoxGeometry(0.08, 0.03, 0.08).translate(0, 2.46, 0)];
    for (const y of [0.55, 1.35, 2.1]) qismlar.push(new THREE.BoxGeometry(0.09, 0.05, 0.09).translate(0, y, 0));
    const geo = mergeGeometries(qismlar, false);
    qismlar.forEach((q) => q.dispose());
    const im = new THREE.InstancedMesh(geo ?? new THREE.BoxGeometry(0.06, 2.45, 0.06), sm.panjaraUstun, joylar.length);
    const mtx = new THREE.Matrix4();
    joylar.forEach(([x, z], i) => im.setMatrixAt(i, mtx.makeTranslation(x, 0, z)));
    im.castShadow = true;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    return im;
  }, [sm]);
  useEffect(() => () => { mesh.geometry.dispose(); mesh.dispose(); }, [mesh]);
  return <primitive object={mesh} />;
}

/** Surma darvoza tabaqasi (ochiq holatda, panjara ichki tomonida). */
function SurmaDarvoza({ sm, m, x0, x1, z }: { sm: ShaharMateriallari; m: Materiallar; x0: number; x1: number; z: number }) {
  const uz = x1 - x0;
  const mx = (x0 + x1) / 2;
  return (
    <group position={[mx, 0, z]}>
      <mesh material={sm.panjara} position={[0, 1.1, 0]}>
        <planeGeometry args={[uz, 1.86]} />
      </mesh>
      <Quti o={[uz, 0.1, 0.08]} p={[0, 0.18, 0]} mat={sm.panjaraUstun} />
      <Quti o={[uz, 0.08, 0.08]} p={[0, 2.06, 0]} mat={sm.panjaraUstun} />
      {[-uz / 2, 0, uz / 2].map((dx) => <Quti key={dx} o={[0.08, 1.96, 0.08]} p={[dx, 1.12, 0]} mat={sm.panjaraUstun} />)}
      {/* Konsol rels va g'ildirak bloklari */}
      <Quti o={[uz, 0.12, 0.12]} p={[0, 0.08, 0]} mat={m.polatQora} />
      {[-uz / 2 + 1, uz / 2 - 1].map((dx) => <Quti key={`k${dx}`} o={[0.3, 0.16, 0.22]} p={[dx, 0.08, 0]} mat={m.korpusQora} />)}
    </group>
  );
}

function Panjara({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  return (
    <group>
      {PANJARA_KESMALARI.map(([a, c], i) => <PanjaraKesmasi key={i} sm={sm} a={a} c={c} />)}
      {/* Darvoza ustunlari: g'isht qoplamali, beton qopqoq, ustida chiroq */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * DARVOZA_USTUNI_X, 0, HUDUD.old]}>
          <TekstQuti o={[0.62, 2.8, 0.62]} p={[0, 1.4, 0]} mat={sm.gisht} tile={[2, 1]} />
          <Quti o={[0.76, 0.12, 0.76]} p={[0, 2.86, 0]} mat={sm.beton} />
          <Silindr r={0.06} h={0.2} p={[0, 3.02, 0]} mat={m.korpusQora} seg={10} />
          <mesh position={[0, 3.25, 0]} material={sm.chiroqBosh}>
            <sphereGeometry args={[0.17, 14, 10]} />
          </mesh>
          {/* Darvoza tabaqasi uchun yo'naltiruvchi rolik ustuni */}
          <Quti o={[0.14, 2.2, 0.14]} p={[s * 0.55, 1.1, -0.8]} mat={sm.panjaraUstun} />
        </group>
      ))}
      <SurmaDarvoza sm={sm} m={m} x0={-DARVOZA_USTUNI_X - 6.6} x1={-DARVOZA_USTUNI_X - 0.45} z={HUDUD.old - 0.45} />
      <SurmaDarvoza sm={sm} m={m} x0={DARVOZA_USTUNI_X + 0.45} x1={DARVOZA_USTUNI_X + 6.6} z={HUDUD.old - 0.45} />
    </group>
  );
}

// ── KPP ──

/**
 * KPP devori: pastki panel, lenta oyna (alyumin impostlar bilan), yuqori tasma, eshik o'rinlari. Mahalliy x — devor bo'ylab
 * (−L/2…L/2), +z — tashqariga. `eshiklar` — [markaz, eni].
 */
function KppDevori({ sm, m, L, eshiklar, p, burchak }: { sm: ShaharMateriallari; m: Materiallar; L: number; eshiklar: Array<[number, number]>; p: V3; burchak: number }) {
  const qalin = 0.18;
  const tz = -qalin / 2;
  // Yaxlit bo'laklar (eshiklar orasida)
  const yaxlit: Array<[number, number]> = [];
  let bosh = -L / 2;
  for (const [mk, en] of [...eshiklar].sort((a, c) => a[0] - c[0])) {
    yaxlit.push([bosh, mk - en / 2]);
    bosh = mk + en / 2;
  }
  yaxlit.push([bosh, L / 2]);
  return (
    <group position={p} rotation={[0, burchak, 0]}>
      {yaxlit.filter(([a, c]) => c - a > 0.05).map(([a, c]) => {
        const uz = c - a;
        const mx = (a + c) / 2;
        const son = Math.max(1, Math.round(uz / 1.15));
        return (
          <group key={a}>
            <Quti o={[uz, 0.95, qalin]} p={[mx, 0.475, tz]} mat={sm.sendvich} />
            <Quti o={[uz, 0.06, qalin + 0.06]} p={[mx, 0.97, tz]} mat={sm.alyumin} />
            <Quti o={[uz, 1.3, 0.03]} p={[mx, 1.65, tz]} mat={sm.kppOyna} />
            {Array.from({ length: son + 1 }, (_, i) => <Quti key={i} o={[0.06, 1.3, qalin]} p={[a + (uz * i) / son, 1.65, tz]} mat={sm.alyumin} />)}
          </group>
        );
      })}
      {eshiklar.map(([mk, en]) => (
        <group key={`e${mk}`}>
          {[-1, 1].map((s) => <Quti key={s} o={[0.07, 2.3, qalin + 0.02]} p={[mk + (s * en) / 2, 1.15, tz]} mat={sm.alyumin} />)}
          <Quti o={[en - 0.1, 2.18, 0.04]} p={[mk, 1.12, tz]} mat={sm.kppOyna} />
          <Quti o={[en - 0.1, 0.25, 0.05]} p={[mk, 0.14, tz]} mat={sm.alyumin} />
          <Quti o={[0.03, 0.9, 0.06]} p={[mk + en / 2 - 0.16, 1.05, 0.02]} mat={m.polat} />
        </group>
      ))}
      {/* Yuqori tasma */}
      <Quti o={[L, 0.72, qalin]} p={[0, 2.66, tz]} mat={sm.sendvich} />
    </group>
  );
}

/** Uch novdali turniket (zanglamas po'lat korpus). */
function Turniket({ m, p, burchak = 0 }: { m: Materiallar; p: V3; burchak?: number }) {
  return (
    <group position={p} rotation={[0, burchak, 0]}>
      <Yumaloq o={[0.28, 1.0, 0.62]} p={[0, 0.5, 0]} mat={m.polat} radius={0.04} />
      <Quti o={[0.2, 0.06, 0.3]} p={[0, 1.02, 0.08]} mat={m.ekran} />
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((b) => (
        <group key={b} position={[-0.15, 0.86, 0]} rotation={[b, 0, 0]}>
          <Silindr r={0.02} h={0.5} p={[-0.25, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={m.polat} seg={8} />
        </group>
      ))}
    </group>
  );
}

function KppBinosi({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const y0 = OROL_BALANDLIGI;
  const { z0, z1 } = KPP;
  const x0 = KPP.x - KPP.yarimEni;
  const x1 = KPP.x + KPP.yarimEni;
  const zm = (z0 + z1) / 2;
  const yonEshik = 45.8 - zm;
  return (
    <group>
      {/* Pol */}
      <Quti o={[x1 - x0, 0.04, z1 - z0]} p={[KPP.x, y0 + 0.02, zm]} mat={sm.beton} />
      {/* Devorlar: old (z1) va orqa (z0) eshiklar, yon eshiklar (x = ±2, z = 45.8) zebralarga chiqadi */}
      <KppDevori sm={sm} m={m} L={x1 - x0} eshiklar={[[0, 1.0]]} p={[KPP.x, y0, z1]} burchak={0} />
      <KppDevori sm={sm} m={m} L={x1 - x0} eshiklar={[[0, 0.9]]} p={[KPP.x, y0, z0]} burchak={Math.PI} />
      <KppDevori sm={sm} m={m} L={z1 - z0} eshiklar={[[yonEshik, 0.95]]} p={[x0, y0, zm]} burchak={-Math.PI / 2} />
      <KppDevori sm={sm} m={m} L={z1 - z0} eshiklar={[[-yonEshik, 0.95]]} p={[x1, y0, zm]} burchak={Math.PI / 2} />
      {[[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => <Quti key={`${x}${z}`} o={[0.22, 3.0, 0.22]} p={[x, y0 + 1.5, z]} mat={m.korpusQora} />)}
      {/* Tom: osilib turuvchi plita, ko'k qirra, konditsioner bloki, antenna */}
      <Quti o={[x1 - x0 + 0.7, 0.24, z1 - z0 + 0.7]} p={[KPP.x, y0 + 3.12, zm]} mat={sm.sendvich} />
      <Quti o={[x1 - x0 + 0.72, 0.1, z1 - z0 + 0.72]} p={[KPP.x, y0 + 3.0, zm]} mat={m.cncRang} />
      <Quti o={[0.9, 0.6, 0.4]} p={[0.8, y0 + 3.54, z0 + 1.2]} mat={sm.sendvich} />
      <Silindr r={0.22} h={0.04} p={[0.8, y0 + 3.6, z0 + 1.41]} rot={[Math.PI / 2, 0, 0]} mat={m.korpusQora} seg={16} />
      <Silindr r={0.02} h={1.4} p={[-1.4, y0 + 3.94, z0 + 0.6]} mat={m.polat} seg={6} />
      {/* Ichi: qorovul xonasi (orqa qism) — burchakli stol, monitorlar, kreslo, shkaf */}
      <Quti o={[0.62, 0.05, 3.2]} p={[x0 + 0.45, y0 + 0.76, z0 + 2.0]} mat={m.lmdpOq} />
      <Quti o={[0.56, 0.72, 0.05]} p={[x0 + 0.45, y0 + 0.38, z0 + 0.45]} mat={m.lmdpKul} />
      <Quti o={[0.56, 0.72, 0.05]} p={[x0 + 0.45, y0 + 0.38, z0 + 3.55]} mat={m.lmdpKul} />
      {[1.3, 2.0, 2.7].map((dz) => (
        <group key={dz}>
          <Quti o={[0.04, 0.34, 0.56]} p={[x0 + 0.3, y0 + 1.03, z0 + dz]} r={[0, 0, -0.08]} mat={m.ekran} />
          <Quti o={[0.08, 0.2, 0.06]} p={[x0 + 0.26, y0 + 0.86, z0 + dz]} mat={m.korpusQora} />
        </group>
      ))}
      <Quti o={[0.5, 0.06, 0.5]} p={[x0 + 1.15, y0 + 0.48, z0 + 2.0]} mat={m.korpusQora} />
      <Quti o={[0.08, 0.55, 0.48]} p={[x0 + 1.4, y0 + 0.8, z0 + 2.0]} mat={m.korpusQora} />
      <Silindr r={0.03} h={0.42} p={[x0 + 1.15, y0 + 0.24, z0 + 2.0]} mat={m.polat} seg={8} />
      <Quti o={[0.6, 1.9, 0.45]} p={[x1 - 0.45, y0 + 0.95, z0 + 0.4]} mat={m.shkaf} />
      <Quti o={[1.4, 0.05, 0.55]} p={[0.55, y0 + 0.76, z0 + 0.42]} mat={m.lmdpOq} />
      <Quti o={[0.5, 0.32, 0.04]} p={[0.55, y0 + 1.02, z0 + 0.25]} mat={m.ekran} />
      {/* Shisha to'siq (qorovul xonasi | piyoda o'tish qismi), kichik deraza */}
      <Quti o={[x1 - x0, 0.95, 0.08]} p={[KPP.x, y0 + 0.475, z0 + 4.4]} mat={sm.sendvich} />
      <Quti o={[x1 - x0, 1.9, 0.03]} p={[KPP.x, y0 + 1.9, z0 + 4.4]} mat={sm.kppOyna} />
      {[-1.4, -0.45, 0.45, 1.4].map((x) => <Quti key={x} o={[0.05, 1.9, 0.08]} p={[x, y0 + 1.9, z0 + 4.4]} mat={sm.alyumin} />)}
      <Quti o={[0.7, 0.04, 0.3]} p={[-0.9, y0 + 0.97, z0 + 4.4]} mat={m.lmdpOq} />
      {/* Piyoda qismi: turniketlar qatori va to'siqlar (old eshikdan kirib, yon eshiklardan zebraga chiqiladi) */}
      {/* Ikki o'tish joyi: novdalar −x tomonga (x ≈ 0 va x ≈ −1), chetlari to'siq bilan yopilgan */}
      <Turniket m={m} p={[0.45, y0, z1 - 0.75]} />
      <Turniket m={m} p={[-0.6, y0, z1 - 0.75]} />
      {([[0.6, 2.0], [-2.0, -1.3]] as const).map(([a, c]) => (
        <group key={`r${a}`}>
          <Quti o={[c - a, 0.04, 0.04]} p={[(a + c) / 2, y0 + 1.0, z1 - 0.75]} mat={m.polat} />
          <Quti o={[c - a, 0.03, 0.03]} p={[(a + c) / 2, y0 + 0.55, z1 - 0.75]} mat={m.polat} />
          {[a + 0.05, c - 0.05].map((x) => <Silindr key={x} r={0.025} h={1.0} p={[x, y0 + 0.5, z1 - 0.75]} mat={m.polat} seg={8} />)}
        </group>
      ))}
    </group>
  );
}

/** Navis: ikkala qatorni yopadigan soyabon — po'lat ustunlar, oq kompozit fasad ("KPP"), ostida LED panellar, qator svetoforlari, kameralar. */
function Navis({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const { x0, x1, z0, z1, past, baland } = NAVIS;
  const xm = (x0 + x1) / 2;
  const zm = (z0 + z1) / 2;
  const qalin = baland - past;
  return (
    <group>
      {NAVIS_USTUNLARI.map(([x, z]) => {
        const tashqi = Math.abs(x) > 5;
        const y0 = tashqi ? 0 : OROL_BALANDLIGI;
        return (
          <group key={`${x}${z}`} position={[x, y0, z]}>
            <Quti o={[0.3, past - y0, 0.3]} p={[0, (past - y0) / 2, 0]} mat={sm.alyumin} />
            <Quti o={[0.5, 0.04, 0.5]} p={[0, 0.02, 0]} mat={m.polatQora} />
            {tashqi && (
              <>
                <Quti o={[0.62, 0.35, 0.62]} p={[0, 0.175, 0]} mat={sm.beton} />
                {[0, 1, 2, 3].map((i) => <Quti key={i} o={[0.34, 0.22, 0.34]} p={[0, 0.46 + i * 0.22, 0]} mat={i % 2 ? m.qora : m.sariq} />)}
              </>
            )}
          </group>
        );
      })}
      {/* Tom qutisi va fasad tasmalari */}
      <Quti o={[x1 - x0, qalin, z1 - z0]} p={[xm, past + qalin / 2, zm]} mat={sm.sendvich} />
      <mesh position={[xm, past + qalin / 2, z1 + 0.012]} material={sm.navisFasad}>
        <planeGeometry args={[x1 - x0, qalin]} />
      </mesh>
      <mesh position={[xm, past + qalin / 2, z0 - 0.012]} rotation={[0, Math.PI, 0]} material={sm.navisFasad}>
        <planeGeometry args={[x1 - x0, qalin]} />
      </mesh>
      <Quti o={[x1 - x0 + 0.06, 0.08, z1 - z0 + 0.06]} p={[xm, baland + 0.02, zm]} mat={m.korpusQora} />
      {/* LED panellar: har qatorda 2 × 4 ta, orol ustida 2 ta */}
      {[-4.5, 4.5].flatMap((qx) => [-1.3, 1.3].flatMap((dx) => [39.9, 42.4, 44.9, 47.2].map((z) => (
        <mesh key={`${qx}${dx}${z}`} position={[qx + dx, past - 0.015, z]} rotation={[Math.PI / 2, 0, 0]} material={sm.ledPanel}>
          <planeGeometry args={[1.6, 0.45]} />
        </mesh>
      ))))}
      {[41, 46].map((z) => (
        <mesh key={`o${z}`} position={[0, past - 0.015, z]} rotation={[Math.PI / 2, 0, 0]} material={sm.ledPanel}>
          <planeGeometry args={[1.2, 0.45]} />
        </mesh>
      ))}
      {/* Qator svetoforlari: kirish — tashqi qirrada (+z ga qaraydi), chiqish — ichki qirrada (−z ga) */}
      {([[-4.5, z1, 0], [4.5, z0, Math.PI]] as const).map(([x, z, b]) => (
        <group key={`sv${x}`} position={[x, past - 0.42, z]} rotation={[0, b, 0]}>
          <Quti o={[0.06, 0.12, 0.06]} p={[0, 0.36, -0.05]} mat={m.korpusQora} />
          <Yumaloq o={[0.36, 0.72, 0.22]} p={[0, 0, 0.02]} mat={m.korpusQora} radius={0.04} />
          <mesh position={[0, 0.17, 0.135]} material={sm.svetoforOchiq}>
            <circleGeometry args={[0.11, 18]} />
          </mesh>
          <mesh position={[0, -0.17, 0.135]} material={sm.svetoforYashil}>
            <circleGeometry args={[0.11, 18]} />
          </mesh>
        </group>
      ))}
      {/* Navis ostidagi kameralar (har qatorga — raqam o'quvchi) */}
      {([[-7.6, z1 - 0.4, 0.5], [7.6, z0 + 0.4, Math.PI + 0.5]] as const).map(([x, z, b]) => (
        <group key={`kam${x}`} position={[x, past - 0.25, z]} rotation={[0, b, 0]}>
          <Quti o={[0.05, 0.3, 0.05]} p={[0, 0.12, 0]} mat={m.korpusQora} />
          <Yumaloq o={[0.16, 0.16, 0.42]} p={[0, -0.06, 0.12]} r={[0.35, 0, 0]} mat={sm.sendvich} radius={0.03} />
        </group>
      ))}
    </group>
  );
}

/** "STOP" belgisi ustunda: sakkizburchak (yuzasi — tekstura), orqasi kulrang. */
function StopBelgisi({ sm, m, p, burchak }: { sm: ShaharMateriallari; m: Materiallar; p: V3; burchak: number }) {
  return (
    <group position={p} rotation={[0, burchak, 0]}>
      <Silindr r={0.035} h={2.3} p={[0, 1.15, -0.03]} mat={m.polat} seg={8} />
      <mesh position={[0, 2.1, 0.005]} material={sm.stopBelgi}>
        <circleGeometry args={[0.36, 8, Math.PI / 8]} />
      </mesh>
      <mesh position={[0, 2.1, -0.005]} rotation={[0, Math.PI, 0]} material={m.polat}>
        <circleGeometry args={[0.36, 8, Math.PI / 8]} />
      </mesh>
    </group>
  );
}

/** Kuzatuv kamerasi ustuni (ikki kamera, sariq-qora poydevor). */
function KameraUstuni({ sm, m, p, burchak }: { sm: ShaharMateriallari; m: Materiallar; p: V3; burchak: number }) {
  return (
    <group position={p} rotation={[0, burchak, 0]}>
      <Quti o={[0.5, 0.3, 0.5]} p={[0, 0.15, 0]} mat={sm.beton} />
      <Silindr r={0.08} h={6} p={[0, 3, 0]} mat={m.polatQora} seg={12} />
      <Quti o={[0.18, 0.12, 0.6]} p={[0, 5.6, 0.25]} mat={m.polatQora} />
      {[-0.3, 0.3].map((b) => (
        <group key={b} position={[0, 5.45, 0.55]} rotation={[0.3, b, 0]}>
          <Yumaloq o={[0.17, 0.17, 0.45]} p={[0, 0, 0.12]} mat={sm.sendvich} radius={0.03} />
          <Quti o={[0.22, 0.02, 0.5]} p={[0, 0.1, 0.12]} mat={sm.sendvich} />
        </group>
      ))}
      <Quti o={[0.3, 0.4, 0.16]} p={[0, 2.2, 0.12]} mat={sm.sendvich} />
    </group>
  );
}

function Kpp({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const o = KPP_OROLI;
  return (
    <group>
      {/* Orol: bordyur va plitka, uchlarida sariq bolardlar */}
      <Quti o={[o.x1 - o.x0, OROL_BALANDLIGI, o.z1 - o.z0]} p={[(o.x0 + o.x1) / 2, OROL_BALANDLIGI / 2, (o.z0 + o.z1) / 2]} mat={sm.bordyur} />
      <Yuza t={tb(o.x0 + 0.15, o.x1 - 0.15, o.z0 + 0.15, o.z1 - 0.15)} y={OROL_BALANDLIGI + 0.003} mat={sm.trotuar} tile={2} />
      {[o.z0 + 0.35, o.z1 - 0.35].flatMap((z) => [-1.6, 1.6].map((x) => (
        <group key={`${x}${z}`}>
          <Silindr r={0.1} h={0.95} p={[x, OROL_BALANDLIGI + 0.475, z]} mat={m.sariq} seg={14} />
          <Silindr r={0.105} h={0.12} p={[x, OROL_BALANDLIGI + 0.7, z]} mat={m.qora} seg={14} />
        </group>
      )))}
      {/* Tashqaridan old eshikka turniket yo'lagi (ikki tomonlama to'siq) */}
      {[-0.75, 0.75].map((x) => (
        <group key={`yo${x}`}>
          <Quti o={[0.04, 0.04, 1.9]} p={[x, OROL_BALANDLIGI + 1.0, KPP.z1 + 1.15]} mat={m.polat} />
          <Quti o={[0.03, 0.03, 1.9]} p={[x, OROL_BALANDLIGI + 0.5, KPP.z1 + 1.15]} mat={m.polat} />
          {[KPP.z1 + 0.25, KPP.z1 + 1.15, KPP.z1 + 2.05].map((z) => <Silindr key={z} r={0.025} h={1.0} p={[x, OROL_BALANDLIGI + 0.5, z]} mat={m.polat} seg={8} />)}
        </group>
      ))}
      <KppBinosi sm={sm} m={m} />
      <Navis sm={sm} m={m} />
      {/* "STOP" belgilari: kirishda (+z dan keladi) va chiqishda (−z dan keladi) */}
      <StopBelgisi sm={sm} m={m} p={[-8.15, 0, 44.6]} burchak={0} />
      <StopBelgisi sm={sm} m={m} p={[8.15, 0, 42.4]} burchak={Math.PI} />
      {/* Kuzatuv kameralari: hovli tomonda va tashqarida (kirish yo'li bo'yida) */}
      <KameraUstuni sm={sm} m={m} p={[-9.6, 0, 37.8]} burchak={Math.PI * 0.8} />
      <KameraUstuni sm={sm} m={m} p={[9.6, 0, 37.8]} burchak={-Math.PI * 0.8} />
      <KameraUstuni sm={sm} m={m} p={[-11.4, 0, 52.6]} burchak={0.5} />
      <KameraUstuni sm={sm} m={m} p={[9.9, 0, 53.2]} burchak={-0.4} />
    </group>
  );
}

// ── Tashqi hudud: avtobus bekati ──

function AvtobusBekati({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const y0 = 0.12;
  return (
    <group>
      <group position={[AVTOBUS_BEKATI.x, y0, 60.9]}>
        {/* Karkas: to'rtta ustun, orqa va yon shishalar, qiya tom */}
        {[-2.5, 2.5].flatMap((x) => [-0.75, 0.75].map((z) => <Quti key={`${x}${z}`} o={[0.08, 2.5, 0.08]} p={[x, 1.25, z]} mat={sm.alyumin} />))}
        <Quti o={[4.9, 2.0, 0.025]} p={[0, 1.2, -0.75]} mat={sm.kppOyna} />
        <Quti o={[5.0, 0.06, 0.06]} p={[0, 0.2, -0.75]} mat={sm.alyumin} />
        <Quti o={[5.0, 0.06, 0.06]} p={[0, 2.2, -0.75]} mat={sm.alyumin} />
        <Quti o={[0.025, 2.0, 1.2]} p={[-2.5, 1.2, -0.12]} mat={sm.kppOyna} />
        <group position={[0, 2.58, 0.05]} rotation={[0.06, 0, 0]}>
          <Quti o={[5.5, 0.06, 2.2]} p={[0, 0, 0]} mat={sm.kppOyna} />
          <Quti o={[5.6, 0.14, 0.1]} p={[0, 0, 1.1]} mat={m.korpusQora} />
          <Quti o={[5.6, 0.14, 0.1]} p={[0, 0, -1.1]} mat={m.korpusQora} />
          <Quti o={[0.1, 0.14, 2.2]} p={[-2.75, 0, 0]} mat={m.korpusQora} />
          <Quti o={[0.1, 0.14, 2.2]} p={[2.75, 0, 0]} mat={m.korpusQora} />
        </group>
        {/* O'rindiq */}
        <Quti o={[3.0, 0.05, 0.42]} p={[-0.3, 0.46, -0.48]} mat={sm.skameyka} />
        <Quti o={[3.0, 0.4, 0.04]} p={[-0.3, 0.72, -0.7]} mat={sm.skameyka} />
        {[-1.6, 1.0].map((x) => <Quti key={x} o={[0.06, 0.44, 0.38]} p={[x, 0.22, -0.48]} mat={m.korpusQora} />)}
        {/* Yoritilgan reklama paneli (o'ng yonda, ikki tomonlama) */}
        <Quti o={[0.16, 1.9, 1.25]} p={[2.5, 1.15, -0.1]} mat={m.korpusQora} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[2.5 + s * 0.085, 1.15, -0.1]} rotation={[0, s * Math.PI / 2, 0]} material={sm.reklama}>
            <planeGeometry args={[1.1, 1.75]} />
          </mesh>
        ))}
        {/* Axlat qutisi */}
        <Silindr r={0.2} h={0.75} p={[-3.0, 0.375, 0.5]} mat={m.korpusQora} seg={16} />
      </group>
      {/* Bekat belgisi (trotuar chetida, ikki tomonlama) */}
      <group position={[AVTOBUS_BEKATI.x + 4.6, y0, 63.55]}>
        <Silindr r={0.04} h={2.8} p={[0, 1.4, 0]} mat={m.polat} seg={8} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.012, 2.5, 0]} rotation={[0, s * Math.PI / 2, 0]} material={sm.avtobusBelgi}>
            <planeGeometry args={[0.6, 0.6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── Orqa hovli ──

/** To'rtburchak markazi. */
const orta = (t: Tortburchak): [number, number] => [(t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2];

function OrqaHovli({ sm, m }: { sm: ShaharMateriallari; m: Materiallar }) {
  const J = ORQA_JIHOZLAR;
  /** Gaz quvuri 2-sexning orqa devori (z = −41) bo'ylab tashqarida o'tadi. */
  const orqaDevor = AVTO_SEX.z0 - 0.45;
  const gazY = 4.8;
  // Kotelxona, mo'ri, gaz shkafi (GRPSh), silos — ORQA_JIHOZLAR markazlarida
  const [kx, kz] = orta(J.kotelxona);
  const [mx, mz] = orta(J.mori);
  const moriH = 26;
  const [gx, gz] = orta(J.gazShkafi);
  const [sx, sz] = orta(J.silos);
  const [tx] = orta(J.transformator);
  const [px, pz] = orta(J.paletlar);
  const konteynerZ = orta(J.konteynerlar)[1];
  /** Quvur tayanchlari xizmat yo'lidan tashqarida (z < −49). */
  const tayanchZ = XIZMAT_YOLI.z0 - 1;
  return (
    <group>
      {/* Kotelxona: g'isht bino, baland derazalar, metall eshik va soyabon, jalyuzlar, tekis tom parapet bilan */}
      <TekstQuti o={[10, 5.2, 7]} p={[kx, 2.6, kz]} mat={sm.gisht} tile={[2, 1]} />
      <Quti o={[10.3, 0.35, 7.3]} p={[kx, 5.35, kz]} mat={sm.beton} />
      <Quti o={[9.6, 0.1, 6.6]} p={[kx, 5.48, kz]} mat={m.korpusQora} />
      {[-3, 0, 3].map((dx) => (
        <group key={dx}>
          <Quti o={[1.8, 1.2, 0.06]} p={[kx + dx + (dx === 0 ? 1.4 : 0), 3.6, kz + 3.52]} mat={sm.alyumin} />
          <Quti o={[1.66, 1.06, 0.05]} p={[kx + dx + (dx === 0 ? 1.4 : 0), 3.6, kz + 3.54]} mat={sm.kppOyna} />
        </group>
      ))}
      <Quti o={[1.9, 2.5, 0.08]} p={[kx - 0.4, 1.25, kz + 3.52]} mat={m.korpusQora} />
      <Quti o={[0.02, 2.4, 0.09]} p={[kx - 0.4, 1.25, kz + 3.53]} mat={m.polatQora} />
      <Quti o={[2.6, 0.12, 1.2]} p={[kx - 0.4, 2.85, kz + 4.1]} mat={m.korpusQora} />
      <Quti o={[2.4, 0.15, 1.2]} p={[kx - 0.4, 0.075, kz + 4.1]} mat={sm.beton} />
      {[-2, 2].map((dz) => <Quti key={dz} o={[0.06, 0.8, 1.4]} p={[kx + 5.03, 1.2, kz + dz]} mat={m.korpus} />)}
      <Quti o={[0.4, 0.4, 0.02]} p={[kx + 1.0, 2.2, kz + 3.53]} r={[0, 0, Math.PI / 4]} mat={m.ogohlantirish} />
      {/* Mo'ri: po'lat, tepasida qizil-oq tasmalar, xizmat maydonchasi, narvon, tutun quvuri va trosslar */}
      <Quti o={[2.2, 0.5, 2.2]} p={[mx, 0.25, mz]} mat={sm.beton} />
      <mesh position={[mx, 0.5 + (moriH - 4.5) / 2, mz]} material={m.polat} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.62, moriH - 4.5, 20]} />
      </mesh>
      {[0, 1, 2].map((i) => <Silindr key={i} r={0.5} h={1.5} p={[mx, moriH - 3.75 + i * 1.5, mz]} mat={i % 2 ? m.oq : m.qizil} seg={20} />)}
      <Silindr r={0.56} h={0.12} p={[mx, moriH + 0.06, mz]} mat={m.korpusQora} seg={20} />
      <Silindr r={1.15} h={0.08} p={[mx, 18, mz]} mat={m.polatQora} seg={20} />
      {Array.from({ length: 8 }, (_, i) => {
        const b = (i / 8) * Math.PI * 2;
        return <Silindr key={i} r={0.02} h={1.0} p={[mx + Math.cos(b) * 1.1, 18.5, mz + Math.sin(b) * 1.1]} mat={m.polatQora} seg={6} />;
      })}
      <Quti o={[0.42, 18, 0.04]} p={[mx, 9.3, mz + 0.68]} mat={m.polatQora} />
      <Truba a={[kx + 4.8, 4.7, mz]} b={[mx - 0.5, 4.7, mz]} r={0.32} mat={m.polat} seg={14} />
      {[0, 100, 250].map((g) => {
        const b = (g * Math.PI) / 180;
        return <Truba key={g} a={[mx, 17, mz]} b={[mx + Math.cos(b) * 5, 0.2, mz + Math.sin(b) * 5]} r={0.012} mat={m.polatQora} seg={4} soya={false} />;
      })}

      {/* Gaz taqsimlash shkafi (GRPSh) va sariq gaz quvurlari: kotelxonaga va xizmat yo'li ustidan 2-sex orqa devori bo'ylab */}
      <Quti o={[1.4, 1.7, 0.8]} p={[gx, 0.85, gz]} mat={m.sariq} />
      <Quti o={[1.42, 0.08, 0.82]} p={[gx, 1.74, gz]} mat={m.korpusQora} />
      <Quti o={[0.36, 0.36, 0.02]} p={[gx, 1.25, gz + 0.41]} r={[0, 0, Math.PI / 4]} mat={m.qizil} />
      <Truba a={[gx + 0.7, 1.2, gz]} b={[kx - 5, 1.2, gz]} r={0.06} mat={m.sariq} />
      <Truba a={[gx, 1.7, gz + 0.55]} b={[gx, gazY, gz + 0.55]} r={0.08} mat={m.sariq} />
      <Truba a={[gx, gazY, gz + 0.55]} b={[gx, gazY, orqaDevor]} r={0.08} mat={m.sariq} />
      <Truba a={[AVTO_SEX.x0 + 0.5, gazY, orqaDevor]} b={[24, gazY, orqaDevor]} r={0.08} mat={m.sariq} />
      <Truba a={[24, gazY, orqaDevor]} b={[24, 3.0, orqaDevor]} r={0.08} mat={m.sariq} />
      <Truba a={[24, 3.0, orqaDevor]} b={[24, 3.0, AVTO_SEX.z0]} r={0.08} mat={m.sariq} />
      {[tayanchZ - 3, tayanchZ].map((z) => (
        <group key={z}>
          <Quti o={[0.12, gazY - 0.1, 0.12]} p={[gx, (gazY - 0.1) / 2, z]} mat={m.polatQora} />
          <Quti o={[0.5, 0.06, 0.12]} p={[gx, gazY - 0.11, z]} mat={m.polatQora} />
        </group>
      ))}
      {Array.from({ length: 19 }, (_, i) => -30 + i * 3).map((x) => <Quti key={`kr${x}`} o={[0.06, 0.06, 0.42]} p={[x, gazY - 0.1, orqaDevor + 0.24]} mat={m.polatQora} />)}

      {/* Transformator podstansiyasi (KTP): beton blok, jalyuzli eshiklar, ogohlantirish belgilari */}
      <group position={[tx, 0, J.transformator.z0 + 3]}>
        <Quti o={[6.8, 3.0, 4.2]} p={[0, 1.5, 0]} mat={sm.transformator} />
        <Quti o={[7.2, 0.18, 4.6]} p={[0, 3.09, 0]} mat={m.korpusQora} />
        {[-2.2, 0, 2.2].map((dx) => (
          <group key={dx}>
            <Quti o={[1.6, 2.3, 0.05]} p={[dx, 1.25, 2.12]} mat={m.korpus} />
            {Array.from({ length: 6 }, (_, i) => <Quti key={i} o={[1.3, 0.04, 0.06]} p={[dx, 0.6 + i * 0.28, 2.15]} mat={m.korpusQora} />)}
          </group>
        ))}
        {[-2.2, 2.2].map((dx) => <Quti key={`o${dx}`} o={[0.4, 0.4, 0.02]} p={[dx, 2.68, 2.16]} r={[0, 0, Math.PI / 4]} mat={m.ogohlantirish} />)}
        <Quti o={[0.5, 0.5, 0.5]} p={[3.7, 0.25, -1.2]} mat={sm.beton} />
      </group>

      {/* Qipiq silosi (aspiratsiya bunkeri): to'rt oyoq, konus, silindr, siklon, sexdan keluvchi havo quvuri, narvon */}
      <group position={[sx, 0, sz]}>
        {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z]) => (
          <group key={`${x}${z}`}>
            <Quti o={[0.26, 5.2, 0.26]} p={[x, 2.6, z]} mat={m.polatQora} />
            <Quti o={[0.5, 0.06, 0.5]} p={[x, 0.03, z]} mat={m.polatQora} />
          </group>
        ))}
        {[[-1.6, 0, 0], [1.6, 0, 0]].map(([x]) => <Quti key={`b${x}`} o={[0.1, 0.1, 3.2]} p={[x, 1.6, 0]} mat={m.polatQora} />)}
        <mesh position={[0, 4.2, 0]} material={m.oluk} castShadow receiveShadow>
          <cylinderGeometry args={[2.2, 0.35, 2.0, 24]} />
        </mesh>
        <Quti o={[0.6, 0.5, 0.6]} p={[0, 2.95, 0]} mat={m.korpusQora} />
        <Silindr r={2.2} h={6.3} p={[0, 8.35, 0]} mat={m.oluk} seg={28} />
        {[6.2, 8.3, 10.4].map((y) => <Silindr key={y} r={2.24} h={0.08} p={[0, y, 0]} mat={m.polatQora} seg={28} />)}
        <mesh position={[0, 11.9, 0]} material={m.oluk} castShadow receiveShadow>
          <cylinderGeometry args={[0.35, 2.25, 0.8, 28]} />
        </mesh>
        <Silindr r={0.75} h={1.6} p={[0.8, 13.1, 0.4]} mat={m.polat} seg={18} />
        <mesh position={[0.8, 11.9, 0.4]} material={m.polat} castShadow>
          <cylinderGeometry args={[0.75, 0.22, 0.8, 18]} />
        </mesh>
        <Quti o={[0.42, 11.6, 0.04]} p={[-2.25, 6.1, 0]} r={[0, Math.PI / 2, 0]} mat={m.polatQora} />
      </group>
      {/* Silosga havo quvuri: 2-sex orqa devoridan (derazalar ustidan) xizmat yo'li ustidan o'tib, tayanch ustuni orqali */}
      <Truba a={[sx + 0.8, 13.6, sz + 0.4]} b={[sx + 0.8, 13.6, tayanchZ]} r={0.32} mat={m.polat} seg={14} />
      <Truba a={[sx + 0.8, 13.6, tayanchZ]} b={[sx + 0.8, 8.2, AVTO_SEX.z0 - 0.1]} r={0.32} mat={m.polat} seg={14} />
      <Quti o={[0.2, 13.3, 0.2]} p={[sx + 0.8, 6.65, tayanchZ]} mat={m.polatQora} />

      {/* Chiqindi konteynerlari (yashil — maishiy, ko'k — qog'oz/karton, kulrang — qipiq/LDSP qoldiqlari) */}
      {[0, 1, 2].map((i) => J.konteynerlar.x0 + 1.4 + i * 2.6).map((x, i) => (
        <group key={x} position={[x, 0, konteynerZ]}>
          <Yumaloq o={[2.2, 1.3, 1.4]} p={[0, 0.78, 0]} mat={i === 0 ? sm.konteyner : i === 1 ? m.cncRang : m.korpusQora} radius={0.06} />
          <Quti o={[2.25, 0.07, 1.45]} p={[0, 1.47, -0.05]} r={[0.1, 0, 0]} mat={m.korpusQora} />
          {[-0.9, 0.9].flatMap((dx) => [-0.5, 0.5].map((dz) => <Silindr key={`${dx}${dz}`} r={0.07} h={0.06} p={[dx, 0.08, dz]} rot={[0, 0, Math.PI / 2]} mat={m.rezina} seg={10} />))}
        </group>
      ))}
      {/* Paletlar taxlami */}
      {[[-1.9, 0.1, 9], [-0.5, 0.1, 7], [1.7, -0.1, 11]].map(([x, z, son], i) => (
        <group key={i} position={[px + x, 0, pz + z]}>
          {Array.from({ length: son }, (_, k) => <Quti key={k} o={[1.2, 0.144, 1.0]} p={[0, 0.072 + k * 0.146, 0]} mat={m.palet} />)}
        </group>
      ))}
    </group>
  );
}

// ── Bayroqlar (shamolda hilpiraydi — StatikGuruh dan tashqarida) ──

type BayroqChizuvchi = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const BAYROQ_CHIZUVCHILARI: Record<(typeof BAYROQLAR)[number]["tur"], BayroqChizuvchi> = {
  // O'zbekiston bayrog'i: ko'k, oq, yashil, qizil hoshiyalar, yarim oy va 12 yulduz.
  ozbekiston: (ctx, w) => {
    ctx.fillStyle = "#0099b5"; ctx.fillRect(0, 0, w, 42);
    ctx.fillStyle = "#ce1126"; ctx.fillRect(0, 42, w, 3); ctx.fillRect(0, 83, w, 3);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 45, w, 38);
    ctx.fillStyle = "#1eb53a"; ctx.fillRect(0, 86, w, 42);
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(30, 21, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0099b5"; ctx.beginPath(); ctx.arc(35, 21, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    [[3, 8], [4, 21], [5, 34]].forEach(([son, y]) => {
      for (let i = 0; i < son; i++) { ctx.beginPath(); ctx.arc(98 - i * 12, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    });
  },
  // Neytral korxona bayrog'i: oq maydon, ko'k tasma va mavhum belgi (taxta qatlamlari).
  korxona: (ctx, w, h) => {
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1e3a8a"; ctx.fillRect(0, 0, 48, h);
    ctx.fillStyle = "#1e3a8a";
    for (let i = 0; i < 3; i++) ctx.fillRect(110 + i * 10, 34 + i * 20, 90, 14);
    ctx.fillStyle = "#0ea5e9"; ctx.fillRect(110, 98, 120, 6);
  },
  // Neytral sifat bayrog'i: ko'k maydon, oq halqa va yulduzcha.
  sifat: (ctx, w, h) => {
    ctx.fillStyle = "#0f766e"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(w / 2, h / 2, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 8 : 20;
      const b = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(w / 2 + Math.cos(b) * r, h / 2 + Math.sin(b) * r);
    }
    ctx.closePath();
    ctx.fill();
  },
};

function Bayroq({ m, x, z, h, chiz, faza }: { m: Materiallar; x: number; z: number; h: number; chiz: BayroqChizuvchi; faza: number }) {
  const { geo, mat, asl } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.4, 1.2, 16, 6);
    geo.translate(1.2, 0, 0);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) chiz(ctx, 256, 128);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 });
    return { geo, mat, asl: Float32Array.from(geo.getAttribute("position").array) };
  }, [chiz]);
  useEffect(() => () => { geo.dispose(); mat.map?.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const px = asl[i * 3];
      const py = asl[i * 3 + 1];
      pos.setZ(i, (Math.sin(px * 2.4 - t * 4.2) * 0.14 + Math.sin(px * 3.7 + py * 2 - t * 6.1) * 0.03) * (px / 2.4));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group position={[x, 0, z]}>
      <Quti o={[0.6, 0.3, 0.6]} p={[0, 0.15, 0]} mat={m.korpus} />
      <mesh position={[0, h / 2 + 0.3, 0]} material={m.polat} castShadow>
        <cylinderGeometry args={[0.045, 0.075, h, 12]} />
      </mesh>
      <mesh position={[0, h + 0.36, 0]} material={m.polat}>
        <sphereGeometry args={[0.09, 12, 8]} />
      </mesh>
      <mesh geometry={geo} material={mat} position={[0.06, h - 0.45, 0]} castShadow />
    </group>
  );
}

function Bayroqlar({ m }: { m: Materiallar }) {
  return (
    <>
      {BAYROQLAR.map((b, i) => <Bayroq key={b.tur} m={m} x={b.x} z={b.z} h={b.h} chiz={BAYROQ_CHIZUVCHILARI[b.tur]} faza={i * 1.7} />)}
    </>
  );
}

// ── Shahar binolari (yig'ilgan geometriya) ──

class Yiguvchi {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  private uch(p: number[], n: number[], t: number[]) {
    this.pos.push(...p);
    this.nor.push(...n);
    this.uv.push(...t);
  }
  /** To'rtburchak: a, b, c, d soat strelkasiga teskari (tashqaridan qaraganda). Normal — berilgan yoki hisoblanadi. */
  tortburchak(a: number[], b: number[], c: number[], d: number[], n: number[] | null, uw: number, vh: number, v0 = 0) {
    const norm = n ?? normal(a, b, c);
    const i = this.pos.length / 3;
    this.uch(a, norm, [0, v0]);
    this.uch(b, norm, [uw, v0]);
    this.uch(c, norm, [uw, v0 + vh]);
    this.uch(d, norm, [0, v0 + vh]);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  uchburchak(a: number[], b: number[], c: number[]) {
    const n = normal(a, b, c);
    const i = this.pos.length / 3;
    this.uch(a, n, [0, 0]);
    this.uch(b, n, [1, 0]);
    this.uch(c, n, [0.5, 1]);
    this.idx.push(i, i + 1, i + 2);
  }
  /** To'rt yon devor (x0…x1, z0…z1, y0…y1), fasad teksturasi `tw × th` metr. */
  devorlar(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, tw: number, th: number) {
    const w = x1 - x0;
    const d = z1 - z0;
    const v = (y1 - y0) / th;
    this.tortburchak([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w / tw, v);
    this.tortburchak([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w / tw, v);
    this.tortburchak([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d / tw, v);
    this.tortburchak([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d / tw, v);
  }
  /** Yopiq quti (pastki tomonsiz): tom jihozlari, parapetlar. */
  quti(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number) {
    this.devorlar(x0, x1, z0, z1, y0, y1, 4, 4);
    this.tortburchak([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1, 1);
  }
  geometriya() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

function normal(a: number[], b: number[], c: number[]) {
  const v1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const v2 = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  return v1.cross(v2).normalize().toArray();
}

/** Bitta binoni yig'uvchilarga qo'shadi: devorlar (pastki do'kon qavati bilan), tom va tom jihozlari. */
function binoQosh(b: Bino, i: number, devorlar: Record<BinoTuri, Yiguvchi>, tekisTom: Yiguvchi, qiyaTomlar: Yiguvchi[], jihoz: Yiguvchi) {
  const rnd = urugli(5000 + i * 7);
  const x0 = b.x - b.w / 2;
  const x1 = b.x + b.w / 2;
  const z0 = b.z - b.d / 2;
  const z1 = b.z + b.d / 2;
  const y0 = b.y0;
  const y1 = b.y0 + b.h;
  if (b.dokon > 0) {
    const [dw, dh] = FASAD_OLCHAMI.dokon;
    devorlar.dokon.devorlar(x0, x1, z0, z1, y0, y0 + b.dokon, dw, dh);
    // Do'kon ustidagi soyabon (peshayvon) tasmasi
    jihoz.quti(x0 - 0.9, x1 + 0.9, z0 - 0.9, z1 + 0.9, y0 + b.dokon - 0.05, y0 + b.dokon + 0.25);
  }
  const [tw, th] = FASAD_OLCHAMI[b.tur];
  devorlar[b.tur].devorlar(x0, x1, z0, z1, y0 + b.dokon, y1, tw, th);
  if (b.tom === "tekis") {
    tekisTom.tortburchak([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1, 1);
    // Parapet
    const p = 0.25;
    const ph = b.tur === "ofis" ? 1.2 : 0.8;
    jihoz.quti(x0, x1, z1 - p, z1, y1, y1 + ph);
    jihoz.quti(x0, x1, z0, z0 + p, y1, y1 + ph);
    jihoz.quti(x0, x0 + p, z0 + p, z1 - p, y1, y1 + ph);
    jihoz.quti(x1 - p, x1, z0 + p, z1 - p, y1, y1 + ph);
    if (b.tur === "panel" || b.tur === "gisht") {
      // Lift mashina xonalari (har ~18 m da bittadan) va shamollatish quvurlari
      const uzun = Math.max(b.w, b.d);
      const son = Math.max(1, Math.round(uzun / 18));
      for (let k = 0; k < son; k++) {
        const t = (k + 0.5) / son - 0.5;
        const [cx, cz] = b.w >= b.d ? [b.x + t * b.w, b.z] : [b.x, b.z + t * b.d];
        jihoz.quti(cx - 1.6, cx + 1.6, cz - 1.3, cz + 1.3, y1, y1 + 2.6);
        jihoz.quti(cx + 2.4, cx + 2.9, cz - 0.25, cz + 0.25, y1, y1 + 1.4);
      }
    } else if (b.tur === "ofis") {
      // Texnik qavat (toj) va konditsioner bloklari
      jihoz.quti(b.x - b.w * 0.3, b.x + b.w * 0.3, b.z - b.d * 0.3, b.z + b.d * 0.3, y1, y1 + 3.2);
      for (let k = 0; k < 4; k++) {
        const cx = b.x + (rnd() - 0.5) * b.w * 0.7;
        const cz = b.z + (rnd() < 0.5 ? -1 : 1) * b.d * 0.38;
        jihoz.quti(cx - 0.8, cx + 0.8, cz - 0.5, cz + 0.5, y1, y1 + 1.1);
      }
    } else {
      // Do'kon/podium tomidagi konditsionerlar
      for (let k = 0; k < 3; k++) {
        const cx = b.x + (rnd() - 0.5) * b.w * 0.6;
        const cz = b.z + (rnd() - 0.5) * b.d * 0.6;
        jihoz.quti(cx - 0.7, cx + 0.7, cz - 0.6, cz + 0.6, y1, y1 + 1.0);
      }
    }
  } else if (b.tom === "tortQiya") {
    // To'rt yonli qiya tom, devordan biroz chiqib turadi.
    const q = 0.45;
    const [a0, a1, c0, c1] = [x0 - q, x1 + q, z0 - q, z1 + q];
    const cho = [b.x, y1 + Math.min(b.w, b.d) * 0.28, b.z];
    const tom = qiyaTomlar[b.tomRang];
    tom.uchburchak([a0, y1, c1], [a1, y1, c1], cho);
    tom.uchburchak([a1, y1, c1], [a1, y1, c0], cho);
    tom.uchburchak([a1, y1, c0], [a0, y1, c0], cho);
    tom.uchburchak([a0, y1, c0], [a0, y1, c1], cho);
  } else {
    // Ikki yonli past qiyalikdagi tom (ombor): tizma uzun tomon bo'ylab, uchburchak frontonlar.
    const tom = qiyaTomlar[b.tomRang];
    const q = 0.3;
    const xBoylab = b.w >= b.d;
    const tizma = y1 + Math.min(b.w, b.d) * 0.11;
    if (xBoylab) {
      tom.tortburchak([x0 - q, y1, z1 + q], [x1 + q, y1, z1 + q], [x1 + q, tizma, b.z], [x0 - q, tizma, b.z], null, 1, 1);
      tom.tortburchak([x1 + q, y1, z0 - q], [x0 - q, y1, z0 - q], [x0 - q, tizma, b.z], [x1 + q, tizma, b.z], null, 1, 1);
      tom.uchburchak([x1, y1, z1], [x1, y1, z0], [x1, tizma, b.z]);
      tom.uchburchak([x0, y1, z0], [x0, y1, z1], [x0, tizma, b.z]);
    } else {
      tom.tortburchak([x1 + q, y1, z1 + q], [x1 + q, y1, z0 - q], [b.x, tizma, z0 - q], [b.x, tizma, z1 + q], null, 1, 1);
      tom.tortburchak([x0 - q, y1, z0 - q], [x0 - q, y1, z1 + q], [b.x, tizma, z1 + q], [b.x, tizma, z0 - q], null, 1, 1);
      tom.uchburchak([x0, y1, z1], [x1, y1, z1], [b.x, tizma, z1]);
      tom.uchburchak([x1, y1, z0], [x0, y1, z0], [b.x, tizma, z0]);
    }
  }
}

function Binolar({ sm, binolar }: { sm: ShaharMateriallari; binolar: Bino[] }) {
  const qismlar = useMemo(() => {
    const devorlar = { panel: new Yiguvchi(), gisht: new Yiguvchi(), ofis: new Yiguvchi(), ombor: new Yiguvchi(), uy: new Yiguvchi(), dokon: new Yiguvchi() } satisfies Record<BinoTuri, Yiguvchi>;
    const tekisTom = new Yiguvchi();
    const qiyaTomlar = [new Yiguvchi(), new Yiguvchi(), new Yiguvchi()];
    const jihoz = new Yiguvchi();
    binolar.forEach((b, i) => binoQosh(b, i, devorlar, tekisTom, qiyaTomlar, jihoz));
    return {
      devorlar: (Object.keys(devorlar) as BinoTuri[]).filter((tur) => devorlar[tur].idx.length).map((tur) => ({ tur, g: devorlar[tur].geometriya() })),
      tekisTom: tekisTom.geometriya(),
      qiyaTomlar: qiyaTomlar.map((t) => t.geometriya()),
      jihoz: jihoz.geometriya(),
    };
  }, [binolar]);
  useEffect(() => () => {
    qismlar.devorlar.forEach(({ g }) => g.dispose());
    qismlar.tekisTom.dispose();
    qismlar.qiyaTomlar.forEach((g) => g.dispose());
    qismlar.jihoz.dispose();
  }, [qismlar]);
  return (
    <group>
      {qismlar.devorlar.map(({ tur, g }) => <mesh key={tur} geometry={g} material={sm.fasad[tur]} receiveShadow />)}
      <mesh geometry={qismlar.tekisTom} material={sm.tomTekis} receiveShadow />
      {qismlar.qiyaTomlar.map((g, i) => <mesh key={i} geometry={g} material={sm.tomlar[i]} />)}
      <mesh geometry={qismlar.jihoz} material={sm.tomJihoz} receiveShadow />
    </group>
  );
}

// ── Daraxtlar va chiroqlar (instancing) ──

/** Daraxtlar: toj bir nechta silliq "bulut"dan (oddiy daraxt — 3 ta, terak — 2 ta cho'zilgan, buta — 1 ta past), barchasi bitta instancing. */
function Daraxtlar({ sm, daraxtlar }: { sm: ShaharMateriallari; daraxtlar: Daraxt[] }) {
  const { tana, barg } = useMemo(() => {
    const rnd = urugli(909);
    const bulutlar: Array<{ p: THREE.Vector3; s: THREE.Vector3; rang: THREE.Color }> = [];
    const tana = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 8), sm.daraxtTana, daraxtlar.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    daraxtlar.forEach((d, i) => {
      const buta = d.tur === "buta";
      const terak = d.tur === "terak";
      const tanaH = buta ? 0.25 : terak ? 2.2 : 1.8 + d.r * 0.35;
      const tanaS = buta ? 0.6 : terak ? 1 : 0.9 + d.r * 0.15;
      tana.setMatrixAt(i, m4.compose(new THREE.Vector3(d.x, tanaH / 2, d.z), q.identity(), new THREE.Vector3(tanaS, tanaH, tanaS)));
      const asos = new THREE.Color().setHSL(0.24 + rnd() * 0.07, 0.36 + rnd() * 0.2, terak ? 0.23 + rnd() * 0.05 : buta ? 0.24 + rnd() * 0.05 : 0.27 + rnd() * 0.09);
      const rang = (k: number) => asos.clone().offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.05 + k);
      if (terak) {
        const h = 5.5 + rnd() * 1.8;
        bulutlar.push({ p: new THREE.Vector3(d.x, tanaH + h * 0.42, d.z), s: new THREE.Vector3(1.15, h * 0.5, 1.15), rang: rang(-0.02) });
        bulutlar.push({ p: new THREE.Vector3(d.x + (rnd() - 0.5) * 0.3, tanaH + h * 0.8, d.z + (rnd() - 0.5) * 0.3), s: new THREE.Vector3(0.8, h * 0.32, 0.8), rang: rang(0.02) });
      } else if (buta) {
        bulutlar.push({ p: new THREE.Vector3(d.x, d.r * 0.7, d.z), s: new THREE.Vector3(d.r * 1.1, d.r * 0.85, d.r), rang: rang(0) });
      } else {
        const r = d.r;
        const y = tanaH + r * 0.75;
        bulutlar.push({ p: new THREE.Vector3(d.x, y, d.z), s: new THREE.Vector3(r, r * (0.9 + rnd() * 0.2), r), rang: rang(0) });
        for (let k = 0; k < 2; k++) {
          const burchak = rnd() * Math.PI * 2;
          const kichik = r * (0.6 + rnd() * 0.15);
          bulutlar.push({ p: new THREE.Vector3(d.x + Math.cos(burchak) * r * 0.55, y - r * 0.15 + rnd() * r * 0.35, d.z + Math.sin(burchak) * r * 0.55), s: new THREE.Vector3(kichik, kichik * 0.9, kichik), rang: rang(k ? 0.03 : -0.03) });
        }
      }
    });
    const barg = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), sm.barg, bulutlar.length);
    bulutlar.forEach((b, i) => {
      q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0));
      barg.setMatrixAt(i, m4.compose(b.p, q, b.s));
      barg.setColorAt(i, b.rang);
    });
    tana.computeBoundingSphere();
    barg.computeBoundingSphere();
    tana.castShadow = true;
    barg.castShadow = true;
    barg.receiveShadow = true;
    return { tana, barg };
  }, [sm, daraxtlar]);
  useEffect(() => () => { tana.geometry.dispose(); barg.geometry.dispose(); tana.dispose(); barg.dispose(); }, [tana, barg]);
  return (
    <>
      <primitive object={tana} />
      <primitive object={barg} />
    </>
  );
}

/** Ko'cha va hovli chiroqlari: konussimon ustun, egilgan kronshteyn, LED yoritgich (ikkita instancing). */
function Chiroqlar({ sm }: { sm: ShaharMateriallari }) {
  const { ustun, bosh } = useMemo(() => {
    const joylar = chiroqlarRejasi();
    const qismlar = [
      new THREE.CylinderGeometry(0.07, 0.11, 8, 10).translate(0, 4, 0),
      new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10).translate(0, 0.25, 0),
      new THREE.CylinderGeometry(0.04, 0.05, 1.7, 8).rotateZ(-Math.PI / 2 + 0.12).translate(0.84, 7.95, 0),
    ];
    const ustunGeo = mergeGeometries(qismlar, false) ?? new THREE.CylinderGeometry(0.07, 0.11, 8, 10);
    qismlar.forEach((g) => g.dispose());
    const boshGeo = new THREE.BoxGeometry(0.7, 0.12, 0.32).translate(1.72, 8.02, 0);
    const ustun = new THREE.InstancedMesh(ustunGeo, sm.chiroqUstun, joylar.length);
    const bosh = new THREE.InstancedMesh(boshGeo, sm.chiroqBosh, joylar.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yuqori = new THREE.Vector3(0, 1, 0);
    const bir = new THREE.Vector3(1, 1, 1);
    joylar.forEach(({ x, z, burchak }, i) => {
      m4.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(yuqori, burchak), bir);
      ustun.setMatrixAt(i, m4);
      bosh.setMatrixAt(i, m4);
    });
    ustun.computeBoundingSphere();
    bosh.computeBoundingSphere();
    ustun.castShadow = true;
    return { ustun, bosh };
  }, [sm]);
  useEffect(() => () => { ustun.geometry.dispose(); bosh.geometry.dispose(); ustun.dispose(); bosh.dispose(); }, [ustun, bosh]);
  return (
    <>
      <primitive object={ustun} />
      <primitive object={bosh} />
    </>
  );
}

/** Butun tashqi muhit: yer, ko'chalar, zavod hududi (yer, panjara, KPP, orqa hovli, bekat), bayroqlar, shahar binolari, daraxtlar, chiroqlar. */
export default function Shaharcha({ m, sm }: { m: Materiallar; sm: ShaharMateriallari }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const binolar = useMemo(() => shaharBinolari(), []);
  const daraxtlar = useMemo(() => daraxtlarRejasi(binolar), [binolar]);
  const yarim = YER_OLCHAMI / 2;
  return (
    <group>
      <Yuza t={tb(-yarim, yarim, -yarim, yarim)} y={-0.03} mat={sm.maysa} tile={10} />
      <Kochalar sm={sm} />
      {/* Hudud jihozlari qimirlamaydi — material bo'yicha birlashtiriladi (bayroqlar va panjara ustunlari alohida) */}
      <StatikGuruh>
        <HududYeri sm={sm} m={m} />
        <Panjara sm={sm} m={m} />
        <Kpp sm={sm} m={m} />
        <AvtobusBekati sm={sm} m={m} />
        <OrqaHovli sm={sm} m={m} />
      </StatikGuruh>
      <PanjaraUstunlari sm={sm} />
      <Bayroqlar m={m} />
      <ZonaYorligi p={[KPP.x, NAVIS.baland + 1.3, (NAVIS.z0 + NAVIS.z1) / 2]} matn={t("zones.kpp")} rang="#1e3a8a" />
      <ZonaYorligi p={[(TURARGOH_ASFALTI.x0 + TURARGOH_ASFALTI.x1) / 2, 3, (TURARGOH_ASFALTI.z0 + TURARGOH_ASFALTI.z1) / 2]} matn={t("zones.parking")} rang="#475569" />
      <Binolar sm={sm} binolar={binolar} />
      <Daraxtlar sm={sm} daraxtlar={daraxtlar} />
      <Chiroqlar sm={sm} />
    </group>
  );
}
