import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletBilanNusxa } from "three/examples/jsm/utils/SkeletonUtils.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ALMASHISH_VAQTI,
  ODAM_TURLARI,
  ORINDIQ_BALANDLIGI,
  burchakFarqi,
  harakatniHal,
  kelibKetuvchiHolati,
  kelibKetuvchiJadvali,
  kelibKetuvchilar,
  klipNomi,
  odamMasshtabi,
  odamUrl,
  otirishBoshlanishi,
  otirishSiljishi,
  yoldagiHolat,
  yolJadvali,
  yurishTezligiKoef,
  type KelibKetuvchi,
  type Nuqta,
  type OdamHarakati,
  type OdamTuri,
} from "./odamModellari";

// Yuklab olingan (Quaternius, CC0) skeletli odam modellari: har nusxada o'z skeleti va AnimationMixer'i bor, geometriya va
// material umumiy. Yuklashda modelning 4–7 ta alohida meshi (har biri o'z materiali bilan) bitta skinli meshga birlashtiriladi
// (rang — uch rangi sifatida): bir odam = 1 draw call (+1 soya). Komponentlar useGLTF bilan "suspend" qiladi — integrator
// ularni <Suspense fallback={null}> ichiga o'raydi.

/** GLB lar faqat loyiha ichidan, Draco/Meshopt dekoderlarisiz (tashqi havola yo'q). */
function useOdamGltf(tur: OdamTuri) {
  return useGLTF(odamUrl(tur), false, false);
}

// Sahifa ochilishi bilan barcha odam modellari fonda yuklana boshlaydi
for (const tur of ODAM_TURLARI) useGLTF.preload(odamUrl(tur), false, false);

/** Bitta model turi uchun tayyor shablon: birlashtirilgan skinli mesh + skelet, kliplar (o'tirish — takrorlanadigan qismi). */
type Shablon = { obj: THREE.Object3D; kliplar: Map<string, THREE.AnimationClip> };
const SHABLONLAR = new WeakMap<THREE.Object3D, Shablon>();

/**
 * Barcha odamlar uchun bitta material: rang uchlarda. Asl FBX→glTF materiallari metalness 0.4 / roughness 0.42 — plastmassa
 * kabi yaltiraydi; mato va teri uchun xira, metallsiz qilinadi. Sahifa yopilganda ham saqlanadi (bitta, kichik).
 */
let odamMateriali: THREE.MeshStandardMaterial | null = null;
function umumiyMaterial() {
  odamMateriali ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, name: "odam" });
  return odamMateriali;
}

/** Klipning `boshlanish` dan keyingi qismi (vaqt 0 dan boshlanadi). Har trek boshlanish nuqtasida interpolyatsiya qilinadi. */
function kesilganKlip(klip: THREE.AnimationClip, boshlanish: number): THREE.AnimationClip {
  const treklar = klip.tracks.map((trek) => {
    const n = trek.getValueSize();
    // createInterpolant ish vaqtida bor (setInterpolation o'rnatadi), lekin @types/three da e'lon qilinmagan
    const interpolyant = (trek as THREE.KeyframeTrack & { createInterpolant: () => THREE.Interpolant }).createInterpolant();
    const boshQiymat = Array.from(interpolyant.evaluate(boshlanish) as ArrayLike<number>);
    const vaqtlar: number[] = [0];
    const qiymatlar: number[] = boshQiymat.slice(0, n);
    for (let i = 0; i < trek.times.length; i++) {
      if (trek.times[i] <= boshlanish + 1e-4) continue;
      vaqtlar.push(trek.times[i] - boshlanish);
      for (let c = 0; c < n; c++) qiymatlar.push(trek.values[i * n + c]);
    }
    const Konstruktor = trek.constructor as new (nom: string, vaqt: number[], qiymat: number[]) => THREE.KeyframeTrack;
    return new Konstruktor(trek.name, vaqtlar, qiymatlar);
  });
  return new THREE.AnimationClip(`${klip.name}#takror`, -1, treklar);
}

/** Skinli meshning bitta bo'lagini birlashtirish uchun bir xil atributlarga keltiradi (rang — material × uch rangi). */
function bolakGeometriyasi(mesh: THREE.SkinnedMesh, suyakIndeksi: Map<THREE.Bone, number>): THREE.BufferGeometry | null {
  const g = mesh.geometry;
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const si = g.getAttribute("skinIndex");
  const sw = g.getAttribute("skinWeight");
  if (!pos || !nor || !si || !sw) return null;
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
  const asosRang = material.color ?? new THREE.Color(1, 1, 1);
  const uchRangi = material.vertexColors ? g.getAttribute("color") : undefined;
  const n = pos.count;
  const p = new Float32Array(n * 3);
  const nr = new Float32Array(n * 3);
  const r = new Float32Array(n * 3);
  const ind = new Uint16Array(n * 4);
  const vazn = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    p[i * 3] = pos.getX(i);
    p[i * 3 + 1] = pos.getY(i);
    p[i * 3 + 2] = pos.getZ(i);
    nr[i * 3] = nor.getX(i);
    nr[i * 3 + 1] = nor.getY(i);
    nr[i * 3 + 2] = nor.getZ(i);
    r[i * 3] = asosRang.r * (uchRangi ? uchRangi.getX(i) : 1);
    r[i * 3 + 1] = asosRang.g * (uchRangi ? uchRangi.getY(i) : 1);
    r[i * 3 + 2] = asosRang.b * (uchRangi ? uchRangi.getZ(i) : 1);
    for (let c = 0; c < 4; c++) {
      const suyak = mesh.skeleton.bones[si.getComponent(i, c)];
      const k = suyak ? suyakIndeksi.get(suyak) : undefined;
      if (k === undefined) return null;
      ind[i * 4 + c] = k;
      vazn[i * 4 + c] = sw.getComponent(i, c);
    }
  }
  const natija = new THREE.BufferGeometry();
  natija.setAttribute("position", new THREE.BufferAttribute(p, 3));
  natija.setAttribute("normal", new THREE.BufferAttribute(nr, 3));
  natija.setAttribute("color", new THREE.BufferAttribute(r, 3));
  natija.setAttribute("skinIndex", new THREE.BufferAttribute(ind, 4));
  natija.setAttribute("skinWeight", new THREE.BufferAttribute(vazn, 4));
  const indeks = new Uint32Array(g.index ? g.index.count : n);
  for (let i = 0; i < indeks.length; i++) indeks[i] = g.index ? g.index.getX(i) : i;
  natija.setIndex(new THREE.BufferAttribute(indeks, 1));
  return natija;
}

/** GLTF sahnasidan shablon yasaydi (har model turi uchun bir marta; keshlanadi). */
function shablonOl(tur: OdamTuri, sahna: THREE.Object3D, animatsiyalar: THREE.AnimationClip[]): Shablon {
  const bor = SHABLONLAR.get(sahna);
  if (bor) return bor;
  const obj = skeletBilanNusxa(sahna);
  obj.updateMatrixWorld(true);
  const terilar: THREE.SkinnedMesh[] = [];
  obj.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) terilar.push(o as THREE.SkinnedMesh);
  });
  const skelet = terilar[0]?.skeleton;
  if (skelet) {
    const suyakIndeksi = new Map(skelet.bones.map((b, i) => [b, i] as const));
    const bolaklar = terilar.map((m) => bolakGeometriyasi(m, suyakIndeksi));
    const birlashgan = bolaklar.every((b) => b) ? mergeGeometries(bolaklar as THREE.BufferGeometry[], false) : null;
    bolaklar.forEach((b) => b?.dispose());
    if (birlashgan) {
      birlashgan.computeBoundingSphere();
      terilar.forEach((m) => m.parent?.remove(m));
      const teri = new THREE.SkinnedMesh(birlashgan, umumiyMaterial());
      teri.name = "odamTanasi";
      obj.add(teri);
      // GLTF yuklovchisidagi kabi: uchlar suyak dunyo matritsasi × teskari bind bilan joylashadi (mesh tuguni hisobga olinmaydi)
      teri.bind(new THREE.Skeleton(skelet.bones, skelet.boneInverses), new THREE.Matrix4());
    }
  }
  obj.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.receiveShadow = true;
    // Skinli mesh chegarasi bind pozadan hisoblanadi — animatsiyada kamera chetida yo'qolib qolmasin
    m.frustumCulled = false;
  });
  const kliplar = new Map(animatsiyalar.map((k) => [k.name, k] as const));
  const boshlanish = otirishBoshlanishi(tur);
  const otirishKlipi = kliplar.get(klipNomi(tur, "otirish"));
  if (boshlanish !== null && otirishKlipi) kliplar.set(`${otirishKlipi.name}#takror`, kesilganKlip(otirishKlipi, boshlanish));
  const shablon = { obj, kliplar };
  SHABLONLAR.set(sahna, shablon);
  return shablon;
}

/** Bitta odam nusxasining animatsiya boshqaruvi (render tsiklidan tashqarida, useFrame ichida o'zgaradi). */
type Boshqaruv = {
  mixer: THREE.AnimationMixer;
  joriy: { harakat: OdamHarakati; amal: THREE.AnimationAction } | null;
};

/**
 * Odam nusxasi: model + mixer. `yangila(dt, harakat, koef, siljishGuruhi, orindiq)` har kadrda chaqiriladi — kerak bo'lsa klipni
 * silliq almashtiradi, o'tirishda ildizni o'rindiq ustiga suradi.
 */
function useOdamNusxasi(tur: OdamTuri, faza: number) {
  const gltf = useOdamGltf(tur);
  const shablon = shablonOl(tur, gltf.scene, gltf.animations);
  const obj = useMemo(() => skeletBilanNusxa(shablon.obj), [shablon]);
  const b = useMemo<Boshqaruv>(() => ({ mixer: new THREE.AnimationMixer(obj), joriy: null }), [obj]);
  useEffect(
    () => () => {
      b.mixer.stopAllAction();
      b.mixer.uncacheRoot(obj);
      b.joriy = null;
      // Suyak teksturasini bo'shatadi (geometriya va material umumiy — tegilmaydi); qayta ulansa renderer qayta yaratadi
      obj.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose();
      });
    },
    [b, obj],
  );

  function amalOl(harakat: OdamHarakati) {
    const nom = klipNomi(tur, harakat);
    const klip = (harakat === "otirish" ? shablon.kliplar.get(`${nom}#takror`) : undefined) ?? shablon.kliplar.get(nom);
    if (!klip) return null;
    const amal = b.mixer.clipAction(klip);
    amal.setLoop(harakat === "otirish" ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);
    return amal;
  }

  function yangila(dt: number, harakat: OdamHarakati, koef: number, siljish: THREE.Object3D | null, orindiq: number) {
    const kerak = harakatniHal(tur, harakat);
    if (!b.joriy || b.joriy.harakat !== kerak) {
      const amal = amalOl(kerak);
      if (amal) {
        const eski = b.joriy?.amal;
        amal.reset();
        // Birinchi klip — tasodifiy fazadan (olomon bir xil qadam tashlamasin)
        amal.time = (eski ? 0 : faza) * amal.getClip().duration;
        amal.play();
        if (eski && eski !== amal) eski.crossFadeTo(amal, ALMASHISH_VAQTI, false);
        b.joriy = { harakat: kerak, amal };
      }
    }
    if (b.joriy) b.joriy.amal.timeScale = koef;
    b.mixer.update(Math.min(dt, 0.1));
    if (siljish) {
      // O'tirganda ildiz o'rindiq ustiga suriladi (klip almashayotganda silliq)
      const o = kerak === "otirish" ? otirishSiljishi(tur, orindiq) : null;
      const k = b.joriy && b.joriy.amal.getEffectiveWeight() < 1 ? 1 - Math.exp(-dt * 8) : 1;
      siljish.position.y += ((o?.y ?? 0) - siljish.position.y) * k;
      siljish.position.z += ((o?.z ?? 0) - siljish.position.z) * k;
    }
  }

  /** Harakat klipining davomiyligi (s) — yurish tezligini moslash uchun. */
  function davomiylik(harakat: OdamHarakati) {
    return shablon.kliplar.get(klipNomi(tur, harakat))?.duration ?? 1;
  }

  return { obj, masshtab: odamMasshtabi(tur), yangila, davomiylik };
}

/**
 * Joyida turgan (yoki o'tirgan) jonli odam.
 * - `p` — oyoq ostidagi nuqta (o'tirganda — o'rindiq markazi ostidagi pol nuqtasi), `burilish` — Y bo'yicha (0 — +z ga qaraydi).
 * - `harakat` o'zgarsa klip 0.35 s da silliq almashadi; modelda klip bo'lmasa zaxira (masalan, "otirish" faqat direktor,
 *   xodimErkak, xodimAyol da bor — qolganlari tik turadi).
 * - `orindiq` — o'rindiq yuzasi balandligi (m, poldan; standart 0.47). Faqat "otirish" da ishlatiladi.
 * - `faza` (0…1) — klip boshlanish nuqtasi, `tezlik` — animatsiya tezligi koeffitsienti (1 — asl).
 */
export function GlbOdam({ tur, harakat = "turish", p, burilish = 0, faza = 0, tezlik = 1, orindiq = ORINDIQ_BALANDLIGI }: {
  tur: OdamTuri;
  harakat?: OdamHarakati;
  p: [number, number, number];
  burilish?: number;
  faza?: number;
  tezlik?: number;
  orindiq?: number;
}) {
  const { obj, masshtab, yangila } = useOdamNusxasi(tur, faza);
  const siljish = useRef<THREE.Group>(null);
  useFrame((_, dt) => yangila(dt, harakat, tezlik, siljish.current, orindiq));
  return (
    <group position={p} rotation={[0, burilish, 0]}>
      <group ref={siljish}>
        <primitive object={obj} scale={masshtab} dispose={null} />
      </group>
    </group>
  );
}

/**
 * Yo'l bo'ylab yuruvchi odam. `nuqtalar` — [x, z] ketma-ketligi; `halqa` — oxiridan boshiga qaytadi, aks holda borib-qaytadi.
 * Yurish yo'nalishiga qaraydi (burilish silliq), yurish klipi tezligi `tezlik` (m/s) ga moslanadi — oyoq sirpanmaydi.
 * `toxtash` (s; son yoki har nuqta uchun massiv) — nuqtada turib `toxtashHarakati` ni bajaradi (masalan, "ishlash").
 * `faza` (0…1) — yo'l davrining boshlanish ulushi (bir yo'ldagi bir necha odam turli joyda bo'ladi). `y` — pol balandligi.
 */
export function YuruvchiGlbOdam({ tur, nuqtalar, tezlik = 1.3, faza = 0, toxtash = 0, halqa = false, harakat = "yurish", toxtashHarakati = "turish", y = 0 }: {
  tur: OdamTuri;
  nuqtalar: readonly Nuqta[];
  tezlik?: number;
  faza?: number;
  toxtash?: number | readonly number[];
  halqa?: boolean;
  harakat?: OdamHarakati;
  toxtashHarakati?: OdamHarakati;
  y?: number;
}) {
  const { obj, masshtab, yangila, davomiylik } = useOdamNusxasi(tur, faza);
  const jadval = useMemo(() => yolJadvali(nuqtalar, { rejim: halqa ? "halqa" : "mayatnik", tezlik, toxtash }), [nuqtalar, halqa, tezlik, toxtash]);
  const guruh = useRef<THREE.Group>(null);
  const siljish = useRef<THREE.Group>(null);
  const burchak = useRef<number | null>(null);
  const yurishKoef = harakatniHal(tur, harakat) === "yurish" ? yurishTezligiKoef(tur, tezlik, davomiylik("yurish")) : 1;

  useFrame((state, dt) => {
    const g = guruh.current;
    if (!g) return;
    const h = yoldagiHolat(jadval, state.clock.elapsedTime + faza * jadval.davr);
    g.position.set(h.x, y, h.z);
    burchak.current = burchak.current === null ? h.burchak : burchak.current + burchakFarqi(burchak.current, h.burchak) * (1 - Math.exp(-dt * 9));
    g.rotation.y = burchak.current;
    yangila(dt, h.yurmoqda ? harakat : toxtashHarakati, h.yurmoqda ? yurishKoef : 1, siljish.current, ORINDIQ_BALANDLIGI);
  });
  return (
    <group ref={guruh}>
      <group ref={siljish}>
        <primitive object={obj} scale={masshtab} dispose={null} />
      </group>
    </group>
  );
}

/** Bitta kelib-ketuvchi: davrning yo'l qismida ko'rinadi, turniketda propusk tekkizadi, qolgan vaqtda bino ichida (yashirin). */
function KelibKetuvchiOdam({ k }: { k: KelibKetuvchi }) {
  const { obj, masshtab, yangila, davomiylik } = useOdamNusxasi(k.tur, k.faza);
  const jadval = useMemo(() => kelibKetuvchiJadvali(k), [k]);
  const koef = yurishTezligiKoef(k.tur, k.tezlik, davomiylik("yurish"));
  const guruh = useRef<THREE.Group>(null);
  const burchak = useRef<number | null>(null);

  useFrame((state, dt) => {
    const g = guruh.current;
    if (!g) return;
    const h = kelibKetuvchiHolati(k, jadval, state.clock.elapsedTime);
    if (!h.korinadi) {
      g.visible = false;
      burchak.current = null;
      return;
    }
    g.visible = true;
    g.position.set(h.x, 0, h.z);
    burchak.current = burchak.current === null ? h.burchak : burchak.current + burchakFarqi(burchak.current, h.burchak) * (1 - Math.exp(-dt * 9));
    g.rotation.y = burchak.current;
    yangila(dt, h.yurmoqda ? "yurish" : h.turniketda ? "ishlash" : "turish", h.yurmoqda ? koef : 1, null, ORINDIQ_BALANDLIGI);
  });
  return (
    <group ref={guruh} visible={false}>
      <primitive object={obj} scale={masshtab} dispose={null} />
    </group>
  );
}

/**
 * Ishga kelib-ketish (demo): avtobus bekati va tashqi avtoturargohdan KPP turniketi orqali maishiy blokka (ishchilar) va
 * ofisga (rahbarlar) kelayotganlar hamda teskari yo'nalishda uyga ketayotganlar — 12 kishi, bir vaqtda 5–10 tasi ko'rinadi.
 */
export function KelibKetuvchilar() {
  const royxat = useMemo(() => kelibKetuvchilar(), []);
  return (
    <group>
      {royxat.map((k) => (
        <KelibKetuvchiOdam key={k.id} k={k} />
      ))}
    </group>
  );
}
