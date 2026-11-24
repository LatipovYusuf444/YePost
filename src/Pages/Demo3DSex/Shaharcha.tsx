import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { SEX_CHUQURLIGI, SEX_ENI, urugli, type Materiallar } from "./materiallar";
import { FASAD_OLCHAMI, type FasadTuri, type ShaharMateriallari } from "./shaharMateriallari";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { ZonaYorligi } from "./SexMuhiti";
import { ASOSIY_YOL, DARVOZA, HUDUD, KONDALANG_YOLLAR, KPP, ORQA_YOL, RAMPA1, RAMPA2, TURARGOH } from "./hudud";

// Zavod hududi va atrofdagi shaharcha (hammasi kod bilan): ko'chalar, trotuarlar, panjara, KPP, bayroq, avtoturargoh,
// ko'p qavatli uylar, ofislar, omborlar, mahalla uylari, teraklar va daraxtlar, ko'cha chiroqlari.
// Uzoqdagi binolar bir nechta umumiy geometriyaga yig'iladi (kam draw call), daraxt va chiroqlar — instancing.

const SHAHAR_RADIUSI = 225;
const YER_OLCHAMI = 1000;

/** UV'si o'lchamga moslangan tekislik (tekstura cho'zilmaydi). */
function useTekislik(w: number, d: number, tile: number) {
  const g = useMemo(() => {
    const geo = new THREE.PlaneGeometry(w, d);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    return geo;
  }, [w, d, tile]);
  useEffect(() => () => g.dispose(), [g]);
  return g;
}

function Tekislik({ w, d, p, mat, tile = 8, soya = true }: { w: number; d: number; p: [number, number, number]; mat: THREE.Material; tile?: number; soya?: boolean }) {
  const g = useTekislik(w, d, tile);
  return <mesh geometry={g} material={mat} position={p} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={soya} />;
}

// ── Ko'chalar ──

/**
 * Bitta ko'cha bo'lagi (x yoki z bo'ylab): asfalt, chekka chiziqlar, o'rtada uzuq chiziq, ikki tomonda trotuar va bordyur.
 * `kesishmalar` — chorrahalar (ko'cha o'qi bo'ylab koordinata): u yerda trotuar va bordyur uziladi.
 */
function Kocha({ sm, markaz, uzunlik, boylab, eni, kesishmalar = [] }: { sm: ShaharMateriallari; markaz: [number, number]; uzunlik: number; boylab: "x" | "z"; eni: number; kesishmalar?: readonly number[] }) {
  const [cx, cz] = markaz;
  const xBoylab = boylab === "x";
  const tekis = (w: number, d: number) => (xBoylab ? [w, d] : [d, w]) as [number, number];
  const joy = (u: number, v: number, y: number) => (xBoylab ? [cx + u, y, cz + v] : [cx + v, y, cz + u]) as [number, number, number];
  const [aw, ad] = tekis(uzunlik, eni);
  const [cw, cd] = tekis(uzunlik, 0.15);
  const uzuqGeo = useMemo(() => {
    // Uzuq chiziq: tekstura uzunlik bo'ylab har 6 m da takrorlanadi.
    const geo = new THREE.PlaneGeometry(xBoylab ? uzunlik : 0.15, xBoylab ? 0.15 : uzunlik);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, ((xBoylab ? uv.getX(i) : uv.getY(i)) * uzunlik) / 6, 0.5);
    return geo;
  }, [uzunlik, xBoylab]);
  useEffect(() => () => uzuqGeo.dispose(), [uzuqGeo]);
  // Trotuar bo'laklari (o'q bo'ylab, ko'cha markaziga nisbatan).
  const bolaklar = useMemo(() => {
    const markazO = xBoylab ? cx : cz;
    const tirqish = 4 + 1.8;
    const kesish = [...kesishmalar].map((k) => k - markazO).sort((a, c) => a - c);
    const natija: Array<[number, number]> = [];
    let bosh = -uzunlik / 2;
    for (const k of kesish) {
      if (k - tirqish > bosh) natija.push([bosh, k - tirqish]);
      bosh = Math.max(bosh, k + tirqish);
    }
    if (bosh < uzunlik / 2) natija.push([bosh, uzunlik / 2]);
    return natija;
  }, [kesishmalar, uzunlik, xBoylab, cx, cz]);
  const yarim = eni / 2;
  return (
    <group>
      <Tekislik w={aw} d={ad} p={joy(0, 0, 0.004)} mat={sm.yolAsfalt} tile={8} />
      <mesh geometry={uzuqGeo} material={sm.uzuqChiziq} position={joy(0, 0, 0.012)} rotation={[-Math.PI / 2, 0, 0]} />
      {[-1, 1].map((yon) => (
        <group key={yon}>
          <mesh position={joy(0, yon * (yarim - 0.35), 0.011)} rotation={[-Math.PI / 2, 0, 0]} material={sm.chiziqOq}>
            <planeGeometry args={[cw, cd]} />
          </mesh>
          {bolaklar.map(([a, c]) => {
            const [tw, td] = tekis(c - a, 1.7);
            const [bw, bd] = tekis(c - a, 0.2);
            return (
              <group key={a}>
                <Tekislik w={tw} d={td} p={joy((a + c) / 2, yon * (yarim + 0.85), 0.12)} mat={sm.trotuar} tile={2} />
                <mesh position={joy((a + c) / 2, yon * (yarim + 0.1), 0.07)} material={sm.bordyur} receiveShadow>
                  <boxGeometry args={[bw, 0.15, bd]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

function Kochalar({ sm }: { sm: ShaharMateriallari }) {
  const L = SHAHAR_RADIUSI * 2 + 60;
  // Ko'ndalang ko'chalar asosiy va orqa ko'cha kesishmalarida bo'linadi (bir-birining ustiga tushmasin).
  const bolaklar = (yarim: number): Array<[number, number]> => {
    const chegaralar = [-L / 2, ORQA_YOL.z - yarim - 1.7, ORQA_YOL.z + yarim + 1.7, ASOSIY_YOL.z - yarim - 1.7, ASOSIY_YOL.z + yarim + 1.7, L / 2];
    return [[chegaralar[0], chegaralar[1]], [chegaralar[2], chegaralar[3]], [chegaralar[4], chegaralar[5]]];
  };
  return (
    <StatikGuruh>
      <Kocha sm={sm} markaz={[0, ASOSIY_YOL.z]} uzunlik={L} boylab="x" eni={ASOSIY_YOL.eni} kesishmalar={KONDALANG_YOLLAR} />
      <Kocha sm={sm} markaz={[0, ORQA_YOL.z]} uzunlik={L} boylab="x" eni={ORQA_YOL.eni} kesishmalar={KONDALANG_YOLLAR} />
      {KONDALANG_YOLLAR.flatMap((x) => bolaklar(ASOSIY_YOL.eni / 2).map(([a, c]) => (
        <Kocha key={`${x}${a}`} sm={sm} markaz={[x, (a + c) / 2]} uzunlik={c - a} boylab="z" eni={8} />
      )))}
      {/* Piyodalar o'tish joyi (darvoza yonida) */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-12, 0.013, ASOSIY_YOL.z - 3.2 + i * 1.07]} rotation={[-Math.PI / 2, 0, 0]} material={sm.chiziqOq}>
          <planeGeometry args={[3.2, 0.5]} />
        </mesh>
      ))}
    </StatikGuruh>
  );
}

// ── Zavod hududi ──

function Panjara({ sm, a, c }: { sm: ShaharMateriallari; a: [number, number]; c: [number, number] }) {
  const uzunlik = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const g = useMemo(() => {
    const geo = new THREE.PlaneGeometry(uzunlik, 2.2);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * uzunlik) / 2.5);
    return geo;
  }, [uzunlik]);
  useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} material={sm.panjara} position={[(a[0] + c[0]) / 2, 1.1, (a[1] + c[1]) / 2]} rotation={[0, -Math.atan2(c[1] - a[1], c[0] - a[0]), 0]} />;
}

/** Panjara ustunlari (instancing): har 2.5 m da. */
function PanjaraUstunlari({ sm, kesmalar }: { sm: ShaharMateriallari; kesmalar: Array<[[number, number], [number, number]]> }) {
  const mesh = useMemo(() => {
    const joylar: Array<[number, number]> = [];
    for (const [a, c] of kesmalar) {
      const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 2.5));
      for (let i = 0; i <= n; i++) joylar.push([a[0] + ((c[0] - a[0]) * i) / n, a[1] + ((c[1] - a[1]) * i) / n]);
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 2.35, 0.07), sm.panjaraUstun, joylar.length);
    const mtx = new THREE.Matrix4();
    joylar.forEach(([x, z], i) => im.setMatrixAt(i, mtx.makeTranslation(x, 1.175, z)));
    im.castShadow = true;
    im.computeBoundingSphere();
    return im;
  }, [sm, kesmalar]);
  useEffect(() => () => mesh.geometry.dispose(), [mesh]);
  return <primitive object={mesh} />;
}

const PANJARA: Array<[[number, number], [number, number]]> = [
  [[HUDUD.chap, HUDUD.old], [DARVOZA.x - DARVOZA.yarimEni - 0.35, HUDUD.old]],
  [[DARVOZA.x + DARVOZA.yarimEni + 0.35, HUDUD.old], [HUDUD.ong, HUDUD.old]],
  [[HUDUD.ong, HUDUD.old], [HUDUD.ong, HUDUD.orqa]],
  [[HUDUD.ong, HUDUD.orqa], [HUDUD.chap, HUDUD.orqa]],
  [[HUDUD.chap, HUDUD.orqa], [HUDUD.chap, HUDUD.old]],
];

/** O'zbekiston bayrog'i (kod bilan chizilgan), shamolda hilpiraydi. */
function Bayroq({ m, p }: { m: Materiallar; p: [number, number, number] }) {
  const mato = useRef<THREE.Mesh>(null);
  const { geo, mat, asl } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.4, 1.2, 16, 6);
    geo.translate(1.2, 0, 0);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0099b5"; ctx.fillRect(0, 0, 256, 42);
      ctx.fillStyle = "#ce1126"; ctx.fillRect(0, 42, 256, 3); ctx.fillRect(0, 83, 256, 3);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 45, 256, 38);
      ctx.fillStyle = "#1eb53a"; ctx.fillRect(0, 86, 256, 42);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(30, 21, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0099b5"; ctx.beginPath(); ctx.arc(35, 21, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      [[3, 8], [4, 21], [5, 34]].forEach(([son, y]) => {
        for (let i = 0; i < son; i++) { ctx.beginPath(); ctx.arc(98 - i * 12, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
      });
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 });
    return { geo, mat, asl: Float32Array.from(geo.getAttribute("position").array) };
  }, []);
  useEffect(() => () => { geo.dispose(); mat.map?.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => {
    const t = performance.now() / 1000;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = asl[i * 3];
      pos.setZ(i, Math.sin(x * 2.4 - t * 4.2) * 0.14 * (x / 2.4));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <group position={p}>
      <Silindr r={0.06} h={9} p={[0, 4.5, 0]} mat={m.polat} seg={12} />
      <mesh position={[0, 9.05, 0]} material={m.polat}>
        <sphereGeometry args={[0.1, 12, 8]} />
      </mesh>
      <mesh ref={mato} geometry={geo} material={mat} position={[0.06, 8.2, 0]} castShadow />
    </group>
  );
}

function ZavodHududi({ m, sm }: { m: Materiallar; sm: ShaharMateriallari }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const eni = HUDUD.ong - HUDUD.chap;
  const chuqurlik = HUDUD.old - HUDUD.orqa;
  const orqaMaysa = -SEX_CHUQURLIGI / 2 - 3.5;
  // Hudud jihozlari qimirlamaydi — material bo'yicha birlashtiriladi (bayroq va panjara ustunlari alohida).
  return (
    <StatikGuruh>
      {/* Asfalt va maysalar (bir-birining ustiga tushmaydi) */}
      <Tekislik w={eni} d={chuqurlik} p={[(HUDUD.chap + HUDUD.ong) / 2, -0.012, (HUDUD.orqa + HUDUD.old) / 2]} mat={sm.asfalt} tile={8} />
      <Tekislik w={eni} d={orqaMaysa - HUDUD.orqa} p={[(HUDUD.chap + HUDUD.ong) / 2, -0.006, (HUDUD.orqa + orqaMaysa) / 2]} mat={sm.maysa} tile={10} />
      <Tekislik w={HUDUD.ong - 20.5} d={HUDUD.old - orqaMaysa} p={[(20.5 + HUDUD.ong) / 2, -0.006, (orqaMaysa + HUDUD.old) / 2]} mat={sm.maysa} tile={10} />
      <Tekislik w={4.5} d={27.5 - orqaMaysa} p={[HUDUD.chap + 2.25, -0.006, (orqaMaysa + 27.5) / 2]} mat={sm.maysa} tile={10} />
      <Tekislik w={-6.5 - HUDUD.chap} d={2.5} p={[(HUDUD.chap - 6.5) / 2, -0.006, 28.75]} mat={sm.maysa} tile={10} />
      <Tekislik w={10} d={2.5} p={[15.5, -0.006, 28.75]} mat={sm.maysa} tile={10} />
      {/* Avtoturargoh: asfalt va oq chiziqlar (mashinalar — Transport.tsx, instancing) */}
      <Tekislik w={TURARGOH.joylar * TURARGOH.qadam} d={15} p={[TURARGOH.x, -0.003, TURARGOH.z]} mat={sm.asfalt} tile={8} />
      {TURARGOH.qatorlar.map((dz) => Array.from({ length: TURARGOH.joylar + 1 }, (_, i) => (
        <Quti key={`${dz}${i}`} o={[0.1, 0.01, 4.6]} p={[TURARGOH.x - (TURARGOH.joylar * TURARGOH.qadam) / 2 + i * TURARGOH.qadam, 0.004, TURARGOH.z + dz * 1.55]} mat={sm.chiziqOq} />
      )))}
      <ZonaYorligi p={[TURARGOH.x, 2.6, TURARGOH.z]} matn={t("zones.parking")} rang="#475569" />

      {/* Rampa belgilari: sariq yo'naltiruvchi chiziqlar, to'xtash chizig'i, rezina bamperlar */}
      {[-1.55, 1.55].map((dx) => <Quti key={`r1${dx}`} o={[0.14, 0.01, 9]} p={[RAMPA1.x + dx, 0.004, RAMPA1.z + 4.6]} mat={sm.chiziqSariq} />)}
      {[-1.55, 1.55].map((dz) => <Quti key={`r2${dz}`} o={[9, 0.01, 0.14]} p={[RAMPA2.x - 4.7, 0.004, RAMPA2.z + dz]} mat={sm.chiziqSariq} />)}
      {[-1.1, 1.1].map((dx) => <Quti key={`b1${dx}`} o={[0.35, 0.45, 0.22]} p={[RAMPA1.x + dx, 0.6, RAMPA1.z + 0.12]} mat={m.rezina} />)}
      {[-1.1, 1.1].map((dz) => <Quti key={`b2${dz}`} o={[0.22, 0.45, 0.35]} p={[RAMPA2.x - 0.3, 0.6, RAMPA2.z + dz]} mat={m.rezina} />)}

      {/* Panjara, darvoza ustunlari, surma darvoza (ochiq holatda) */}
      {PANJARA.map(([a, c], i) => <Panjara key={i} sm={sm} a={a} c={c} />)}
      <PanjaraUstunlari sm={sm} kesmalar={PANJARA} />
      {[-1, 1].map((yon) => (
        <group key={yon} position={[DARVOZA.x + yon * (DARVOZA.yarimEni + 0.35), 0, HUDUD.old]}>
          <Yumaloq o={[0.6, 2.7, 0.6]} p={[0, 1.35, 0]} mat={sm.kppDevor} radius={0.04} />
          <Quti o={[0.72, 0.12, 0.72]} p={[0, 2.76, 0]} mat={m.korpusQora} />
        </group>
      ))}
      <group position={[DARVOZA.x - DARVOZA.yarimEni - 4.8, 0, HUDUD.old - 0.25]}>
        <Panjara sm={sm} a={[-4.5, 0]} c={[4.5, 0]} />
        <Quti o={[9.0, 0.08, 0.06]} p={[0, 0.12, 0]} mat={sm.panjaraUstun} />
        <Quti o={[9.0, 0.08, 0.06]} p={[0, 2.18, 0]} mat={sm.panjaraUstun} />
      </group>
      {/* Darvoza: to'xtash chizig'i va sun'iy notekislik */}
      <Quti o={[DARVOZA.yarimEni * 2, 0.01, 0.3]} p={[DARVOZA.x, 0.004, 25.9]} mat={sm.chiziqOq} />
      {Array.from({ length: 9 }, (_, i) => <Quti key={`bump${i}`} o={[1.0, 0.07, 0.45]} p={[DARVOZA.x - 4 + i * 1.0, 0.035, 28.2]} mat={i % 2 ? m.qora : m.sariq} />)}

      {/* KPP budkasi */}
      <group position={[KPP.x, 0, KPP.z]}>
        <Quti o={[3.5, 0.15, 3.0]} p={[0, 0.075, 0]} mat={sm.beton} />
        <Yumaloq o={[3.0, 2.6, 2.6]} p={[0, 1.45, 0]} mat={sm.kppDevor} radius={0.06} />
        <Quti o={[0.04, 1.1, 1.3]} p={[-1.52, 1.75, -0.5]} mat={sm.kppOyna} />
        <Quti o={[0.05, 2.0, 0.85]} p={[-1.52, 1.15, 0.75]} mat={m.korpusQora} />
        <Quti o={[2.3, 1.1, 0.04]} p={[0, 1.75, 1.32]} mat={sm.kppOyna} />
        <Quti o={[2.3, 1.1, 0.04]} p={[0, 1.75, -1.32]} mat={sm.kppOyna} />
        <Quti o={[3.6, 0.2, 3.2]} p={[0, 2.85, 0]} mat={m.korpusQora} />
        <Quti o={[0.7, 0.45, 0.25]} p={[1.6, 2.2, 0.3]} mat={m.korpus} />
        <Quti o={[2.2, 0.5, 0.08]} p={[0, 3.25, 1.2]} mat={m.cncRang} />
        {/* Ichkarida stol va monitor */}
        <Quti o={[1.2, 0.05, 0.6]} p={[0.2, 0.95, -0.7]} mat={m.lmdpYongoq} />
        <Quti o={[0.45, 0.3, 0.04]} p={[0.2, 1.2, -0.95]} mat={m.ekran} />
      </group>
      <ZonaYorligi p={[KPP.x, 4.1, KPP.z]} matn={t("zones.kpp")} rang="#1e3a8a" />
      {/* Kuzatuv kamerasi ustuni va "STOP" belgisi */}
      <group position={[-DARVOZA.yarimEni - 1.2, 0, 26]}>
        <Silindr r={0.07} h={4.2} p={[0, 2.1, 0]} mat={m.polatQora} seg={10} />
        <Quti o={[0.18, 0.18, 0.42]} p={[0.15, 4.1, 0.1]} r={[0.35, 0.6, 0]} mat={m.korpus} />
      </group>
      <group position={[DARVOZA.yarimEni + 0.9, 0, 23.6]}>
        <Silindr r={0.04} h={2.2} p={[0, 1.1, 0]} mat={m.polat} seg={8} />
        <mesh position={[0, 2.35, 0]} rotation={[Math.PI / 2, Math.PI / 8, 0]} material={m.qizil}>
          <cylinderGeometry args={[0.38, 0.38, 0.04, 8]} />
        </mesh>
      </group>

      {/* Orqa hovli: transformator podstansiyasi, chiqindi konteynerlari, palet taxlami, gaz quvuri (sariq) */}
      <group position={[29, 0, -20]}>
        <Quti o={[3.2, 2.6, 2.4]} p={[0, 1.3, 0]} mat={sm.transformator} />
        <Quti o={[0.4, 0.4, 0.02]} p={[0, 1.8, 1.21]} r={[0, 0, Math.PI / 4]} mat={m.ogohlantirish} />
        <Quti o={[3.4, 0.12, 2.6]} p={[0, 2.66, 0]} mat={m.korpusQora} />
      </group>
      {[-22, -19.6, -17.2].map((x, i) => (
        <group key={x} position={[x, 0, -17.6]}>
          <Yumaloq o={[2.0, 1.3, 1.3]} p={[0, 0.7, 0]} mat={i === 2 ? m.cncRang : sm.konteyner} radius={0.06} />
          <Quti o={[2.05, 0.08, 1.35]} p={[0, 1.38, 0]} r={[0.08, 0, 0]} mat={m.korpusQora} />
        </group>
      ))}
      {[[-6, -17.5], [-4.6, -17.5], [-5.3, -18.9]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {Array.from({ length: 7 + i * 2 }, (_, k) => <Quti key={k} o={[1.2, 0.14, 1.0]} p={[0, 0.07 + k * 0.15, 0]} mat={m.palet} />)}
        </group>
      ))}
      <group>
        <Silindr r={0.07} h={SEX_ENI - 2} p={[0, 3.2, -SEX_CHUQURLIGI / 2 - 0.4]} rot={[0, 0, Math.PI / 2]} mat={m.sariq} seg={10} />
        {Array.from({ length: 9 }, (_, i) => <Quti key={i} o={[0.05, 0.05, 0.3]} p={[-15 + i * 3.75, 3.2, -SEX_CHUQURLIGI / 2 - 0.27]} mat={m.polatQora} />)}
        <Silindr r={0.07} h={3.2} p={[15.9, 1.6, -SEX_CHUQURLIGI / 2 - 0.4]} mat={m.sariq} seg={10} />
        <Quti o={[0.7, 0.9, 0.4]} p={[15.9, 1.1, -SEX_CHUQURLIGI / 2 - 0.7]} mat={m.sariq} />
      </group>
    </StatikGuruh>
  );
}

// ── Shahar binolari (yig'ilgan geometriya) ──

type Bino = { x: number; z: number; w: number; d: number; h: number; tur: FasadTuri; tom?: number };

function binoTushadimi(x: number, z: number, w: number, d: number) {
  const ichida = (x0: number, x1: number, z0: number, z1: number) => x + w / 2 > x0 && x - w / 2 < x1 && z + d / 2 > z0 && z - d / 2 < z1;
  if (Math.hypot(x, z) > SHAHAR_RADIUSI) return false;
  if (ichida(HUDUD.chap - 8, HUDUD.ong + 9, HUDUD.orqa - 6, HUDUD.old + 4)) return false;
  // Old tomondagi bog' (kamera shu tomondan qaraydi — past daraxtlar)
  if (ichida(-46, 54, 40, 100)) return false;
  for (const zy of [ASOSIY_YOL.z, ORQA_YOL.z]) if (ichida(-Infinity, Infinity, zy - 7, zy + 7)) return false;
  for (const xy of KONDALANG_YOLLAR) if (ichida(xy - 7, xy + 7, -Infinity, Infinity)) return false;
  return true;
}

function shaharRejasi(): Bino[] {
  const rnd = urugli(2024);
  const binolar: Bino[] = [];
  const oraliq = (a: number, c: number) => a + rnd() * (c - a);
  for (let gx = -216; gx <= 216; gx += 24) {
    for (let gz = -216; gz <= 216; gz += 24) {
      const qosh = (b: Bino) => { if (binoTushadimi(b.x, b.z, b.w, b.d)) binolar.push(b); };
      if (gz < -46) {
        // Orqa: ko'p qavatli uylar va ofislar (zavod orqasidagi siluet)
        const ofis = Math.abs(gx) < 100 && rnd() < 0.3;
        qosh({ x: gx + oraliq(-2, 2), z: gz + oraliq(-2, 2), w: oraliq(14, 19), d: oraliq(10, 13), h: ofis ? oraliq(24, 54) : 3 * Math.round(oraliq(5, 12)), tur: ofis ? "ofis" : "panel" });
      } else if (gx < -60 && gx > -140) {
        // Chap: mahalla — 2×2 hovli uylar, tomlari qiya
        for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) {
          if (rnd() < 0.15) continue;
          qosh({ x: gx + dx + oraliq(-1, 1), z: gz + dz + oraliq(-1, 1), w: oraliq(7.5, 9.5), d: oraliq(7, 9), h: rnd() < 0.3 ? 6.4 : 3.2, tur: "uy", tom: Math.floor(rnd() * 3) });
        }
      } else if (gx > 66 && gx < 150 && gz < 40) {
        // O'ng: sanoat omborlari
        qosh({ x: gx + oraliq(-1, 1), z: gz + oraliq(-1, 1), w: oraliq(16, 21), d: oraliq(12, 18), h: oraliq(7, 11), tur: "ombor" });
      } else if (gz > 44) {
        // Old: past uylar va do'konlar
        for (const dx of [-6, 6]) qosh({ x: gx + dx, z: gz + oraliq(-3, 3), w: oraliq(8, 10), d: oraliq(8, 11), h: rnd() < 0.5 ? 6.4 : 3.2, tur: "uy", tom: Math.floor(rnd() * 3) });
      } else if (Math.abs(gx) >= 140 || gx <= -140) {
        qosh({ x: gx + oraliq(-2, 2), z: gz + oraliq(-2, 2), w: oraliq(14, 19), d: oraliq(10, 13), h: 3 * Math.round(oraliq(5, 9)), tur: "panel" });
      }
    }
  }
  return binolar;
}

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
  /** To'rtburchak: a, b, c, d soat strelkasiga teskari (tashqaridan qaraganda). */
  tortburchak(a: number[], b: number[], c: number[], d: number[], n: number[], uw: number, vh: number) {
    const i = this.pos.length / 3;
    this.uch(a, n, [0, 0]);
    this.uch(b, n, [uw, 0]);
    this.uch(c, n, [uw, vh]);
    this.uch(d, n, [0, vh]);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  uchburchak(a: number[], b: number[], c: number[]) {
    const v1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const v2 = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const n = v1.cross(v2).normalize().toArray();
    const i = this.pos.length / 3;
    this.uch(a, n, [0, 0]);
    this.uch(b, n, [1, 0]);
    this.uch(c, n, [0.5, 1]);
    this.idx.push(i, i + 1, i + 2);
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

function Binolar({ sm }: { sm: ShaharMateriallari }) {
  const qismlar = useMemo(() => {
    const devorlar: Record<FasadTuri, Yiguvchi> = { panel: new Yiguvchi(), ofis: new Yiguvchi(), ombor: new Yiguvchi(), uy: new Yiguvchi() };
    const tekisTom = new Yiguvchi();
    const qiyaTomlar = [new Yiguvchi(), new Yiguvchi(), new Yiguvchi()];
    for (const b of shaharRejasi()) {
      const [tw, th] = FASAD_OLCHAMI[b.tur];
      const x0 = b.x - b.w / 2;
      const x1 = b.x + b.w / 2;
      const z0 = b.z - b.d / 2;
      const z1 = b.z + b.d / 2;
      const y0 = 0;
      const y1 = b.h;
      const v = b.h / th;
      const dv = devorlar[b.tur];
      dv.tortburchak([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], b.w / tw, v);
      dv.tortburchak([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], b.w / tw, v);
      dv.tortburchak([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], b.d / tw, v);
      dv.tortburchak([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], b.d / tw, v);
      if (b.tom === undefined) {
        tekisTom.tortburchak([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], 1, 1);
      } else {
        // Qiya (to'rt yonli) tom, devordan biroz chiqib turadi.
        const q = 0.45;
        const [a0, a1, c0, c1] = [x0 - q, x1 + q, z0 - q, z1 + q];
        const cho = [b.x, y1 + Math.min(b.w, b.d) * 0.28, b.z];
        const tom = qiyaTomlar[b.tom % 3];
        tom.uchburchak([a0, y1, c1], [a1, y1, c1], cho);
        tom.uchburchak([a1, y1, c1], [a1, y1, c0], cho);
        tom.uchburchak([a1, y1, c0], [a0, y1, c0], cho);
        tom.uchburchak([a0, y1, c0], [a0, y1, c1], cho);
      }
    }
    return {
      devorlar: (Object.keys(devorlar) as FasadTuri[]).map((tur) => ({ tur, g: devorlar[tur].geometriya() })),
      tekisTom: tekisTom.geometriya(),
      qiyaTomlar: qiyaTomlar.map((t) => t.geometriya()),
    };
  }, []);
  useEffect(() => () => {
    qismlar.devorlar.forEach(({ g }) => g.dispose());
    qismlar.tekisTom.dispose();
    qismlar.qiyaTomlar.forEach((g) => g.dispose());
  }, [qismlar]);
  return (
    <group>
      {qismlar.devorlar.map(({ tur, g }) => <mesh key={tur} geometry={g} material={sm.fasad[tur]} />)}
      <mesh geometry={qismlar.tekisTom} material={sm.tomTekis} />
      {qismlar.qiyaTomlar.map((g, i) => <mesh key={i} geometry={g} material={sm.tomlar[i]} />)}
    </group>
  );
}

// ── Daraxtlar va chiroqlar (instancing) ──

type Daraxt = { x: number; z: number; terak: boolean; r: number };

function daraxtlarRejasi(): Daraxt[] {
  const rnd = urugli(808);
  const d: Daraxt[] = [];
  const kochaYonida = (x: number) => KONDALANG_YOLLAR.some((k) => Math.abs(x - k) < 7);
  // Ko'chalar bo'ylab teraklar
  for (let x = -220; x <= 220; x += 7) {
    if (kochaYonida(x)) continue;
    d.push({ x: x + rnd(), z: ASOSIY_YOL.z + 6.8, terak: true, r: 1 });
    d.push({ x: x + rnd(), z: ORQA_YOL.z - 6.6, terak: true, r: 1 });
    if (x < HUDUD.chap - 4 || x > HUDUD.ong + 4) d.push({ x: x + rnd(), z: ORQA_YOL.z + 6.4, terak: true, r: 1 });
  }
  for (const k of KONDALANG_YOLLAR) {
    for (let z = -220; z <= 220; z += 8) {
      if (Math.abs(z - ASOSIY_YOL.z) < 8 || Math.abs(z - ORQA_YOL.z) < 8) continue;
      d.push({ x: k - 6.2, z: z + rnd(), terak: false, r: 1.6 + rnd() * 0.8 });
      d.push({ x: k + 6.2, z: z + rnd(), terak: false, r: 1.6 + rnd() * 0.8 });
    }
  }
  // Hudud ichidagi maysalar
  for (let x = HUDUD.chap + 2; x < -8; x += 4.5) d.push({ x, z: 28.8, terak: false, r: 1.3 + rnd() * 0.5 });
  for (let x = 12; x < 20; x += 4.5) d.push({ x, z: 28.8, terak: false, r: 1.3 + rnd() * 0.5 });
  for (let z = -12; z < 27; z += 5) if (z < -6 || z > 10) d.push({ x: HUDUD.ong - 1.6, z, terak: true, r: 1 });
  for (let z = -12; z < 26; z += 5) d.push({ x: HUDUD.chap + 2, z, terak: false, r: 1.4 + rnd() * 0.5 });
  for (let x = HUDUD.chap + 3; x < HUDUD.ong - 2; x += 5.5) if (x < 20 || x > 33) d.push({ x, z: HUDUD.orqa + 1.6, terak: true, r: 1 });
  // Hudud bilan ko'ndalang ko'chalar orasidagi yashil tasma
  for (let z = -30; z < 30; z += 6) {
    d.push({ x: HUDUD.chap - 5 + rnd() * 2, z: z + rnd() * 2, terak: false, r: 1.8 + rnd() * 0.8 });
    d.push({ x: HUDUD.ong + 5 + rnd() * 3, z: z + rnd() * 2, terak: false, r: 1.8 + rnd() * 0.8 });
  }
  // Old tomondagi bog'
  for (let i = 0; i < 80; i++) d.push({ x: -44 + rnd() * 96, z: 46 + rnd() * 52, terak: rnd() < 0.15, r: 1.8 + rnd() * 1.4 });
  // Mahalla hovlilaridagi mevali daraxtlar
  for (let i = 0; i < 90; i++) {
    const x = -140 + rnd() * 80;
    const z = -40 + rnd() * 75;
    if (Math.abs(z - ASOSIY_YOL.z) > 7 && Math.abs(z - ORQA_YOL.z) > 7 && !kochaYonida(x)) d.push({ x, z, terak: false, r: 1.3 + rnd() * 0.9 });
  }
  return d;
}

/** Daraxtlar: toj bir nechta silliq "bulut"dan (oddiy daraxt — 3 ta, terak — 2 ta cho'zilgan), barchasi bitta instancing. */
function Daraxtlar({ sm }: { sm: ShaharMateriallari }) {
  const { tana, barg } = useMemo(() => {
    const rejasi = daraxtlarRejasi();
    const rnd = urugli(909);
    const bulutlar: Array<{ p: THREE.Vector3; s: THREE.Vector3; rang: THREE.Color }> = [];
    const tana = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 8), sm.daraxtTana, rejasi.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    rejasi.forEach((d, i) => {
      const tanaH = d.terak ? 2.2 : 1.8 + d.r * 0.35;
      tana.setMatrixAt(i, m4.compose(new THREE.Vector3(d.x, tanaH / 2, d.z), q.identity(), new THREE.Vector3(d.terak ? 1 : 0.9 + d.r * 0.15, tanaH, d.terak ? 1 : 0.9 + d.r * 0.15)));
      const asos = new THREE.Color().setHSL(0.24 + rnd() * 0.07, 0.36 + rnd() * 0.2, d.terak ? 0.23 + rnd() * 0.05 : 0.27 + rnd() * 0.09);
      const rang = (k: number) => asos.clone().offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.05 + k);
      if (d.terak) {
        const h = 5.5 + rnd() * 1.8;
        bulutlar.push({ p: new THREE.Vector3(d.x, tanaH + h * 0.42, d.z), s: new THREE.Vector3(1.15, h * 0.5, 1.15), rang: rang(-0.02) });
        bulutlar.push({ p: new THREE.Vector3(d.x + (rnd() - 0.5) * 0.3, tanaH + h * 0.8, d.z + (rnd() - 0.5) * 0.3), s: new THREE.Vector3(0.8, h * 0.32, 0.8), rang: rang(0.02) });
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
  }, [sm]);
  useEffect(() => () => { tana.geometry.dispose(); barg.geometry.dispose(); tana.dispose(); barg.dispose(); }, [tana, barg]);
  return (
    <>
      <primitive object={tana} />
      <primitive object={barg} />
    </>
  );
}

function Chiroqlar({ sm }: { sm: ShaharMateriallari }) {
  const { ustun, bosh } = useMemo(() => {
    const joylar: Array<{ x: number; z: number; yon: number }> = [];
    for (let x = -210; x <= 210; x += 28) {
      if (KONDALANG_YOLLAR.some((k) => Math.abs(x - k) < 6)) continue;
      if (Math.abs(x - DARVOZA.x) > 9) joylar.push({ x, z: ASOSIY_YOL.z - ASOSIY_YOL.eni / 2 - 0.9, yon: 1 });
      joylar.push({ x: x + 14, z: ASOSIY_YOL.z + ASOSIY_YOL.eni / 2 + 0.9, yon: -1 });
      joylar.push({ x, z: ORQA_YOL.z + ORQA_YOL.eni / 2 + 0.9, yon: -1 });
    }
    const ustun = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 8, 8), sm.chiroqUstun, joylar.length);
    const bosh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.14, 1.9), sm.chiroqBosh, joylar.length);
    const m4 = new THREE.Matrix4();
    joylar.forEach(({ x, z, yon }, i) => {
      ustun.setMatrixAt(i, m4.makeTranslation(x, 4, z));
      bosh.setMatrixAt(i, m4.makeTranslation(x, 8, z + yon * 0.9));
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

/** Butun tashqi muhit: yer, ko'chalar, zavod hududi, shahar binolari, daraxtlar, chiroqlar. */
export default function Shaharcha({ m, sm }: { m: Materiallar; sm: ShaharMateriallari }) {
  return (
    <group>
      <Tekislik w={YER_OLCHAMI} d={YER_OLCHAMI} p={[0, -0.03, 0]} mat={sm.maysa} tile={10} />
      <Kochalar sm={sm} />
      <ZavodHududi m={m} sm={sm} />
      <Bayroq m={m} p={[14.5, 0, 27.2]} />
      <Binolar sm={sm} />
      <Daraxtlar sm={sm} />
      <Chiroqlar sm={sm} />
    </group>
  );
}
