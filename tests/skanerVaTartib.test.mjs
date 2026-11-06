import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { enterTolovniTasdiqlaydimi, posQidiruvigaFokus, POS_QIDIRUV_BELGISI } from '../src/lib/skanerFokusi.ts';

const enter = (target = { tagName: 'INPUT' }, extra = {}) => ({ key: 'Enter', target, ...extra });

test('Enter: to‘lov tugmasi yoqilgan va band bo‘lmasa tasdiqlaydi', () => {
  assert.equal(enterTolovniTasdiqlaydimi(enter(), { mumkin: true, band: false }), true);
});

test('Enter: tugma o‘chiq yoki band bo‘lsa (ikki marta yuborilmaydi) tasdiqlamaydi', () => {
  assert.equal(enterTolovniTasdiqlaydimi(enter(), { mumkin: false, band: false }), false);
  assert.equal(enterTolovniTasdiqlaydimi(enter(), { mumkin: true, band: true }), false);
  assert.equal(enterTolovniTasdiqlaydimi(enter({ tagName: 'INPUT' }, { repeat: true }), { mumkin: true, band: false }), false);
});

test('Enter: textarea, select, tugma, havola va boshqa tugmalarda ishlamaydi', () => {
  for (const tagName of ['TEXTAREA', 'SELECT', 'BUTTON', 'A']) {
    assert.equal(enterTolovniTasdiqlaydimi(enter({ tagName }), { mumkin: true, band: false }), false, tagName);
  }
  assert.equal(enterTolovniTasdiqlaydimi(enter({ isContentEditable: true }), { mumkin: true, band: false }), false);
  assert.equal(enterTolovniTasdiqlaydimi({ key: 'a', target: { tagName: 'INPUT' } }, { mumkin: true, band: false }), false);
  assert.equal(enterTolovniTasdiqlaydimi(enter(undefined, { isComposing: true }), { mumkin: true, band: false }), false);
  assert.equal(enterTolovniTasdiqlaydimi(enter(undefined, { defaultPrevented: true }), { mumkin: true, band: false }), false);
  assert.equal(enterTolovniTasdiqlaydimi(enter(undefined, { shiftKey: true }), { mumkin: true, band: false }), false);
});

test('posQidiruvigaFokus: ko‘rinadigan qidiruv maydoniga fokus beradi, bo‘lmasa false', () => {
  const chaqiruvlar = [];
  const maydon = (nom, korinadi) => ({ offsetParent: korinadi ? {} : null, focus: (opsiya) => chaqiruvlar.push([nom, opsiya]) });
  let selector = '';
  const hujjat = (royxat) => ({ querySelectorAll: (s) => { selector = s; return royxat; } });
  assert.equal(posQidiruvigaFokus(hujjat([maydon('yashirin', false), maydon('korinadigan', true)])), true);
  assert.deepEqual(chaqiruvlar, [['korinadigan', { preventScroll: true }]]);
  assert.ok(selector.includes(POS_QIDIRUV_BELGISI));
  assert.equal(posQidiruvigaFokus(hujjat([])), false);
  // Hech biri ko‘rinmasa ham birinchisiga urinadi.
  chaqiruvlar.length = 0;
  assert.equal(posQidiruvigaFokus(hujjat([maydon('birinchi', false)])), true);
  assert.equal(chaqiruvlar[0][0], 'birinchi');
});

function tsxFayllar(papka) {
  return readdirSync(papka).flatMap((nom) => {
    const yol = join(papka, nom);
    return statSync(yol).isDirectory() ? tsxFayllar(yol) : yol.endsWith('.tsx') ? [yol] : [];
  });
}

test('faqat ikonkali tugmalarda (X, Trash2, Edit3, Pencil, Download, MoreHorizontal) aria-label bor', () => {
  const belgilanishi = new Set(['X', 'Trash2', 'Edit3', 'Pencil', 'Download', 'MoreHorizontal']);
  const topilmadi = [];
  for (const fayl of tsxFayllar(new URL('../src', import.meta.url).pathname)) {
    const sf = ts.createSourceFile(fayl, readFileSync(fayl, 'utf8'), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    (function yur(n) {
      if (ts.isJsxElement(n) && n.openingElement.tagName.getText() === 'button') {
        const props = n.openingElement.attributes.properties;
        const nomlar = props.map((p) => p.name?.getText());
        const belgili = nomlar.some((a) => ['aria-label', 'aria-labelledby', 'title'].includes(a)) || props.some((p) => ts.isJsxSpreadAttribute(p));
        const bolalar = n.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()));
        const faqatIkonka = bolalar.length > 0 && bolalar.every((c) => ts.isJsxSelfClosingElement(c) && belgilanishi.has(c.tagName.getText()));
        if (!belgili && faqatIkonka) topilmadi.push(`${fayl}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
      ts.forEachChild(n, yur);
    })(sf);
  }
  assert.deepEqual(topilmadi, []);
});

test('aria-label kalitlari uz va ru common.json da bor', () => {
  for (const til of ['uz', 'ru']) {
    const actions = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/common.json`, import.meta.url), 'utf8')).actions;
    for (const kalit of ['close', 'delete', 'edit', 'download', 'more', 'remove', 'clear', 'cancel', 'copyLink', 'linkCopied', 'downloadModal', 'openExternal']) {
      assert.ok(actions[kalit], `${til}.actions.${kalit}`);
    }
  }
});

test('modal panellari kichik ekranda scroll qiladi va sidebar chekinishi faqat md dan', () => {
  const oqish = (yol) => readFileSync(new URL(`../src/${yol}`, import.meta.url), 'utf8');
  for (const yol of ['Pages/Mahsulotlar/index.tsx', 'Pages/Ombor/Kompaniyalar.tsx', 'Pages/SozlamalarUchot/FiliallarBolimi.tsx']) {
    assert.match(oqish(yol), /max-h-\[90dvh\] overflow-y-auto/, yol);
  }
  for (const fayl of tsxFayllar(new URL('../src', import.meta.url).pathname)) {
    assert.doesNotMatch(readFileSync(fayl, 'utf8'), /py-4 pl-\[88px\]/, fayl);
  }
  assert.match(oqish('Pages/Savdo/SotuvTafsilotlariModal.tsx'), /pl-4 pr-4 md:pl-\[88px\]/);
  assert.match(oqish('Pages/XaridorUchot/XaridorModal.tsx'), /pl-4 pr-4 md:pl-\[88px\]/);
});
