import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Materiallar } from "./materiallar";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { odamGeometriyasi } from "./geometriyalar";

// Sexdagi odamlar va pogruzchik (kod bilan yasalgan, tashqi model yo'q). Stanok ishlayotganda operator ish harakatini qiladi,
// pauza / bo'sh / aloqa yo'q bo'lsa — joyida tik turadi (nafas oladi, og'irligini almashtiradi, atrofga qaraydi).

/** Ish harakati turi. */
export type IshHarakati = "surish" | "pult" | "qabul" | "qadoqlash" | "burgilash" | "rul" | "kuzatish" | "ishora" | "planshet";

/** Kiyim: ishchi (kombinezon + signal jilet + kaska), usta (oq kaska, ko'ylak, planshet), qorovul (qora forma, kepka), haydovchi. */
export type Kiyim = "ishchi" | "usta" | "qorovul" | "haydovchi";

type Bogimlar = {
  ildiz: RefObject<THREE.Group | null>;
  tana: RefObject<THREE.Group | null>;
  bosh: RefObject<THREE.Group | null>;
  chapQol: RefObject<THREE.Group | null>;
  ongQol: RefObject<THREE.Group | null>;
  chapOyoq: RefObject<THREE.Group | null>;
  ongOyoq: RefObject<THREE.Group | null>;
};

function useBogimlar(): Bogimlar {
  return {
    ildiz: useRef<THREE.Group>(null),
    tana: useRef<THREE.Group>(null),
    bosh: useRef<THREE.Group>(null),
    chapQol: useRef<THREE.Group>(null),
    ongQol: useRef<THREE.Group>(null),
    chapOyoq: useRef<THREE.Group>(null),
    ongOyoq: useRef<THREE.Group>(null),
  };
}

const ichki = (g: THREE.Group | null, nom: string) => g?.getObjectByName(nom) ?? null;

/** Bitta odam (balandligi ~1.76 m, old tomoni +z). Bel — tana bo'g'imi; son/tizza, yelka/tirsak alohida bo'g'imlar.
 *  Geometriyalar umumiy (geometriyalar.ts) — har odam uchun qayta yaratilmaydi. */
function Tana({ mat, turi = 0, kiyim = "ishchi", b, planshet }: { mat: Materiallar; turi?: number; kiyim?: Kiyim; b: Bogimlar; planshet?: boolean }) {
  const g = odamGeometriyasi();
  const teri = mat.teri[turi % mat.teri.length];
  const soch = mat.soch[turi % mat.soch.length];
  const shim = kiyim === "qorovul" ? mat.forma : kiyim === "haydovchi" ? mat.jinsi : mat.shim[turi % mat.shim.length];
  const ust = kiyim === "qorovul" ? mat.forma : kiyim === "usta" ? mat.koylak : kiyim === "haydovchi" ? mat.kurtka : mat.ustKiyim[turi % mat.ustKiyim.length];
  const jilet = kiyim === "ishchi" ? mat.jilet[turi % mat.jilet.length] : kiyim === "usta" ? mat.jilet[0] : null;
  const kaska = kiyim === "ishchi" ? mat.kaska[turi % mat.kaska.length] : kiyim === "usta" ? mat.kaska[1] : null;
  const kepka = kiyim === "qorovul";

  const oyoq = (x: number, ref: RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[x, 0.93, 0]}>
      <mesh geometry={g.son} material={shim} castShadow />
      <group position={[0, -0.44, 0]} name="tizza">
        <mesh geometry={g.boldir} material={shim} castShadow />
        <mesh geometry={g.etik} material={mat.etik} castShadow />
      </group>
    </group>
  );
  const qol = (x: number, ref: RefObject<THREE.Group | null>) => (
    <group ref={ref} position={[x, 0.5, 0]}>
      <mesh geometry={g.yelka} material={ust} castShadow />
      <group position={[0, -0.29, 0]} name="bilak">
        <mesh geometry={g.tirsak} material={ust} castShadow />
        <mesh geometry={g.kaft} material={kiyim === "ishchi" ? mat.qolqop : teri} castShadow />
      </group>
    </group>
  );
  return (
    <group ref={b.ildiz} dispose={null}>
      {oyoq(-0.095, b.chapOyoq)}
      {oyoq(0.095, b.ongOyoq)}
      <mesh geometry={g.chanoq} material={shim} castShadow />
      {/* Bel bo'g'imi: tana shu nuqta atrofida egiladi */}
      <group position={[0, 0.98, 0]}>
        <group ref={b.tana}>
          <mesh geometry={g.kamar} material={mat.kamar} />
          <mesh geometry={g.kokrak} material={ust} castShadow />
          {jilet && (
            <>
              <mesh geometry={g.jilet} material={jilet} castShadow />
              <mesh geometry={g.jiletChiziq} material={mat.nurQaytargich} />
            </>
          )}
          {kepka && <mesh geometry={g.nishon} material={mat.ogohlantirish} />}
          <mesh geometry={g.boyin} material={teri} />
          <group ref={b.bosh} position={[0, 0.7, 0]}>
            <mesh geometry={g.teri} material={teri} castShadow />
            <mesh geometry={g.yuz} material={mat.koz} />
            <mesh geometry={g.lab} material={mat.lab} />
            {/* Soch: kaska/kepka ostidan ensada, ularsiz — tepada ham */}
            <mesh geometry={g.sochOrqa} material={soch} />
            {!kaska && !kepka && <mesh geometry={g.sochTepa} material={soch} />}
            {kaska && <mesh geometry={g.kaska} material={kaska} castShadow />}
            {kepka && <mesh geometry={g.kepka} material={mat.forma} castShadow />}
            {kiyim === "ishchi" && (
              <>
                {/* Himoya ko'zoynagi va quloqchin (shovqindan) */}
                <mesh geometry={g.kozoynak} material={mat.kozoynak} />
                <mesh geometry={g.quloqchin} material={mat.quloqchin} />
              </>
            )}
          </group>
          {qol(-0.21, b.chapQol)}
          {qol(0.21, b.ongQol)}
          {planshet && <mesh geometry={g.planshet} material={mat.planshet} />}
        </group>
      </group>
    </group>
  );
}

/** Ishchi / usta / qorovul / haydovchi: joyida turib yoki o'tirib ishlaydi. */
export function Ishchi({ mat, p, burilish = 0, harakat, ishlayapti, turi = 0, faza = 0, kiyim = "ishchi", nigoh }: {
  mat: Materiallar;
  p: [number, number, number];
  /** Y o'qi atrofida burilish: 0 — +z ga qaraydi. */
  burilish?: number;
  harakat: IshHarakati;
  ishlayapti: boolean;
  /** Ko'rinish varianti: teri / kiyim / jilet / kaska rangi. */
  turi?: number;
  /** Animatsiya fazasi (bir xil harakat qiladigan ishchilar bir vaqtda qimirlamasin). */
  faza?: number;
  kiyim?: Kiyim;
  /** Bosh shu nuqtaga qaraydi (masalan, qorovul — kelayotgan mashinaga); null — o'z holicha. */
  nigoh?: { current: THREE.Vector3 | null };
}) {
  const b = useBogimlar();
  const vaqtincha = useRef(new THREE.Vector3());

  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const { tana, bosh, chapQol: cq, ongQol: oq, chapOyoq: co, ongOyoq: oo, ildiz } = b;
    const chap = cq.current;
    const ong = oq.current;
    if (!chap || !ong || !tana.current || !bosh.current || !co.current || !oo.current || !ildiz.current) return;
    const chapBilak = ichki(chap, "bilak");
    const ongBilak = ichki(ong, "bilak");
    const chapTizza = ichki(co.current, "tizza");
    const ongTizza = ichki(oo.current, "tizza");
    // Standart: tik turish
    tana.current.position.set(0, Math.sin(t * 1.6) * 0.004, 0);
    tana.current.rotation.set(0, 0, 0);
    bosh.current.rotation.set(0, 0, 0);
    co.current.rotation.set(0, 0, 0);
    oo.current.rotation.set(0, 0, 0);
    chapTizza?.rotation.set(0, 0, 0);
    ongTizza?.rotation.set(0, 0, 0);
    ildiz.current.position.set(0, 0, 0);
    ildiz.current.rotation.set(0, 0, 0);

    if (harakat === "rul") {
      // O'tirib haydash: son oldinga, boldir pastga, qo'llar rulda.
      co.current.rotation.x = -1.5;
      oo.current.rotation.x = -1.5;
      chapTizza?.rotation.set(1.45, 0, 0);
      ongTizza?.rotation.set(1.45, 0, 0);
      tana.current.rotation.x = -0.08;
      chap.rotation.set(-0.95, 0, 0.12);
      ong.rotation.set(-0.95, 0, -0.12);
      chapBilak?.rotation.set(-0.55, 0, 0);
      ongBilak?.rotation.set(-0.55, 0, 0);
      bosh.current.rotation.y = Math.sin(t * 0.5) * 0.25;
      return;
    }

    // Bosh nishonga qaraydi (qorovul — mashinaga).
    const qarash = () => {
      const nishon = nigoh?.current;
      if (!nishon || !bosh.current) return false;
      const mahalliy = bosh.current.parent ? bosh.current.parent.worldToLocal(vaqtincha.current.copy(nishon)) : nishon;
      const burchak = Math.atan2(mahalliy.x, mahalliy.z);
      bosh.current.rotation.y = THREE.MathUtils.clamp(burchak, -1.1, 1.1);
      return true;
    };

    if (!ishlayapti || harakat === "kuzatish") {
      // Kutish: og'irlikni almashtiradi, atrofga qaraydi; qorovul qo'llarini ko'kragida chalishtirib turadi.
      const ogirlik = Math.sin(t * 0.35) * 0.025;
      ildiz.current.position.x = ogirlik;
      ildiz.current.rotation.z = -ogirlik * 0.8;
      if (harakat === "kuzatish") {
        chap.rotation.set(-0.45, 0, 0.32);
        ong.rotation.set(-0.45, 0, -0.32);
        chapBilak?.rotation.set(-1.55, 0, -1.1);
        ongBilak?.rotation.set(-1.55, 0, 1.1);
      } else {
        chap.rotation.set(0.04, 0, 0.09);
        ong.rotation.set(0.04, 0, -0.09);
        chapBilak?.rotation.set(-0.18, 0, 0);
        ongBilak?.rotation.set(-0.18, 0, 0);
      }
      if (!qarash()) bosh.current.rotation.y = Math.sin(t * 0.4) * 0.6;
      return;
    }

    bosh.current.rotation.y = Math.sin(t * 0.7) * 0.12;
    if (harakat === "surish") {
      // List suradi: ikki qo'l oldinga, tana bilan birga oldinga-orqaga, bir oyoq orqada.
      const s = (Math.sin(t * 1.7) + 1) / 2;
      chap.rotation.set(-1.15 - s * 0.25, 0, 0.12);
      ong.rotation.set(-1.15 - s * 0.25, 0, -0.12);
      chapBilak?.rotation.set(-0.35 + s * 0.3, 0, 0);
      ongBilak?.rotation.set(-0.35 + s * 0.3, 0, 0);
      tana.current.rotation.x = 0.14 + s * 0.1;
      co.current.rotation.x = 0.25;
      chapTizza?.rotation.set(0.15, 0, 0);
      oo.current.rotation.x = -0.12 - s * 0.1;
      ongTizza?.rotation.set(0.2, 0, 0);
      ildiz.current.position.z = -s * 0.1;
      bosh.current.rotation.x = 0.25;
    } else if (harakat === "pult") {
      // Pultda ishlaydi: o'ng qo'l ekranga tegib turadi, chap qo'l bel atrofida.
      const tegish = Math.max(0, Math.sin(t * 2.2));
      ong.rotation.set(-1.25 - tegish * 0.2, 0, -0.15);
      ongBilak?.rotation.set(-0.5, 0, 0);
      chap.rotation.set(-0.25, 0, 0.12);
      chapBilak?.rotation.set(-0.9, 0, 0);
      tana.current.rotation.x = 0.06;
      bosh.current.rotation.x = 0.2;
    } else if (harakat === "qabul") {
      // Chiqishda detalni qabul qilib, aravachaga taxlaydi (tizzalar biroz bukiladi).
      const s = Math.sin(t * 1.3);
      chap.rotation.set(-0.95 + s * 0.35, 0, 0.18);
      ong.rotation.set(-0.95 + s * 0.35, 0, -0.18);
      chapBilak?.rotation.set(-0.5, 0, 0);
      ongBilak?.rotation.set(-0.5, 0, 0);
      const egilish = Math.max(0, s);
      tana.current.rotation.x = 0.15 + egilish * 0.3;
      tana.current.rotation.y = s * 0.35;
      co.current.rotation.x = -egilish * 0.25;
      oo.current.rotation.x = -egilish * 0.25;
      chapTizza?.rotation.set(egilish * 0.45, 0, 0);
      ongTizza?.rotation.set(egilish * 0.45, 0, 0);
      ildiz.current.position.y = -egilish * 0.05;
      bosh.current.rotation.x = 0.2;
    } else if (harakat === "qadoqlash") {
      // Quti yopadi / skotch tortadi: qo'llar yonga harakatlanadi.
      const s = Math.sin(t * 2.4);
      chap.rotation.set(-1.0, s * 0.35, 0.25 + s * 0.2);
      ong.rotation.set(-1.0, s * 0.35, -0.25 + s * 0.2);
      chapBilak?.rotation.set(-0.6, 0, 0);
      ongBilak?.rotation.set(-0.6, 0, 0);
      tana.current.rotation.x = 0.3;
      bosh.current.rotation.x = 0.3;
    } else if (harakat === "burgilash") {
      // Detalni tirgakka bosib turadi, bir qo'l tugmada.
      const s = (Math.sin(t * 3.2) + 1) / 2;
      chap.rotation.set(-1.05, 0, 0.12);
      ong.rotation.set(-0.9 - s * 0.15, 0, -0.1);
      chapBilak?.rotation.set(-0.45, 0, 0);
      ongBilak?.rotation.set(-0.35 - s * 0.2, 0, 0);
      tana.current.rotation.x = 0.2;
      bosh.current.rotation.x = 0.25;
    } else if (harakat === "ishora") {
      // Orqaga yurayotgan mashinaga ishora: o'ng qo'l yuqorida tebranadi, chap qo'l yon tomonda.
      const s = Math.sin(t * 3);
      ong.rotation.set(-2.5, 0, -0.25);
      ongBilak?.rotation.set(-0.6 + s * 0.5, 0, 0);
      chap.rotation.set(-0.3, 0, 0.5);
      chapBilak?.rotation.set(-0.3, 0, 0);
      if (!qarash()) bosh.current.rotation.y = 0;
    } else {
      // Planshet bilan tekshiradi: ikki qo'l oldinda, bosh pastda.
      chap.rotation.set(-0.55, 0, 0.12);
      ong.rotation.set(-0.55, 0, -0.12);
      chapBilak?.rotation.set(-1.0, 0, 0);
      ongBilak?.rotation.set(-1.0 - Math.max(0, Math.sin(t * 1.7)) * 0.2, 0, 0);
      bosh.current.rotation.x = 0.35;
      bosh.current.rotation.y = Math.sin(t * 0.3) * 0.2;
    }
  });

  return (
    <group position={p} rotation={[0, burilish, 0]}>
      <Tana mat={mat} turi={turi} kiyim={kiyim} b={b} planshet={harakat === "planshet"} />
    </group>
  );
}

/** Yurish qadamlari: son va tizza (yer bilan to'qnashmasin), qo'llar qarama-qarshi. */
function qadamTashla(b: Bogimlar, t: number, tezlik: number, qolTebransin: boolean) {
  const qadam = Math.sin(t * tezlik * 5.4);
  const co = b.chapOyoq.current;
  const oo = b.ongOyoq.current;
  if (co) co.rotation.x = qadam * 0.42;
  if (oo) oo.rotation.x = -qadam * 0.42;
  ichki(co, "tizza")?.rotation.set(Math.max(0, -qadam) * 0.75 + 0.05, 0, 0);
  ichki(oo, "tizza")?.rotation.set(Math.max(0, qadam) * 0.75 + 0.05, 0, 0);
  if (b.tana.current) {
    b.tana.current.position.y = Math.abs(qadam) * 0.022;
    b.tana.current.rotation.y = qadam * 0.06;
  }
  if (qolTebransin) {
    b.chapQol.current?.rotation.set(-qadam * 0.35, 0, 0.08);
    b.ongQol.current?.rotation.set(qadam * 0.35, 0, -0.08);
    ichki(b.chapQol.current, "bilak")?.rotation.set(-0.25, 0, 0);
    ichki(b.ongQol.current, "bilak")?.rotation.set(-0.25, 0, 0);
  }
}

/** Yo'lak bo'ylab LDSP list ko'tarib yuradigan ishchi (borib-keladi). */
export function YuruvchiIshchi({ mat, yol, tezlik = 1.1, turi = 1, z, faza = 0 }: { mat: Materiallar; yol: [number, number]; tezlik?: number; turi?: number; z: number; faza?: number }) {
  const b = useBogimlar();
  const ildiz = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const uzunlik = yol[1] - yol[0];
    const davr = (uzunlik / tezlik) * 2;
    const f = (t % davr) / davr; // 0..1
    const oldinga = f < 0.5;
    const ulush = oldinga ? f * 2 : (1 - f) * 2;
    if (ildiz.current) {
      ildiz.current.position.set(yol[0] + uzunlik * ulush, 0, z);
      ildiz.current.rotation.y = oldinga ? Math.PI / 2 : -Math.PI / 2;
    }
    qadamTashla(b, t, tezlik, false);
    // List ikki qo'lda, tana oldida
    b.chapQol.current?.rotation.set(-0.6, 0, 0.3);
    b.ongQol.current?.rotation.set(-0.6, 0, -0.3);
    ichki(b.chapQol.current, "bilak")?.rotation.set(-0.75, 0, 0);
    ichki(b.ongQol.current, "bilak")?.rotation.set(-0.75, 0, 0);
    if (b.bosh.current) b.bosh.current.rotation.y = Math.sin(t * 0.5) * 0.25;
  });
  return (
    <group ref={ildiz}>
      <Tana mat={mat} turi={turi} b={b} />
      {/* Ko'tarib ketilayotgan list (tana oldida, vertikal) */}
      <Quti o={[0.9, 0.6, 0.018]} p={[0, 1.08, 0.36]} mat={mat.lmdpOq} />
    </group>
  );
}

/** Nuqtalar orasida aylanib yuradigan odam (usta sexni aylanadi; piyodalar trotuarda). Har nuqtada biroz to'xtaydi. */
export function AylanuvchiOdam({ mat, nuqtalar, tezlik = 1.1, turi = 0, kiyim = "ishchi", faza = 0, toxtash = 1.5 }: {
  mat: Materiallar;
  nuqtalar: Array<[number, number]>;
  tezlik?: number;
  turi?: number;
  kiyim?: Kiyim;
  faza?: number;
  /** Har nuqtada necha soniya to'xtaydi. */
  toxtash?: number;
}) {
  const b = useBogimlar();
  const ildiz = useRef<THREE.Group>(null);
  const bolaklar = useMemo(() => nuqtalar.map((a, i) => {
    const c = nuqtalar[(i + 1) % nuqtalar.length];
    return { a, c, uzunlik: Math.hypot(c[0] - a[0], c[1] - a[1]) };
  }), [nuqtalar]);
  useFrame(() => {
    const t = performance.now() / 1000 + faza;
    const davr = bolaklar.reduce((s, q) => s + q.uzunlik / tezlik + toxtash, 0);
    let qoldi = t % davr;
    for (const q of bolaklar) {
      const yurish = q.uzunlik / tezlik;
      if (qoldi < toxtash) {
        // To'xtab turadi (planshetga qaraydi)
        ildiz.current?.position.set(q.a[0], 0, q.a[1]);
        qadamTashla(b, 0, tezlik, kiyim !== "usta");
        if (kiyim === "usta") {
          b.chapQol.current?.rotation.set(-0.55, 0, 0.12);
          b.ongQol.current?.rotation.set(-0.55, 0, -0.12);
          ichki(b.chapQol.current, "bilak")?.rotation.set(-1.0, 0, 0);
          ichki(b.ongQol.current, "bilak")?.rotation.set(-1.0, 0, 0);
        }
        if (b.bosh.current) b.bosh.current.rotation.set(0.3, Math.sin(t) * 0.3, 0);
        return;
      }
      qoldi -= toxtash;
      if (qoldi < yurish) {
        const u = qoldi / yurish;
        if (ildiz.current) {
          ildiz.current.position.set(q.a[0] + (q.c[0] - q.a[0]) * u, 0, q.a[1] + (q.c[1] - q.a[1]) * u);
          ildiz.current.rotation.y = Math.atan2(q.c[0] - q.a[0], q.c[1] - q.a[1]);
        }
        qadamTashla(b, t, tezlik, kiyim !== "usta");
        if (kiyim === "usta") {
          b.chapQol.current?.rotation.set(-0.5, 0, 0.12);
          b.ongQol.current?.rotation.set(-0.5, 0, -0.12);
          ichki(b.chapQol.current, "bilak")?.rotation.set(-0.95, 0, 0);
          ichki(b.ongQol.current, "bilak")?.rotation.set(-0.95, 0, 0);
        }
        if (b.bosh.current) b.bosh.current.rotation.set(0.05, Math.sin(t * 0.6) * 0.3, 0);
        return;
      }
      qoldi -= yurish;
    }
  });
  return (
    <group ref={ildiz}>
      <Tana mat={mat} turi={turi} kiyim={kiyim} b={b} planshet={kiyim === "usta"} />
    </group>
  );
}

/** Pogruzchik modeli (harakatsiz qismi): kuzov, qarshi yuk, himoya tomi, o'rindiq, rul, machta, vilkalar, mayoq, haydovchi. */
export function PogruzchikModeli({ mat, vilka, goldiraklar, yuk, yukTuri = "list" }: {
  mat: Materiallar;
  vilka: RefObject<THREE.Group | null>;
  goldiraklar: RefObject<THREE.Group | null>;
  /** Vilkadagi yuk guruhi (ko'rinishini harakat boshqaradi). */
  yuk?: RefObject<THREE.Group | null>;
  yukTuri?: "list" | "karton";
}) {
  const mayoq = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mayoq.current) mayoq.current.visible = Math.floor(performance.now() / 420) % 2 === 0;
  });
  return (
    <group>
      <StatikGuruh>
      {/* Kuzov va qarshi yuk */}
      <Yumaloq o={[1.1, 0.62, 1.25]} p={[0, 0.55, -0.05]} mat={mat.pogruzchik} radius={0.08} />
      <Yumaloq o={[1.08, 0.75, 0.42]} p={[0, 0.62, -0.78]} mat={mat.korpusQora} radius={0.12} />
      <Quti o={[0.5, 0.06, 0.08]} p={[0, 0.98, -1.0]} mat={mat.ogohlantirish} />
      {/* O'rindiq va rul */}
      <Yumaloq o={[0.5, 0.12, 0.45]} p={[0, 0.92, -0.35]} mat={mat.orindiq} radius={0.04} />
      <Yumaloq o={[0.5, 0.5, 0.1]} p={[0, 1.2, -0.58]} r={[-0.15, 0, 0]} mat={mat.orindiq} radius={0.04} />
      <Silindr r={0.03} h={0.45} p={[0, 1.05, 0.22]} rot={[-0.5, 0, 0]} mat={mat.korpusQora} seg={10} />
      <mesh position={[0, 1.27, 0.12]} rotation={[-0.5 + Math.PI / 2, 0, 0]} material={mat.korpusQora}>
        <torusGeometry args={[0.15, 0.022, 8, 24]} />
      </mesh>
      {/* Himoya tomi */}
      {[[-0.48, 0.32], [0.48, 0.32], [-0.48, -0.72], [0.48, -0.72]].map(([a, c]) => (
        <Quti key={`${a}${c}`} o={[0.06, 1.35, 0.06]} p={[a, 1.55, c]} mat={mat.korpusQora} />
      ))}
      <Quti o={[1.05, 0.06, 1.15]} p={[0, 2.23, -0.2]} mat={mat.korpusQora} />
      {Array.from({ length: 5 }, (_, i) => <Quti key={i} o={[0.03, 0.04, 1.1]} p={[-0.4 + i * 0.2, 2.27, -0.2]} mat={mat.korpusQora} />)}
      {/* Machta (tashqi va ichki kanal) */}
      {[-0.32, 0.32].map((x) => <Quti key={x} o={[0.09, 2.4, 0.12]} p={[x, 1.2, 0.72]} mat={mat.polatQora} />)}
      {[-0.24, 0.24].map((x) => <Quti key={`i${x}`} o={[0.06, 2.2, 0.08]} p={[x, 1.25, 0.76]} mat={mat.polat} />)}
      <Quti o={[0.72, 0.08, 0.1]} p={[0, 2.38, 0.72]} mat={mat.polatQora} />
      <Silindr r={0.04} h={2.0} p={[0, 1.1, 0.66]} mat={mat.polat} seg={10} />
      </StatikGuruh>
      <mesh ref={mayoq} position={[0.38, 2.33, -0.65]} material={mat.mayoq}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 14]} />
      </mesh>
      {/* Haydovchi (o'tirgan) */}
      <Ishchi mat={mat} p={[0, 0.15, -0.38]} harakat="rul" ishlayapti turi={2} />
      {/* G'ildiraklar (disk bilan) */}
      <group ref={goldiraklar}>
        {[[-0.56, 0.38, 0.27], [0.56, 0.38, 0.27], [-0.56, -0.72, 0.22], [0.56, -0.72, 0.22]].map(([a, c, r]) => (
          <group key={`${a}${c}`} position={[a, r, c]}>
            <Silindr r={r} h={0.2} p={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={mat.rezina} seg={20} />
            <Silindr r={r * 0.55} h={0.21} p={[0, 0, 0]} rot={[0, 0, Math.PI / 2]} mat={mat.polat} seg={16} />
          </group>
        ))}
      </group>
      {/* Vilkalar */}
      <group ref={vilka} position={[0, 0.12, 0]}>
        <Quti o={[0.8, 0.5, 0.06]} p={[0, 0.25, 0.82]} mat={mat.polatQora} />
        <Quti o={[0.1, 0.045, 1.1]} p={[-0.25, 0, 1.38]} mat={mat.polat} />
        <Quti o={[0.1, 0.045, 1.1]} p={[0.25, 0, 1.38]} mat={mat.polat} />
        <group ref={yuk}>
          <Quti o={[1.2, 0.12, 1.0]} p={[0, 0.09, 1.4]} mat={mat.palet} />
          {yukTuri === "list"
            ? Array.from({ length: 8 }, (_, i) => <Quti key={i} o={[1.15, 0.03, 0.95]} p={[0, 0.17 + i * 0.033, 1.4]} mat={[mat.lmdp, mat.lmdpOq, mat.lmdpYongoq][i % 3]} />)
            : (
              <>
                <Quti o={[1.1, 0.7, 0.9]} p={[0, 0.5, 1.4]} mat={mat.karton} />
                <Quti o={[1.14, 0.74, 0.94]} p={[0, 0.5, 1.4]} mat={mat.plyonka} />
              </>
            )}
        </group>
      </group>
    </group>
  );
}

/** Pogruzchik (forklift) LDSP to'plami bilan: ko'ndalang yo'lak bo'ylab borib-keladi, vilkalarini ko'taradi/tushiradi. */
export function Pogruzchik({ mat, x, yol, faza = 0 }: { mat: Materiallar; x: number; yol: [number, number]; faza?: number }) {
  const ildiz = useRef<THREE.Group>(null);
  const vilka = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const t = performance.now() / 1000 + faza;
    const davr = 26;
    const f = (t % davr) / davr;
    // Yo'l: borish (0–0.4), to'xtab yuk ko'tarish (0.4–0.5), qaytish (0.5–0.9), to'xtash (0.9–1)
    let ulush = 0;
    let harakat = 0;
    if (f < 0.4) { ulush = f / 0.4; harakat = 1; }
    else if (f < 0.5) { ulush = 1; }
    else if (f < 0.9) { ulush = 1 - (f - 0.5) / 0.4; harakat = -1; }
    const silliq = ulush * ulush * (3 - 2 * ulush);
    if (ildiz.current) ildiz.current.position.set(x, 0, yol[0] + (yol[1] - yol[0]) * silliq);
    if (vilka.current) {
      const kotarish = f >= 0.4 && f < 0.5 ? Math.sin(((f - 0.4) / 0.1) * Math.PI) : 0;
      vilka.current.position.y = 0.12 + kotarish * 0.5;
    }
    goldiraklar.current?.children.forEach((g) => { g.rotation.x += dt * harakat * 3; });
  });
  return (
    <group ref={ildiz}>
      <PogruzchikModeli mat={mat} vilka={vilka} goldiraklar={goldiraklar} />
    </group>
  );
}
