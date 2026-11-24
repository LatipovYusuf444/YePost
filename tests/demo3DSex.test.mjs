// 3D sex — Demo: ssenariy dvigateli (sinov ma'lumotlari) va ma'lumot modeli sahnadan alohida.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DemoSexManbasi, DEMO_STANOKLAR, LOGISTIKA, SSENARIY, reysBosqichi } from '../src/Pages/Demo3DSex/demoManbasi.ts';
import { bajarilishUlushi, korinadiganHolat, miqdorMatni, stanokYorligi } from '../src/Pages/Demo3DSex/sexModeli.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const nomlar = { ishlayapti: 'Ishlayapti', pauza: 'Pauzada', bosh: "Bo'sh", nosoz: 'Nosoz' };
function yangi() {
  let hozir = 1_000_000;
  const m = new DemoSexManbasi(() => hozir);
  return { m, vaqt: (s) => { hozir += s * 1000; } };
}
const tikla = (m, vaqt, n) => { for (let i = 0; i < n; i += 1) { vaqt(1); m.tik(); } };

test('boshlanishi: namuna yorlig‘i "Kesish-01 · Ishlayapti · №174 · Yon panel · 32/80 dona", 5 ta stanok, barqaror ID', () => {
  const { m } = yangi();
  assert.equal(DEMO_STANOKLAR.length, 5);
  assert.deepEqual(DEMO_STANOKLAR.map((s) => s.tur).sort(), ['burgilash', 'cnc', 'kesish', 'qadoqlash', 'qirra']);
  const h = m.holat()['kesish-01'];
  assert.equal(stanokYorligi('Kesish-01', h, (x) => nomlar[x], "Ma'lumot eskirgan"), 'Kesish-01 · Ishlayapti · №174 · Yon panel · 32/80 dona');
  assert.equal(bajarilishUlushi(h.joriy), 0.4);
  assert.equal(m.holat()['cnc-01'].holat, 'bosh');
});

test('1) kesish miqdori bir necha soniyada oshadi; 2) CNC’da boshqa buyurtma boshlanadi', () => {
  const { m, vaqt } = yangi();
  tikla(m, vaqt, 4);
  assert.equal(m.holat()['kesish-01'].joriy.bajarildi, 40);
  tikla(m, vaqt, SSENARIY.cncBoshlanadi - 4);
  const cnc = m.holat()['cnc-01'];
  assert.equal(cnc.holat, 'ishlayapti');
  assert.equal(cnc.joriy.buyurtma, '№181');
  assert.equal(cnc.joriy.detal, 'Eshik fasadi');
  assert.ok(m.hodisalar.some((h) => h.stanokId === 'cnc-01' && h.tur === 'boshlandi'));
});

test('3) qirra pauzaga o‘tadi, buyurtma biriktirilgan qoladi va miqdor o‘smaydi; keyin davom etadi', () => {
  const { m, vaqt } = yangi();
  tikla(m, vaqt, SSENARIY.qirraPauza);
  const pauza = m.holat()['qirra-01'];
  assert.equal(pauza.holat, 'pauza');
  assert.equal(pauza.joriy.buyurtma, '№172');
  const miqdor = pauza.joriy.bajarildi;
  tikla(m, vaqt, 4);
  assert.equal(m.holat()['qirra-01'].joriy.bajarildi, miqdor);
  tikla(m, vaqt, SSENARIY.qirraDavom - SSENARIY.qirraPauza - 4);
  assert.equal(m.holat()['qirra-01'].holat, 'ishlayapti');
});

test('4) aloqa uzilsa oxirgi holat va vaqt muzlaydi ("Ma’lumot eskirgan"); tiklanganda joriy holat qayta ko‘rinadi', () => {
  const { m, vaqt } = yangi();
  tikla(m, vaqt, SSENARIY.aloqaUziladi - 1);
  const oxirgi = m.holat()['burgilash-01'];
  tikla(m, vaqt, 1);
  const uzilgan = m.holat()['burgilash-01'];
  assert.equal(uzilgan.aloqa, false);
  assert.equal(korinadiganHolat(uzilgan), 'eskirgan');
  assert.match(stanokYorligi("Burg'ilash-01", uzilgan, (x) => nomlar[x], "Ma'lumot eskirgan"), /Ma'lumot eskirgan/);
  tikla(m, vaqt, 5);
  assert.equal(m.holat()['burgilash-01'].yangilangan, oxirgi.yangilangan, 'oxirgi yangilanish vaqti muzlagan');
  assert.equal(m.holat()['burgilash-01'].joriy.bajarildi, oxirgi.joriy.bajarildi, 'eski miqdor ko‘rsatiladi');
  tikla(m, vaqt, SSENARIY.aloqaTiklanadi - SSENARIY.aloqaUziladi - 5);
  const tiklangan = m.holat()['burgilash-01'];
  assert.equal(tiklangan.aloqa, true);
  assert.ok(tiklangan.yangilangan > oxirgi.yangilangan);
  assert.notDeepEqual(tiklangan.joriy, oxirgi.joriy, 'uzilish paytida stanok ishlagan — joriy holat yangilandi');
});

test('5) topshiriq tugagach navbatdagisi alohida hodisa bilan boshlanadi: yangi detal va miqdor', () => {
  const { m, vaqt } = yangi();
  let tugadiSoniya = 0;
  for (let i = 0; i < 60 && !tugadiSoniya; i += 1) {
    vaqt(1); m.tik();
    if (m.hodisalar.some((h) => h.stanokId === 'kesish-01' && h.tur === 'tugadi')) tugadiSoniya = m.soniya;
  }
  assert.ok(tugadiSoniya > 0);
  assert.equal(m.holat()['kesish-01'].holat, 'bosh');
  assert.equal(miqdorMatni(m.holat()['kesish-01'].joriy), '80/80 dona');
  tikla(m, vaqt, SSENARIY.keyingiKutish);
  const keyingi = m.holat()['kesish-01'];
  assert.equal(keyingi.holat, 'ishlayapti');
  assert.equal(keyingi.joriy.detal, 'Orqa panel');
  assert.equal(miqdorMatni(keyingi.joriy), '0/40 dona');
  const turlar = m.hodisalar.filter((h) => h.stanokId === 'kesish-01').map((h) => h.tur);
  assert.deepEqual(turlar.slice(0, 2), ['boshlandi', 'tugadi'], 'ikki alohida hodisa (eng yangisi birinchi)');
});

test('qayta boshlash va obuna; pauza taymerni to‘xtatadi', () => {
  const { m, vaqt } = yangi();
  const kelgan = [];
  const bekor = m.obuna((h, hodisa) => kelgan.push(hodisa?.tur ?? 'holat'));
  tikla(m, vaqt, 6);
  assert.ok(kelgan.length >= 6);
  m.qaytaBoshlash();
  assert.equal(m.soniya, 0);
  assert.equal(m.holat()['kesish-01'].joriy.bajarildi, 32);
  assert.equal(m.holat()['cnc-01'].holat, 'bosh');
  bekor();
  m.boshlash(10_000);
  assert.equal(m.ishlayapti, true);
  m.pauza();
  assert.equal(m.ishlayapti, false);
});

test('ulanish: /demo/3d-sex marshruti (alohida bo‘lak), "Demo — sinov ma’lumotlari" belgisi, sahna manbani faqat interfeys orqali oladi', () => {
  const router = manba('src/routes/AppRouter.tsx');
  assert.match(router, /lazy\(\(\) => import\("@\/Pages\/Demo3DSex"\)\)/);
  assert.match(router, /path="\/demo\/3d-sex"/);
  const sahna = manba('src/Pages/Demo3DSex/SexSahnasi.tsx');
  assert.ok(!/demoManbasi/.test(sahna), 'sahna demo dvigateliga bog‘lanmagan');
  assert.ok(!/https?:\/\//.test(sahna), 'tashqi model havolasi yo‘q');
});

test('sexda odamlar (har stanokda operator), yuruvchi ishchilar va pogruzchik; fon kod bilan; bosh sahifada "Demo 3D sex" tugmasi', () => {
  const sahna = manba('src/Pages/Demo3DSex/SexSahnasi.tsx');
  for (const tur of ['kesish', 'cnc', 'qirra', 'burgilash', 'qadoqlash']) assert.ok(sahna.includes(`${tur}: [\n    { p:`) || sahna.includes(`${tur}: [{ p:`), tur);
  assert.match(sahna, /<Ishchi key=\{i\}[^>]*ishlayapti=\{ishlayapti\}/);
  assert.match(sahna, /<YuruvchiIshchi /);
  assert.match(sahna, /<Pogruzchik /);
  assert.match(sahna, /<SexMuhiti mat=\{mat\} stanoklar=\{stanoklar\}[^>]*\/>/);
  const muhit = manba('src/Pages/Demo3DSex/SexMuhiti.tsx') + manba('src/Pages/Demo3DSex/materiallar.ts') + manba('src/Pages/Demo3DSex/Ishchilar.tsx');
  assert.ok(!/https?:\/\//.test(muhit), 'tashqi model/tekstura havolasi yo‘q');
  assert.match(manba('src/Pages/Demo3DSex/materiallar.ts'), /new THREE\.CanvasTexture\(canvas\)/);
  const bosh = manba('src/Pages/BoshSahifa/index.tsx');
  assert.match(bosh, /data-demo-3d\s+onClick=\{\(\) => navigate\("\/demo\/3d-sex"\)\}/);
  for (const til of ['uz', 'ru']) assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/bosh_sahifa.json`)).demo3d.label, til);
});

// ── Logistika: yuk mashinalari (KPP → rampa → jo'nash) ──

test('reyslar: boshida 1-reys KPP\'ga kelmoqda, 2-reys jo\'nab ketmoqda; bosqich almashganda hodisa (obyekt "reys") va yangi boshlanish vaqti', () => {
  const { m, vaqt } = yangi();
  const [r1, r2] = m.reyslar();
  assert.equal(r1.id, 'reys-1');
  assert.equal(r1.bosqich, 'kelmoqda');
  assert.equal(r1.rampa, 1);
  assert.equal(r1.yonalish, 'jonatish');
  assert.equal(r2.bosqich, 'ketmoqda');
  assert.equal(r2.rampa, 2);
  const kelishBoshi = r1.boshlangan;
  tikla(m, vaqt, 10);
  assert.equal(m.reyslar()[0].boshlangan, kelishBoshi, 'bosqich ichida boshlanish vaqti o\'zgarmaydi');
  const kelmoqda = LOGISTIKA.bosqichlar[0][1];
  tikla(m, vaqt, kelmoqda - 10);
  const rampada = m.reyslar()[0];
  assert.equal(rampada.bosqich, 'rampada');
  assert.ok(rampada.boshlangan > kelishBoshi);
  const h = m.hodisalar.find((x) => x.stanokId === 'reys-1' && x.tur === 'reys_rampada');
  assert.ok(h && h.obyekt === 'reys' && /01 345 ABA 1-rampada/.test(h.matn), h?.matn);
});

test('paletlar: rampada har 7.5 s da 2 tadan, bosqich oxirigacha hammasi (jo\'natishda yuklanadi, qabulda tushiriladi)', () => {
  assert.deepEqual([0, 4, 5, 12, 13, 20, 23].map((s) => {
    const { m, vaqt } = yangi();
    tikla(m, vaqt, LOGISTIKA.bosqichlar[0][1] + s);
    return m.reyslar()[0].palet;
  }), [0, 0, 2, 2, 4, 6, 6]);
  assert.equal(reysBosqichi(LOGISTIKA.bosqichlar[0][1] + LOGISTIKA.bosqichlar[1][1], 0).bosqich, 'ketmoqda');
});

test('marshrutlar: mashina demo bosqichi ichida rampaga yetadi va hududdan chiqib ketadi; rampada to\'g\'ri yo\'nalishda turadi', async () => {
  const y = await import('../src/Pages/Demo3DSex/yollar.ts');
  const kelmoqda = LOGISTIKA.bosqichlar.find(([b]) => b === 'kelmoqda')[1];
  const ketmoqda = LOGISTIKA.bosqichlar.find(([b]) => b === 'ketmoqda')[1];
  for (const rampa of [1, 2]) {
    assert.ok(y.MARSHRUTLAR[rampa].kelish.davom <= kelmoqda, `${rampa}-rampa kelish ${y.MARSHRUTLAR[rampa].kelish.davom.toFixed(1)} s`);
    assert.ok(y.MARSHRUTLAR[rampa].ketish.davom <= ketmoqda, `${rampa}-rampa ketish ${y.MARSHRUTLAR[rampa].ketish.davom.toFixed(1)} s`);
  }
  const h = y.yangiHolat();
  y.marshrutHolati(y.RAMPA1_KELISH, 999, h);
  assert.ok(Math.abs(h.p.x + 12.8) < 0.05 && Math.abs(h.p.z - 15.5) < 0.05, '1-rampa: orqasi binoga tegadi');
  assert.ok(Math.abs(h.burchak) < 0.05, '1-rampa: oldi +z (hovliga) qaraydi');
  y.marshrutHolati(y.RAMPA2_KELISH, 999, h);
  assert.ok(Math.abs(h.p.x + 21.6) < 0.05 && Math.abs(h.p.z - 0.1) < 0.05, '2-rampa');
  assert.ok(Math.abs(h.burchak + Math.PI / 2) < 0.05, '2-rampa: oldi −x ga qaraydi');
  // KPP: shlagbaum oldida to'xtaydi (mashina oldi shlagbaumdan o'tmaydi)
  const kpp = y.RAMPA1_KELISH.bolaklar[0];
  y.marshrutHolati(y.RAMPA1_KELISH, kpp.vaqt + kpp.kutish / 2, h);
  assert.ok(!h.harakatda && h.p.z - 4.3 > 25.2, `KPP oldida kutadi (z = ${h.p.z.toFixed(2)})`);
});

test('ikki yuk mashinasi butun davr davomida bir-biriga yaqinlashmaydi (markazlar orasi ≥ 6 m)', async () => {
  const y = await import('../src/Pages/Demo3DSex/yollar.ts');
  const joy = (rampa, { bosqich, otgan }) => {
    const M = y.MARSHRUTLAR[rampa];
    if (bosqich === 'yoq' || (bosqich === 'ketmoqda' && otgan > M.ketish.davom)) return null;
    return y.marshrutHolati(bosqich === 'ketmoqda' ? M.ketish : M.kelish, bosqich === 'rampada' ? 1e9 : otgan, y.yangiHolat()).p;
  };
  let eng = Infinity;
  for (let s = 0; s < LOGISTIKA.davr; s += 0.25) {
    const a = joy(1, reysBosqichi(s, 0));
    const b = joy(2, reysBosqichi(s, 19));
    if (a && b) eng = Math.min(eng, a.distanceTo(b));
  }
  assert.ok(eng >= 6, `eng yaqin masofa ${eng.toFixed(2)} m`);
});

test('ulanish: "Hudud" kamerasi, Logistika bo\'limi, reys hodisasi hududga olib boradi; tashqi muhit kod bilan (havolasiz)', () => {
  const sahifa = manba('src/Pages/Demo3DSex/index.tsx');
  assert.match(sahifa, /data-kamera="hudud"/);
  assert.match(sahifa, /data-logistika/);
  assert.match(sahifa, /reyslar=\{reyslar\}/);
  assert.match(sahifa, /hodisa\.obyekt !== "reys"/);
  const sahna = manba('src/Pages/Demo3DSex/SexSahnasi.tsx');
  assert.match(sahna, /<Shaharcha m=\{mat\} sm=\{sm\} \/>/);
  assert.match(sahna, /<Logistika m=\{mat\} sm=\{sm\} reyslar=\{reyslar\}/);
  assert.ok(!/demoManbasi/.test(manba('src/Pages/Demo3DSex/Transport.tsx')), 'transport demo dvigateliga bog\'lanmagan');
  for (const fayl of ['Shaharcha.tsx', 'Transport.tsx', 'shaharMateriallari.ts', 'yollar.ts', 'geometriyalar.ts', 'hudud.ts', 'shakllar.tsx']) {
    assert.ok(!/https?:\/\//.test(manba(`src/Pages/Demo3DSex/${fayl}`)), fayl);
  }
});
