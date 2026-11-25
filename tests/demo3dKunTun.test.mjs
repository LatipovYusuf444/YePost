// 3D Demo — kun/tun: Toshkent vaqti, quyosh holati (NOAA), sahna yo'nalishi, fazalar, yoritish parametrlari, tungi derazalar va UI ulanishi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DERAZA_KATAKLARI,
  MAJBURIY_LAHZA,
  derazaNiqobi,
  derazaPikselimi,
  kunFazasi,
  quyoshHolati,
  rangAralash,
  sahnaYonalishi,
  soatMatni,
  toshkentVaqti,
  yoritishParametrlari,
} from '../src/Pages/Demo3DSex/kunTun.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
/** Toshkent vaqti (UTC+5) bo'yicha lahza. */
const toshkent = (yil, oy, kun, soat, daqiqa = 0) => Date.UTC(yil, oy - 1, kun, soat - 5, daqiqa);

test('Toshkent vaqti: UTC + 5 soat, kun/oy almashinuvi, kompyuter vaqt mintaqasiga bog\'liq emas', () => {
  const v = toshkentVaqti(new Date(Date.UTC(2026, 10, 25, 16, 47, 12)));
  assert.deepEqual([v.yil, v.oy, v.kun, v.soat, v.daqiqa, v.soniya], [2026, 11, 25, 21, 47, 12]);
  assert.equal(soatMatni(v), '21:47');
  // 20:30 UTC → ertasi kun 01:30
  const t = toshkentVaqti(Date.UTC(2026, 11, 31, 20, 30));
  assert.deepEqual([t.yil, t.oy, t.kun, t.soat, t.daqiqa], [2027, 1, 1, 1, 30]);
  assert.equal(soatMatni({ soat: 7, daqiqa: 5 }), '07:05');
  assert.equal(toshkentVaqti(toshkent(2026, 6, 21, 13)).soat, 13);
});

test('quyosh: Toshkentda yarim tunda ufq ostida, iyunda 13:00 atrofida baland (> 50°), dekabr tushida past', () => {
  for (const [oy, kun] of [[6, 21], [12, 21], [3, 20], [9, 23]]) {
    const q = quyoshHolati(toshkent(2026, oy, kun, 0));
    assert.ok(q.balandlik < -15, `${oy}-oy 00:00: ${q.balandlik}`);
  }
  const iyun = quyoshHolati(toshkent(2026, 6, 21, 13));
  assert.ok(iyun.balandlik > 50, `iyun 13:00: ${iyun.balandlik}`);
  // Toshkentda yozgi quyosh kulminatsiyasi ≈ 90 − 41.3 + 23.44 ≈ 72°
  const eng = Math.max(...Array.from({ length: 24 * 6 }, (_, i) => quyoshHolati(toshkent(2026, 6, 21, 0, i * 10)).balandlik));
  assert.ok(Math.abs(eng - 72.1) < 0.7, `iyun maksimumi ${eng}`);
  const dekabr = quyoshHolati(toshkent(2026, 12, 21, 12, 30));
  assert.ok(dekabr.balandlik > 20 && dekabr.balandlik < 27, `dekabr tushi ${dekabr.balandlik}`);
  // Og'ish: yozgi kun to'xtashi ≈ +23.4°, qishki ≈ −23.4°
  assert.ok(Math.abs(iyun.ogish - 23.44) < 0.1);
  assert.ok(Math.abs(dekabr.ogish + 23.44) < 0.1);
});

test('quyosh chiqishi va botishi: iyunda ~04:50 / ~20:00, dekabrda ~07:50 / ~17:05 (Toshkent vaqti)', () => {
  const kesishuv = (oy, kun, ertalab) => {
    let oldingi = null;
    for (let i = 0; i < 24 * 60; i++) {
      const b = quyoshHolati(toshkent(2026, oy, kun, 0, i)).balandlik;
      if (oldingi !== null && (ertalab ? oldingi < -0.833 && b >= -0.833 : oldingi > -0.833 && b <= -0.833)) return i;
      oldingi = b;
    }
    return -1;
  };
  const yaqin = (daqiqa, soat, minut, chegara = 12) => assert.ok(Math.abs(daqiqa - (soat * 60 + minut)) <= chegara, `${Math.floor(daqiqa / 60)}:${daqiqa % 60} ≉ ${soat}:${minut}`);
  yaqin(kesishuv(6, 21, true), 4, 50);
  yaqin(kesishuv(6, 21, false), 20, 0);
  yaqin(kesishuv(12, 21, true), 7, 50);
  yaqin(kesishuv(12, 21, false), 17, 3);
});

test('sahna o\'qlari: quyosh sharqda (+x) chiqadi, g\'arbda (−x) botadi, tushda janubda (+z), yarim tunda ufq ostida', () => {
  const yon = (soat, daqiqa = 0, oy = 6) => {
    const q = quyoshHolati(toshkent(2026, oy, 21, soat, daqiqa));
    return sahnaYonalishi(q.azimut, q.balandlik);
  };
  const tong = yon(5, 30);
  assert.ok(tong[0] > 0.5 && tong[1] > 0, `tong: ${tong}`);
  const shom = yon(19, 30);
  assert.ok(shom[0] < -0.5 && shom[1] > 0, `shom: ${shom}`);
  // Quyosh tushi (Toshkentda ≈ 12:23): to'g'ri janubda — z > 0, x ≈ 0
  const tush = yon(12, 23, 12);
  assert.ok(tush[2] > 0.85 && Math.abs(tush[0]) < 0.05 && tush[1] > 0.3, `tush: ${tush}`);
  assert.ok(yon(0)[1] < 0);
  // Birlik vektor va asosiy yo'nalishlar
  for (const v of [tong, shom, tush]) assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  const [shx, , shz] = sahnaYonalishi(0, 0);
  assert.ok(Math.abs(shx) < 1e-9 && Math.abs(shz + 1) < 1e-9, 'shimol = −z');
  assert.ok(Math.abs(sahnaYonalishi(90, 0)[0] - 1) < 1e-9, 'sharq = +x');
  assert.ok(Math.abs(sahnaYonalishi(270, 0)[0] + 1) < 1e-9, 'g\'arb = −x');
  assert.ok(Math.abs(sahnaYonalishi(0, 90)[1] - 1) < 1e-9, 'zenit = +y');
});

test('fazalar: tun → tong → kun → shom → tun; quyosh chiqishi atrofida ulushlar monoton', () => {
  assert.equal(kunFazasi(-30).faza, 'tun');
  assert.equal(kunFazasi(-3, true).faza, 'tong');
  assert.equal(kunFazasi(-3, false).faza, 'shom');
  assert.equal(kunFazasi(5, true).faza, 'tong');
  assert.equal(kunFazasi(40).faza, 'kun');
  assert.equal(kunFazasi(-8).kunUlushi, 0);
  assert.equal(kunFazasi(10).kunUlushi, 1);
  let oldingi = null;
  const fazalar = [];
  for (let i = 0; i <= 150; i++) {
    const lahza = toshkent(2026, 6, 21, 3, 30 + i);
    const q = quyoshHolati(lahza);
    const f = kunFazasi(q.balandlik, q.azimut < 180);
    if (oldingi) {
      assert.ok(f.kunUlushi >= oldingi.kunUlushi - 1e-12, 'kunUlushi o\'sadi');
      assert.ok(f.chiroqUlushi <= oldingi.chiroqUlushi + 1e-12, 'chiroqlar o\'chadi');
      assert.ok(f.yulduzUlushi <= oldingi.yulduzUlushi + 1e-12, 'yulduzlar so\'nadi');
    }
    assert.ok(Math.abs(f.kunUlushi + f.tunUlushi - 1) < 1e-12);
    if (fazalar.at(-1) !== f.faza) fazalar.push(f.faza);
    oldingi = f;
  }
  assert.deepEqual(fazalar, ['tun', 'tong', 'kun']);
  const kechqurun = [];
  for (let i = 0; i <= 180; i++) {
    const q = quyoshHolati(toshkent(2026, 6, 21, 18, i));
    const f = kunFazasi(q.balandlik, q.azimut < 180).faza;
    if (kechqurun.at(-1) !== f) kechqurun.push(f);
  }
  assert.deepEqual(kechqurun, ['kun', 'shom', 'tun']);
});

test('yoritish: majburiy "kun" — 11:00 yoz quyoshi (oq, kuchli), "tun" — 23:00 oy nuri (sovuq ko\'k), sahna hech qachon qop-qora emas', () => {
  assert.equal(toshkentVaqti(MAJBURIY_LAHZA.kun).soat, 11);
  assert.equal(toshkentVaqti(MAJBURIY_LAHZA.tun).soat, 23);
  const kun = yoritishParametrlari('kun');
  assert.equal(kun.rejim, 'kun');
  assert.equal(kun.faza.faza, 'kun');
  assert.equal(kun.asosiy.manba, 'quyosh');
  assert.ok(kun.quyosh.balandlik > 50);
  assert.ok(kun.asosiy.kuch > 2 && kun.yulduzlar === 0 && kun.chiroqlar === 0 && kun.osmon.kunAralash === 1);
  assert.equal(kun.asosiy.rang, '#fff6e8');
  assert.equal(kun.tuman.rang, '#d4dfe9');

  const tun = yoritishParametrlari('tun');
  assert.equal(tun.rejim, 'tun');
  assert.equal(tun.faza.faza, 'tun');
  assert.equal(tun.asosiy.manba, 'oy');
  assert.ok(tun.yulduzlar === 1 && tun.chiroqlar === 1 && tun.osmon.kunAralash === 0);
  // Oy nuri: sovuq ko'k (b > r), ufqdan baland, kuchi 0 emas; yarim shar + muhit aksi — binolar ko'rinadi
  const [r, , b] = [1, 3, 5].map((i) => parseInt(tun.asosiy.rang.slice(i, i + 2), 16));
  assert.ok(b > r);
  assert.ok(tun.asosiy.yonalish[1] >= Math.sin((25 * Math.PI) / 180) - 1e-9);
  assert.ok(tun.asosiy.kuch >= 0.4 && tun.yarimShar.kuch >= 0.4 && tun.muhitKuchi > 0.1);
  assert.ok(tun.tuman.uzoq > tun.tuman.yaqin);

  // Avto rejim: shu lahzaning quyoshi
  const lahza = toshkent(2026, 6, 21, 20, 5);
  const shom = yoritishParametrlari(lahza);
  assert.equal(shom.rejim, 'avto');
  assert.equal(shom.lahza, lahza);
  assert.equal(shom.faza.faza, 'shom');
  // Past quyosh — iliq to'q sariq (r > b), kunduzgidan kuchsiz
  const ertalab = yoritishParametrlari(toshkent(2026, 6, 21, 5, 20));
  assert.equal(ertalab.asosiy.manba, 'quyosh');
  const [er, , eb] = [1, 3, 5].map((i) => parseInt(ertalab.asosiy.rang.slice(i, i + 2), 16));
  assert.ok(er - eb > 80, ertalab.asosiy.rang);
  assert.ok(ertalab.asosiy.kuch < kun.asosiy.kuch);
  assert.ok(ertalab.asosiy.yonalish[0] > 0.5, 'ertalab yorug\'lik sharqdan');
  // Soya cho'zilib ketmasin: quyosh yorug'ligi kamida 5° balandlikdan
  assert.ok(ertalab.asosiy.yonalish[1] >= Math.sin((5 * Math.PI) / 180) - 1e-9);

  // Butun sutka davomida: asosiy + yarim shar yorug'ligi hech qachon nol emas
  for (let i = 0; i < 24 * 4; i++) {
    const p = yoritishParametrlari(toshkent(2026, 3, 20, 0, i * 15));
    assert.ok(p.yarimShar.kuch >= 0.4 && p.muhitKuchi >= 0.15, `${i}: ${p.yarimShar.kuch}`);
    for (const rang of [p.asosiy.rang, p.yarimShar.osmon, p.tuman.rang, p.osmon.tunZenit]) assert.match(rang, /^#[0-9a-f]{6}$/);
  }
  assert.equal(rangAralash('#000000', '#ffffff', 0.5), '#808080');
});

test('tungi shahar: fasad niqobida faqat deraza piksellari yonadi, devor/g\'isht qora qoladi', () => {
  assert.ok(derazaPikselimi(0x8f, 0xb2, 0xcf), 'ko\'kish shisha');
  assert.ok(derazaPikselimi(0x2f, 0x4a, 0x63), 'to\'q shisha');
  assert.ok(derazaPikselimi(0xf6, 0xd5, 0x8a), 'yoniq deraza');
  for (const devor of [[0xe4, 0xdc, 0xcb], [0xc9, 0xa2, 0x7a], [0xd8, 0xc2, 0x9a], [0x33, 0x41, 0x55], [0xf8, 0xf6, 0xf0]]) assert.ok(!derazaPikselimi(...devor), devor.join(','));
  // 8 × 8 piksellik "panel" fasad: chap yarmi shisha, o'ng yarmi devor
  const eni = 8;
  const boyi = 8;
  const piksellar = new Uint8ClampedArray(eni * boyi * 4);
  for (let i = 0; i < eni * boyi; i++) {
    const shisha = i % eni < 4;
    piksellar.set(shisha ? [0x8f, 0xb2, 0xcf, 255] : [0xe4, 0xdc, 0xcb, 255], i * 4);
  }
  const niqob = derazaNiqobi(piksellar, eni, boyi, 'panel');
  assert.equal(niqob.length, eni * boyi * 4);
  let yoniq = 0;
  for (let i = 0; i < eni * boyi; i++) {
    assert.equal(niqob[i * 4 + 3], 255);
    const yonadi = niqob[i * 4] > 0;
    if (i % eni >= 4) assert.ok(!yonadi, 'devor yonmaydi');
    if (yonadi) yoniq++;
  }
  assert.ok(yoniq > 0 && yoniq < 32, `yoniq derazalar bir qismi: ${yoniq}`);
  assert.deepEqual(Object.keys(DERAZA_KATAKLARI).sort(), ['dokon', 'gisht', 'ofis', 'panel', 'uy']);
});

test('sahna komponenti: bitta soya beruvchi yorug\'lik, eski soya kamerasi, yulduzlar, ≤ 6 nuqtali chiroq, materiallar tiklanadi', () => {
  const k = manba('src/Pages/Demo3DSex/KunTunYoritish.tsx');
  assert.match(k, /export default function KunTunYoritish\(\{ m, sm, rejim, soyaNishoni \}: Props\)/);
  assert.equal((k.match(/castShadow/g) ?? []).length, 1);
  for (const s of ['shadow-mapSize={[4096, 4096]}', 'shadow-camera-left={-110}', 'shadow-camera-right={110}', 'shadow-camera-top={72}', 'shadow-camera-bottom={-72}', 'shadow-camera-near={10}', 'shadow-camera-far={300}', 'target={soyaNishoni}']) {
    assert.ok(k.includes(s), s);
  }
  assert.match(k, /<Sky /);
  assert.match(k, /<Stars /);
  assert.match(k, /<fog ref=\{tuman\} attach="fog"/);
  assert.match(k, /<Environment /);
  assert.match(k, /<hemisphereLight /);
  const chiroqlar = k.slice(k.indexOf('const TUNGI_CHIROQLAR'), k.indexOf('const TUNGI_NUR'));
  const son = (chiroqlar.match(/\{ joy: \[/g) ?? []).length;
  assert.ok(son >= 3 && son <= 6, `nuqtali chiroqlar: ${son}`);
  assert.ok(!/castShadow/.test(k.slice(k.indexOf('<pointLight'))), 'nuqtali chiroqlar soyasiz');
  // Asl qiymatlar sahifadan chiqilganda tiklanadi, niqob teksturalari bo'shatiladi
  assert.match(k, /n\.mat\.emissiveIntensity = n\.asl/);
  assert.match(k, /f\.mat\.emissiveMap = f\.asl\.map/);
  assert.match(k, /f\.niqob\.dispose\(\)/);
  assert.match(k, /QAYTA_HISOB = 10_000/);
  assert.ok(!/https?:\/\//.test(k) && !/https?:\/\//.test(manba('src/Pages/Demo3DSex/kunTun.ts')), 'tashqi havola yo\'q');
});

test('UI: Toshkent soati, "Avto / Kun / Tun" tanlovi (data-vaqt-rejimi, aria-pressed) va sahnaga vaqtRejimi uzatiladi', () => {
  const sahifa = manba('src/Pages/Demo3DSex/index.tsx');
  assert.match(sahifa, /const VAQT_REJIMLARI: VaqtRejimi\[\] = \["avto", "kun", "tun"\]/);
  assert.match(sahifa, /data-vaqt-rejimi=\{tur\}/);
  assert.match(sahifa, /aria-pressed=\{faol\}\s+onClick=\{\(\) => onRejim\(tur\)\}/);
  assert.match(sahifa, /useState<VaqtRejimi>\("avto"\)/);
  assert.match(sahifa, /<SexSahnasi [^>]*vaqtRejimi=\{vaqtRejimi\}/);
  assert.match(sahifa, /<VaqtBoshqaruvi hozir=\{hozir\} rejim=\{vaqtRejimi\} onRejim=\{setVaqtRejimi\} \/>/);
  assert.match(sahifa, /soatMatni\(vaqt\)/);
  assert.match(sahifa, /\bSun\b.*\bMoon\b|\bMoon\b.*\bSun\b/s);
  assert.match(manba('src/Pages/Demo3DSex/SexSahnasi.tsx'), /vaqtRejimi\?: "avto" \| "kun" \| "tun"/);

  const matnlar = manba('src/Pages/Demo3DSex/matnlar.ts');
  for (const kalit of ['title', 'avto', 'kun', 'tun', 'toshkent', 'tong', 'shom', 'tunFaza', 'kunFaza']) {
    assert.equal((matnlar.match(new RegExp(`vaqt: \\{[^}]*\\b${kalit}: "`, 'g')) ?? []).length, 2, `vaqt.${kalit} uz + ru`);
  }
  assert.match(matnlar, /vaqt: \{ title: "Kun vaqti"/);
  assert.match(matnlar, /vaqt: \{ title: "Время суток"/);
});
