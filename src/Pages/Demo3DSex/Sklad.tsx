import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import type { Materiallar } from "./materiallar";
import { Quti, Silindr, StatikGuruh, Yumaloq } from "./shakllar";
import { PogruzchikModeli } from "./Ishchilar";
import { GlbOdam, YuruvchiGlbOdam } from "./Odamlar";
import { ZonaYorligi } from "./SexMuhiti";
import { SKLAD, TASHISH_QATORLARI } from "./hudud";
import {
  DOK_BALANDLIGI,
  DOK_DARVOZALARI,
  DOK_ENI,
  MUDIR_XONASI,
  RICHTRAK_YOLAGI,
  STELLAJ,
  STELLAJ_SIGIMI,
  STELLAJ_X1,
  TASHISH_DAVRI,
  USTUNLAR_X,
  YIGISH_PALETLARI,
  YOLAKLAR,
  korinadiganPalet,
  paletJoylari,
  tashishHolati,
} from "./skladRejasi";

// Tayyor mahsulot skladi (alohida bino, hududning o'ng tomonida): baland stellajlar (instancing), rampa darvozalari,
// sexdan mahsulot tashiydigan pogruzchiklar, richtrak, ishchilar va sklad mudiri xonasi. Stellajdagi paletlar soni —
// ma'lumotdagi sklad qoldig'i (`palet`). Hammasi kod bilan; odamlar — GLB modellar.

const ORTA_X = (SKLAD.x0 + SKLAD.x1) / 2;
const ENI = SKLAD.x1 - SKLAD.x0;
const CHUQURLIK = SKLAD.z1 - SKLAD.z0;
const ORTA_Z = (SKLAD.z0 + SKLAD.z1) / 2;
const H = SKLAD.balandlik;

/** Sklad uchun qo'shimcha materiallar (to'sin — to'q sariq, seksiyali darvoza, rezina germetik, sprinkler quvuri). */
function useSkladMateriallari() {
  const mat = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...extra });
    return {
      tosin: m("#ea580c", { roughness: 0.45, metalness: 0.35 }),
      darvoza: m("#cbd5e1", { roughness: 0.4, metalness: 0.5 }),
      germetik: m("#111827", { roughness: 0.95 }),
      sprinkler: m("#b91c1c", { roughness: 0.4, metalness: 0.4 }),
      yuk: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }),
      chiroq: m("#f8fafc", { emissive: "#fff7e0", emissiveIntensity: 1.1 }),
      chiziq: m("#facc15", { roughness: 0.7 }),
      oqChiziq: m("#f1f5f9", { roughness: 0.7 }),
    };
  }, []);
  useEffect(() => () => Object.values(mat).forEach((x) => x.dispose()), [mat]);
  return mat;
}
type SkladMateriallari = ReturnType<typeof useSkladMateriallari>;

// ── Bino ──

function Bino({ m, sk }: { m: Materiallar; sk: SkladMateriallari }) {
  const kirishZ0 = SKLAD.kirishZ - SKLAD.kirishEni / 2;
  const kirishZ1 = SKLAD.kirishZ + SKLAD.kirishEni / 2;
  const KIRISH_H = 4.5;
  // Old devor bo'laklari (dok darvozalari orasida).
  const oldBolaklar = useMemo(() => {
    const ochiqlar = DOK_DARVOZALARI.map((d) => [d.x - DOK_ENI / 2, d.x + DOK_ENI / 2] as const);
    const bolaklar: Array<[number, number]> = [];
    let bosh: number = SKLAD.x0;
    for (const [a, c] of ochiqlar) {
      if (a > bosh) bolaklar.push([bosh, a]);
      bosh = c;
    }
    if (bosh < SKLAD.x1) bolaklar.push([bosh, SKLAD.x1]);
    return bolaklar;
  }, []);
  return (
    <StatikGuruh>
      {/* Pol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ORTA_X, 0.004, ORTA_Z]} material={m.pol} receiveShadow>
        <planeGeometry args={[ENI, CHUQURLIK]} />
      </mesh>
      {/* Yo'lak chiziqlari (sariq) va yig'ish maydoni chegarasi (oq) */}
      {YOLAKLAR.flatMap((y, i) => [y.z0 + 0.12, y.z1 - 0.12].map((z) => <Quti key={`${i}${z}`} o={[STELLAJ_X1 - STELLAJ.x0, 0.01, 0.1]} p={[(STELLAJ.x0 + STELLAJ_X1) / 2, 0.01, z]} mat={sk.chiziq} />))}
      <Quti o={[ENI - 2, 0.01, 0.12]} p={[ORTA_X, 0.01, -4.4]} mat={sk.chiziq} />
      {[0.4, 5.4].map((z) => <Quti key={z} o={[20, 0.01, 0.1]} p={[97, 0.01, z]} mat={sk.oqChiziq} />)}
      {/* Orqa devor: sendvich-panel, pastki tasma, yuqorida deraza tasmasi */}
      <Quti o={[ENI, H, 0.3]} p={[ORTA_X, H / 2, SKLAD.z0]} mat={m.devor} />
      <Quti o={[ENI, 1.2, 0.32]} p={[ORTA_X, 0.6, SKLAD.z0 + 0.01]} mat={m.devorPast} />
      <Quti o={[ENI - 2, 1.1, 0.06]} p={[ORTA_X, H - 1.7, SKLAD.z0 + 0.17]} mat={m.derazaYorugi} />
      {/* G'arbiy devor (sexdan mahsulot kiradigan darvoza bilan) */}
      <Quti o={[0.3, H, kirishZ0 - SKLAD.z0]} p={[SKLAD.x0, H / 2, (SKLAD.z0 + kirishZ0) / 2]} mat={m.devor} />
      <Quti o={[0.3, H, SKLAD.z1 - kirishZ1]} p={[SKLAD.x0, H / 2, (kirishZ1 + SKLAD.z1) / 2]} mat={m.devor} />
      <Quti o={[0.3, H - KIRISH_H, SKLAD.kirishEni]} p={[SKLAD.x0, (H + KIRISH_H) / 2, SKLAD.kirishZ]} mat={m.devor} />
      <Quti o={[0.32, 1.2, kirishZ0 - SKLAD.z0]} p={[SKLAD.x0 + 0.01, 0.6, (SKLAD.z0 + kirishZ0) / 2]} mat={m.devorPast} />
      {[kirishZ0, kirishZ1].map((z) => Array.from({ length: 9 }, (_, i) => <Quti key={`${z}${i}`} o={[0.36, 0.5, 0.18]} p={[SKLAD.x0, 0.25 + i * 0.5, z]} mat={i % 2 ? m.qora : m.sariq} />))}
      <Quti o={[0.5, 0.4, SKLAD.kirishEni + 0.4]} p={[SKLAD.x0 + 0.3, KIRISH_H + 0.2, SKLAD.kirishZ]} mat={m.korpusQora} />
      {/* Sharqiy devor past (kamera tomoni — ichi ko'rinadi) */}
      <Quti o={[0.3, 1.2, CHUQURLIK]} p={[SKLAD.x1, 0.6, ORTA_Z]} mat={m.devorPast} />
      {/* Old devor: dok darvozalarigacha (5.5 m), darvozalar ustida to'sin */}
      {oldBolaklar.map(([a, c]) => <Quti key={a} o={[c - a, SKLAD.oldDevor, 0.3]} p={[(a + c) / 2, SKLAD.oldDevor / 2, SKLAD.z1]} mat={m.devor} />)}
      {DOK_DARVOZALARI.map(({ x, ochiq }) => (
        <group key={x} position={[x, 0, SKLAD.z1]}>
          <Quti o={[DOK_ENI, SKLAD.oldDevor - DOK_BALANDLIGI, 0.3]} p={[0, (SKLAD.oldDevor + DOK_BALANDLIGI) / 2, 0]} mat={m.devor} />
          {/* Dok germetigi (qora rezina) va bamperlar */}
          {[-1, 1].map((yon) => <Quti key={yon} o={[0.35, DOK_BALANDLIGI + 0.4, 0.6]} p={[yon * (DOK_ENI / 2 + 0.17), (DOK_BALANDLIGI + 0.4) / 2, 0.45]} mat={sk.germetik} />)}
          <Quti o={[DOK_ENI + 0.7, 0.5, 0.6]} p={[0, DOK_BALANDLIGI + 0.4, 0.45]} mat={sk.germetik} />
          {[-1, 1].map((yon) => <Quti key={`b${yon}`} o={[0.3, 0.45, 0.25]} p={[yon * 1.15, 0.6, 0.3]} mat={m.ogohlantirish} />)}
          {/* Dok chirog'i */}
          <Quti o={[0.06, 0.06, 0.7]} p={[DOK_ENI / 2 + 0.6, 2.8, 0.45]} mat={m.korpusQora} />
          <Quti o={[0.25, 0.18, 0.18]} p={[DOK_ENI / 2 + 0.6, 2.75, 0.8]} mat={sk.chiroq} />
          {ochiq ? (
            // Ko'tarilgan darvoza (yuqorida o'ralgan)
            <Quti o={[DOK_ENI, 0.35, 0.35]} p={[0, DOK_BALANDLIGI - 0.1, -0.35]} mat={sk.darvoza} />
          ) : (
            <>
              <Quti o={[DOK_ENI, DOK_BALANDLIGI, 0.08]} p={[0, DOK_BALANDLIGI / 2, -0.05]} mat={sk.darvoza} />
              {Array.from({ length: 5 }, (_, i) => <Quti key={i} o={[DOK_ENI, 0.03, 0.1]} p={[0, 0.72 * (i + 1), -0.05]} mat={m.polatQora} />)}
            </>
          )}
        </group>
      ))}
      {/* Ustunlar (old va orqa devor bo'ylab) va fermalar (tomsiz — ichi yuqoridan ko'rinadi) */}
      {USTUNLAR_X.flatMap((x) => [SKLAD.z0 + 0.25, SKLAD.z1 - 0.25].map((z) => <Quti key={`${x}${z}`} o={[0.35, H, 0.35]} p={[x, H / 2, z]} mat={m.ustun} />))}
      {USTUNLAR_X.map((x) => (
        <group key={`f${x}`} position={[x, 0, ORTA_Z]}>
          <Quti o={[0.2, 0.2, CHUQURLIK]} p={[0, H + 0.6, 0]} mat={m.polatQora} />
          <Quti o={[0.16, 0.16, CHUQURLIK]} p={[0, H - 0.2, 0]} mat={m.polatQora} />
          {Array.from({ length: 13 }, (_, i) => <Quti key={i} o={[0.1, 0.9, 0.1]} p={[0, H + 0.2, -CHUQURLIK / 2 + (i + 0.5) * (CHUQURLIK / 13)]} r={[i % 2 ? 0.5 : -0.5, 0, 0]} mat={m.polatQora} />)}
        </group>
      ))}
      {Array.from({ length: 9 }, (_, i) => <Quti key={`p${i}`} o={[ENI, 0.14, 0.12]} p={[ORTA_X, H + 0.75, SKLAD.z0 + 1 + i * 4.5]} mat={m.polatQora} />)}
      {/* Sprinkler quvurlari (yong'in o'chirish) va LED yoritkichlar yo'laklar ustida */}
      {YOLAKLAR.map((y, i) => <Silindr key={`s${i}`} r={0.05} h={STELLAJ_X1 - STELLAJ.x0} p={[(STELLAJ.x0 + STELLAJ_X1) / 2, H - 0.6, (y.z0 + y.z1) / 2]} rot={[0, 0, Math.PI / 2]} mat={sk.sprinkler} seg={8} />)}
      {YOLAKLAR.flatMap((y, i) => Array.from({ length: 5 }, (_, k) => <Quti key={`l${i}${k}`} o={[1.2, 0.08, 0.35]} p={[STELLAJ.x0 + 3 + k * 5.6, H - 1, (y.z0 + y.z1) / 2]} mat={sk.chiroq} />))}
      {Array.from({ length: 6 }, (_, k) => <Quti key={`ly${k}`} o={[1.2, 0.08, 0.35]} p={[80 + k * 6.6, H - 1, 6]} mat={sk.chiroq} />)}
      {/* O't o'chirgichlar va evakuatsiya belgilari */}
      {[79, 97, 115].map((x) => (
        <group key={`o${x}`} position={[x, 0, SKLAD.z0 + 0.55]}>
          <Silindr r={0.09} h={0.5} p={[0, 0.6, 0]} mat={m.qizil} seg={12} />
          <Quti o={[0.35, 0.35, 0.02]} p={[0, 1.4, -0.1]} mat={m.qizil} />
        </group>
      ))}
      {/* Yig'ish maydoni: jo'natishga tayyor paletlar va stretch-o'rash mashinasi */}
      {YIGISH_PALETLARI.map(([x, z, q], i) => (
        <group key={`y${i}`} position={[x, 0, z]}>
          {Array.from({ length: q }, (_, k) => (
            <group key={k} position={[0, k * 1.0, 0]}>
              <Quti o={[1.2, 0.14, 1.0]} p={[0, 0.07, 0]} mat={m.palet} />
              <Quti o={[1.12, 0.78, 0.94]} p={[0, 0.53, 0]} mat={m.karton} />
              <Quti o={[1.16, 0.82, 0.98]} p={[0, 0.53, 0]} mat={m.plyonka} />
            </group>
          ))}
        </group>
      ))}
      <group position={[110.6, 0, 4.4]}>
        <Silindr r={0.9} h={0.12} p={[0, 0.06, 0]} mat={m.qadoqRang} seg={32} />
        <Quti o={[0.2, 2.6, 0.2]} p={[1.15, 1.3, 0]} mat={m.qadoqRang} />
        <Quti o={[0.3, 0.35, 0.3]} p={[0.95, 1.4, 0]} mat={m.korpus} />
        <Quti o={[1.2, 0.14, 1.0]} p={[0, 0.19, 0]} mat={m.palet} />
        <Quti o={[1.12, 1.1, 0.94]} p={[0, 0.81, 0]} mat={m.karton} />
      </group>
      {/* Sklad mudiri xonasi (shisha kabina) */}
      <group>
        <Quti o={[MUDIR_XONASI.x1 - MUDIR_XONASI.x0, 0.08, MUDIR_XONASI.z1 - MUDIR_XONASI.z0]} p={[(MUDIR_XONASI.x0 + MUDIR_XONASI.x1) / 2, MUDIR_XONASI.h, (MUDIR_XONASI.z0 + MUDIR_XONASI.z1) / 2]} mat={m.polatQora} />
        <Quti o={[0.06, MUDIR_XONASI.h, MUDIR_XONASI.z1 - MUDIR_XONASI.z0]} p={[MUDIR_XONASI.x0, MUDIR_XONASI.h / 2, (MUDIR_XONASI.z0 + MUDIR_XONASI.z1) / 2]} mat={m.oyna} />
        <Quti o={[MUDIR_XONASI.x1 - MUDIR_XONASI.x0, MUDIR_XONASI.h, 0.06]} p={[(MUDIR_XONASI.x0 + MUDIR_XONASI.x1) / 2, MUDIR_XONASI.h / 2, MUDIR_XONASI.z0]} mat={m.oyna} />
        {[[MUDIR_XONASI.x0, MUDIR_XONASI.z0], [MUDIR_XONASI.x0, MUDIR_XONASI.z1], [MUDIR_XONASI.x1, MUDIR_XONASI.z0]].map(([x, z]) => <Quti key={`${x}${z}`} o={[0.1, MUDIR_XONASI.h, 0.1]} p={[x, MUDIR_XONASI.h / 2, z]} mat={m.polatQora} />)}
        <Quti o={[1.6, 0.05, 0.8]} p={[117.6, 0.76, 9.5]} mat={m.lmdpYongoq} />
        {[[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].map(([dx, dz]) => <Quti key={`${dx}${dz}`} o={[0.05, 0.74, 0.05]} p={[117.6 + dx, 0.37, 9.5 + dz]} mat={m.polatQora} />)}
        <Quti o={[0.04, 0.34, 0.55]} p={[118.1, 1.0, 9.5]} mat={m.ekran} />
        <Yumaloq o={[0.5, 0.08, 0.5]} p={[116.4, 0.47, 9.5]} mat={m.orindiq} radius={0.03} />
        <Yumaloq o={[0.08, 0.55, 0.5]} p={[116.1, 0.78, 9.5]} mat={m.orindiq} radius={0.03} />
        <Quti o={[0.5, 1.8, 0.4]} p={[119.2, 0.9, 6.3]} mat={m.shkaf} />
      </group>
    </StatikGuruh>
  );
}

// ── Stellajlar (instancing): ustunlar, to'sinlar, ko'ndalang bog'lamalar, paletlar ──

function Stellajlar({ m, sk, palet }: { m: Materiallar; sk: SkladMateriallari; palet: number }) {
  const { qismlar, paletTagi, paletYuki } = useMemo(() => {
    const m4 = new THREE.Matrix4();
    const birlik = new THREE.Quaternion();
    const kattalik = new THREE.Vector3(1, 1, 1);
    const joy = new THREE.Vector3();
    const ramalar = STELLAJ.bolimlar + 1;
    const qatorlar = STELLAJ.qatorlarZ.length;
    // Ustunlar: har rama oldi va orqasida
    const ustun = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, STELLAJ.balandlik, 0.1), m.stellaj, qatorlar * ramalar * 2);
    // Ko'ndalang bog'lamalar (rama ichida, chuqurlik bo'ylab)
    const bogSatrlari = [0.5, 2.5, 4.5, 6.5, 8.5];
    const bog = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, STELLAJ.chuqurlik), m.stellaj, qatorlar * ramalar * bogSatrlari.length);
    // To'sinlar (bo'lim bo'ylab, old va orqa)
    const tosin = new THREE.InstancedMesh(new THREE.BoxGeometry(STELLAJ.bolimEni - 0.1, 0.12, 0.06), sk.tosin, qatorlar * STELLAJ.bolimlar * STELLAJ.tosinlar.length * 2);
    let iu = 0;
    let ib = 0;
    let it = 0;
    STELLAJ.qatorlarZ.forEach((z) => {
      for (let r = 0; r < ramalar; r++) {
        const x = STELLAJ.x0 + r * STELLAJ.bolimEni;
        for (const dz of [-STELLAJ.chuqurlik / 2, STELLAJ.chuqurlik / 2]) ustun.setMatrixAt(iu++, m4.compose(joy.set(x, STELLAJ.balandlik / 2, z + dz), birlik, kattalik));
        for (const y of bogSatrlari) bog.setMatrixAt(ib++, m4.compose(joy.set(x, y, z), birlik, kattalik));
      }
      for (let b = 0; b < STELLAJ.bolimlar; b++) {
        const bx = STELLAJ.x0 + (b + 0.5) * STELLAJ.bolimEni;
        for (const y of STELLAJ.tosinlar) for (const dz of [-STELLAJ.chuqurlik / 2, STELLAJ.chuqurlik / 2]) tosin.setMatrixAt(it++, m4.compose(joy.set(bx, y, z + dz), birlik, kattalik));
      }
    });
    // Paletlar: tag (yog'och) va yuk (karton / o'ralgan mebel; rangi har xil)
    const joylar = paletJoylari();
    const paletTagi = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.14, 1.0), m.palet, STELLAJ_SIGIMI);
    const paletYuki = new THREE.InstancedMesh(new THREE.BoxGeometry(1.12, 1.3, 0.95), sk.yuk, STELLAJ_SIGIMI);
    const ranglar = ["#c8a06e", "#d6b48a", "#e8e2d6", "#b9cfe0"].map((c) => new THREE.Color(c));
    joylar.forEach((j, i) => {
      paletTagi.setMatrixAt(i, m4.compose(joy.set(j.x, j.y + 0.07, j.z), birlik, kattalik));
      paletYuki.setMatrixAt(i, m4.compose(joy.set(j.x, j.y + 0.14 + 0.65 * (j.y > 0 ? 1 : 1.05), j.z), birlik, kattalik));
      paletYuki.setColorAt(i, ranglar[j.rang]);
    });
    const hammasi = [ustun, bog, tosin, paletTagi, paletYuki];
    for (const im of hammasi) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
    }
    return { qismlar: hammasi, paletTagi, paletYuki };
  }, [m, sk]);
  useEffect(() => () => qismlar.forEach((im) => { im.geometry.dispose(); im.dispose(); }), [qismlar]);
  // Ko'rinadigan paletlar soni = sklad qoldig'i
  useEffect(() => {
    const n = korinadiganPalet(palet);
    paletTagi.count = n;
    paletYuki.count = n;
  }, [palet, paletTagi, paletYuki]);
  return (
    <>
      {qismlar.map((im, i) => <primitive key={i} object={im} />)}
    </>
  );
}

// ── Harakatlanuvchi texnika ──

/** Sexdan skladga tayyor mahsulot tashiydigan pogruzchik: sex tomonida yuk oladi, sklad ichida tushiradi, orqaga qaytadi. */
function TashuvchiPogruzchik({ m, qator, faza }: { m: Materiallar; qator: (typeof TASHISH_QATORLARI)[number]; faza: number }) {
  const ildiz = useRef<THREE.Group>(null);
  const vilka = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  const yuk = useRef<THREE.Group>(null);
  const oldingi = useRef(0);
  useFrame(() => {
    const h = tashishHolati(performance.now() / 1000 + faza * TASHISH_DAVRI);
    const x = qator.x0 + (qator.x1 - qator.x0) * h.u;
    ildiz.current?.position.set(x, 0, qator.z);
    if (vilka.current) vilka.current.position.y = 0.12 + h.vilka * 0.4;
    if (yuk.current) yuk.current.visible = h.yuk;
    const d = x - oldingi.current;
    oldingi.current = x;
    if (Math.abs(d) < 1) goldiraklar.current?.children.forEach((g) => { g.rotation.x += d / 0.25; });
  });
  return (
    <group ref={ildiz} position={[qator.x0, 0, qator.z]} rotation={[0, Math.PI / 2, 0]}>
      <PogruzchikModeli mat={m} vilka={vilka} goldiraklar={goldiraklar} yuk={yuk} yukTuri="karton" />
    </group>
  );
}

/** Richtrak: o'rta yo'lakda yuradi, to'xtab stellajga buriladi, vilkasini ko'tarib-tushiradi. */
function Richtrak({ m }: { m: Materiallar }) {
  const ildiz = useRef<THREE.Group>(null);
  const tana = useRef<THREE.Group>(null);
  const vilka = useRef<THREE.Group>(null);
  const goldiraklar = useRef<THREE.Group>(null);
  const yuk = useRef<THREE.Group>(null);
  useFrame(() => {
    const davr = 34;
    const t = (performance.now() / 1000) % davr;
    const silliq = (u: number) => u * u * (3 - 2 * u);
    const { x0, x1, z } = RICHTRAK_YOLAGI;
    const nishon = x0 + (x1 - x0) * 0.62;
    let x = x0;
    let burilish = 0;
    let kotarish = 0;
    if (t < 8) x = x0 + (nishon - x0) * silliq(t / 8);
    else if (t < 26) {
      x = nishon;
      const l = t - 8;
      burilish = l < 2 ? silliq(l / 2) : l > 16 ? 1 - silliq((l - 16) / 2) : 1;
      kotarish = l < 2 || l > 16 ? 0 : l < 7 ? silliq((l - 2) / 5) : l < 11 ? 1 : 1 - silliq((l - 11) / 5);
    } else x = nishon + (x0 - nishon) * silliq(Math.min(1, (t - 26) / 7));
    ildiz.current?.position.set(x, 0, z);
    if (tana.current) tana.current.rotation.y = Math.PI / 2 - burilish * (Math.PI / 2);
    if (vilka.current) vilka.current.position.y = 0.12 + kotarish * 2.0;
    if (yuk.current) yuk.current.visible = t > 15 && t < 30;
  });
  return (
    <group ref={ildiz} position={[RICHTRAK_YOLAGI.x0, 0, RICHTRAK_YOLAGI.z]}>
      <group ref={tana} rotation={[0, Math.PI / 2, 0]} scale={0.95}>
        <PogruzchikModeli mat={m} vilka={vilka} goldiraklar={goldiraklar} yuk={yuk} yukTuri="karton" />
      </group>
    </group>
  );
}

/** Tayyor mahsulot skladi: bino, stellajlar (paletlar soni — `palet`), tashuvchi pogruzchiklar, richtrak, odamlar, yorliq. */
export default function Sklad({ m, palet }: { m: Materiallar; palet: number }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const sk = useSkladMateriallari();
  return (
    <group>
      <Bino m={m} sk={sk} />
      <Stellajlar m={m} sk={sk} palet={palet} />
      {TASHISH_QATORLARI.map((qator, i) => <TashuvchiPogruzchik key={qator.z} m={m} qator={qator} faza={i * 0.5} />)}
      <Richtrak m={m} />
      <Suspense fallback={null}>
        <YuruvchiGlbOdam tur="ishchi" nuqtalar={[[78.5, -3.4], [110, -3.4]]} tezlik={1.1} faza={0.25} toxtash={2} toxtashHarakati="ishlash" />
        <GlbOdam tur="ishchi" harakat="ishlash" p={[97.4, 0, 5.4]} burilish={Math.PI} faza={0.4} />
        <GlbOdam tur="ayolOddiy" harakat="ishlash" p={[109.2, 0, 4.4]} burilish={Math.PI / 2} faza={0.7} />
        <GlbOdam tur="xodimErkak" harakat="otirish" p={[116.4, 0, 9.5]} burilish={Math.PI / 2} />
        <GlbOdam tur="biznesmen" harakat="gaplashish" p={[115.2, 0, 12.2]} burilish={Math.PI * 0.75} faza={0.2} />
        <GlbOdam tur="oddiyErkak" harakat="turish" p={[77.2, 0, 7.2]} burilish={-Math.PI / 2} faza={0.5} />
      </Suspense>
      <ZonaYorligi p={[ORTA_X, H + 2.2, ORTA_Z]} matn={t("zones.warehouse")} rang="#0f766e" />
    </group>
  );
}
