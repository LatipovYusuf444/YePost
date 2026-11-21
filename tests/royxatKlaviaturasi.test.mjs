// Ochiladigan ro'yxatlarda klaviatura (savdodagi mijoz tanlovidek) va O'zaro hisob-kitobda bitta tur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { harfBilanTopish, klaviaturaYonalishi } from '../src/lib/royxatKlaviaturasi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('↑/↓ chetda aylanadi, Home/End, PageUp/PageDown; bo\'sh ro\'yxat va boshqa tugma — null', () => {
  assert.equal(klaviaturaYonalishi('ArrowDown', -1, 3), 0);
  assert.equal(klaviaturaYonalishi('ArrowDown', 0, 3), 1);
  assert.equal(klaviaturaYonalishi('ArrowDown', 2, 3), 0);
  assert.equal(klaviaturaYonalishi('ArrowUp', 0, 3), 2);
  assert.equal(klaviaturaYonalishi('ArrowUp', -1, 3), 2);
  assert.equal(klaviaturaYonalishi('ArrowUp', 2, 3), 1);
  assert.equal(klaviaturaYonalishi('Home', 2, 3), 0);
  assert.equal(klaviaturaYonalishi('End', 0, 3), 2);
  assert.equal(klaviaturaYonalishi('PageDown', 1, 20), 6);
  assert.equal(klaviaturaYonalishi('PageDown', 18, 20), 19);
  assert.equal(klaviaturaYonalishi('PageUp', 3, 20), 0);
  assert.equal(klaviaturaYonalishi('ArrowDown', 0, 0), null);
  assert.equal(klaviaturaYonalishi('a', 0, 3), null);
});

test('harf terib tez o\'tish: prefiks, bitta harf qayta — keyingisi (aylanib), o\'chirilganlar tashlanadi', () => {
  const nomlar = ['Asosiy ombor', 'Taminotchi', '', 'Tashkent', 'Toshloq'];
  assert.equal(harfBilanTopish(nomlar, 'ta', -1), 1);
  assert.equal(harfBilanTopish(nomlar, 'tas', -1), 3);
  assert.equal(harfBilanTopish(nomlar, 't', -1), 1);
  assert.equal(harfBilanTopish(nomlar, 't', 1), 3);
  assert.equal(harfBilanTopish(nomlar, 'tt', 3), 4);
  assert.equal(harfBilanTopish(nomlar, 't', 4), 1);
  assert.equal(harfBilanTopish(nomlar, 'x', 0), -1);
  assert.equal(harfBilanTopish(nomlar, '', 0), -1);
});

test('Kassa amaliyoti tanlovi (Tanlov): ochish, yurish, Enter, Esc va qidiruvda ham', () => {
  const s = manba('src/Pages/XaridorUchot/Tanlov.tsx');
  assert.ok(s.includes('onKeyDown={klaviatura}'));
  assert.ok(s.includes('if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && event.currentTarget === tugmaRef.current)'));
  assert.ok(s.includes('const keyingi = klaviaturaYonalishi(event.key, faol, korinadigan.length);'));
  assert.match(s, /if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);\s*yopish\(true\);/);
  assert.ok(s.includes('role="listbox"') && s.includes('role="option"') && s.includes('aria-activedescendant={faolId}'));
  assert.ok(manba('src/Pages/KassaUchot/KassaAmaliyotModal.tsx').includes('import Tanlov from "@/Pages/XaridorUchot/Tanlov";'));
});

test('Ombor oynalaridagi AppSelect: klaviatura (o\'chirilganlar tashlanadi), harf bilan o\'tish, Esc oynani yopmaydi', () => {
  const s = manba('src/Components/ui/AppSelect.tsx');
  assert.ok(s.includes('onKeyDown={klaviatura}'));
  assert.ok(s.includes('const yoqilganlar = options.flatMap((option, index) => (option.disabled ? [] : [index]));'));
  assert.ok(s.includes('const keyingi = klaviaturaYonalishi(event.key, joy, yoqilganlar.length);'));
  assert.ok(s.includes('harfBilanTopish('));
  assert.match(s, /if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
  // Sichqoncha bilan ishlash o'zgarmagan: bosish — ochadi/yopadi, variant bosilsa tanlanadi.
  assert.ok(s.includes('onClick={() => (open ? yopish() : ochish())}'));
});

test('Yangi kirim: yetkazib beruvchi qidiruvida ↑/↓, Enter (yangi qo\'shish qatori ham), Esc', () => {
  const s = manba('src/Pages/Ombor/YangiKirimModal.tsx');
  assert.ok(s.includes('onKeyDown={supplierKlaviaturasi}'));
  assert.ok(s.includes('const supplierQatorSoni = supplierMoslari.length + (supplierQuery.trim() && !aynanMosSupplier ? 1 : 0);'));
  assert.ok(s.includes('else if (supplierFaol === supplierMoslari.length && supplierQatorSoni > supplierMoslari.length && !store.amalBajarilmoqda) void yangiSupplierQoshish();'));
});

test('O\'zaro hisob-kitob: bitta tur (Xaridorlar yoki Yetkazib beruvchilar), so\'rov, filtr va Excel shu tur bo\'yicha', () => {
  const s = manba('src/Pages/HisobotUchot/OzaroHisobKitob.tsx');
  assert.ok(s.includes('const [tur, setTur] = useState<KontragentTuri>("CUSTOMER");'));
  assert.ok(s.includes('counterpartyType: tur,'));
  assert.equal((s.match(/counterpartyBalanceReportApi\.barchasi\(/g) ?? []).length, 1);
  assert.ok(s.includes('if (natijaValyutasi !== valyuta || natijaTuri !== tur) return [];'));
  assert.ok(s.includes('{tur === "CUSTOMER"\n          ? <KopTanlovli label="Xaridor"') || s.includes('{tur === "CUSTOMER"\r\n          ? <KopTanlovli label="Xaridor"'));
  assert.ok(!s.includes('{ id: "turi", nom: "Turi"'));
  assert.match(s, /if \(tur === "CUSTOMER"\) \{\s*await counterpartyBalanceReportApi\.export\(/);
});
