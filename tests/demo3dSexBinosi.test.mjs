// 3D Demo — ishlab chiqarish binosi (64 × 30 × 8 m): devor ochiqlari, bordyur uzilishlari, karkas, kran, chang so'rish va jihozlar joyi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARAVACHALAR, ARAVACHA_OLCHAMI, ASBOB_STOLI, BOSH_YOLAKLAR, CHAP_DEVOR_BOLAKLARI, CHAP_ESHIKLAR_Z, CHIQINDI_IDISHLARI, ELEKTR_SHKAFLAR,
  ESHIK_BALANDLIGI, ESHIK_ENI, FERMA, FERMA_X, ICHKI_QATOR_Z, JONATISH_YOLAKLARI, KONDALANG_QUVUR_X, KRAN, LIST_OLCHAMI, MAGISTRAL_R,
  MATERIAL_STELLAJLARI, MATERIAL_TAXLAMLARI, MATERIAL_YOLAKLARI, OLD_BORDYUR_BOLAKLARI, OLD_MAGISTRAL_Z, OLD_RAMPALAR_X, ONG_BORDYUR_BOLAKLARI,
  ORQA_DEVOR_BOLAKLARI, ORQA_MAGISTRAL_Y, ORQA_MAGISTRAL_Z, ORQA_OCHIQ_YOLAKLARI, ORQA_USTUNLAR_X, ORQA_USTUN_Z, PALET_OLCHAMI,
  PORTAL_USTUNLARI_X, PRORAB_XONASI, QUVUR_Y, RAMPA_OCHIGI, SHKAF_ENI, SIKLON, SIKLON_TRUBASI, TARMOQ_TUSHISH_Z, TAYYOR_PALETLAR, USTUN_KESIMI, YONGIN_SHKAFI_X,
  YORDAM_QUTISI_X, bolaklar, kesishadi, kranHolati, magistralZ, ochiqdami, orqaDerazalari, stanokMaydoni, tortburchak, tushishNuqtasi, ustunlar,
} from '../src/Pages/Demo3DSex/sexBinosi.ts';
import { AVTO_SEX, GALEREYA, ORQA_OCHIQLAR, ORQA_OCHIQ_BALANDLIGI, ZONALAR } from '../src/Pages/Demo3DSex/hudud.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const muhit = manba('src/Pages/Demo3DSex/SexMuhiti.tsx');
const reja = manba('src/Pages/Demo3DSex/sexBinosi.ts');

/** Umumiy topshiriqdagi 10 ta stanok: liniya 1 (z −7.5, oldi +z) va liniya 2 (z 7.5, oldi −z). */
const TURLAR = ['kesish', 'cnc', 'qirra', 'burgilash', 'qadoqlash'];
const XLAR = [-15, -5, 5.5, 14.5, 22.5];
const STANOKLAR = [
  ...XLAR.map((x, i) => ({ id: `${TURLAR[i]}-01`, tur: TURLAR[i], joy: [x, -7.5], burilish: 0 })),
  ...XLAR.map((x, i) => ({ id: `${TURLAR[i]}-02`, tur: TURLAR[i], joy: [x, 7.5], burilish: Math.PI })),
];
const MAYDONLAR = STANOKLAR.map(stanokMaydoni);
const yaqin = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('chap devor: ikki darvoza ochig‘i z = −6 va z = 6 da, 4 m × 4.1 m (pardasi Transport.tsx da)', () => {
  assert.deepEqual([...CHAP_ESHIKLAR_Z], [-6, 6]);
  assert.equal(ESHIK_ENI, 4);
  assert.equal(ESHIK_BALANDLIGI, 4.1);
  assert.deepEqual(CHAP_DEVOR_BOLAKLARI, [[-15, -8], [-4, 4], [8, 15]]);
  // Xavf chiziqli romlar va ustki to'sin chiziladi, ochiq bo'sh qoladi (parda yo'q).
  assert.match(muhit, /function DarvozaRomi/);
  assert.match(muhit, /CHAP_ESHIKLAR_Z\.map\(\(z\) => \(/);
  assert.match(muhit, /XavfChizigi/);
  assert.doesNotMatch(muhit, /RolikDarvoza|function \w*Parda/);
});

test('old bordyur rampalar (x = 18.5 va 27.5) ro‘parasida ≈3.6 m uzilgan; o‘ng bordyurda galereya ochig‘i', () => {
  assert.deepEqual([...OLD_RAMPALAR_X], [18.5, 27.5]);
  assert.equal(RAMPA_OCHIGI, 3.6);
  const old = OLD_BORDYUR_BOLAKLARI.map(([a, b]) => [Math.round(a * 100) / 100, Math.round(b * 100) / 100]);
  assert.deepEqual(old, [[-32, 16.7], [20.3, 25.7], [29.3, 32]]);
  for (const x of OLD_RAMPALAR_X) assert.ok(OLD_BORDYUR_BOLAKLARI.every(([a, b]) => x + 1.6 < a || x - 1.6 > b), `rampa ${x} ochiq`);
  assert.deepEqual(ONG_BORDYUR_BOLAKLARI, [[-15, GALEREYA.z0], [GALEREYA.z1, 15]]);
  assert.match(muhit, /OLD_BORDYUR_BOLAKLARI\.map/);
  assert.match(muhit, /ONG_BORDYUR_BOLAKLARI\.map/);
  assert.match(muhit, /function OldRampa/);
});

test('orqa devor: 2-sexga ikki ochiq (x = ±12, 8 × 5.5 m), ochiqda ustun, jihoz va 5.5 m dan past quvur yo‘q', () => {
  assert.deepEqual(ORQA_OCHIQLAR.map((o) => [o.x, o.eni]), [[-12, 8], [12, 8]]);
  assert.deepEqual(ORQA_DEVOR_BOLAKLARI, [[-32, -16], [-8, 8], [16, 32]]);
  // Ochiqlar ichida ustun yo'q; ikki yonida portal ustunlari, kran yo'li konsollari shularga o'rnatiladi
  for (const u of ustunlar().filter((x) => x.z === ORQA_USTUN_Z)) {
    for (const o of ORQA_OCHIQLAR) assert.ok(Math.abs(u.x - o.x) >= o.eni / 2 + USTUN_KESIMI / 2, `ustun x = ${u.x} ochiqda`);
  }
  assert.deepEqual(PORTAL_USTUNLARI_X, [-16.25, -7.75, 7.75, 16.25]);
  for (const x of PORTAL_USTUNLARI_X) assert.ok(ORQA_USTUNLAR_X.includes(x));
  assert.equal(ochiqdami(-12), true);
  assert.equal(ochiqdami(0), false);
  // Ochiqlar oldidagi o'tish yo'laklari bo'sh qoladigan yo'laklar ro'yxatida; stanoklarga tegmaydi
  for (const y of ORQA_OCHIQ_YOLAKLARI) {
    assert.ok(BOSH_YOLAKLAR.includes(y));
    assert.equal(y.z0, -15);
    for (const m of MAYDONLAR) assert.ok(!kesishadi(y, m), 'o‘tish yo‘lagi stanok maydoniga tegmaydi');
    for (const j of jihozlar()) assert.ok(!kesishadi(y, j.t), `${j.nom} o‘tish yo‘lagida`);
  }
  // Chang quvurlari: orqa magistral ochiqlar ustidan (pastki yuzi ≥ 5.5 m), kran relsiga tegmaydi; ko'ndalang quvur va siklon ochiqlarda emas
  assert.ok(ORQA_MAGISTRAL_Y - MAGISTRAL_R >= ORQA_OCHIQ_BALANDLIGI);
  assert.ok(Math.abs(ORQA_MAGISTRAL_Z - KRAN.orqaRelsZ) >= MAGISTRAL_R + 0.15 + 0.1);
  assert.ok(ORQA_MAGISTRAL_Y + MAGISTRAL_R < KRAN.relsY + 0.02, 'kran torets aravasidan pastda');
  // Orqa tarmoqlar o'tish yo'lagi ustidan baland o'tib, kran ilmog'i zonasidan oldin pastga tushadi
  assert.ok(TARMOQ_TUSHISH_Z >= Math.max(...ORQA_OCHIQ_YOLAKLARI.map((y) => y.z1)) - 0.2);
  assert.ok(TARMOQ_TUSHISH_Z + 0.13 < KRAN.aravaZMin - 0.07, 'tirsak kran ilmog‘iga tegmaydi');
  assert.match(muhit, /TARMOQ_TUSHISH_Z/);
  assert.equal(ochiqdami(KONDALANG_QUVUR_X, 0.5), false);
  assert.equal(ochiqdami(SIKLON.x, SIKLON.r + 0.5), false);
  assert.ok(SIKLON_TRUBASI.z < -15 && SIKLON_TRUBASI.z > AVTO_SEX.z0 && SIKLON_TRUBASI.tepa > AVTO_SEX.balandlik, 'siklon trubasi 2-sex tomonida, tomdan yuqori');
  // Ko'chirilgan jihozlar ochiqlardan chetda
  for (const x of [YONGIN_SHKAFI_X, YORDAM_QUTISI_X, ASBOB_STOLI.x, ...ELEKTR_SHKAFLAR.flatMap(({ x: a, soni }) => [a, a + soni * SHKAF_ENI])]) assert.equal(ochiqdami(x, 0.4), false, `x = ${x}`);
  // Derazalar faqat devor bo'laklarida
  for (const u of orqaDerazalari(3.2)) assert.ok(ORQA_DEVOR_BOLAKLARI.some(([a, b]) => u - 1.6 >= a + 0.3 && u + 1.6 <= b - 0.3), `deraza ${u}`);
  // Manba: devor bo'laklari, ochiq romi (xavf chizig'i, ustki to'sin), yo'lak belgilari; tashqi gaz quvuri endi yo'q
  assert.match(muhit, /ORQA_DEVOR_BOLAKLARI\.map/);
  assert.match(muhit, /function OrqaOchiqRomi/);
  assert.match(muhit, /<OrqaOchiqRomi /);
  assert.match(muhit, /ORQA_OCHIQ_YOLAKLARI\.map/);
  assert.match(muhit, /xlar=\{ORQA_USTUNLAR_X\}/);
  assert.doesNotMatch(muhit, /gaz/i);
});

test('bolaklar: ochiqlar tartibsiz, chetga tegsa yoki ustma-ust tushsa ham to‘g‘ri bo‘ladi', () => {
  assert.deepEqual(bolaklar(0, 10, []), [[0, 10]]);
  assert.deepEqual(bolaklar(0, 10, [{ markaz: 7, eni: 2 }, { markaz: 2, eni: 2 }]), [[0, 1], [3, 6], [8, 10]]);
  assert.deepEqual(bolaklar(0, 10, [{ markaz: 0, eni: 2 }, { markaz: 10, eni: 2 }]), [[1, 9]]);
  assert.deepEqual(bolaklar(0, 10, [{ markaz: 4, eni: 4 }, { markaz: 5, eni: 4 }]), [[0, 2], [7, 10]]);
});

test('ustunlar 12 m qadamda, stanok maydonlari, yo‘laklar va jihozlarga tegmaydi', () => {
  for (let i = 1; i < FERMA_X.length; i += 1) assert.equal(FERMA_X[i] - FERMA_X[i - 1], 12);
  const hammasi = ustunlar();
  assert.ok(hammasi.length >= 20);
  assert.ok(hammasi.filter((u) => u.tur === 'ichki').every((u) => Math.abs(u.z) === ICHKI_QATOR_Z));
  for (const u of hammasi) {
    const t = tortburchak(u.x, u.z, USTUN_KESIMI, USTUN_KESIMI);
    for (const m of MAYDONLAR) assert.ok(!kesishadi(t, m), `ustun ${u.x},${u.z} stanok maydonida`);
    for (const y of BOSH_YOLAKLAR) assert.ok(!kesishadi(t, y), `ustun ${u.x},${u.z} yo'lakda`);
    for (const j of jihozlar()) assert.ok(!kesishadi(t, j.t), `ustun ${u.x},${u.z} ${j.nom} ga tegadi`);
  }
  // Ferma ≈ 8 m sathida, tom yopilmagan.
  assert.ok(FERMA.past >= 7 && FERMA.tepa <= 8.6);
  assert.doesNotMatch(muhit, /tom panel|TomPaneli/i);
});

/** Polda turadigan jihozlar (to'rtburchaklari). */
function jihozlar() {
  const r = [];
  ARAVACHALAR.forEach((a, i) => {
    const burilgan = Math.abs(Math.sin(a.burilish)) > 0.5;
    r.push({ nom: `aravacha ${i}`, t: tortburchak(a.x, a.z, burilgan ? ARAVACHA_OLCHAMI.chuqurlik : ARAVACHA_OLCHAMI.eni, burilgan ? ARAVACHA_OLCHAMI.eni : ARAVACHA_OLCHAMI.chuqurlik) });
  });
  r.push({ nom: 'prorab xonasi', t: PRORAB_XONASI });
  r.push({ nom: 'siklon', t: tortburchak(SIKLON.x, SIKLON.z, SIKLON.r * 2, SIKLON.r * 2) });
  MATERIAL_TAXLAMLARI.forEach((s, i) => r.push({ nom: `taxlam ${i}`, t: tortburchak(s.x, s.z, LIST_OLCHAMI.uzunlik, LIST_OLCHAMI.eni) }));
  MATERIAL_STELLAJLARI.forEach((s, i) => r.push({ nom: `stellaj ${i}`, t: s }));
  TAYYOR_PALETLAR.forEach((p, i) => r.push({ nom: `palet ${i}`, t: tortburchak(p.x, p.z, PALET_OLCHAMI.eni, PALET_OLCHAMI.chuqurlik) }));
  CHIQINDI_IDISHLARI.forEach((c, i) => r.push({ nom: `chiqindi ${i}`, t: tortburchak(c.x, c.z, 0.64, 0.64) }));
  ELEKTR_SHKAFLAR.forEach(({ x, soni }) => r.push({ nom: `shkaflar ${x}`, t: { x0: x, x1: x + soni * SHKAF_ENI, z0: -14.85, z1: -14.33 } }));
  r.push({ nom: 'chilangar stoli', t: tortburchak(ASBOB_STOLI.x, ASBOB_STOLI.z, ASBOB_STOLI.eni, 0.75) });
  return r;
}

test('jihozlar stanoklar joyiga va bo‘sh qoladigan yo‘laklarga qo‘yilmagan', () => {
  for (const j of jihozlar()) {
    for (let i = 0; i < MAYDONLAR.length; i += 1) assert.ok(!kesishadi(j.t, MAYDONLAR[i]), `${j.nom} ↔ ${STANOKLAR[i].id}`);
    for (const y of BOSH_YOLAKLAR) assert.ok(!kesishadi(j.t, y), `${j.nom} yo'lakda`);
    // Bino ichida
    assert.ok(j.t.x0 >= -31.85 && j.t.x1 <= 32 && j.t.z0 >= -14.86 && j.t.z1 <= 15, `${j.nom} bino tashqarisida`);
  }
});

test('zonalar: material ombori (qabul yo‘laklari z = ±6 bo‘sh), tayyor mahsulot (jo‘natish yo‘laklari x = 18.5, 27.5 ±1.2 bo‘sh), prorab xonasi', () => {
  const m = ZONALAR.material;
  for (const s of MATERIAL_TAXLAMLARI) {
    const t = tortburchak(s.x, s.z, LIST_OLCHAMI.uzunlik, LIST_OLCHAMI.eni);
    assert.ok(t.x0 >= m.x0 - 0.01 && t.x1 <= m.x1 && t.z0 >= m.z0 && t.z1 <= m.z1, `taxlam ${s.x},${s.z} zonadan tashqarida`);
    for (const y of MATERIAL_YOLAKLARI) assert.ok(!kesishadi(t, y));
  }
  assert.deepEqual(MATERIAL_YOLAKLARI.map((y) => (y.z0 + y.z1) / 2), [-6, 6]);
  assert.ok(MATERIAL_YOLAKLARI.every((y) => yaqin(y.z1 - y.z0, 1.6)));
  const tz = ZONALAR.tayyor;
  assert.ok(TAYYOR_PALETLAR.length >= 12);
  for (const p of TAYYOR_PALETLAR) {
    const t = tortburchak(p.x, p.z, PALET_OLCHAMI.eni, PALET_OLCHAMI.chuqurlik);
    assert.ok(t.x0 >= tz.x0 && t.x1 <= tz.x1 && t.z0 >= tz.z0 && t.z1 <= tz.z1, `palet ${p.x},${p.z} zonadan tashqarida`);
    for (const x of OLD_RAMPALAR_X) assert.ok(t.x1 <= x - 1.2 || t.x0 >= x + 1.2, `palet ${p.x} jo'natish yo'lagida`);
  }
  assert.deepEqual(JONATISH_YOLAKLARI.map((y) => (y.x0 + y.x1) / 2), [18.5, 27.5]);
  assert.deepEqual(PRORAB_XONASI, { x0: 26, x1: 31.5, z0: -14.5, z1: -10 });
  assert.match(muhit, /<ZonaYorligi[^>]*zones\.material/);
  assert.match(muhit, /<ZonaYorligi[^>]*zones\.finished/);
  assert.match(muhit, /!uzoq && <ZonaYorligi/);
});

test('chang so‘rish: 1-liniya tushuvchi quvuri orqaga (−z), 2-liniyaniki (burilish π) +z ga siljigan va o‘z magistraliga ulanadi', () => {
  for (const s of STANOKLAR) {
    const [x, z] = tushishNuqtasi(s);
    const m = stanokMaydoni(s);
    assert.ok(x > m.x0 && x < m.x1 && z > m.z0 && z < m.z1, `${s.id} quvuri stanok ustida`);
    if (s.burilish === 0) {
      assert.ok(z < s.joy[1], `${s.id}: orqasi −z`);
      assert.equal(magistralZ(z), ORQA_MAGISTRAL_Z);
    } else {
      assert.ok(z > s.joy[1], `${s.id}: orqasi +z`);
      assert.equal(magistralZ(z), OLD_MAGISTRAL_Z);
    }
  }
  // Kesish stanogining patrubkasi lokal +x da: burilish π da dunyo −x ga o'tadi.
  assert.ok(tushishNuqtasi(STANOKLAR[0])[0] > -15 && tushishNuqtasi(STANOKLAR[5])[0] < -15);
  assert.ok(yaqin(QUVUR_Y, 5.3, 0.31));
  assert.match(muhit, /stanoklar\.map\(\(s\) =>/);
  assert.match(muhit, /tushishNuqtasi\(s\)/);
});

test('kran-balka: orqa yarmida, chegaralardan chiqmaydi, ilmog‘i chang quvurlari ustidan o‘tadi', () => {
  assert.ok(KRAN.orqaRelsZ > ORQA_USTUN_Z && KRAN.oldRelsZ < -ICHKI_QATOR_Z);
  for (let t = 0; t <= 900; t += 0.7) {
    const h = kranHolati(t);
    assert.ok(h.x >= KRAN.xMin - 1e-9 && h.x <= KRAN.xMax + 1e-9);
    assert.ok(h.z >= KRAN.aravaZMin - 1e-9 && h.z <= KRAN.aravaZMax + 1e-9);
    assert.ok(h.ilmoqY >= QUVUR_Y + MAGISTRAL_R + 0.2);
  }
  // Sekin: 1 soniyada 1.5 m dan ko'p siljimaydi.
  for (let t = 0; t < 300; t += 1) assert.ok(Math.abs(kranHolati(t + 1).x - kranHolati(t).x) < 1.5);
  // Ko'prik va ferma: ko'prik ustidagi arava fermaning pastki belbog'idan pastda.
  assert.ok(KRAN.relsY + 0.95 < FERMA.past);
  assert.match(muhit, /<\/StatikGuruh>\s*<KranBalka/);
  assert.match(muhit, /useFrame/);
});

test('manba: StatikGuruh (kalit = stanoklar), ZonaYorligi eksporti, tashqi havolasiz, materiallar render ichida yaratilmaydi', () => {
  assert.match(muhit, /<StatikGuruh kalit=\{stanoklar\}>/);
  assert.match(muhit, /export function ZonaYorligi\(\{ p, matn, rang \}/);
  assert.match(muhit, /export default function SexMuhiti\(\{ mat, stanoklar, uzoq = false \}/);
  // Faqat komponentlar eksport qilinadi (react-refresh).
  const eksportlar = [...muhit.matchAll(/^export (?:default )?(\w+) (\w+)/gm)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(eksportlar.sort(), ['function SexMuhiti', 'function ZonaYorligi']);
  for (const fayl of [muhit, reja]) assert.doesNotMatch(fayl, /https?:\/\//);
  // Mahalliy materiallar/geometriyalar useMemo ichida yaratiladi va useEffect'da tozalanadi; inline <meshStandardMaterial> yo'q (draw call ko'paymasin).
  assert.match(muhit, /function useBinoResurslari\(\) \{\s*const r = useMemo\(/);
  assert.match(muhit, /useEffect\(\(\) => \(\) => \{[\s\S]*?dispose\(\)/);
  assert.doesNotMatch(muhit, /<mesh(?:Standard|Basic)Material/);
  // Eski 34 × 22 m sex o'lchamlari qolmagan.
  assert.doesNotMatch(muhit, /RAMPA1|RAMPA2/);
});
