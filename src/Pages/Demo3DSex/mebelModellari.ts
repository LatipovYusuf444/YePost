import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GALEREYA, MAISHIY } from "./hudud.ts";
import type { Nuqta, OdamHarakati, OdamTuri } from "./odamModellari.ts";

// Ofis va maishiy blok: mebel modellari ro'yxati (Kenney Furniture Kit, CC0 + Quaternius ofis kreslosi), joylashuv ma'lumotlari
// (ish stollari, stullar, odamlar, shkafchalar), mebelni bitta geometriyaga birlashtirish va kod bilan chiziladigan teksturalar.
// Bu faylda JSX va drei yo'q — node testlari to'g'ridan-to'g'ri import qiladi. Chizish — Ofis.tsx va Maishiy.tsx da.
//
// Kenney modellari taxminan 0.5× real o'lchamda (masshtab ≈ 2), Y yuqoriga, oldi +Z (stul/stol foydalanuvchisi +Z tomonda),
// origin — chegara burchagida. Shuning uchun har joy chegara markazi (x, z) va pastki nuqtasi (y) bo'yicha joylashtiriladi.

export type V3 = [number, number, number];

/** Mebel "pardozi" — bitta umumiy material (rang — uch rangi). Bir binodagi barcha mebel shu guruhlar bo'yicha birlashtiriladi. */
export type Pardoz = "yogoch" | "metall" | "qoraMetall" | "sopol" | "mato" | "plastik" | "shisha" | "osimlik" | "chiroq" | "ekran";
export const PARDOZLAR: readonly Pardoz[] = ["yogoch", "metall", "qoraMetall", "sopol", "mato", "plastik", "shisha", "osimlik", "chiroq", "ekran"];

/** GLB ichidagi material nomi → pardoz va standart rang (Kenney palitrasi; ofis kreslosida Grey/Black/Chair). */
const MATERIAL_NOMLARI: Record<string, readonly [Pardoz, string]> = {
  wood: ["yogoch", "#c9a27e"],
  woodDark: ["yogoch", "#7a573d"],
  metal: ["metall", "#b9c0c8"],
  metalMedium: ["metall", "#6b7480"],
  metalDark: ["qoraMetall", "#2a2f36"],
  metalLight: ["sopol", "#eef1f4"],
  carpet: ["mato", "#56606e"],
  carpetDarker: ["mato", "#3c4450"],
  carpetWhite: ["sopol", "#f4f6f8"],
  _defaultMat: ["sopol", "#f8fafc"],
  glass: ["shisha", "#d4e6ee"],
  plant: ["osimlik", "#3d7a46"],
  lamp: ["chiroq", "#fff3d1"],
  Grey: ["metall", "#8e959e"],
  Black: ["plastik", "#1b1d21"],
  Chair: ["mato", "#23262b"],
};

type MebelModeli = {
  /** public/models/demo3d/mebel/ ichidagi fayl. */
  fayl: string;
  /** Standart masshtab (x, y, z). */
  masshtab: V3;
  /** Model chegarasi (model birligida, tugun transformatsiyalari bilan) — GLB dan o'lchangan, test tekshiradi. */
  chegara: readonly [V3, V3];
  /** Shu modeldagi material nomlari uchun boshqa pardoz/rang. */
  pardoz?: Partial<Record<string, Pardoz>>;
  rang?: Partial<Record<string, string>>;
};

export const MEBEL_MODELLARI = {
  stol: { fayl: "desk.glb", masshtab: [2, 2, 2], chegara: [[-0.01, 0, -0.38], [0.724, 0.384, 0.012]], rang: { wood: "#ece8e1", metal: "#30353c" } },
  burchakStol: { fayl: "deskCorner.glb", masshtab: [2, 2, 2], chegara: [[0, 0, -0.974], [0.974, 0.384, 0]], rang: { wood: "#c39a6b", metal: "#30353c" } },
  kreslo: { fayl: "ofisKreslo.glb", masshtab: [1, 1, 1], chegara: [[-0.361, 0, -0.442], [0.36, 1.128, 0.365]] },
  ofisStuli: { fayl: "chairDesk.glb", masshtab: [2, 2, 2], chegara: [[0, 0, -0.314], [0.335, 0.608, 0]], rang: { carpet: "#3a4656", metalMedium: "#2b2f35" } },
  stul: { fayl: "chair.glb", masshtab: [2.2, 2, 2.2], chegara: [[0, 0, -0.2], [0.2, 0.47, 0]], rang: { wood: "#a8774f" } },
  monitor: { fayl: "computerScreen.glb", masshtab: [1.4, 1.4, 1.4], chegara: [[0, 0, -0.104], [0.393, 0.294, 0]], pardoz: { metal: "ekran" }, rang: { metal: "#0b1424", metalDark: "#16191d" } },
  klaviatura: { fayl: "computerKeyboard.glb", masshtab: [1.6, 1.6, 1.6], chegara: [[0, 0, -0.118], [0.282, 0.028, 0]], rang: { metalDark: "#1d2025", metalMedium: "#3a3f46" } },
  noutbuk: { fayl: "laptop.glb", masshtab: [1.3, 1.3, 1.3], chegara: [[0, 0, -0.24], [0.264, 0.162, 0]], rang: { metalDark: "#202328", metal: "#c4c9cf", metalMedium: "#8a9099" } },
  divan: { fayl: "loungeSofa.glb", masshtab: [2, 1.8, 2], chegara: [[0, 0, -0.41], [0.98, 0.46, 0]], rang: { carpet: "#5b6472", wood: "#2b2f35" }, pardoz: { wood: "qoraMetall" } },
  yumshoqKreslo: { fayl: "loungeChair.glb", masshtab: [2, 1.8, 2], chegara: [[0, 0, -0.41], [0.49, 0.46, 0]], rang: { carpet: "#7a6a58", wood: "#2b2f35" }, pardoz: { wood: "qoraMetall" } },
  jurnalStoli: { fayl: "tableCoffeeGlass.glb", masshtab: [2, 1.8, 2], chegara: [[-0.461, 0, -0.3], [0.2, 0.23, 0.1]], rang: { metal: "#2e3238" } },
  shishaStol: { fayl: "tableGlass.glb", masshtab: [2, 2.3, 2], chegara: [[0, 0, -0.447], [0.841, 0.327, 0]], rang: { metal: "#9aa3ad" } },
  oshxonaStoli: { fayl: "table.glb", masshtab: [2, 2.3, 2], chegara: [[0, 0, -0.447], [0.841, 0.327, 0]], rang: { wood: "#d2b48f" } },
  gulTuvak: { fayl: "pottedPlant.glb", masshtab: [2.4, 2.4, 2.4], chegara: [[-0.106, 0, -0.121], [0.106, 0.654, 0.121]], pardoz: { wood: "sopol" }, rang: { wood: "#e4e0d8", woodDark: "#4a3a2c", plant: "#3f7f47" } },
  kichikGul: { fayl: "plantSmall1.glb", masshtab: [2, 2, 2], chegara: [[-0.047, 0, -0.047], [0.047, 0.14, 0.047]], pardoz: { wood: "sopol" }, rang: { wood: "#f1efe9", plant: "#4b8b4f" } },
  yopiqJavon: { fayl: "bookcaseClosedDoors.glb", masshtab: [2, 2.3, 1.6], chegara: [[0, 0, -0.25], [0.4, 0.85, 0]], rang: { wood: "#e4e1dc", metal: "#7b828c" } },
  ochiqJavon: { fayl: "bookcaseOpen.glb", masshtab: [2, 2.2, 1.6], chegara: [[0, 0, -0.25], [0.4, 0.88, 0]], rang: { wood: "#b48a62" } },
  kiyimIlgich: { fayl: "coatRackStanding.glb", masshtab: [2.3, 2.3, 2.3], chegara: [[-0.136, 0, -0.136], [0.136, 0.77, 0.136]], pardoz: { wood: "qoraMetall" }, rang: { wood: "#2e3238" } },
  dush: { fayl: "shower.glb", masshtab: [1.8, 1.8, 1.8], chegara: [[-0.562, 0, -0.562], [0, 1.094, 0.02]], rang: { metalDark: "#3a3f47", metal: "#c3c9d0" } },
  qolYuvgich: { fayl: "bathroomSink.glb", masshtab: [1.7, 1.7, 1.7], chegara: [[0, -0.4, -0.29], [0.34, 0.16, 0]], pardoz: { metalLight: "metall" }, rang: { metalLight: "#cfd5db" } },
  unitaz: { fayl: "toilet.glb", masshtab: [1.6, 1.6, 1.6], chegara: [[0, 0, 0], [0.313, 0.451, 0.477]], pardoz: { metalDark: "metall" }, rang: { metalDark: "#9aa3ad" } },
  muzlatgich: { fayl: "kitchenFridge.glb", masshtab: [2, 2, 2], chegara: [[0, 0, -0.282], [0.43, 0.92, 0.01]], rang: { metalLight: "#e8ebee", metal: "#aab2bb" } },
  kofeMashina: { fayl: "kitchenCoffeeMachine.glb", masshtab: [2, 2, 2], chegara: [[0, 0, -0.24], [0.19, 0.177, 0]], rang: { metalMedium: "#25282d", metal: "#b9c0c8" } },
  oshxonaShkafi: { fayl: "kitchenCabinet.glb", masshtab: [2, 2, 1.4], chegara: [[0, 0, -0.45], [0.43, 0.45, 0]], rang: { wood: "#ebe8e2", woodDark: "#d9d4cb", metal: "#a8afb8" } },
  axlatQuti: { fayl: "trashcan.glb", masshtab: [1.8, 1.8, 1.8], chegara: [[-0.104, 0, -0.112], [0.104, 0.428, 0.122]], rang: { metal: "#7b838d", metalDark: "#2b2f35" } },
  torchiroq: { fayl: "lampSquareFloor.glb", masshtab: [2, 2, 2], chegara: [[0, 0, -0.12], [0.12, 0.86, 0]], rang: { metal: "#2e3238" } },
  gilam: { fayl: "rugRectangle.glb", masshtab: [1.6, 1, 1.6], chegara: [[0, 0, -0.92], [1.57, 0.01, 0]], rang: { carpet: "#6b7280", carpetDarker: "#4b5563" } },
  televizor: { fayl: "televisionModern.glb", masshtab: [1.6, 1.6, 1.6], chegara: [[-0.342, 0, -0.064], [0.342, 0.455, 0.064]], pardoz: { metal: "ekran" }, rang: { metal: "#0b1424", metalDark: "#121418" } },
} satisfies Record<string, MebelModeli>;

export type MebelTuri = keyof typeof MEBEL_MODELLARI;
export const MEBEL_TURLARI = (Object.keys(MEBEL_MODELLARI) as MebelTuri[]).sort();

/** O'rindiq: yuzasi balandligi (model birligida, y masshtabidan oldin) va o'rindiq markazi chegara markazidan qancha oldinda (model birligida). */
export const ORINDIQLAR: Partial<Record<MebelTuri, { y: number; oldinga: number }>> = {
  kreslo: { y: 0.49, oldinga: 0.04 },
  stul: { y: 0.24, oldinga: 0.03 },
  ofisStuli: { y: 0.247, oldinga: 0.02 },
  divan: { y: 0.23, oldinga: 0.045 },
  yumshoqKreslo: { y: 0.23, oldinga: 0.045 },
};

/** Vite BASE_URL (node testida import.meta.env yo'q — "/"). */
function asosiyYol(): string {
  const env = (import.meta as { env?: { BASE_URL?: string } }).env;
  const b = env?.BASE_URL ?? "/";
  return b.endsWith("/") ? b : `${b}/`;
}

/** Mebel fayli manzili: `${BASE_URL}models/demo3d/mebel/<fayl>`. */
export function mebelUrl(tur: MebelTuri): string {
  return `${asosiyYol()}models/demo3d/mebel/${MEBEL_MODELLARI[tur].fayl}`;
}
/** Barcha mebel fayllari (bitta ro'yxat — ikkala bino bir xil kesh kalitini ishlatadi, har fayl bir marta yuklanadi). */
export const MEBEL_URLLARI: readonly string[] = MEBEL_TURLARI.map(mebelUrl);

/** Mebel joyi: `p` — pol nuqtasi (chegara markazi ostida), `b` — Y bo'yicha burilish (0 — oldi +z), `m` — masshtab (standartdan boshqa bo'lsa). */
export type MebelJoyi = {
  tur: MebelTuri;
  p: V3;
  b?: number;
  m?: V3;
  /** Material nomi → rang (shu joy uchun). */
  rang?: Partial<Record<string, string>>;
  pardoz?: Partial<Record<string, Pardoz>>;
  /** Boshqa mebel ustida yoki tagida (monitor stol ustida, gilam pol ustida) — kesishish testida hisoblanmaydi. */
  ustida?: boolean;
};

export function mebelMasshtabi(j: MebelJoyi): V3 {
  return j.m ?? MEBEL_MODELLARI[j.tur].masshtab;
}

/** Model birligidan dunyo koordinatasiga matritsa: T(p) · R(b) · S(m) · T(−markaz). */
export function mebelMatritsasi(j: MebelJoyi, natija = new THREE.Matrix4()): THREE.Matrix4 {
  const [mn, mx] = MEBEL_MODELLARI[j.tur].chegara;
  const s = mebelMasshtabi(j);
  const markaz = new THREE.Matrix4().makeTranslation(-(mn[0] + mx[0]) / 2, -mn[1], -(mn[2] + mx[2]) / 2);
  const olcham = new THREE.Matrix4().makeScale(s[0], s[1], s[2]);
  const burilish = new THREE.Matrix4().makeRotationY(j.b ?? 0);
  return natija.makeTranslation(j.p[0], j.p[1], j.p[2]).multiply(burilish).multiply(olcham).multiply(markaz);
}

/** Mebel o'lchami (metr): eni (lokal x), balandligi, chuqurligi (lokal z). */
export function mebelOlchami(j: MebelJoyi): V3 {
  const [mn, mx] = MEBEL_MODELLARI[j.tur].chegara;
  const s = mebelMasshtabi(j);
  return [(mx[0] - mn[0]) * s[0], (mx[1] - mn[1]) * s[1], (mx[2] - mn[2]) * s[2]];
}

export type Tortburchak = { x0: number; x1: number; z0: number; z1: number };
/** Kod bilan chiziladigan to'siqlar (peshtaxta, stol, tumba): test mebel bilan kesishmasligini tekshiradi. */
export type Tosiq = Tortburchak & { nom: string; y: number; h: number };

/** Mebelning poldagi izi (dunyo o'qlariga tekislangan to'rtburchak) va balandlik oralig'i. */
export function mebelIzi(j: MebelJoyi): Tortburchak & { y0: number; y1: number } {
  const [w, h, d] = mebelOlchami(j);
  const b = j.b ?? 0;
  const c = Math.abs(Math.cos(b));
  const s = Math.abs(Math.sin(b));
  const ex = (c * w + s * d) / 2;
  const ez = (s * w + c * d) / 2;
  return { x0: j.p[0] - ex, x1: j.p[0] + ex, z0: j.p[2] - ez, z1: j.p[2] + ez, y0: j.p[1], y1: j.p[1] + h };
}

// ---------------------------------------------------------------------------------------------------------------------
// Mebelni birlashtirish: bir binodagi barcha GLB mebel pardoz bo'yicha bir nechta geometriyaga (≈ 10 draw call)

type ModelBolagi = { nom: string; geo: THREE.BufferGeometry };
const MODEL_KESHI = new WeakMap<THREE.Object3D, ModelBolagi[]>();

/** GLB sahnasidagi meshlar (model koordinatasida, faqat position + normal, indekssiz). Sahna bo'yicha keshlanadi. */
export function modelBolaklari(sahna: THREE.Object3D): ModelBolagi[] {
  const bor = MODEL_KESHI.get(sahna);
  if (bor) return bor;
  sahna.updateMatrixWorld(true);
  const teskari = new THREE.Matrix4().copy(sahna.matrixWorld).invert();
  const nisbiy = new THREE.Matrix4();
  const natija: ModelBolagi[] = [];
  sahna.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const asl = mesh.geometry;
    if (!asl.getAttribute("position")) return;
    const geo = asl.index ? asl.toNonIndexed() : asl.clone();
    for (const nom of Object.keys(geo.attributes)) if (nom !== "position" && nom !== "normal") geo.deleteAttribute(nom);
    geo.morphAttributes = {};
    if (!geo.getAttribute("normal")) geo.computeVertexNormals();
    geo.applyMatrix4(nisbiy.multiplyMatrices(teskari, mesh.matrixWorld));
    natija.push({ nom: material?.name ?? "", geo });
  });
  MODEL_KESHI.set(sahna, natija);
  return natija;
}

/** Shu joydagi material nomi uchun pardoz va rang. */
export function bolakPardozi(j: MebelJoyi, nom: string): { pardoz: Pardoz; rang: string } {
  const model: MebelModeli = MEBEL_MODELLARI[j.tur];
  const asos = MATERIAL_NOMLARI[nom] ?? (["plastik", "#9ca3af"] as const);
  return {
    pardoz: j.pardoz?.[nom] ?? model.pardoz?.[nom] ?? asos[0],
    rang: j.rang?.[nom] ?? model.rang?.[nom] ?? asos[1],
  };
}

/**
 * Barcha joylardagi mebel → pardoz bo'yicha birlashtirilgan geometriyalar (position, normal, color). Har joyning har bolagi
 * nusxalanib dunyo koordinatasiga o'tkaziladi va rangi uch rangi sifatida yoziladi. Natija geometriyalarini chaqiruvchi bo'shatadi.
 */
export function mebelGeometriyalari(sahnalar: ReadonlyMap<MebelTuri, THREE.Object3D>, joylar: readonly MebelJoyi[]): Map<Pardoz, THREE.BufferGeometry> {
  const guruhlar = new Map<Pardoz, THREE.BufferGeometry[]>();
  const matritsa = new THREE.Matrix4();
  const rang = new THREE.Color();
  for (const j of joylar) {
    const sahna = sahnalar.get(j.tur);
    if (!sahna) continue;
    mebelMatritsasi(j, matritsa);
    for (const bolak of modelBolaklari(sahna)) {
      const t = bolakPardozi(j, bolak.nom);
      const g = bolak.geo.clone();
      g.applyMatrix4(matritsa);
      rang.set(t.rang);
      const n = g.getAttribute("position").count;
      const ranglar = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        ranglar[i * 3] = rang.r;
        ranglar[i * 3 + 1] = rang.g;
        ranglar[i * 3 + 2] = rang.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(ranglar, 3));
      const royxat = guruhlar.get(t.pardoz) ?? [];
      royxat.push(g);
      guruhlar.set(t.pardoz, royxat);
    }
  }
  const natija = new Map<Pardoz, THREE.BufferGeometry>();
  for (const p of PARDOZLAR) {
    const royxat = guruhlar.get(p);
    if (!royxat?.length) continue;
    const birlashgan = mergeGeometries(royxat, false);
    royxat.forEach((g) => g.dispose());
    if (!birlashgan) continue;
    birlashgan.computeBoundingSphere();
    natija.set(p, birlashgan);
  }
  return natija;
}

/** Pardoz materiallari (rang — uchlarda). Chaqiruvchi bo'shatadi. */
export function pardozMateriallari(): Record<Pardoz, THREE.MeshStandardMaterial> {
  const m = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, ...p });
  return {
    yogoch: m({ roughness: 0.6 }),
    metall: m({ roughness: 0.32, metalness: 0.75 }),
    qoraMetall: m({ roughness: 0.45, metalness: 0.45 }),
    sopol: m({ roughness: 0.2, metalness: 0.02 }),
    mato: m({ roughness: 0.95 }),
    plastik: m({ roughness: 0.5 }),
    shisha: m({ roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
    osimlik: m({ roughness: 0.8 }),
    chiroq: m({ roughness: 0.4, emissive: "#fff1c9", emissiveIntensity: 0.9 }),
    ekran: m({ roughness: 0.15, metalness: 0.1, emissive: "#2a5bd7", emissiveIntensity: 0.32 }),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Joylashuv yordamchilari

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** Lokal (dx, dz) siljish — b burilishli jism uchun dunyo koordinatasida. */
export function lokal(x: number, z: number, b: number, dx: number, dz: number): [number, number] {
  const c = Math.cos(b);
  const s = Math.sin(b);
  return [r3(x + dx * c + dz * s), r3(z - dx * s + dz * c)];
}
/** a nuqtadan b nuqtaga qarash burchagi (rotation.y). */
export function qarashBurchagi(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}

/** Joyida turgan yoki o'tirgan odam (GlbOdam props). */
export type OdamJoyi = { tur: OdamTuri; harakat: OdamHarakati; p: V3; burilish: number; orindiq?: number; faza?: number };
/** Yo'l bo'ylab yuruvchi odam (YuruvchiGlbOdam props). */
export type YuruvchiJoyi = { tur: OdamTuri; nuqtalar: readonly Nuqta[]; y: number; tezlik: number; toxtash: number | readonly number[]; toxtashHarakati: OdamHarakati; faza: number };
/** Stul va u qaragan stol markazi (test: stul stolga qaraydi). */
export type OtirishJuftligi = { stul: MebelJoyi; nishon: [number, number] };

let fazaSanagich = 0;
/** Odamlar bir xil harakat qilmasin — har biriga turli faza (takrorlanadi). */
export function keyingiFaza() {
  fazaSanagich = (fazaSanagich + 0.37) % 1;
  return r3(fazaSanagich);
}

/**
 * Stul (yoki divan) va unda o'tirgan odam. Odam o'rindiq markazi ustida, stul qaragan tomonga qaraydi.
 * `lateral` — o'rindiq bo'ylab siljish (divanning chap/o'ng o'rni).
 */
export function stulVaOdam(tur: MebelTuri, x: number, y: number, z: number, b: number, odam?: OdamTuri | null, m?: V3, lateral = 0) {
  const stul: MebelJoyi = { tur, p: [r3(x), y, r3(z)], b, ...(m ? { m } : {}) };
  const orindiq = ORINDIQLAR[tur];
  if (!odam || !orindiq) return { stul, odam: null };
  const s = m ?? MEBEL_MODELLARI[tur].masshtab;
  const [ox, oz] = lokal(x, z, b, lateral, orindiq.oldinga * s[2]);
  const o: OdamJoyi = { tur: odam, harakat: "otirish", p: [ox, y, oz], burilish: b, orindiq: r3(orindiq.y * s[1]), faza: keyingiFaza() };
  return { stul, odam: o };
}

/** Kenney stol: yuzasi balandligi, eni (lokal x) va chuqurligi (lokal z), metr. */
export const STOL = { balandlik: 0.768, eni: 1.468, chuqurlik: 0.784 } as const;

export type IshJoyi = { stol: MebelJoyi; stul: MebelJoyi; odam: OdamJoyi | null; jihozlar: MebelJoyi[] };

/**
 * Ish joyi: stol (markazi x, z; foydalanuvchi lokal +z tomonda), ofis kreslosi, monitor, klaviatura va (bo'lsa) o'tirgan xodim.
 * Stolning tortmasi lokal −x tomonda — kreslo va tizzalar +0.25 m o'ngda (bo'sh joyda). `bosh` — xodim yo'q, kreslo surilgan.
 */
export function ishJoyi(x: number, y: number, z: number, b: number, o: { odam?: OdamTuri | null; bosh?: boolean; monitorlar?: 1 | 2; gul?: boolean; noutbuk?: boolean } = {}): IshJoyi {
  const stol: MebelJoyi = { tur: "stol", p: [r3(x), y, r3(z)], b };
  const ustY = r3(y + STOL.balandlik);
  let stul: MebelJoyi;
  let odam: OdamJoyi | null = null;
  if (o.bosh) {
    const [sx, sz] = lokal(x, z, b, 0.3, 1.0);
    stul = { tur: "kreslo", p: [sx, y, sz], b: b + Math.PI + 0.35 };
  } else {
    const [sx, sz] = lokal(x, z, b, 0.25, 0.84);
    const natija = stulVaOdam("kreslo", sx, y, sz, b + Math.PI, o.odam);
    stul = natija.stul;
    odam = natija.odam;
  }
  const jihozlar: MebelJoyi[] = [];
  if (o.noutbuk) {
    // Noutbuk (ochiq, ekrani orqada) xodim qarshisida, kreslo bilan bir chiziqda
    const [nx, nz] = lokal(x, z, b, 0.25, -0.02);
    jihozlar.push({ tur: "noutbuk", p: [nx, ustY, nz], b, ustida: true });
  } else if (o.monitorlar === 2) {
    // Ikki monitor stol o'rtasida, xodimga qarab biroz burilgan (chapdagisi ko'proq)
    const [ax, az] = lokal(x, z, b, -0.31, -0.2);
    const [bx, bz] = lokal(x, z, b, 0.27, -0.2);
    jihozlar.push({ tur: "monitor", p: [ax, ustY, az], b: b + 0.28, ustida: true }, { tur: "monitor", p: [bx, ustY, bz], b: b - 0.04, ustida: true });
  } else {
    const [mx, mz] = lokal(x, z, b, 0.25, -0.2);
    jihozlar.push({ tur: "monitor", p: [mx, ustY, mz], b, ustida: true });
  }
  if (!o.noutbuk) {
    const [kx, kz] = lokal(x, z, b, 0.25, 0.12);
    jihozlar.push({ tur: "klaviatura", p: [kx, ustY, kz], b, ustida: true });
  }
  if (o.gul) {
    const [gx, gz] = lokal(x, z, b, -0.55, -0.22);
    jihozlar.push({ tur: "kichikGul", p: [gx, ustY, gz], ustida: true });
  }
  return { stol, stul, odam, jihozlar };
}

/**
 * Ish stollari guruhi (2 × 2, orqama-orqa): shimoliy qator (z − 0.4) foydalanuvchisi −z tomonda, janubiy (z + 0.4) — +z tomonda.
 * `odamlar` tartibi: [N0, N1, S0, S1]; null — bo'sh joy, `undefined` — stol yo'q (masalan, bitta qatorli guruh).
 * Orada akustik to'siq (bolgich) turadi.
 */
export function stolGuruhi(cx: number, y: number, cz: number, odamlar: readonly (OdamTuri | null | undefined)[], noutbuk = false) {
  const joylar: IshJoyi[] = [];
  const yarim = STOL.eni / 2 + 0.001;
  [
    [cx - yarim, cz - 0.4, Math.PI],
    [cx + yarim, cz - 0.4, Math.PI],
    [cx - yarim, cz + 0.4, 0],
    [cx + yarim, cz + 0.4, 0],
  ].forEach(([x, z, b], i) => {
    const kim = odamlar[i];
    if (kim === undefined) return;
    joylar.push(ishJoyi(x, y, z, b, { odam: kim, bosh: !kim, monitorlar: i % 3 === 0 ? 2 : 1, gul: i === 1, noutbuk }));
  });
  const bolgich = { x0: r3(cx - STOL.eni), x1: r3(cx + STOL.eni), z: cz, y };
  return { joylar, bolgich };
}

// ---------------------------------------------------------------------------------------------------------------------
// Ofis binosining rejasi (8 qavat, panorama lift, direktor avtomobili) — ofisRejasi.ts da.

/** Pol qoplamasi qalinligi: 0-qavat poli y = 0.05 (ofis va maishiy blok). */
export const POL_QALINLIGI = 0.05;

// ---------------------------------------------------------------------------------------------------------------------
// Maishiy blok (1 qavat, tomsiz) va galereya

export const MAISHIY_POLI = POL_QALINLIGI;
/** Tashqi devor 0.25 m, ichki 0.12 m. */
export const MAISHIY_ICHI: Tortburchak = { x0: MAISHIY.x0 + 0.25, x1: MAISHIY.x1 - 0.25, z0: MAISHIY.z0 + 0.25, z1: MAISHIY.z1 - 0.25 };
export const MAISHIY_ICHKI_DEVOR = 0.12;

/** Xonalar (ichki yuzalar bo'yicha). */
export const MAISHIY_XONALARI = {
  erkaklar: { x0: MAISHIY_ICHI.x0, x1: 47.44, z0: MAISHIY_ICHI.z0, z1: -9.66 },
  erkaklarDushi: { x0: 47.56, x1: 51.44, z0: MAISHIY_ICHI.z0, z1: -9.66 },
  ayollar: { x0: 51.56, x1: MAISHIY_ICHI.x1, z0: MAISHIY_ICHI.z0, z1: -9.66 },
  yolak: { x0: MAISHIY_ICHI.x0, x1: 52.06, z0: -9.54, z1: -6.66 },
  vestibyul: { x0: 52.06, x1: MAISHIY_ICHI.x1, z0: -9.54, z1: -1.56 },
  wcErkak: { x0: MAISHIY_ICHI.x0, x1: 43.04, z0: -6.54, z1: -1.56 },
  wcAyol: { x0: 43.16, x1: 45.94, z0: -6.54, z1: -1.56 },
  tibbiyot: { x0: 46.06, x1: 51.94, z0: -6.54, z1: -1.56 },
  oshxona: { x0: MAISHIY_ICHI.x0, x1: MAISHIY_ICHI.x1, z0: -1.44, z1: MAISHIY_ICHI.z1 },
} as const satisfies Record<string, Tortburchak>;
export type MaishiyXonasi = keyof typeof MAISHIY_XONALARI;

/** Ichki devorlar (o'q chizig'i, eshik ochiqlari bilan). `o` — "x": devor x = c bo'ylab z oralig'ida; "z": z = c bo'ylab x oralig'ida. */
export type DevorChizigi = { o: "x" | "z"; c: number; a0: number; a1: number; eshiklar: readonly (readonly [number, number])[] };
export const MAISHIY_ICHKI_DEVORLARI: readonly DevorChizigi[] = [
  { o: "z", c: -9.6, a0: MAISHIY_ICHI.x0, a1: MAISHIY_ICHI.x1, eshiklar: [[46.2, 47.2], [52.6, 53.5]] },
  { o: "x", c: 47.5, a0: MAISHIY_ICHI.z0, a1: -9.66, eshiklar: [[-11.0, -10.1]] },
  { o: "x", c: 51.5, a0: MAISHIY_ICHI.z0, a1: -9.66, eshiklar: [] },
  { o: "z", c: -6.6, a0: MAISHIY_ICHI.x0, a1: 52.06, eshiklar: [[41.3, 42.1], [44.2, 45.0], [48.4, 49.3]] },
  { o: "x", c: 43.1, a0: -6.54, a1: -1.56, eshiklar: [] },
  { o: "x", c: 46.0, a0: -6.54, a1: -1.56, eshiklar: [] },
  { o: "x", c: 52.0, a0: -6.66, a1: -1.44, eshiklar: [] },
  { o: "z", c: -1.5, a0: MAISHIY_ICHI.x0, a1: MAISHIY_ICHI.x1, eshiklar: [[53.8, 55.6]] },
];
/** Tashqi devorlardagi eshiklar: g'arbda galereya (x = 40), sharqda kirish (x = 58, MAISHIY.eshik). */
export const MAISHIY_ESHIKLARI = {
  galereya: { x: MAISHIY.x0, z0: -9.4, z1: -7.2 },
  kirish: { x: MAISHIY.x1, z0: MAISHIY.eshik[1] - 1.0, z1: MAISHIY.eshik[1] + 1.0 },
} as const;

/** Shkafcha (metall kiyim shkafi): eni, chuqurligi, balandligi. */
export const SHKAFCHA = { eni: 0.4, chuqurlik: 0.5, balandlik: 1.85 } as const;
/** Shkafchalar qatori: (x, z) — birinchi shkafcha izining markazi, qator lokal +x bo'ylab, oldi `b` tomonga (0 — +z). */
export type ShkafchaQatori = { x: number; z: number; b: number; soni: number; boshRaqam: number };
export const SHKAFCHA_QATORLARI: readonly ShkafchaQatori[] = [
  // Erkaklar: shimoliy devor bo'ylab va o'rtadagi ikki tomonlama orol
  { x: 40.8, z: -15.5, b: 0, soni: 16, boshRaqam: 1 },
  { x: 45.45, z: -12.85, b: Math.PI, soni: 12, boshRaqam: 17 },
  { x: 41.05, z: -12.35, b: 0, soni: 12, boshRaqam: 29 },
  // Ayollar: g'arbiy devor bo'ylab
  { x: 51.81, z: -10.8, b: Math.PI / 2, soni: 12, boshRaqam: 41 },
];

/** Qatordagi har shkafcha: markazi, burilishi va raqami. */
export function shkafchalar(q: ShkafchaQatori): { x: number; z: number; b: number; raqam: number }[] {
  const c = Math.cos(q.b);
  const s = Math.sin(q.b);
  return Array.from({ length: q.soni }, (_, i) => ({ x: r3(q.x + i * SHKAFCHA.eni * c), z: r3(q.z - i * SHKAFCHA.eni * s), b: q.b, raqam: q.boshRaqam + i }));
}

/** Shkafchalar qatorining izi. */
export function shkafchaQatoriIzi(q: ShkafchaQatori): Tortburchak {
  const royxat = shkafchalar(q);
  const izlar = royxat.map((k) => mebelIziB(k.x, k.z, k.b, SHKAFCHA.eni, SHKAFCHA.chuqurlik));
  return { x0: Math.min(...izlar.map((i) => i.x0)), x1: Math.max(...izlar.map((i) => i.x1)), z0: Math.min(...izlar.map((i) => i.z0)), z1: Math.max(...izlar.map((i) => i.z1)) };
}
function mebelIziB(x: number, z: number, b: number, w: number, d: number): Tortburchak {
  const c = Math.abs(Math.cos(b));
  const s = Math.abs(Math.sin(b));
  const ex = (c * w + s * d) / 2;
  const ez = (s * w + c * d) / 2;
  return { x0: r3(x - ex), x1: r3(x + ex), z0: r3(z - ez), z1: r3(z + ez) };
}

/** Kiyinish xonalaridagi o'rindiqlar (yog'och reykali, po'lat oyoqli; suyanchiqsiz). */
export const SKAMEYKALAR: readonly Tortburchak[] = [
  { x0: 41.0, x1: 46.6, z0: -14.35, z1: -13.99 },
  { x0: 41.0, x1: 45.4, z0: -11.08, z1: -10.72 },
  { x0: 52.82, x1: 53.18, z0: -15.0, z1: -11.0 },
  { x0: 48.2, x1: 50.6, z0: -10.06, z1: -9.7 },
  { x0: 57.35, x1: 57.75, z0: -3.4, z1: -1.9 },
];

/** Kod bilan chiziladigan jihozlar (maishiy). */
export const MAISHIY_TOSIQLARI: readonly Tosiq[] = [
  { nom: "ayollarDushDevori", x0: 55.54, x1: 55.66, z0: MAISHIY_ICHI.z0, z1: -14.2, y: MAISHIY_POLI, h: 2.1 },
  { nom: "kushetka", x0: 49.4, x1: 51.3, z0: -2.3, z1: -1.65, y: MAISHIY_POLI, h: 0.62 },
  { nom: "doriShkafi", x0: 51.5, x1: 51.94, z0: -5.2, z1: -4.0, y: MAISHIY_POLI, h: 1.9 },
  { nom: "tibbiyTosiq", x0: 48.9, x1: 49.0, z0: -3.4, z1: -1.9, y: MAISHIY_POLI, h: 1.7 },
  { nom: "plita", x0: MAISHIY_ICHI.x0, x1: 40.95, z0: 3.0, z1: 3.9, y: MAISHIY_POLI, h: 0.9 },
  { nom: "oshxonaOroli", x0: 41.8, x1: 42.6, z0: 0.4, z1: 3.2, y: MAISHIY_POLI, h: 0.9 },
  { nom: "tarqatish", x0: 44.4, x1: 45.2, z0: -0.6, z1: 4.2, y: MAISHIY_POLI, h: 0.9 },
  { nom: "patnisRelsi", x0: 45.2, x1: 45.5, z0: -0.6, z1: 4.2, y: MAISHIY_POLI, h: 0.86 },
  { nom: "patnisJavoni", x0: 57.25, x1: MAISHIY_ICHI.x1, z0: 2.6, z1: 4.2, y: MAISHIY_POLI, h: 1.6 },
  { nom: "terminal", x0: 57.05, x1: 57.35, z0: -7.15, z1: -6.85, y: MAISHIY_POLI, h: 1.5 },
  { nom: "kuler", x0: 57.25, x1: 57.65, z0: -9.4, z1: -9.0, y: MAISHIY_POLI, h: 1.1 },
  { nom: "pissuar1", x0: MAISHIY_ICHI.x0, x1: 40.6, z0: -5.6, z1: -5.2, y: MAISHIY_POLI, h: 1.1 },
  { nom: "pissuar2", x0: MAISHIY_ICHI.x0, x1: 40.6, z0: -4.8, z1: -4.4, y: MAISHIY_POLI, h: 1.1 },
];
/** Hojatxona kabinalari (to'siq panellari): x chiziqlari va old panel z. */
export const WC_KABINALARI = [
  { x0: MAISHIY_ICHI.x0, xlar: [41.2, 42.15], oldZ: -2.96 },
  { x0: 43.16, xlar: [44.11, 45.06], oldZ: -2.96 },
] as const;

/** Oshxona stollari markazlari (har biriga 4 stul). */
export const OVQAT_STOLLARI: readonly [number, number][] = [[48.2, 0.9], [51.8, 0.9], [55.4, 0.9], [48.2, 3.9], [51.8, 3.9], [55.4, 3.9]];

function maishiyYarat() {
  const y = MAISHIY_POLI;
  const P = Math.PI;
  const mebel: MebelJoyi[] = [];
  const odamlar: OdamJoyi[] = [];
  const juftlar: OtirishJuftligi[] = [];
  const turgan = (tur: OdamTuri, harakat: OdamHarakati, x: number, z: number, burilish: number) =>
    odamlar.push({ tur, harakat, p: [x, y, z], burilish: r3(burilish), faza: keyingiFaza() });

  // Erkaklar dushi va qo'l yuvgichlar
  for (const x of [48.105, 49.145, 50.185]) mebel.push({ tur: "dush", p: [x, y, -15.22] });
  for (const z of [-13.2, -12.4]) mebel.push({ tur: "qolYuvgich", p: [51.19, y, z], b: -P / 2 });
  // Ayollar: ikki dush, qo'l yuvgich
  for (const x of [56.2, 57.22]) mebel.push({ tur: "dush", p: [x, y, -15.22] });
  mebel.push({ tur: "qolYuvgich", p: [57.5, y, -12.6], b: -P / 2 });
  mebel.push({ tur: "axlatQuti", p: [40.55, y, -10.0] }, { tur: "axlatQuti", p: [57.5, y, -10.1] });
  // Kiyinayotgan ishchilar (shkafchaga qaragan)
  turgan("ishchi", "ishlash", 42.2, -14.8, P);
  turgan("ishchi", "ishlash", 44.6, -11.6, P);
  turgan("oddiyErkak", "turish", 43.4, -13.55, 0);
  turgan("ayolOddiy", "ishlash", 52.55, -13.2, -P / 2);

  // Hojatxonalar
  for (const x of [40.73, 41.68, 43.63, 44.58]) mebel.push({ tur: "unitaz", p: [x, y, -1.94], b: P });
  for (const z of [-5.4, -4.6]) mebel.push({ tur: "qolYuvgich", p: [42.79, y, z], b: -P / 2 }, { tur: "qolYuvgich", p: [45.69, y, z], b: -P / 2 });

  // Tibbiyot xonasi: hamshira stoli eshikka qaragan
  const hamshira = ishJoyi(47.3, y, -4.6, 0, { odam: "xodimAyol" });
  mebel.push(hamshira.stol, hamshira.stul, ...hamshira.jihozlar);
  if (hamshira.odam) odamlar.push(hamshira.odam);
  juftlar.push({ stul: hamshira.stul, nishon: [47.3, -4.6] });
  mebel.push({ tur: "qolYuvgich", p: [50.4, y, -6.293] }, { tur: "axlatQuti", p: [46.35, y, -1.85], m: [1.2, 1.2, 1.2] });

  // Vestibyul
  mebel.push({ tur: "gulTuvak", p: [52.45, y, -2.0] }, { tur: "axlatQuti", p: [56.6, y, -9.2] });

  // Oshxona: muzlatgichlar, shkaflar, kofe mashinasi
  mebel.push({ tur: "muzlatgich", p: [40.542, y, -0.95], b: P / 2 }, { tur: "muzlatgich", p: [40.542, y, 4.75], b: P / 2 });
  for (const z of [-0.05, 0.81, 1.67, 2.53]) mebel.push({ tur: "oshxonaShkafi", p: [40.565, y, z], b: P / 2 });
  mebel.push(
    { tur: "kofeMashina", p: [40.6, r3(y + 0.9), 0.81], b: P / 2, ustida: true },
    { tur: "kofeMashina", p: [44.8, r3(y + 0.9), 3.9], b: P / 2, ustida: true },
    { tur: "muzlatgich", p: [46.2, y, 5.458], b: P },
    { tur: "qolYuvgich", p: [52.6, y, -1.193] },
    { tur: "axlatQuti", p: [57.45, y, 5.4] },
    { tur: "axlatQuti", p: [57.45, y, 2.3] },
    { tur: "gulTuvak", p: [57.45, y, -1.1] },
    { tur: "gulTuvak", p: [46.9, y, -1.1] },
  );
  turgan("oddiyErkak", "ishlash", 43.5, 1.8, P / 2);
  turgan("ishchi", "turish", 45.85, 1.4, -P / 2);
  // Stollar va stullar; uch kishi ovqatlanmoqda
  const ovqatlanuvchilar = new Map<string, OdamTuri>([["0:0", "xodimErkak"], ["0:3", "xodimAyol"], ["4:2", "xodimErkak"]]);
  const patnislar: V3[] = [];
  OVQAT_STOLLARI.forEach(([tx, tz], ti) => {
    mebel.push({ tur: "oshxonaStoli", p: [tx, y, tz] });
    [[-0.42, -0.775, 0], [0.42, -0.775, 0], [-0.42, 0.775, P], [0.42, 0.775, P]].forEach(([dx, dz, b], si) => {
      const kim = ovqatlanuvchilar.get(`${ti}:${si}`) ?? null;
      const n = stulVaOdam("stul", tx + dx, y, tz + dz, b, kim);
      mebel.push(n.stul);
      juftlar.push({ stul: n.stul, nishon: [tx, tz] });
      if (n.odam) {
        odamlar.push(n.odam);
        patnislar.push([r3(tx + dx), r3(y + 0.752), r3(tz + dz * 0.34)]);
      }
    });
  });
  const yuruvchilar: YuruvchiJoyi[] = [
    // Kiyinib bo'lgan ishchi galereya orqali sexga o'tadi va qaytadi
    { tur: "ishchi", nuqtalar: [[46.7, -11.5], [46.7, -8.2], [40.8, -8.2], [GALEREYA.x0 + 1, -8.5], [28, -8.5], [28, -3.4]], y, tezlik: 1.25, toxtash: [5, 0, 0, 0, 0, 6], toxtashHarakati: "ishlash", faza: 0.1 },
  ];
  return { mebel, odamlar, juftlar, patnislar, yuruvchilar };
}

const MAISHIY_JOYLASHUVI = maishiyYarat();
export const MAISHIY_MEBELLARI: readonly MebelJoyi[] = MAISHIY_JOYLASHUVI.mebel;
export const MAISHIY_ODAMLARI: readonly OdamJoyi[] = MAISHIY_JOYLASHUVI.odamlar;
export const MAISHIY_YURUVCHILARI: readonly YuruvchiJoyi[] = MAISHIY_JOYLASHUVI.yuruvchilar;
export const MAISHIY_OTIRISH_JUFTLARI: readonly OtirishJuftligi[] = MAISHIY_JOYLASHUVI.juftlar;
/** Ovqatlanayotganlar oldidagi patnislar (stol ustida). */
export const PATNISLAR: readonly V3[] = MAISHIY_JOYLASHUVI.patnislar;

// ---------------------------------------------------------------------------------------------------------------------
// Devor bo'laklari va geometriyalar

/** Teshik (eshik yoki deraza): devor bo'ylab a0…a1, balandlik y0…y1. */
export type Teshik = { a0: number; a1: number; y0: number; y1: number };
/** Devor bo'lagi (devor bo'ylab a0…a1, y0…y1). */
export type DevorBolagi = { a0: number; a1: number; y0: number; y1: number };

/**
 * Devordan teshiklarni chiqarib tashlaydi: devor teshik chetlari bo'yicha bo'linadi; teshikli oraliqda teshik ostida va
 * ustida bo'lak qoladi. Teshiklar bir-biriga tegmasligi kerak.
 */
export function devorBolaklari(a0: number, a1: number, y0: number, y1: number, teshiklar: readonly Teshik[]): DevorBolagi[] {
  const chegaralar = [...new Set([a0, a1, ...teshiklar.flatMap((t) => [Math.max(a0, Math.min(a1, t.a0)), Math.max(a0, Math.min(a1, t.a1))])])].sort((a, b) => a - b);
  const natija: DevorBolagi[] = [];
  for (let i = 0; i < chegaralar.length - 1; i++) {
    const p0 = chegaralar[i];
    const p1 = chegaralar[i + 1];
    if (p1 - p0 < 1e-6) continue;
    const orta = (p0 + p1) / 2;
    const t = teshiklar.find((x) => x.a0 < orta && orta < x.a1);
    if (!t) natija.push({ a0: p0, a1: p1, y0, y1 });
    else {
      if (t.y0 > y0 + 1e-6) natija.push({ a0: p0, a1: p1, y0, y1: t.y0 });
      if (t.y1 < y1 - 1e-6) natija.push({ a0: p0, a1: p1, y0: t.y1, y1 });
    }
  }
  return natija;
}

/** Quti geometriyasi, UV lari metrda (1 UV = `tile` metr): tekstura har o'lchamda bir xil zichlikda takrorlanadi. */
export function olchamliQutiGeometriyasi(w: number, h: number, d: number, tile = 1): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  // Tomonlar tartibi: +x, −x, +y, −y, +z, −z (har biri 4 uch)
  const enlar = [d, d, w, w, w, w];
  const boylar = [h, h, d, d, h, h];
  for (let t = 0; t < 6; t++) {
    for (let k = 0; k < 4; k++) {
      const i = t * 4 + k;
      uv.setXY(i, (uv.getX(i) * enlar[t]) / tile, (uv.getY(i) * boylar[t]) / tile);
    }
  }
  uv.needsUpdate = true;
  return g;
}

/** Shkafcha eshigi teksturasi atlasi: 16 × 4 katak (64 ta raqam). */
export const SHKAFCHA_ATLASI = { ustun: 16, qator: 4 } as const;
/** Raqam uchun atlas katagi (UV, chap-past va o'ng-yuqori). */
export function atlasKatagi(raqam: number): { u0: number; v0: number; u1: number; v1: number } {
  const n = SHKAFCHA_ATLASI.ustun * SHKAFCHA_ATLASI.qator;
  const i = (((raqam - 1) % n) + n) % n;
  const ustun = i % SHKAFCHA_ATLASI.ustun;
  const qator = Math.floor(i / SHKAFCHA_ATLASI.ustun);
  return { u0: ustun / SHKAFCHA_ATLASI.ustun, u1: (ustun + 1) / SHKAFCHA_ATLASI.ustun, v0: 1 - (qator + 1) / SHKAFCHA_ATLASI.qator, v1: 1 - qator / SHKAFCHA_ATLASI.qator };
}

/**
 * Barcha shkafchalar — uchta birlashtirilgan geometriya: korpus (yon/tepa/orqa), eshik (atlasdan raqamli tekstura), tag (sokol).
 * Chaqiruvchi bo'shatadi.
 */
export function shkafchaGeometriyalari(qatorlar: readonly ShkafchaQatori[], y: number) {
  const { eni: W, chuqurlik: D, balandlik: H } = SHKAFCHA;
  const korpus: THREE.BufferGeometry[] = [];
  const eshik: THREE.BufferGeometry[] = [];
  const tag: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const joyla = (g: THREE.BufferGeometry, lx: number, ly: number, lz: number, k: { x: number; z: number; b: number }) => {
    g.translate(lx, ly, lz);
    g.applyMatrix4(m.makeRotationY(k.b).setPosition(k.x, y, k.z));
    return g.index ? g.toNonIndexed() : g;
  };
  for (const q of qatorlar) {
    for (const k of shkafchalar(q)) {
      tag.push(joyla(new THREE.BoxGeometry(W - 0.02, 0.1, D - 0.06), 0, 0.05, -0.03, k));
      // Korpus: ikki yon devor, tepa (bir oz chiqib turadi), orqa
      korpus.push(joyla(new THREE.BoxGeometry(0.012, H - 0.1, D), -W / 2 + 0.008, 0.1 + (H - 0.1) / 2, 0, k));
      korpus.push(joyla(new THREE.BoxGeometry(0.012, H - 0.1, D), W / 2 - 0.008, 0.1 + (H - 0.1) / 2, 0, k));
      korpus.push(joyla(new THREE.BoxGeometry(W - 0.002, 0.025, D + 0.012), 0, H - 0.0125, 0.006, k));
      korpus.push(joyla(new THREE.BoxGeometry(W - 0.03, H - 0.12, 0.01), 0, 0.1 + (H - 0.12) / 2, -D / 2 + 0.005, k));
      // Eshik: yupqa panel, old yuzasiga atlas katagi
      const e = new THREE.BoxGeometry(W - 0.026, H - 0.16, 0.012);
      const uv = e.getAttribute("uv") as THREE.BufferAttribute;
      const c = atlasKatagi(k.raqam);
      // +z tomoni (indeks 16…19) — atlas katagi; qolgan tomonlar katakning chetidagi bir rangli joyga
      for (let i = 0; i < uv.count; i++) {
        if (i >= 16 && i < 20) uv.setXY(i, c.u0 + uv.getX(i) * (c.u1 - c.u0), c.v0 + uv.getY(i) * (c.v1 - c.v0));
        else uv.setXY(i, c.u0 + 0.002, c.v0 + (c.v1 - c.v0) * 0.5);
      }
      eshik.push(joyla(e, 0, 0.1 + 0.03 + (H - 0.16) / 2, D / 2 - 0.004, k));
    }
  }
  const birlashtir = (royxat: THREE.BufferGeometry[]) => {
    const g = mergeGeometries(royxat, false);
    royxat.forEach((x) => x.dispose());
    if (!g) throw new Error("Shkafcha geometriyasini birlashtirib bo'lmadi");
    g.computeBoundingSphere();
    return g;
  };
  return { korpus: birlashtir(korpus), eshik: birlashtir(eshik), tag: birlashtir(tag) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Teksturalar (canvas, tashqi rasm yo'q) va bino materiallari

type Chizuvchi = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function tekstura(w: number, h: number, chiz: Chizuvchi, takror = true): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  chiz(ctx, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (takror) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

/** Takrorlanadigan "tasodifiy" son. */
function urug(s0: number) {
  let s = s0 >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function donalar(ctx: CanvasRenderingContext2D, w: number, h: number, son: number, rang: (r: () => number) => string, u: number, olcham = 1.6) {
  const rnd = urug(u);
  for (let i = 0; i < son; i++) {
    ctx.fillStyle = rang(rnd);
    ctx.fillRect(rnd() * w, rnd() * h, 0.8 + rnd() * olcham, 0.8 + rnd() * olcham);
  }
}

/** Plitkalar: `n × m` katak, har biri biroz boshqa ohangda, choklar bilan. */
function plitkalar(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, m: number, asos: [number, number, number], farq: number, chok: string, chokEni: number, u: number) {
  const rnd = urug(u);
  const kw = w / n;
  const kh = h / m;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = (rnd() - 0.5) * farq;
      ctx.fillStyle = `rgb(${Math.round(asos[0] + d)},${Math.round(asos[1] + d)},${Math.round(asos[2] + d)})`;
      ctx.fillRect(i * kw, j * kh, kw, kh);
    }
  }
  ctx.fillStyle = chok;
  for (let i = 0; i <= n; i++) ctx.fillRect(i * kw - chokEni / 2, 0, chokEni, h);
  for (let j = 0; j <= m; j++) ctx.fillRect(0, j * kh - chokEni / 2, w, chokEni);
}

/** Granit plitka 0.8 m (1 tekstura = 1.6 m). */
const granit = () => tekstura(512, 512, (ctx, w, h) => {
  plitkalar(ctx, w, h, 2, 2, [214, 210, 202], 14, "rgba(150,145,136,0.9)", 3, 31);
  donalar(ctx, w, h, 16000, (r) => (r() < 0.5 ? `rgba(90,86,80,${0.25 + r() * 0.35})` : `rgba(255,255,255,${0.3 + r() * 0.4})`), 32, 2.2);
});

/** Kovrolin plitka 0.5 m (1 tekstura = 2 m): har plitkada tola yo'nalishi 90° burilgan. */
const kovrolin = () => tekstura(512, 512, (ctx, w, h) => {
  ctx.fillStyle = "#5d6673";
  ctx.fillRect(0, 0, w, h);
  const k = w / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const gor = (i + j) % 2 === 0;
      ctx.fillStyle = gor ? "#606a78" : "#58616d";
      ctx.fillRect(i * k, j * k, k, k);
      ctx.strokeStyle = "rgba(40,46,54,0.22)";
      ctx.lineWidth = 1;
      for (let t = 3; t < k; t += 5) {
        ctx.beginPath();
        if (gor) { ctx.moveTo(i * k, j * k + t); ctx.lineTo(i * k + k, j * k + t); } else { ctx.moveTo(i * k + t, j * k); ctx.lineTo(i * k + t, j * k + k); }
        ctx.stroke();
      }
    }
  }
  donalar(ctx, w, h, 22000, (r) => `rgba(${r() < 0.5 ? "30,36,44" : "150,160,175"},${0.12 + r() * 0.18})`, 41, 1.2);
  ctx.fillStyle = "rgba(30,34,40,0.35)";
  for (let i = 0; i <= 4; i++) { ctx.fillRect(i * k - 1, 0, 2, h); ctx.fillRect(0, i * k - 1, w, 2); }
});

/** Eman parket taxtalari 0.18 m (1 tekstura = 2 m). */
const parket = () => tekstura(512, 512, (ctx, w, h) => {
  const rnd = urug(51);
  const qator = 11;
  const qh = h / qator;
  for (let j = 0; j < qator; j++) {
    let x = -rnd() * 200;
    while (x < w) {
      const l = 180 + rnd() * 160;
      const v = rnd();
      ctx.fillStyle = `rgb(${Math.round(176 + v * 30)},${Math.round(130 + v * 24)},${Math.round(86 + v * 18)})`;
      ctx.fillRect(x, j * qh, l, qh);
      ctx.strokeStyle = "rgba(110,70,40,0.18)";
      ctx.lineWidth = 1;
      for (let t = 0; t < 5; t++) {
        const yy = j * qh + 3 + rnd() * (qh - 6);
        ctx.beginPath();
        ctx.moveTo(x, yy);
        ctx.bezierCurveTo(x + l * 0.3, yy + (rnd() - 0.5) * 4, x + l * 0.6, yy + (rnd() - 0.5) * 4, x + l, yy);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(70,45,25,0.55)";
      ctx.fillRect(x, j * qh, 1.5, qh);
      x += l;
    }
    ctx.fillStyle = "rgba(70,45,25,0.45)";
    ctx.fillRect(0, j * qh, w, 1.5);
  }
});

/** Kompozit fasad paneli: 1.5 × 1.0 m panellar (1 tekstura = 3 m). */
const kompozit = () => tekstura(384, 384, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#d3d8de");
  g.addColorStop(1, "#c5cbd2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 3000, (r) => `rgba(255,255,255,${r() * 0.08})`, 61);
  ctx.fillStyle = "rgba(70,78,90,0.65)";
  for (let i = 0; i <= 2; i++) ctx.fillRect(i * (w / 2) - 2, 0, 4, h);
  for (let j = 0; j <= 3; j++) ctx.fillRect(0, j * (h / 3) - 2, w, 4);
});

/** Kafel (pol) 0.3 m (1 tekstura = 1.2 m). */
const kafelPol = () => tekstura(256, 256, (ctx, w, h) => {
  plitkalar(ctx, w, h, 4, 4, [222, 226, 230], 10, "rgba(160,168,178,0.95)", 2, 71);
  donalar(ctx, w, h, 3000, (r) => `rgba(120,130,140,${r() * 0.2})`, 72);
});

/** Devor kafeli 0.2 × 0.4 m, yotqizilgan (1 tekstura = 1.2 m). */
const kafelDevor = () => tekstura(256, 256, (ctx, w, h) => {
  plitkalar(ctx, w, h, 3, 6, [243, 245, 246], 5, "rgba(190,198,206,0.95)", 2, 81);
});

/** Linoleum (kiyinish xonalari, yo'lak): kulrang-ko'k, mayda chiplar (1 tekstura = 2 m). */
const linoleum = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#8a97a6";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 9000, (r) => (r() < 0.5 ? `rgba(60,70,84,${0.2 + r() * 0.3})` : `rgba(230,235,240,${0.2 + r() * 0.3})`), 91, 2.4);
});

/** Oshxona poli: 0.6 m bej plitka (1 tekstura = 1.2 m). */
const oshxonaPol = () => tekstura(256, 256, (ctx, w, h) => {
  plitkalar(ctx, w, h, 2, 2, [216, 200, 174], 12, "rgba(150,132,108,0.9)", 2.5, 101);
  donalar(ctx, w, h, 4000, (r) => `rgba(120,100,70,${r() * 0.18})`, 102);
});

/** "Yashil devor" (vestibyuldagi tirik o'simlik devori). */
const yashilDevor = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#2f5a32";
  ctx.fillRect(0, 0, w, h);
  const rnd = urug(111);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 3 + rnd() * 7;
    ctx.fillStyle = `rgb(${Math.round(40 + rnd() * 60)},${Math.round(95 + rnd() * 80)},${Math.round(40 + rnd() * 40)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
});

/** Shkafcha eshiklari atlasi: kulrang-ko'k eshik, shamollatish tirqishlari, raqam lavhasi, qulf va dastak. */
const shkafchaAtlasi = () => tekstura(1024, 1024, (ctx, w, h) => {
  const kw = w / SHKAFCHA_ATLASI.ustun;
  const kh = h / SHKAFCHA_ATLASI.qator;
  for (let i = 0; i < SHKAFCHA_ATLASI.ustun * SHKAFCHA_ATLASI.qator; i++) {
    const x = (i % SHKAFCHA_ATLASI.ustun) * kw;
    const y = Math.floor(i / SHKAFCHA_ATLASI.ustun) * kh;
    const g = ctx.createLinearGradient(x, y, x + kw, y + kh);
    g.addColorStop(0, "#7d93b0");
    g.addColorStop(1, "#6a7f9b");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, kw, kh);
    // Qirra (bukilgan list): yuqori-chap och, past-o'ng to'q
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, y, kw, 2);
    ctx.fillRect(x, y, 2, kh);
    ctx.fillStyle = "rgba(20,28,40,0.35)";
    ctx.fillRect(x, y + kh - 2, kw, 2);
    ctx.fillRect(x + kw - 2, y, 2, kh);
    // Shamollatish tirqishlari (yuqori va past)
    for (const y0 of [y + 14, y + kh - 52]) {
      for (let t = 0; t < 6; t++) {
        ctx.fillStyle = "rgba(18,24,34,0.75)";
        ctx.fillRect(x + 14, y0 + t * 6, kw - 28, 2.5);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x + 14, y0 + t * 6 + 2.5, kw - 28, 1);
      }
    }
    // Raqam lavhasi
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x + 14, y + 62, kw - 28, 22);
    ctx.strokeStyle = "rgba(30,41,59,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 14.5, y + 62.5, kw - 29, 21);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), x + kw / 2, y + 74);
    // Dastak va qulf (o'ng tomonda)
    ctx.fillStyle = "#2b3440";
    ctx.fillRect(x + kw - 16, y + kh * 0.42, 6, 34);
    ctx.fillStyle = "#c8ced6";
    ctx.beginPath();
    ctx.arc(x + kw - 13, y + kh * 0.42 - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x + kw - 13.5, y + kh * 0.42 - 12, 1, 4);
  }
}, false);

/** Majlislar zali ekranidagi taqdimot: savdo grafigi (ustunli diagramma + chiziq). */
const taqdimot = () => tekstura(512, 288, (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0f2747");
  g.addColorStop(1, "#0a1a30");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("Ishlab chiqarish — 2026", 24, 38);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Oylik reja bajarilishi, %", 24, 60);
  ctx.strokeStyle = "rgba(148,163,184,0.25)";
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(40, 90 + i * 40); ctx.lineTo(w - 24, 90 + i * 40); ctx.stroke(); }
  const qiymat = [62, 70, 68, 81, 86, 79, 92, 95, 88, 97];
  qiymat.forEach((q, i) => {
    const x = 52 + i * 44;
    const bh = (q / 100) * 170;
    ctx.fillStyle = i === qiymat.length - 1 ? "#f59e0b" : "#3b82f6";
    ctx.fillRect(x, 250 - bh, 26, bh);
  });
  ctx.strokeStyle = "#34d399";
  ctx.lineWidth = 3;
  ctx.beginPath();
  qiymat.forEach((q, i) => { const x = 65 + i * 44; const yy = 250 - (q / 100) * 170 - 12; if (i) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); });
  ctx.stroke();
}, false);

/** Vestibyul logotip paneli (orqadan yoritilgan). */
const logotip = () => tekstura(512, 128, (ctx, w, h) => {
  ctx.fillStyle = "#1f2a37";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(40, 96); ctx.lineTo(72, 32); ctx.lineTo(104, 96); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("MEBEL ZAVODI", 128, 66);
}, false);

/** Qizil xoch (tibbiyot xonasi belgisi). */
const qizilXoch = () => tekstura(128, 128, (ctx, w, h) => {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(w * 0.38, h * 0.16, w * 0.24, h * 0.68);
  ctx.fillRect(w * 0.16, h * 0.38, w * 0.68, h * 0.24);
}, false);

/** Oshxona menyusi taxtasi. */
const menyu = () => tekstura(512, 256, (ctx, w, h) => {
  ctx.fillStyle = "#1c2a22";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#a16207";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = "#fde68a";
  ctx.font = "bold 34px Arial, sans-serif";
  ctx.fillText("Bugungi menyu", 28, 50);
  ctx.font = "24px Arial, sans-serif";
  ctx.fillStyle = "#f1f5f9";
  [["Osh", "28 000"], ["Lag'mon", "25 000"], ["Mastava", "18 000"], ["Non, choy", "5 000"]].forEach(([nom, narx], i) => {
    ctx.fillText(nom, 36, 96 + i * 38);
    ctx.fillText(narx, w - 150, 96 + i * 38);
  });
}, false);

/** Sport zali rezina qoplamasi: ko'k, mayda EPDM donalari (1 tekstura = 2 m). */
const sportPol = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#2f5d8a";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 9000, (r) => (r() < 0.5 ? `rgba(20,40,70,${0.25 + r() * 0.3})` : `rgba(170,200,230,${0.15 + r() * 0.25})`), 121, 2);
});

/** Silliqlangan mikrotsement (dizayn studiyasi): och kulrang, yumshoq dog'lar (1 tekstura = 3 m). */
const mikrotsement = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#d7d8d6";
  ctx.fillRect(0, 0, w, h);
  const rnd = urug(131);
  for (let i = 0; i < 60; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 10 + rnd() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() > 0.5 ? "rgba(255,255,255,0.18)" : "rgba(120,124,128,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  donalar(ctx, w, h, 2500, (r) => `rgba(110,112,116,${r() * 0.15})`, 132);
});

/** Stol tennisi stoli ustki yuzasi: ko'k, oq chetlar va o'rta chiziq (bo'ylama). */
const tennisStoli = () => tekstura(512, 288, (ctx, w, h) => {
  ctx.fillStyle = "#1e4fa8";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 2500, (r) => `rgba(255,255,255,${r() * 0.05})`, 141);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w, 7);
  ctx.fillRect(0, h - 7, w, 7);
  ctx.fillRect(0, 0, 7, h);
  ctx.fillRect(w - 7, 0, 7, h);
  ctx.fillRect(0, h / 2 - 2, w, 4);
}, false);

/** Yugurish yo'lagi lentasi: to'q rezina, ko'ndalang chiziqlar (u bo'ylab siljiydi — harakat ko'rinadi). */
const lenta = () => tekstura(256, 64, (ctx, w, h) => {
  ctx.fillStyle = "#202428";
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) {
    ctx.fillStyle = "rgba(160,170,180,0.35)";
    ctx.fillRect(x, 0, 6, h);
  }
  donalar(ctx, w, h, 800, (r) => `rgba(255,255,255,${r() * 0.08})`, 151);
});

/** O'yin konsoli ekrani: yuqoridan ko'rinadigan poyga yo'li (vertikal takrorlanadi — siljitilsa "harakatlanadi"). */
const oyinEkrani = () => tekstura(512, 512, (ctx, w, h) => {
  ctx.fillStyle = "#1f7a3a";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 5000, (r) => `rgba(${r() < 0.5 ? "20,90,40" : "90,170,80"},${0.3 + r() * 0.3})`, 161, 3);
  // Yo'l, chetlari (qizil-oq), uzuq chiziqlar
  ctx.fillStyle = "#3a3f47";
  ctx.fillRect(w * 0.22, 0, w * 0.56, h);
  for (let y = 0; y < h; y += 32) {
    ctx.fillStyle = (y / 32) % 2 ? "#ef4444" : "#f8fafc";
    ctx.fillRect(w * 0.2, y, w * 0.025, 32);
    ctx.fillRect(w * 0.775, y, w * 0.025, 32);
  }
  ctx.fillStyle = "#fde047";
  for (let y = 8; y < h; y += 64) {
    ctx.fillRect(w * 0.405, y, 8, 34);
    ctx.fillRect(w * 0.59, y, 8, 34);
  }
  // Raqib mashinalar (yuqoridan)
  const mashina = (x: number, y: number, rang: string) => {
    ctx.fillStyle = rang;
    ctx.fillRect(x, y, 40, 70);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x + 6, y + 14, 28, 14);
    ctx.fillRect(x + 6, y + 46, 28, 10);
  };
  mashina(w * 0.3, 90, "#f97316");
  mashina(w * 0.62, 300, "#a855f7");
  mashina(w * 0.46, 430, "#22d3ee");
  // Daraxtlar
  const rnd = urug(162);
  for (let i = 0; i < 14; i++) {
    const x = rnd() < 0.5 ? rnd() * w * 0.16 : w * 0.84 + rnd() * w * 0.14;
    const y = rnd() * h;
    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.arc(x, y, 12 + rnd() * 10, 0, Math.PI * 2);
    ctx.fill();
  }
});

/** Kitob javoni qatori: rang-barang muqovalar (turli eni va bo'yi), orqasi qorong'i. */
const kitoblar = () => tekstura(512, 128, (ctx, w, h) => {
  ctx.fillStyle = "#1c1917";
  ctx.fillRect(0, 0, w, h);
  const rnd = urug(171);
  const ranglar = ["#7f1d1d", "#1e3a8a", "#14532d", "#78350f", "#f5f5f4", "#334155", "#9a3412", "#0f766e", "#a16207", "#4c1d95", "#e7e5e4", "#57534e"];
  let x = 0;
  while (x < w) {
    const k = 9 + rnd() * 16;
    const bh = h * (0.68 + rnd() * 0.3);
    ctx.fillStyle = ranglar[Math.floor(rnd() * ranglar.length)];
    ctx.fillRect(x, h - bh, k - 1, bh);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x + 2, h - bh + 10, k - 5, 2);
    ctx.fillRect(x + 2, h - 18, k - 5, 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + k - 2, h - bh, 1, bh);
    x += k + (rnd() < 0.08 ? 10 : 0);
  }
});

/** Dizayn studiyasi ilhom taxtasi: eskizlar, mato va rang namunalari, mebel fotosuratlari (sxematik). */
const moodboard = () => tekstura(512, 256, (ctx, w, h) => {
  ctx.fillStyle = "#c8b89a";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 3000, (r) => `rgba(90,70,40,${r() * 0.15})`, 181);
  const rnd = urug(182);
  const ranglar = ["#e7d3b0", "#8b5a3c", "#334155", "#0f766e", "#f1ede6", "#b45309", "#1e293b", "#94a3b8", "#be123c"];
  for (let i = 0; i < 22; i++) {
    const kw = 40 + rnd() * 70;
    const kh = 30 + rnd() * 60;
    const x = rnd() * (w - kw);
    const y = rnd() * (h - kh);
    ctx.save();
    ctx.translate(x + kw / 2, y + kh / 2);
    ctx.rotate((rnd() - 0.5) * 0.12);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-kw / 2 + 3, -kh / 2 + 3, kw, kh);
    ctx.fillStyle = rnd() < 0.35 ? "#fafaf9" : ranglar[Math.floor(rnd() * ranglar.length)];
    ctx.fillRect(-kw / 2, -kh / 2, kw, kh);
    // Eskiz chiziqlari (oq qog'ozda)
    ctx.strokeStyle = "rgba(30,41,59,0.6)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-kw / 3, -kh / 4, kw / 1.6, kh / 2.2);
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(0, -kh / 2 + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}, false);

/** Ofis binosi materiallari (chaqiruvchi `materiallarniTozala` bilan bo'shatadi). */
export function ofisMateriallariYarat() {
  const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });
  const nur = (color: string, kuch: number, map: THREE.Texture | null = null) => new THREE.MeshStandardMaterial({ color: map ? "#ffffff" : color, map, emissive: color, emissiveMap: map, emissiveIntensity: kuch, roughness: 0.4 });
  const shaffof = (color: string, opacity: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.25, transparent: true, opacity, depthWrite: false, ...extra });
  const lentaT = lenta();
  lentaT?.repeat.set(3, 1);
  return {
    // Kamera tomonidagi (old va o'ng) parda-devor — ichi ko'rinsin deb shaffofroq; panorama lift shaxtasi shishasi
    oldOyna: shaffof("#a9d3e6", 0.13),
    liftOyna: shaffof("#d6eef7", 0.12, { metalness: 0.1 }),
    mullion: m("#2b3139", { roughness: 0.35, metalness: 0.65 }),
    plitaQirrasi: m("#eef1f4", { roughness: 0.38, metalness: 0.2 }),
    liftRom: m("#8f9aa7", { roughness: 0.25, metalness: 0.85 }),
    /** Lift chirog'i: eshik ochiq — yashil, harakatda — sariq (rang Ofis.tsx dagi useFrame da almashtiriladi). */
    liftChirogi: new THREE.MeshStandardMaterial({ color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 1.6, roughness: 0.3 }),
    sportPol: m("#ffffff", { map: sportPol(), roughness: 0.85 }),
    mikrotsement: m("#ffffff", { map: mikrotsement(), roughness: 0.35 }),
    tennisStoli: m("#ffffff", { map: tennisStoli(), roughness: 0.45 }),
    tennisTori: new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false }),
    tennisTopi: m("#fff7ed", { roughness: 0.3, emissive: "#ffedd5", emissiveIntensity: 0.35 }),
    raketka: m("#b91c1c", { roughness: 0.6 }),
    lenta: m("#ffffff", { map: lentaT, roughness: 0.9 }),
    trenajer: m("#3a4048", { roughness: 0.4, metalness: 0.55 }),
    gantel: m("#16181c", { roughness: 0.5, metalness: 0.4 }),
    yogaMat: [m("#14b8a6", { roughness: 0.95 }), m("#8b5cf6", { roughness: 0.95 }), m("#f97316", { roughness: 0.95 })],
    oyinEkrani: nur("#ffffff", 1.0, oyinEkrani()),
    ledBinafsha: nur("#a855f7", 2.2),
    ledMoviy: nur("#38bdf8", 2.0),
    pult: m("#111318", { roughness: 0.45 }),
    kitoblar: m("#ffffff", { map: kitoblar(), roughness: 0.75 }),
    moodboard: m("#ffffff", { map: moodboard(), roughness: 0.85 }),
    likopcha: m("#f8fafc", { roughness: 0.2 }),
    ovqat: [m("#c2410c", { roughness: 0.7 }), m("#facc15", { roughness: 0.6 }), m("#65a30d", { roughness: 0.7 })],
    zanglamas: m("#c9cfd6", { roughness: 0.22, metalness: 0.9 }),
    printer3d: nur("#fb923c", 1.2),
    maket: [m("#e7d3b0", { roughness: 0.6 }), m("#8b5a3c", { roughness: 0.6 }), m("#f1ede6", { roughness: 0.6 }), m("#475569", { roughness: 0.6 })],
    plita: m("#e9e8e4", { roughness: 0.9 }),
    granit: m("#ffffff", { map: granit(), roughness: 0.25, metalness: 0.05 }),
    kovrolin: m("#ffffff", { map: kovrolin(), roughness: 0.98 }),
    parket: m("#ffffff", { map: parket(), roughness: 0.45 }),
    devor: m("#eeece8", { roughness: 0.9 }),
    yadroDevor: m("#d9d6d0", { roughness: 0.92 }),
    kompozit: m("#ffffff", { map: kompozit(), roughness: 0.4, metalness: 0.35 }),
    spandrel: m("#3a4048", { roughness: 0.35, metalness: 0.6 }),
    alyumin: m("#c3c9d1", { roughness: 0.3, metalness: 0.8 }),
    fasadOyna: new THREE.MeshStandardMaterial({ color: "#9ec3d6", roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.2, depthWrite: false }),
    ichkiOyna: new THREE.MeshStandardMaterial({ color: "#d8ecf2", roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.14, depthWrite: false }),
    xiraOyna: new THREE.MeshStandardMaterial({ color: "#f4f7f9", roughness: 0.6, transparent: true, opacity: 0.75, depthWrite: false }),
    yongoq: m("#5a3d2b", { roughness: 0.5 }),
    yongoqOch: m("#8b5a3c", { roughness: 0.55 }),
    teri: m("#1d1b1a", { roughness: 0.45 }),
    zina: m("#cfc9bf", { roughness: 0.55 }),
    perila: m("#aab2bc", { roughness: 0.25, metalness: 0.85 }),
    lift: m("#b9c0c8", { roughness: 0.22, metalness: 0.9 }),
    ledPanel: nur("#f5f8ff", 1.1),
    logotip: nur("#ffffff", 0.9, logotip()),
    taqdimot: nur("#ffffff", 0.85, taqdimot()),
    qabul: m("#f3f1ec", { roughness: 0.3 }),
    yashilDevor: m("#ffffff", { map: yashilDevor(), roughness: 0.95 }),
    bolgich: m("#7b8796", { roughness: 0.98 }),
    korpus: m("#2f343b", { roughness: 0.5, metalness: 0.3 }),
    oqKorpus: m("#e5e7eb", { roughness: 0.45 }),
    oqDoska: m("#fbfbfa", { roughness: 0.15 }),
    sokol: m("#4b5058", { roughness: 0.8 }),
    eshikRomi: m("#30353c", { roughness: 0.4, metalness: 0.5 }),
  };
}
export type OfisMateriallari = ReturnType<typeof ofisMateriallariYarat>;

/** Maishiy blok va galereya materiallari. */
export function maishiyMateriallariYarat() {
  const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...extra });
  const menyuT = menyu();
  return {
    plita: m("#b9b6b0", { roughness: 0.92 }),
    tashqiDevor: m("#e6e2da", { roughness: 0.88 }),
    ichkiDevor: m("#f1efea", { roughness: 0.9 }),
    sokol: m("#5b6068", { roughness: 0.85 }),
    parapet: m("#9aa1aa", { roughness: 0.4, metalness: 0.6 }),
    kafelPol: m("#ffffff", { map: kafelPol(), roughness: 0.35 }),
    kafelDevor: m("#ffffff", { map: kafelDevor(), roughness: 0.2 }),
    linoleum: m("#ffffff", { map: linoleum(), roughness: 0.55 }),
    oshxonaPol: m("#ffffff", { map: oshxonaPol(), roughness: 0.45 }),
    shkafKorpus: m("#5d7191", { roughness: 0.45, metalness: 0.45 }),
    shkafEshik: m("#ffffff", { map: shkafchaAtlasi(), roughness: 0.42, metalness: 0.4 }),
    shkafTag: m("#2b3038", { roughness: 0.8 }),
    reyka: m("#b98a5a", { roughness: 0.55 }),
    polat: m("#8f98a3", { roughness: 0.3, metalness: 0.8 }),
    zanglamas: m("#c9cfd6", { roughness: 0.22, metalness: 0.9 }),
    hpl: m("#5f7a8c", { roughness: 0.45 }),
    sopol: m("#f7f8f9", { roughness: 0.15 }),
    oyna: new THREE.MeshStandardMaterial({ color: "#9ec3d6", roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.25, depthWrite: false }),
    kozgu: m("#dfe7ee", { roughness: 0.02, metalness: 1 }),
    alyumin: m("#c3c9d1", { roughness: 0.3, metalness: 0.8 }),
    tom: m("#7b828b", { roughness: 0.85 }),
    ledPanel: new THREE.MeshStandardMaterial({ color: "#f5f8ff", emissive: "#f5f8ff", emissiveIntensity: 1.1, roughness: 0.4 }),
    oqMebel: m("#eef0f2", { roughness: 0.4 }),
    qizilXoch: new THREE.MeshStandardMaterial({ map: qizilXoch(), roughness: 0.4 }),
    menyu: new THREE.MeshStandardMaterial({ map: menyuT, emissive: "#ffffff", emissiveMap: menyuT, emissiveIntensity: 0.25, roughness: 0.6 }),
    ovqat: [m("#c2410c", { roughness: 0.7 }), m("#facc15", { roughness: 0.6 }), m("#65a30d", { roughness: 0.7 })],
    patnis: m("#9a3412", { roughness: 0.5 }),
    korpus: m("#2f343b", { roughness: 0.5, metalness: 0.3 }),
    qizil: m("#dc2626", { roughness: 0.4, metalness: 0.2 }),
    eshik: m("#d8d4cc", { roughness: 0.5 }),
    taxta: m("#3b4a3f", { roughness: 0.8 }),
  };
}
export type MaishiyMateriallari = ReturnType<typeof maishiyMateriallariYarat>;

/** Materiallar to'plamini (va ulardagi kod bilan chizilgan teksturalarni) bo'shatadi. */
export function materiallarniTozala(toplam: Record<string, THREE.Material | THREE.Material[]>) {
  for (const qiymat of Object.values(toplam)) {
    for (const mat of Array.isArray(qiymat) ? qiymat : [qiymat]) {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.map?.dispose();
        mat.emissiveMap?.dispose();
      }
      mat.dispose();
    }
  }
}
