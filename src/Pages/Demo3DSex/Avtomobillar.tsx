import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Materiallar } from "./materiallar";
import { Quti, StatikGuruh, Yumaloq } from "./shakllar";
import { marshrutHolati, yangiHolat } from "./yollar";
import {
  AVTOBUS,
  AVTOBUS_TOXTASH_X,
  AVTOMOBIL_OLCHAMI,
  AVTOMOBIL_TURLARI,
  BEKAT_OYNALARI,
  KOCHA_CHEGARASI,
  KOCHA_QATORLARI,
  QATNOV,
  QATNOVCHI_JOYLARI,
  QATNOVCHI_RANGLARI,
  QATNOVCHI_TURLARI,
  QATNOV_KECHIKISH_CHEGARASI,
  TRAFIK,
  TURGAN_AVTOMOBILLAR,
  avtobusToxtaydimi,
  avtomobilMateriallari,
  glbAvtomobili,
  yukGeometriyalari,
  kochadami,
  materiallarniTozala,
  oldindagiMasofa,
  qatnovBosqichi,
  qatnovchiMarshrutlari,
  yangiReestr,
  yukMashinaTosiqlari,
  type AvtomobilModeli,
  type AvtomobilTuri,
  type QatnovBosqichi,
  type TransportMateriallari,
  type TransportReestri,
  type YoldagiObyekt,
} from "./avtomobilModellari";

// Ko'cha va tashqi avtoturargoh avtomobillari (Quaternius CC0 GLB modellari: sedan, hatchback, SUV) va xizmat avtobusi (kod bilan).
// Avtomobillar InstancedMesh bilan chiziladi: har tur uchun kuzov (rangi — instanceColor), oyna, qolgan qismlar + barcha g'ildiraklar
// bitta InstancedMesh — jami 10 ta mesh (soyasi bilan ~17 draw call). GLB yuklanguncha (yoki yuklanmasa) hech narsa chizilmaydi,
// sahnaning qolgan qismi kutmaydi: komponent o'z Suspense va xato chegarasiga ega.
//
// Harakat: ko'chada ~20 ta avtomobil qatorlarda aylanadi va oldidagi avtomobil, yuk mashinasi, avtobus yoki ko'chaga qo'shilayotgan
// transport oldida sekinlashadi; 4 ta qatnovchi avtomobil jadval bo'yicha turargohga kelib, joyiga kiradi, turadi va ketadi.

const GLB_YOLLARI = AVTOMOBIL_TURLARI.map((tur) => `${import.meta.env.BASE_URL}models/demo3d/mashinalar/${tur}.glb`);

type Avtomobil = { tur: AvtomobilTuri; rang: string; /** Tur meshidagi indeks. */ ti: number; /** Umumiy indeks (g'ildiraklar uchun). */ gi: number };

/** Barcha avtomobillar ro'yxati: turganlar, qatnovchilar, ko'chadagilar (indekslari bir marta beriladi). */
const ROYXAT = (() => {
  const sanoq: Record<AvtomobilTuri, number> = { sedan: 0, hatchback: 0, suv: 0 };
  let jami = 0;
  const qosh = (tur: AvtomobilTuri, rang: string): Avtomobil => ({ tur, rang, ti: sanoq[tur]++, gi: jami++ });
  const turgan = TURGAN_AVTOMOBILLAR.map((a) => qosh(a.tur, a.rang));
  const qatnov = QATNOVCHI_TURLARI.map((tur, k) => qosh(tur, QATNOVCHI_RANGLARI[k]));
  const trafik = TRAFIK.map((a) => qosh(a.tur, a.rang));
  return { turgan, qatnov, trafik, sanoq, jami };
})();
const TUR_INDEKSI: Record<AvtomobilTuri, number> = { sedan: 0, hatchback: 1, suv: 2 };

const Y_OQI = new THREE.Vector3(0, 1, 0);
const X_OQI = new THREE.Vector3(1, 0, 0);
const BIRLIK = new THREE.Vector3(1, 1, 1);
const YASHIRIN = new THREE.Matrix4().makeScale(0, 0, 0);
const TESKARI = new THREE.Quaternion().setFromAxisAngle(Y_OQI, Math.PI);

type TurMeshlari = { kuzov: THREE.InstancedMesh; oyna: THREE.InstancedMesh; qolgan: THREE.InstancedMesh };
type Qismlar = { turlar: TurMeshlari[]; goldirak: THREE.InstancedMesh; hammasi: THREE.InstancedMesh[] };

/** Matritsalarni yozuvchi (vaqtinchalik obyektlar qayta ishlatiladi). */
function joylovchi(modellar: AvtomobilModeli[], q: Qismlar) {
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  const w = new THREE.Matrix4();
  const namuna = modellar[0].radius;
  return {
    qoy(a: Avtomobil, x: number, z: number, burchak: number, aylanish: number) {
      const i = TUR_INDEKSI[a.tur];
      const t = q.turlar[i];
      const md = modellar[i];
      m.compose(p.set(x, 0, z), qa.setFromAxisAngle(Y_OQI, burchak), BIRLIK);
      t.kuzov.setMatrixAt(a.ti, m);
      t.oyna.setMatrixAt(a.ti, m);
      t.qolgan.setMatrixAt(a.ti, m);
      s.setScalar(md.radius / namuna);
      md.goldiraklar.forEach((g, k) => {
        qb.setFromAxisAngle(X_OQI, g.chap ? aylanish : -aylanish);
        if (!g.chap) qb.premultiply(TESKARI);
        w.compose(p.set(g.x, g.y, g.z), qb, s).premultiply(m);
        q.goldirak.setMatrixAt(a.gi * 4 + k, w);
      });
    },
    yashir(a: Avtomobil) {
      const t = q.turlar[TUR_INDEKSI[a.tur]];
      t.kuzov.setMatrixAt(a.ti, YASHIRIN);
      t.oyna.setMatrixAt(a.ti, YASHIRIN);
      t.qolgan.setMatrixAt(a.ti, YASHIRIN);
      for (let k = 0; k < 4; k++) q.goldirak.setMatrixAt(a.gi * 4 + k, YASHIRIN);
    },
  };
}

/** Obyektlar hovuzi: har kadrda yangi obyekt yaratmaslik uchun. */
function hovuz() {
  const elementlar: YoldagiObyekt[] = [];
  return {
    royxat: [] as YoldagiObyekt[],
    tozala() { this.royxat.length = 0; },
    qosh(x: number, z: number, burchak: number, yarimUzunlik: number) {
      const o = elementlar[this.royxat.length] ?? (elementlar[this.royxat.length] = { x: 0, z: 0, burchak: 0, yarimUzunlik: 0 });
      o.x = x;
      o.z = z;
      o.burchak = burchak;
      o.yarimUzunlik = yarimUzunlik;
      this.royxat.push(o);
    },
  };
}

type QatnovchiHolati = { bosqich: QatnovBosqichi; kechKel: number; kechKet: number; aylanish: number; oxirgiMasofa: number | null };

/** Ko'chaga qo'shilishdan oldin qatnovchi shu oraliqdagi (x) harakatlanayotgan avtomobilni o'tkazib yuboradi. */
const QOSHILISH_ZONASI = { x0: QATNOV.chiqishX - 8, x1: QATNOV.chiqishX + 7 } as const;
/** Ko'chadagilar shu nuqta oldida to'xtab, qatnovchini qo'shilishga qo'yib beradi (zonadan tashqarida — tiqilib qolmaydi). */
const QOSHILISH_TOSIGI_X = QATNOV.chiqishX + 9;

function GlbAvtomobillar({ reestr }: { reestr: TransportReestri }) {
  const gltflar = useGLTF(GLB_YOLLARI, false, false);
  const modellar = useMemo(() => gltflar.map((g) => glbAvtomobili(g.scene)), [gltflar]);
  useEffect(() => () => modellar.forEach((md) => [md.kuzov, md.oyna, md.qolgan, md.goldirak].forEach((g) => g.dispose())), [modellar]);
  const mat = useMemo(avtomobilMateriallari, []);
  useEffect(() => () => materiallarniTozala(mat), [mat]);
  const marshrutlar = useMemo(() => QATNOVCHI_JOYLARI.map(qatnovchiMarshrutlari), []);

  const qismlar = useMemo<Qismlar>(() => {
    const yasa = (geo: THREE.BufferGeometry, material: THREE.Material, soni: number, soya: boolean) => {
      const im = new THREE.InstancedMesh(geo, material, Math.max(1, soni));
      im.count = soni;
      im.castShadow = soya;
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      return im;
    };
    const turlar = AVTOMOBIL_TURLARI.map((tur, i) => {
      const n = ROYXAT.sanoq[tur];
      return { kuzov: yasa(modellar[i].kuzov, mat.kuzov, n, true), oyna: yasa(modellar[i].oyna, mat.oyna, n, false), qolgan: yasa(modellar[i].qolgan, mat.qolgan, n, true) };
    });
    const goldirak = yasa(modellar[0].goldirak, mat.goldirak, ROYXAT.jami * 4, true);
    const q: Qismlar = { turlar, goldirak, hammasi: [...turlar.flatMap((t) => [t.kuzov, t.oyna, t.qolgan]), goldirak] };
    const rang = new THREE.Color();
    const j = joylovchi(modellar, q);
    for (const a of [...ROYXAT.turgan, ...ROYXAT.qatnov, ...ROYXAT.trafik]) {
      turlar[TUR_INDEKSI[a.tur]].kuzov.setColorAt(a.ti, rang.set(a.rang));
      j.yashir(a);
    }
    // Doim turganlar — bir marta joylanadi.
    TURGAN_AVTOMOBILLAR.forEach((t, i) => j.qoy(ROYXAT.turgan[i], t.x, t.z, t.burchak, i * 0.7));
    return q;
  }, [modellar, mat]);
  useEffect(() => () => qismlar.hammasi.forEach((im) => im.dispose()), [qismlar]);
  const joyla = useMemo(() => joylovchi(modellar, qismlar), [modellar, qismlar]);

  const trafik = useRef(TRAFIK.map((a) => ({ x: a.x0, v: a.tezlik, aylanish: 0 })));
  const qatnov = useRef<QatnovchiHolati[]>(QATNOVCHI_JOYLARI.map(() => ({ bosqich: "yoq", kechKel: 0, kechKet: 0, aylanish: 0, oxirgiMasofa: null })));
  const ish = useMemo(() => ({
    holat: yangiHolat(),
    yuklar: [] as YoldagiObyekt[],
    qoshilish: [] as YoldagiObyekt[],
    /** Qatnovchilar (ko'chadagilari) va ularning qo'shilish to'siqlari. */
    qatnovTosiq: hovuz(),
    /** Ko'chadagi avtomobillar (reestrga — avtobus uchun). */
    chiqish: hovuz(),
    avtobus: [] as YoldagiObyekt[],
  }), []);

  useFrame((_, dtXom) => {
    const dt = Math.min(0.1, dtXom);
    const hozir = Date.now() / 1000;
    const { holat: h, yuklar, qoshilish, qatnovTosiq, chiqish, avtobus } = ish;
    yukMashinaTosiqlari(reestr, yuklar, qoshilish);
    avtobus.length = 0;
    if (reestr.avtobus.korinadi) avtobus.push(reestr.avtobus);
    const tr = trafik.current;

    // ── Qatnovchilar ──
    qatnovTosiq.tozala();
    QATNOVCHI_JOYLARI.forEach((joy, k) => {
      const a = ROYXAT.qatnov[k];
      const md = marshrutlar[k];
      const s = qatnov.current[k];
      const yarim = AVTOMOBIL_OLCHAMI[a.tur].uzunlik / 2;
      const b = qatnovBosqichi(k, hozir, { kelish: md.kelish.davom, ketish: md.ketish.davom });
      if (b.bosqich !== s.bosqich) {
        if (b.bosqich === "kelmoqda" || b.bosqich === "yoq") s.kechKel = 0;
        if (b.bosqich === "ketmoqda" || b.bosqich === "yoq") s.kechKet = 0;
        s.oxirgiMasofa = null;
        s.bosqich = b.bosqich;
      }
      const oldinda = (x: number, z: number) =>
        Math.min(oldindagiMasofa(x, z, -1, yarim, yuklar), oldindagiMasofa(x, z, -1, yarim, avtobus), oldindagiMasofa(x, z, -1, yarim, chiqish.royxat));
      let korinadi = true;
      let marshrut = md.kelish;
      let t = 0;
      if (b.bosqich === "yoq") korinadi = false;
      else if (b.bosqich === "ketmoqda") {
        marshrut = md.ketish;
        t = b.t - s.kechKet;
        if (t > md.ketish.davom) korinadi = false;
      } else {
        t = (b.bosqich === "kelmoqda" ? b.t : md.kelish.davom + b.t) - s.kechKel;
      }
      if (!korinadi) { joyla.yashir(a); return; }
      if (marshrut === md.kelish && t >= md.kelish.davom) {
        joyla.qoy(a, joy.x, joy.z, joy.burchak, s.aylanish);
        return;
      }
      marshrutHolati(marshrut, Math.max(0, t), h);
      // Ko'chada oldindagiga qarab sekinlashadi; chiqishda ko'chadagi avtomobilni o'tkazib yuboradi (jadvaldan kechikish chegaralangan).
      let tezlik = 1;
      if (kochadami(h.p.z)) tezlik = THREE.MathUtils.clamp((oldinda(h.p.x, h.p.z) - 2.5) / 6, 0, 1);
      if (marshrut === md.ketish && h.p.z > 56.5 && !kochadami(h.p.z) && Math.abs(h.p.x - QATNOV.chiqishX) < 4) {
        qatnovTosiq.qosh(QOSHILISH_TOSIGI_X, KOCHA_QATORLARI[0].z, -Math.PI / 2, 1);
        const kelayotgan = TRAFIK.some((c, i) => c.qator === 0 && tr[i].v > 1.5 && tr[i].x > QOSHILISH_ZONASI.x0 && tr[i].x < QOSHILISH_ZONASI.x1);
        if (kelayotgan && h.p.z > 58.5) tezlik = 0;
      }
      if (tezlik < 1) {
        if (marshrut === md.kelish && s.kechKel < QATNOV_KECHIKISH_CHEGARASI) s.kechKel += dt * (1 - tezlik);
        if (marshrut === md.ketish && s.kechKet < QATNOV_KECHIKISH_CHEGARASI) s.kechKet += dt * (1 - tezlik);
      }
      if (kochadami(h.p.z)) qatnovTosiq.qosh(h.p.x, h.p.z, h.burchak, yarim);
      const d = s.oxirgiMasofa === null ? 0 : h.masofa - s.oxirgiMasofa;
      s.oxirgiMasofa = h.masofa;
      if (Math.abs(d) < 2) s.aylanish += (h.orqaga ? -d : d) / modellar[TUR_INDEKSI[a.tur]].radius;
      joyla.qoy(a, h.p.x, h.p.z, h.burchak, s.aylanish);
    });

    // ── Ko'chadagi avtomobillar ──
    const C = KOCHA_CHEGARASI;
    TRAFIK.forEach((a, i) => {
      const { z, yon } = KOCHA_QATORLARI[a.qator];
      const yarim = AVTOMOBIL_OLCHAMI[a.tur].uzunlik / 2;
      const x = tr[i].x;
      let bosh = Infinity;
      TRAFIK.forEach((c, j) => {
        if (j === i || c.qator !== a.qator) return;
        let d = (tr[j].x - x) * yon;
        if (d <= 0) d += C * 2;
        bosh = Math.min(bosh, d - yarim - AVTOMOBIL_OLCHAMI[c.tur].uzunlik / 2);
      });
      bosh = Math.min(
        bosh,
        oldindagiMasofa(x, z, yon, yarim, yuklar),
        oldindagiMasofa(x, z, yon, yarim, qoshilish),
        oldindagiMasofa(x, z, yon, yarim, avtobus),
        oldindagiMasofa(x, z, yon, yarim, qatnovTosiq.royxat),
      );
      let maqsad = a.tezlik * THREE.MathUtils.clamp((bosh - 3) / 12, 0, 1);
      // Orqadan yuk mashinasi yaqinlashsa (u to'xtamaydi) — yo'l bo'sh bo'lsa tezlashib uzoqlashadi.
      for (const y of yuklar) {
        if (Math.abs(y.z - z) > 1.5 || Math.sin(y.burchak) * yon < 0.7) continue;
        const orqada = (x - y.x) * yon;
        if (orqada > 0 && orqada < 26 && bosh > 22) maqsad = Math.max(maqsad, 13.5);
      }
      const v = THREE.MathUtils.damp(tr[i].v, maqsad, maqsad < tr[i].v ? 4 : 1.2, dt);
      tr[i].v = bosh < 0.4 ? 0 : v;
      let yangiX = x + yon * tr[i].v * dt;
      if (yangiX > C) yangiX -= C * 2;
      if (yangiX < -C) yangiX += C * 2;
      tr[i].x = yangiX;
      tr[i].aylanish += (tr[i].v * dt) / modellar[TUR_INDEKSI[a.tur]].radius;
      joyla.qoy(ROYXAT.trafik[i], yangiX, z, yon > 0 ? Math.PI / 2 : -Math.PI / 2, tr[i].aylanish);
    });

    // Reestrga: ko'chadagilar va qatnovchilar (avtobus ularga qarab sekinlashadi).
    chiqish.tozala();
    TRAFIK.forEach((a, i) => chiqish.qosh(tr[i].x, KOCHA_QATORLARI[a.qator].z, KOCHA_QATORLARI[a.qator].yon > 0 ? Math.PI / 2 : -Math.PI / 2, AVTOMOBIL_OLCHAMI[a.tur].uzunlik / 2));
    for (const o of qatnovTosiq.royxat) chiqish.qosh(o.x, o.z, o.burchak, o.yarimUzunlik);
    reestr.avtomobillar = chiqish.royxat;

    for (const im of qismlar.hammasi) im.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {qismlar.hammasi.map((im, i) => <primitive key={i} object={im} />)}
    </>
  );
}

/** GLB yuklanmasa (fayl yo'q / buzilgan) sahna qulamaydi — avtomobillar shunchaki ko'rinmaydi. */
class XatoChegarasi extends Component<{ children: ReactNode }, { xato: boolean }> {
  state = { xato: false };

  static getDerivedStateFromError() {
    return { xato: true };
  }

  render() {
    return this.state.xato ? null : this.props.children;
  }
}

/**
 * Ko'cha va tashqi avtoturargoh avtomobillari (GLB). O'z Suspense va xato chegarasi bilan — yuk mashinalari va sahnaning qolgan
 * qismi model yuklanishini kutmaydi. `reestr` — Logistika'dagi umumiy reestr (yuk mashinalari, avtobus); berilmasa — mustaqil.
 */
export default function Avtomobillar({ reestr }: { reestr?: TransportReestri }) {
  const ichki = useMemo(() => reestr ?? yangiReestr(), [reestr]);
  return (
    <XatoChegarasi>
      <Suspense fallback={null}>
        <GlbAvtomobillar reestr={ichki} />
      </Suspense>
    </XatoChegarasi>
  );
}

// ── Xizmat avtobusi (oq, umumiy ko'rinish, belgisiz; kod bilan yasalgan) ──

type AvtobusHolati = {
  faol: boolean;
  x: number;
  v: number;
  bosqich: "yolda" | "bekatda" | "ketmoqda";
  kutishOxiri: number;
  toxtaydi: boolean | null;
  davr: number;
  eshik: number;
};

const AVTOBUS_YARIM = AVTOBUS.uzunlik / 2;
/** Eshik tavaqalari: [z markazi, siljish yo'nalishi]. Old eshik (old g'ildirakdan oldinda) va o'rta eshik. */
const TAVAQALAR: ReadonlyArray<readonly [number, number]> = [[3.85, -1], [4.25, 1], [-0.25, -1], [0.15, 1]];

/** Bekat yonida yo'l chetiga yaqinlashish (0…1). */
const chetgaUlush = (x: number) => {
  const u = THREE.MathUtils.clamp(1 - (Math.abs(x - AVTOBUS_TOXTASH_X) - 4) / 28, 0, 1);
  return u * u * (3 - 2 * u);
};

/**
 * Xizmat avtobusi: har ~60 s da ko'chaning z = 66 qatori bo'ylab (−x ga) o'tadi, bekatda eshigi bekatga to'g'ri keladigan joyda
 * to'xtab (9 s, eshiklar ochiladi), yo'lida davom etadi. Shu payt bekat yonidan yuk mashinasi o'tishi kerak bo'lsa — to'xtamaydi.
 * Oldidagi avtomobil / yuk mashinasiga qarab sekinlashadi.
 */
export function Avtobus({ m, tm, reestr }: { m: Materiallar; tm: TransportMateriallari; reestr: TransportReestri }) {
  const geo = yukGeometriyalari();
  const ildiz = useRef<THREE.Group>(null);
  const oqOld = useRef<THREE.Mesh>(null);
  const oqOrqa = useRef<THREE.Mesh>(null);
  const tavaqa0 = useRef<THREE.Group>(null);
  const tavaqa1 = useRef<THREE.Group>(null);
  const tavaqa2 = useRef<THREE.Group>(null);
  const tavaqa3 = useRef<THREE.Group>(null);
  const tavaqalar = [tavaqa0, tavaqa1, tavaqa2, tavaqa3];
  const holat = useRef<AvtobusHolati>({ faol: false, x: AVTOBUS.boshX, v: 0, bosqich: "yolda", kutishOxiri: 0, toxtaydi: null, davr: -1, eshik: 0 });
  const ish = useMemo(() => ({ yuklar: [] as YoldagiObyekt[], qoshilish: [] as YoldagiObyekt[], oynalar: [] as Array<readonly [number, number]> }), []);

  useFrame((_, dtXom) => {
    const g = ildiz.current;
    if (!g) return;
    const dt = Math.min(0.1, dtXom);
    const hozir = Date.now() / 1000;
    const s = holat.current;
    const { yuklar, qoshilish, oynalar } = ish;
    yukMashinaTosiqlari(reestr, yuklar, qoshilish);
    if (!s.faol) {
      const davr = Math.floor(hozir / AVTOBUS.davr);
      if (davr !== s.davr && hozir - davr * AVTOBUS.davr < 25) {
        const band = [...reestr.avtomobillar, ...yuklar].some((o) => Math.abs(o.z - AVTOBUS.qatorZ) < 2.4 && Math.abs(o.x - AVTOBUS.boshX) < 16);
        if (!band) Object.assign(s, { faol: true, x: AVTOBUS.boshX, v: AVTOBUS.tezlik, bosqich: "yolda", toxtaydi: null, davr, eshik: 0 });
      }
      if (!s.faol) {
        g.visible = false;
        reestr.avtobus.korinadi = false;
        return;
      }
    }
    // Bekatga ~75 m qolganda qaror: shu oraliqda bekat yonidan yuk mashinasi o'tadimi.
    if (s.toxtaydi === null && s.x < AVTOBUS_TOXTASH_X + 75) {
      const qoldi = (s.x - AVTOBUS_TOXTASH_X) / AVTOBUS.tezlik + 2.5;
      oynalar.length = 0;
      for (const iz of Object.values(reestr.yukMashinalari)) {
        if (!iz || iz.bosqich !== "ketmoqda") continue;
        const w = BEKAT_OYNALARI[iz.rampa];
        if (w && w[1] > iz.t) oynalar.push([hozir + w[0] - iz.t, hozir + w[1] - iz.t]);
      }
      s.toxtaydi = avtobusToxtaydimi([hozir + qoldi, hozir + qoldi + AVTOBUS.kutish + 5], oynalar);
    }
    const chetga = s.toxtaydi ? chetgaUlush : () => 0;
    const z = AVTOBUS.qatorZ - AVTOBUS.chetga * chetga(s.x);
    const oldingiX = s.x;
    if (s.bosqich === "bekatda") {
      s.v = 0;
      if (hozir >= s.kutishOxiri) s.bosqich = "ketmoqda";
    } else {
      let maqsad: number = AVTOBUS.tezlik;
      const bosh = Math.min(
        oldindagiMasofa(s.x, z, -1, AVTOBUS_YARIM, reestr.avtomobillar),
        oldindagiMasofa(s.x, z, -1, AVTOBUS_YARIM, yuklar),
        oldindagiMasofa(s.x, z, -1, AVTOBUS_YARIM, qoshilish),
      );
      maqsad = Math.min(maqsad, AVTOBUS.tezlik * THREE.MathUtils.clamp((bosh - 4) / 14, 0, 1));
      s.v = THREE.MathUtils.damp(s.v, maqsad, maqsad < s.v ? 3.5 : 0.8, dt);
      if (bosh < 0.5) s.v = 0;
      if (s.toxtaydi && s.bosqich === "yolda") {
        // Bekatga tormoz bilan aniq yetib keladi.
        const qoldi = s.x - AVTOBUS_TOXTASH_X;
        s.v = Math.min(s.v, Math.sqrt(2 * AVTOBUS.tormoz * Math.max(0, qoldi)) + 0.12);
        s.x = Math.max(AVTOBUS_TOXTASH_X, s.x - s.v * dt);
        if (s.x - AVTOBUS_TOXTASH_X < 0.02) {
          s.bosqich = "bekatda";
          s.v = 0;
          s.kutishOxiri = hozir + AVTOBUS.kutish;
        }
      } else {
        s.x -= s.v * dt;
      }
    }
    if (s.x < AVTOBUS.oxiriX) {
      s.faol = false;
      g.visible = false;
      reestr.avtobus.korinadi = false;
      return;
    }
    // Yo'nalish: chetga yaqinlashishdagi kichik burilish ham hisobga olinadi.
    // −x ga 1 m yurganda z qanchaga o'zgaradi (bekatga yaqinlashganda chetga, ketishda qatorga qaytadi).
    const dz = AVTOBUS.chetga * (chetga(s.x + 0.5) - chetga(s.x - 0.5));
    const burchak = Math.atan2(-1, dz);
    g.visible = true;
    g.position.set(s.x, 0, z);
    g.rotation.y = burchak;
    const aylanish = (oldingiX - s.x) / 0.45;
    if (oqOld.current) oqOld.current.rotation.x += aylanish;
    if (oqOrqa.current) oqOrqa.current.rotation.x += aylanish;
    s.eshik = THREE.MathUtils.damp(s.eshik, s.bosqich === "bekatda" && hozir < s.kutishOxiri - 1.3 ? 1 : 0, 4, dt);
    tavaqalar.forEach((r, i) => {
      if (!r.current) return;
      r.current.position.x = -1.235 - 0.1 * Math.min(1, s.eshik * 3);
      r.current.position.z = TAVAQALAR[i][0] + TAVAQALAR[i][1] * 0.36 * s.eshik;
    });
    Object.assign(reestr.avtobus, { x: s.x, z, burchak, yarimUzunlik: AVTOBUS_YARIM, korinadi: true });
  });

  return (
    <group ref={ildiz} visible={false}>
      <StatikGuruh>
        {/* Kuzov: yuqori qism, g'ildirak o'yiqlari orasidagi pastki panellar, o'yiq ichi */}
        <Yumaloq o={[2.45, 0.62, AVTOBUS.uzunlik]} p={[0, 1.22, 0]} mat={tm.avtobusKuzov} radius={0.1} />
        {([[-4.55, -3.2], [-1.6, 2.35], [3.65, 4.55]] as const).map(([a, b]) => <Quti key={a} o={[2.43, 0.5, b - a]} p={[0, 0.68, (a + b) / 2]} mat={tm.avtobusKuzov} />)}
        <Quti o={[2.3, 0.04, 1.25]} p={[0, 0.93, 3.0]} mat={tm.rama} />
        <Quti o={[2.3, 0.04, 1.6]} p={[0, 0.93, -2.4]} mat={tm.rama} />
        {/* Deraza tasmasi va ustunlar, tom, konditsioner */}
        <Quti o={[2.43, 0.95, 8.9]} p={[0, 2.0, -0.1]} mat={tm.avtobusOyna} />
        {[-4.3, -3.05, -1.8, -0.55, 0.7, 1.95, 3.2].map((z) => <Quti key={z} o={[2.46, 0.95, 0.1]} p={[0, 2.0, z]} mat={tm.avtobusKuzov} />)}
        <Yumaloq o={[2.45, 0.62, AVTOBUS.uzunlik]} p={[0, 2.78, 0]} mat={tm.avtobusKuzov} radius={0.22} />
        <Yumaloq o={[1.5, 0.26, 2.3]} p={[0, 3.2, 0.8]} mat={tm.alyumin} radius={0.08} />
        <Quti o={[2.47, 0.14, 8.95]} p={[0, 1.42, 0]} mat={tm.avtobusTasma} />
        {/* Old: shamol oynasi, yo'nalish tablosi, fara, bamper; orqa: oyna, chiroqlar, bamper */}
        <Quti o={[2.3, 1.45, 0.05]} p={[0, 1.98, 4.62]} r={[-0.05, 0, 0]} mat={tm.avtobusOyna} />
        <Quti o={[1.7, 0.24, 0.03]} p={[0, 2.86, 4.615]} mat={tm.tablo} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Quti o={[0.38, 0.16, 0.03]} p={[s * 0.85, 0.9, 4.615]} mat={tm.oldChiroq} />
            <Quti o={[0.12, 0.16, 0.03]} p={[s * 1.12, 0.9, 4.615]} mat={tm.sariqChiroq} />
            <Quti o={[0.16, 0.5, 0.03]} p={[s * 1.05, 1.15, -4.615]} mat={tm.orqaChiroq} />
            {/* "Quyon qulog'i" ko'zgular */}
            <Quti o={[0.04, 0.04, 0.5]} p={[s * 1.12, 2.62, 4.82]} mat={tm.rama} />
            <Yumaloq o={[0.1, 0.36, 0.16]} p={[s * 1.18, 2.35, 5.05]} mat={tm.qoraPlastik} radius={0.03} />
          </group>
        ))}
        <Yumaloq o={[2.47, 0.32, 0.18]} p={[0, 0.56, 4.6]} mat={tm.qoraPlastik} radius={0.05} />
        <Yumaloq o={[2.47, 0.32, 0.18]} p={[0, 0.56, -4.6]} mat={tm.qoraPlastik} radius={0.05} />
        <Quti o={[2.0, 0.75, 0.03]} p={[0, 2.05, -4.615]} mat={tm.avtobusOyna} />
        {/* Eshik o'rinlari (o'ng tomonda — yo'l chetida): tavaqalar siljiganda ichi qorong'i ko'rinadi */}
        <Quti o={[0.02, 1.95, 0.82]} p={[-1.228, 1.45, 4.05]} mat={tm.rama} />
        <Quti o={[0.02, 1.95, 0.82]} p={[-1.228, 1.45, -0.05]} mat={tm.rama} />
      </StatikGuruh>
      {TAVAQALAR.map(([z], i) => (
        <group key={z} ref={tavaqalar[i]} position={[-1.235, 1.47, z]}>
          <Quti o={[0.04, 1.92, 0.4]} p={[0, 0, 0]} mat={tm.avtobusOyna} />
          <Quti o={[0.045, 0.06, 0.4]} p={[0, -0.25, 0]} mat={m.polat} />
        </group>
      ))}
      <mesh ref={oqOld} geometry={geo.avtobusOqOld} material={tm.goldirak} position={[0, 0.45, 3.0]} castShadow receiveShadow />
      <mesh ref={oqOrqa} geometry={geo.avtobusOqOrqa} material={tm.goldirak} position={[0, 0.45, -2.4]} castShadow receiveShadow />
    </group>
  );
}
