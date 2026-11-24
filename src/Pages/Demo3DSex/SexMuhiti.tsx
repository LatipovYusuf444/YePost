import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import { DEMO_SEX_NS } from "./matnlar";
import { SEX_CHUQURLIGI, SEX_ENI, type Materiallar } from "./materiallar";
import { Quti, Silindr } from "./shakllar";
import type { StanokTavsifi } from "./sexModeli";

// Sex muhiti: beton pol, yo'laklar, devorlar va derazalar, darvoza, ustunlar, chang so'rish tizimi, elektr shkaflar, o't o'chirgichlar,
// usta xonasi, material ombori va tayyor mahsulot zonasi. Hammasi kod bilan (tashqi model/tekstura fayli yo'q).

const ZONA_Z = [9, 0];
const ZONA_USLUBI = { pointerEvents: "none" } as const;
const DEVOR_Z = -SEX_CHUQURLIGI / 2;
const DEVOR_X = -SEX_ENI / 2;
const QUVUR_Y = 4.4;

function ZonaYorligi({ p, matn, rang }: { p: [number, number, number]; matn: string; rang: string }) {
  return (
    <Html position={p} center zIndexRange={ZONA_Z} style={ZONA_USLUBI}>
      <span className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px] font-black uppercase tracking-wide text-white shadow" style={{ background: rang }}>{matn}</span>
    </Html>
  );
}

/** Ustun: po'lat, pastida sariq-qora xavf chizig'i, ba'zilarida o't o'chirgich va ogohlantirish belgisi. */
function Ustun({ mat, x, z, otOchirgich }: { mat: Materiallar; x: number; z: number; otOchirgich?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <Quti o={[0.4, 5.2, 0.4]} p={[0, 2.6, 0]} mat={mat.ustun} />
      {[0, 1, 2, 3].map((i) => <Quti key={i} o={[0.42, 0.15, 0.42]} p={[0, 0.08 + i * 0.3, 0]} mat={i % 2 ? mat.qora : mat.sariq} />)}
      {otOchirgich && (
        <group position={[0, 0, 0.26]}>
          <Silindr r={0.08} h={0.42} p={[0, 1.15, 0]} mat={mat.qizil} seg={16} />
          <Silindr r={0.03} h={0.08} p={[0, 1.4, 0]} mat={mat.qora} seg={8} />
          <Quti o={[0.3, 0.3, 0.02]} p={[0, 1.75, -0.04]} mat={mat.qizil} />
          <Quti o={[0.26, 0.26, 0.025]} p={[0, 2.15, -0.04]} r={[0, 0, Math.PI / 4]} mat={mat.ogohlantirish} />
        </group>
      )}
    </group>
  );
}

/** Chang so'rish quvuri: magistraldan stanok ustigacha gorizontal, keyin vertikal tushadi. */
function TushuvchiQuvur({ mat, x, zMagistral, zStanok, yPast }: { mat: Materiallar; x: number; zMagistral: number; zStanok: number; yPast: number }) {
  const uzunlik = Math.abs(zStanok - zMagistral);
  const markaz = (zStanok + zMagistral) / 2;
  return (
    <group>
      <Silindr r={0.13} h={uzunlik} p={[x, QUVUR_Y, markaz]} rot={[Math.PI / 2, 0, 0]} mat={mat.oluk} seg={16} />
      <mesh position={[x, QUVUR_Y, zStanok]} material={mat.oluk} castShadow>
        <sphereGeometry args={[0.14, 14, 10]} />
      </mesh>
      <Silindr r={0.11} h={QUVUR_Y - yPast} p={[x, (QUVUR_Y + yPast) / 2, zStanok]} mat={mat.oluk} seg={16} />
      {/* Egiluvchan shlang uchi */}
      <Silindr r={0.12} h={0.35} p={[x, yPast + 0.05, zStanok]} mat={mat.rezina} seg={14} />
    </group>
  );
}

export default function SexMuhiti({ mat, stanoklar }: { mat: Materiallar; stanoklar: StanokTavsifi[] }) {
  const { t } = useTranslation(DEMO_SEX_NS);
  const varaqlar = useMemo(() => [mat.lmdp, mat.lmdpOq, mat.lmdpYongoq, mat.lmdpKul], [mat]);
  return (
    <group>
      {/* Beton pol (tekstura kod bilan chizilgan) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mat.pol}>
        <planeGeometry args={[SEX_ENI, SEX_CHUQURLIGI]} />
      </mesh>

      {/* Markaziy yo'lak: bo'yalgan yashil qatlam, sariq chegaralar, oq yo'nalish o'qlari va piyoda o'tish joyi */}
      <Quti o={[SEX_ENI - 6, 0.004, 2.1]} p={[-1, 0.003, 0.1]} mat={mat.yolakYashil} />
      {[-0.95, 1.15].map((z) => <Quti key={z} o={[SEX_ENI - 6, 0.01, 0.12]} p={[-1, 0.006, z]} mat={mat.sariq} />)}
      {[-11, -6, -1, 4, 8].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} position={[x, 0.009, 0.1]} material={mat.oq}>
          <circleGeometry args={[0.42, 3]} />
        </mesh>
      ))}
      {Array.from({ length: 6 }, (_, i) => <Quti key={`zebra${i}`} o={[0.28, 0.011, 1.7]} p={[2.2 + i * 0.5, 0.008, 0.1]} mat={mat.oq} />)}
      {/* Ko'ndalang yo'lak (o'ngda, pogruzchik uchun) */}
      <Quti o={[2.0, 0.004, SEX_CHUQURLIGI - 4]} p={[11.6, 0.003, 0]} mat={mat.yolakYashil} />
      {[10.6, 12.6].map((x) => <Quti key={x} o={[0.12, 0.01, SEX_CHUQURLIGI - 4]} p={[x, 0.006, 0]} mat={mat.sariq} />)}

      {/* Orqa devor: sendvich-panel, pastki qismi to'q, yorug' derazalar */}
      <Quti o={[SEX_ENI, 6, 0.3]} p={[0, 3, DEVOR_Z]} mat={mat.devor} />
      <Quti o={[SEX_ENI, 1.2, 0.32]} p={[0, 0.6, DEVOR_Z + 0.01]} mat={mat.devorPast} />
      {Array.from({ length: 8 }, (_, i) => (
        <group key={`d${i}`} position={[-14.5 + i * 4.1, 4.1, DEVOR_Z + 0.17]}>
          <Quti o={[3.0, 1.5, 0.04]} p={[0, 0, 0]} mat={mat.derazaYorugi} />
          <Quti o={[0.05, 1.5, 0.06]} p={[0, 0, 0.02]} mat={mat.polatQora} />
          <Quti o={[3.0, 0.05, 0.06]} p={[0, 0, 0.02]} mat={mat.polatQora} />
        </group>
      ))}
      {/* Chap devor: derazalar va ko'tariluvchi darvoza (xavf chiziqli rom) */}
      <Quti o={[0.3, 6, SEX_CHUQURLIGI]} p={[DEVOR_X, 3, 0]} mat={mat.devor} />
      <Quti o={[0.32, 1.2, SEX_CHUQURLIGI]} p={[DEVOR_X + 0.01, 0.6, 0]} mat={mat.devorPast} />
      <group position={[DEVOR_X + 0.18, 0, 0.1]}>
        {Array.from({ length: 22 }, (_, i) => <Quti key={i} o={[0.05, 0.16, 4.0]} p={[0, 0.1 + i * 0.18, 0]} mat={i % 2 ? mat.shkaf : mat.oluk} />)}
        {[-2.1, 2.1].map((z) => Array.from({ length: 8 }, (_, i) => <Quti key={`${z}${i}`} o={[0.07, 0.5, 0.2]} p={[0, 0.25 + i * 0.5, z]} mat={i % 2 ? mat.qora : mat.sariq} />))}
        <Quti o={[0.08, 0.3, 4.4]} p={[0, 4.15, 0]} mat={mat.korpusQora} />
      </group>
      {[-7, 7].map((z) => <Quti key={`cd${z}`} o={[0.04, 1.5, 2.8]} p={[DEVOR_X + 0.17, 4.1, z]} mat={mat.derazaYorugi} />)}
      {/* Old va o'ng chetlar: past bordyur (sex ichi ko'rinib turishi uchun devor qirqilgan) */}
      <Quti o={[SEX_ENI, 0.25, 0.25]} p={[0, 0.125, -DEVOR_Z]} mat={mat.devorPast} />
      <Quti o={[0.25, 0.25, SEX_CHUQURLIGI]} p={[-DEVOR_X, 0.125, 0]} mat={mat.devorPast} />

      {/* Ustunlar (ba'zilarida o't o'chirgich va ogohlantirish belgisi) */}
      {[-11, -5.5, 0, 5.5, 11].flatMap((x, i) => [-7.6, 7.6].map((z, j) => <Ustun key={`${x}${z}`} mat={mat} x={x} z={z} otOchirgich={(i + j) % 2 === 0} />))}
      {/* Ustunlar orasidagi tom to'sinlari faqat devor bo'ylab (yuqoridan ko'rinishni to'smaydi) */}
      <Quti o={[SEX_ENI, 0.35, 0.25]} p={[0, 5.6, DEVOR_Z + 0.4]} mat={mat.polatQora} />

      {/* Elektr shkaflar va asboblar stoli (orqa devor bo'ylab) */}
      {[-9.5, -8.7, -7.9].map((x) => (
        <group key={x} position={[x, 0, DEVOR_Z + 0.45]}>
          <Quti o={[0.75, 1.9, 0.45]} p={[0, 0.95, 0]} mat={mat.shkaf} />
          <Quti o={[0.04, 0.25, 0.03]} p={[0.25, 1.0, 0.24]} mat={mat.qora} />
          <Quti o={[0.18, 0.18, 0.02]} p={[0, 1.55, 0.235]} r={[0, 0, Math.PI / 4]} mat={mat.ogohlantirish} />
        </group>
      ))}
      <group position={[-3.2, 0, DEVOR_Z + 0.55]}>
        <Quti o={[2.4, 0.06, 0.8]} p={[0, 0.9, 0]} mat={mat.lmdp} />
        <Quti o={[2.4, 0.8, 0.7]} p={[0, 0.45, 0]} mat={mat.korpusQora} />
        <Quti o={[2.4, 1.0, 0.04]} p={[0, 1.55, -0.35]} mat={mat.shkaf} />
        {Array.from({ length: 7 }, (_, i) => <Quti key={i} o={[0.06, 0.25 + (i % 3) * 0.08, 0.04]} p={[-1.0 + i * 0.33, 1.6, -0.31]} mat={i % 2 ? mat.qizil : mat.polatQora} />)}
      </group>
      {/* Chiqindi idishlari */}
      {[[-6.2, "#2563eb"], [-5.5, "#16a34a"]].map(([x, rang]) => (
        <mesh key={String(x)} position={[Number(x), 0.45, DEVOR_Z + 0.6]} castShadow>
          <cylinderGeometry args={[0.32, 0.28, 0.9, 18]} />
          <meshStandardMaterial color={String(rang)} roughness={0.6} />
        </mesh>
      ))}

      {/* Chang so'rish tizimi: siklon-filtr (o'ng-orqa burchak), magistral quvur va har stanokka tushuvchi quvurlar */}
      <group position={[14.6, 0, -8.2]}>
        <Silindr r={1.0} h={3.4} p={[0, 3.6, 0]} mat={mat.oluk} seg={28} />
        <mesh position={[0, 1.4, 0]} rotation={[Math.PI, 0, 0]} material={mat.oluk} castShadow>
          <coneGeometry args={[1.0, 1.4, 28]} />
        </mesh>
        <Silindr r={0.35} h={0.7} p={[0, 0.35, 0]} mat={mat.qadoqRang} />
        {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.12, 5.3, 0.12]} p={[a, 2.65, b]} mat={mat.polatQora} />)}
      </group>
      <Silindr r={0.26} h={26} p={[0.6, QUVUR_Y, DEVOR_Z + 1.1]} rot={[0, 0, Math.PI / 2]} mat={mat.oluk} seg={20} />
      {[-12.4, -6.2, 0, 6.2, 12.4].map((x) => <Quti key={`il${x}`} o={[0.06, 0.06, 1.0]} p={[x, QUVUR_Y + 0.3, DEVOR_Z + 0.6]} mat={mat.polatQora} />)}
      {stanoklar.map((stanok) => (
        <TushuvchiQuvur key={stanok.id} mat={mat} x={stanok.joy[0] + (stanok.tur === "kesish" ? 0.7 : stanok.tur === "qirra" ? -0.6 : 0)} zMagistral={DEVOR_Z + 1.1} zStanok={stanok.joy[1] + (stanok.burilish ? 0.25 : -0.35)} yPast={stanok.tur === "qadoqlash" ? 2.6 : 2.25} />
      ))}

      {/* Usta xonasi (o'ng-old burchak): shisha devorlar, stol, monitor, stul */}
      <group position={[14.2, 0, 7.4]}>
        {/* Tomsiz (ichi yuqoridan ko'rinsin): faqat yuqori rom */}
        <Quti o={[4.2, 0.08, 0.08]} p={[0, 2.8, -1.7]} mat={mat.polatQora} />
        <Quti o={[0.08, 0.08, 3.4]} p={[-2.1, 2.8, 0]} mat={mat.polatQora} />
        <Quti o={[4.2, 2.8, 0.06]} p={[0, 1.4, -1.7]} mat={mat.oyna} />
        <Quti o={[0.06, 2.8, 3.4]} p={[-2.1, 1.4, 0]} mat={mat.oyna} />
        <Quti o={[4.2, 0.9, 0.08]} p={[0, 0.45, -1.7]} mat={mat.shkaf} />
        <Quti o={[0.08, 0.9, 3.4]} p={[-2.1, 0.45, 0]} mat={mat.shkaf} />
        {[[-2.1, -1.7], [2.1, -1.7], [-2.1, 1.7]].map(([a, b]) => <Quti key={`${a}${b}`} o={[0.1, 2.8, 0.1]} p={[a, 1.4, b]} mat={mat.polatQora} />)}
        <Quti o={[1.6, 0.05, 0.75]} p={[0, 0.76, -0.9]} mat={mat.lmdpYongoq} />
        <Quti o={[0.55, 0.35, 0.04]} p={[0, 1.02, -1.1]} mat={mat.ekran} />
        <Quti o={[0.5, 0.08, 0.5]} p={[0, 0.48, -0.2]} mat={mat.qora} />
        <Quti o={[0.5, 0.5, 0.08]} p={[0, 0.78, 0.02]} mat={mat.qora} />
      </group>

      {/* Material ombori: stellajlar va LDSP listlar to'plami */}
      <group position={[-13.3, 0, -4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <planeGeometry args={[5, 7.2]} />
          <meshStandardMaterial color="#bfdbfe" roughness={0.9} transparent opacity={0.75} />
        </mesh>
        {[-2.2, 0, 2.2].map((z) => (
          <group key={z} position={[0, 0, z]}>
            {[0, 1].map((qavat) => <Quti key={qavat} o={[2.9, 0.06, 1.4]} p={[0, 0.1 + qavat * 1.3, 0]} mat={mat.polatQora} />)}
            {[-1.4, 1.4].map((x) => <Quti key={x} o={[0.08, 2.5, 0.08]} p={[x, 1.25, -0.65]} mat={mat.stellaj} />)}
            {[-1.4, 1.4].map((x) => <Quti key={`o${x}`} o={[0.08, 2.5, 0.08]} p={[x, 1.25, 0.65]} mat={mat.stellaj} />)}
            {[0, 1].map((qavat) =>
              Array.from({ length: 6 }, (_, i) => (
                <Quti key={`${qavat}${i}`} o={[2.75, 0.03, 1.25]} p={[0, 0.15 + qavat * 1.3 + i * 0.035, 0]} mat={varaqlar[(i + qavat + Math.round(z)) % varaqlar.length]} />
              ))
            )}
          </group>
        ))}
      </group>
      <ZonaYorligi p={[-13.3, 3.2, -4]} matn={t("zones.material")} rang="#1d4ed8" />

      {/* Tayyor mahsulot zonasi: paletlar, o'ralgan qutilar */}
      <group position={[-12.8, 0, 4.6]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#bbf7d0" roughness={0.9} transparent opacity={0.75} />
        </mesh>
        {[[-1.6, -1.5], [0, -1.5], [1.6, -1.5], [-1.6, 1.2], [0, 1.2], [1.6, 1.2]].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <Quti o={[1.2, 0.14, 1.0]} p={[0, 0.07, 0]} mat={mat.palet} />
            <Quti o={[1.1, 0.4 + (i % 3) * 0.25, 0.9]} p={[0, 0.34 + (i % 3) * 0.125, 0]} mat={mat.karton} />
            <Quti o={[1.14, 0.44 + (i % 3) * 0.25, 0.94]} p={[0, 0.36 + (i % 3) * 0.125, 0]} mat={mat.plyonka} />
          </group>
        ))}
      </group>
      <ZonaYorligi p={[-12.8, 2.4, 4.6]} matn={t("zones.finished")} rang="#15803d" />

      {/* Stanoklar orasidagi aravachalar va list paletlari (oraliq bufer) */}
      {[[-3.3, -1.9], [3.4, -1.9], [3.4, 2.4], [-3.3, 2.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Quti o={[1.1, 0.05, 0.7]} p={[0, 0.4, 0]} mat={mat.polatQora} />
          {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([a, b]) => <Silindr key={`${a}${b}`} r={0.05} h={0.04} p={[a, 0.05, b]} rot={[Math.PI / 2, 0, 0]} mat={mat.rezina} />)}
          {[-0.5, 0.5].map((a) => <Quti key={a} o={[0.03, 0.36, 0.03]} p={[a, 0.22, 0]} mat={mat.polatQora} />)}
          {Array.from({ length: 4 + i }, (_, k) => <Quti key={k} o={[0.9, 0.018, 0.55]} p={[0, 0.44 + k * 0.02, 0]} mat={varaqlar[(i + k) % varaqlar.length]} />)}
        </group>
      ))}
      {[[-9.6, -6.6], [3.2, -7.0], [9.8, -6.6]].map(([x, z], i) => (
        <group key={`p${i}`} position={[x, 0, z]}>
          <Quti o={[2.0, 0.14, 1.3]} p={[0, 0.07, 0]} mat={mat.palet} />
          {Array.from({ length: 10 + i * 4 }, (_, k) => <Quti key={k} o={[1.95, 0.018, 1.25]} p={[0, 0.16 + k * 0.02, 0]} mat={varaqlar[(i + k) % varaqlar.length]} />)}
        </group>
      ))}
    </group>
  );
}
