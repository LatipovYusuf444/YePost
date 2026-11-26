// "Ko'rinishni sozlash": Qisqa ko'rinishdagi ixtiyoriy kartalar va matnlar — Sotuv yaratish va Sotuv tafsiloti uchun bitta,
// foydalanuvchi bo'yicha saqlanadigan tanlov (sotuv yozuvidan alohida). Faqat ko'rinish: qiymat, hisob, saqlash o'zgarmaydi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/qisqaKorinish.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('standart Qisqa: ixtiyoriy kartalar yopiq; qisqa foydali matnlar ochiq, uzun izohlar yopiq', () => {
  assert.ok(Object.values(lib.STANDART_QISQA.kartalar).every((v) => v === false));
  assert.equal(lib.STANDART_QISQA.matnlar.qoldiq, true);
  assert.equal(lib.STANDART_QISQA.matnlar.bosqichTavsifi, true);
  assert.equal(lib.STANDART_QISQA.matnlar.klaviatura, false);
  assert.equal(lib.STANDART_QISQA.matnlar.chegirmaIzohi, false);
  assert.deepEqual(Object.keys(lib.STANDART_QISQA.kartalar), lib.QISQA_KARTALAR.map((k) => k.kalit));
});

test('tahlil: noma\'lum kalit tashlanadi, yetishmagani standartdan, buzilgani null; teng', () => {
  const t = lib.qisqaKorinishniTahlil(JSON.stringify({ kartalar: { izoh: true, begona: true }, matnlar: { qoldiq: false } }));
  assert.equal(t.kartalar.izoh, true);
  assert.equal(t.kartalar.begona, undefined);
  assert.equal(t.kartalar.shtrixkod, false);
  assert.equal(t.matnlar.qoldiq, false);
  assert.equal(t.matnlar.bosqichTavsifi, true);
  assert.equal(lib.qisqaKorinishniTahlil('{buzuq'), null);
  assert.equal(lib.qisqaKorinishniTahlil('[]'), null);
  assert.equal(lib.qisqaKorinishniTahlil(null), null);
  assert.equal(lib.teng(lib.STANDART_QISQA, lib.qisqaKorinishniTahlil('{}')), true);
  assert.equal(lib.teng(lib.STANDART_QISQA, t), false);
});

test('ko\'rinish: To\'liq rejimda hammasi, Qisqa rejimda tanlov bo\'yicha', () => {
  const k = lib.qisqaKorinishniTahlil({ kartalar: { izoh: true }, matnlar: { qoldiq: false } });
  assert.equal(lib.kartaKorinadimi(false, k, 'shtrixkod'), true);
  assert.equal(lib.kartaKorinadimi(true, k, 'shtrixkod'), false);
  assert.equal(lib.kartaKorinadimi(true, k, 'izoh'), true);
  assert.equal(lib.matnKorinadimi(true, k, 'qoldiq'), false);
  assert.equal(lib.matnKorinadimi(false, k, 'qoldiq'), true);
});

test('saqlash: foydalanuvchi bo\'yicha (ID + do\'kon|login), sotuv yozuvidan alohida; ikki oyna bir kalitda', () => {
  const hook = manba('src/hooks/useFoydalanuvchiSozlamasi.ts');
  assert.match(hook, /kalitlar\.push\(`\$\{prefiks\}:\$\{id\}`\)/);
  assert.match(hook, /kalitlar\.push\(`\$\{prefiks\}:login:\$\{login\}`\)/);
  assert.match(hook, /window\.dispatchEvent\(new CustomEvent\("yepost-sozlama"/, 'bir vkladkadagi ikkinchi oyna darhol yangilanadi');
  assert.match(manba('src/hooks/useQisqaSozlamasi.ts'), /useFoydalanuvchiSozlamasi<QisqaKorinish>\(QISQA_KORINISH_KALITI/);
  assert.equal(lib.QISQA_KORINISH_KALITI, 'yepost-qisqa-korinish');
  assert.doesNotMatch(manba('src/lib/sessiyaIzolyatsiyasi.ts'), /yepost-qisqa-korinish/, 'chiqishda o\'chirilmaydi');
  for (const fayl of ['src/Pages/Savdo/YangiSotuvModal.tsx', 'src/Pages/Savdo/SotuvTafsilotlariModal.tsx']) {
    assert.match(manba(fayl), /useQisqaSozlamasi\(\) \?\? null/, fayl);
    assert.doesNotMatch(manba(fayl).slice(manba(fayl).indexOf('function submit') >= 0 ? manba(fayl).indexOf('function submit') : 0, (manba(fayl).indexOf('function submit') >= 0 ? manba(fayl).indexOf('function submit') : 0) + 6000), /qisqaSozlama/, 'saqlash oqimi tanlovga bog\'liq emas');
  }
});

test('panel: Kartalar va Matnlar bo\'limlari, saqlash / bekor qilish / standartga qaytarish; tugma faqat Qisqa rejimda', () => {
  const panel = manba('src/Pages/Savdo/KorinishSozlashPaneli.tsx');
  for (const b of ['data-panel-saqlash', 'data-panel-bekor', 'data-panel-standart', 'data-panel-bolim', 'role="switch"']) assert.ok(panel.includes(b), b);
  assert.match(panel, /onClick=\{\(\) => setQoralama\(STANDART_QISQA\)\}/, 'standart — taklif (saqlash bilan qo\'llanadi)');
  assert.match(panel, /onClick=\{\(\) => onSaqlash\(qoralama\)\}/);
  assert.match(manba('src/Pages/Savdo/YangiSotuvModal.tsx'), /\{qisqa && qisqaSozlama && \(\n\s+<KorinishSozlash korinish=\{qisqaSozlama\.korinish\} onSaqlash=\{qisqaSozlama\.saqlash\} joriyOyna="yaratish" \/>/);
  const tafsilot = manba('src/Pages/Savdo/SotuvTafsilotlariModal.tsx');
  assert.match(tafsilot, /\{qisqa && qisqaSozlama && <KorinishSozlash korinish=\{qisqaSozlama\.korinish\} onSaqlash=\{qisqaSozlama\.saqlash\} joriyOyna="tafsilot" \/>\}/);
  assert.match(tafsilot, /useState<"toliq" \| "qisqa">\(\(\) => \(qisqaSozlama\?\.saqlangan \? "qisqa" : "toliq"\)\)/, 'saqlangan Qisqa ko\'rinish bo\'lsa tafsilot Qisqa\'da ochiladi');
  for (const til of ['uz', 'ru']) {
    const vm = JSON.parse(manba(`src/i18n/locales/${til}/savdo_yangi.json`)).viewMode;
    for (const { kalit } of lib.QISQA_KARTALAR) assert.ok(vm.kartalar[kalit], `${til} karta ${kalit}`);
    for (const { kalit } of lib.QISQA_MATNLAR) assert.ok(vm.matnlar[kalit], `${til} matn ${kalit}`);
    for (const k of ['open', 'title', 'kartalar', 'matnlar', 'save', 'cancel', 'reset']) assert.ok(vm.panel[k], `${til} panel ${k}`);
  }
});

test('tafsilot: Qisqa\'da faoliyat va sozlama qatorlari yashirin, xatolar ko\'rinadi; kartalar/matnlar tanlov bo\'yicha', () => {
  const k = manba('src/Pages/Savdo/SotuvTafsilotlariModal.tsx');
  assert.match(k, /<main className=\{qk\.qisqa && !crmXatolik \? "hidden" : "space-y-6"\}>/);
  assert.match(k, /\{qk\.matn\("tolovIzohi"\) && <p className="mt-0\.5 text-xs leading-5 text-slate-400">\{t\("kelishuvCard\.bolimTavsif"\)\}<\/p>\}/);
  assert.match(k, /\$\{qk\.qisqa \? "hidden" : ""\}`\}>/, 'sozlama qatorlari');
  assert.match(k, /\$\{qk\.karta\("izoh"\) \? "" : "hidden"\}/);
  assert.match(k, /\{qk\.karta\("xulosa"\) && \(\n\s+<tfoot>/);
  assert.match(k, /\{\(qk\.karta\("umumiyChegirma"\) \|\| umumiyChegirma > 0\) && <p className="text-lime-700">/, 'chegirma qiymati bo\'lsa doim ko\'rinadi');
  assert.match(k, /<QisqaKorinishBeruvchi qisqa=\{qisqa\} korinish=\{qisqaSozlama\?\.korinish\}>/);
  assert.match(manba('src/Pages/Savdo/SotuvJarayoni.tsx'), /\{tavsif && <p className="mt-1 text-xs leading-5 text-slate-500">\{qadam\.izoh\}<\/p>\}/);
});
