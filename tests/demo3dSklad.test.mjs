// 3D Demo — tayyor mahsulot skladi: reja (stellajlar, palet joylari), ma'lumot (qoldiq, kirim, jo'natish), sahna ulanishi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DemoSexManbasi, REYSLAR_JADVALI, SKLAD as SKLAD_DEMO } from '../src/Pages/Demo3DSex/demoManbasi.ts';
import { RAMPALAR, SKLAD } from '../src/Pages/Demo3DSex/hudud.ts';
import { DOK_DARVOZALARI, STELLAJ, STELLAJ_SIGIMI, STELLAJ_X1, YIGISH_PALETLARI, korinadiganPalet, paletJoylari, tashishHolati, TASHISH_DAVRI } from '../src/Pages/Demo3DSex/skladRejasi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('sklad rejasi: 600 palet joyi, hammasi bino ichida va takrorlanmas; jo\'natish rampalari sklad old devorida', () => {
  assert.equal(STELLAJ_SIGIMI, 600);
  assert.equal(SKLAD_DEMO.sigim, STELLAJ_SIGIMI, 'ma\'lumotdagi sig\'im stellajlar bilan bir xil');
  const joylar = paletJoylari();
  assert.equal(joylar.length, 600);
  assert.equal(new Set(joylar.map((j) => `${j.x.toFixed(2)}:${j.y}:${j.z}`)).size, 600);
  for (const j of joylar) assert.ok(j.x > SKLAD.x0 && j.x < SKLAD.x1 && j.z > SKLAD.z0 && j.z < SKLAD.z1, JSON.stringify(j));
  assert.ok(STELLAJ.x0 > SKLAD.x0 && STELLAJ_X1 < SKLAD.x1);
  for (const n of [1, 2]) {
    assert.equal(RAMPALAR[n].z, SKLAD.z1);
    assert.ok(RAMPALAR[n].x > SKLAD.x0 && RAMPALAR[n].x < SKLAD.x1);
    assert.ok(DOK_DARVOZALARI.some((d) => d.x === RAMPALAR[n].x && d.ochiq), `${n}-rampa darvozasi ochiq`);
  }
  // Yig'ish paletlari yuklash pogruzchiklari yo'lagiga (rampa x ± 1.3) tushmaydi.
  for (const [x] of YIGISH_PALETLARI) for (const n of [1, 2]) assert.ok(Math.abs(x - RAMPALAR[n].x) > 1.3 + 0.6, `palet x=${x}`);
  assert.equal(korinadiganPalet(-5), 0);
  assert.equal(korinadiganPalet(1000), 600);
  assert.equal(korinadiganPalet(412.4), 412);
});

test('sklad ma\'lumoti: zavoddan kirim, jo\'natish reysi yuklaganda chiqim; qoldiq = boshlang\'ich + kirim − chiqim; qayta boshlash', () => {
  let hozir = 1_000_000;
  const m = new DemoSexManbasi(() => hozir);
  assert.deepEqual({ ...m.sklad(), yangilangan: 0 }, { palet: SKLAD_DEMO.boshlangich, sigim: 600, kirim: 0, chiqim: 0, yangilangan: 0 });
  for (let i = 0; i < 400; i++) { hozir += 1000; m.tik(); }
  const s = m.sklad();
  assert.ok(s.kirim > 0 && s.chiqim > 0, JSON.stringify(s));
  assert.equal(s.palet, SKLAD_DEMO.boshlangich + s.kirim - s.chiqim);
  assert.ok(s.palet >= 0 && s.palet <= s.sigim);
  // Jo'natish reyslari jami 6 tadan palet oladi: chiqim — 6 ga karrali bo'lmasa ham, tugallangan reyslar soniga mos.
  const jonatish = REYSLAR_JADVALI.filter((r) => r.yonalish === 'jonatish').length;
  assert.ok(s.chiqim <= Math.ceil(400 / 170 + 1) * jonatish * 6);
  m.qaytaBoshlash(false);
  assert.equal(m.sklad().palet, SKLAD_DEMO.boshlangich);
  assert.equal(m.sklad().kirim, 0);
});

test('tashuvchi pogruzchik sikli: sexda yuk oladi, skladda tushiradi, bo\'sh qaytadi', () => {
  assert.deepEqual(tashishHolati(0).u, 0);
  const borish = tashishHolati(3 + 8.5);
  assert.ok(borish.yuk && borish.u > 0.3 && borish.u < 0.7);
  const tushgan = tashishHolati(3 + 17 + 3 - 0.1);
  assert.equal(tushgan.u, 1);
  assert.equal(tushgan.yuk, false);
  const qaytish = tashishHolati(3 + 17 + 3 + 8.5);
  assert.ok(!qaytish.yuk && qaytish.u > 0.3 && qaytish.u < 0.7);
  assert.deepEqual(tashishHolati(TASHISH_DAVRI + 0.5), tashishHolati(0.5));
});

test('ulanish: sahnada Sklad (paletlar soni — sklad qoldig\'i), "Sklad" kamerasi, yon panelda sklad kartasi, havolasiz', () => {
  const sahna = manba('src/Pages/Demo3DSex/SexSahnasi.tsx');
  assert.match(sahna, /<Sklad m=\{mat\} palet=\{sklad\?\.palet \?\? 0\} \/>/);
  assert.match(sahna, /kamera\.tur === "sklad"/);
  const sahifa = manba('src/Pages/Demo3DSex/index.tsx');
  assert.match(sahifa, /tur: "sklad"/);
  assert.match(sahifa, /data-sklad-palet/);
  assert.match(sahifa, /sklad=\{sklad\}/);
  for (const f of ['Sklad.tsx', 'skladRejasi.ts']) assert.ok(!/https?:\/\//.test(manba(`src/Pages/Demo3DSex/${f}`)), f);
});
