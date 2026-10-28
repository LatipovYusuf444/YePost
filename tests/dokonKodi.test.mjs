import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOKON_KODI_KERAK_KODI,
  dokonKodiKerakmi,
  dokonKodiniSaqlash,
  dokonKodiniTozalash,
  loginMalumoti,
  saqlanganDokonKodi,
} from '../src/lib/dokonKodi.ts';

function soxtaBrauzer(boshlangich = {}) {
  const xotira = new Map(Object.entries(boshlangich));
  globalThis.window = {
    localStorage: {
      getItem: (kalit) => (xotira.has(kalit) ? xotira.get(kalit) : null),
      setItem: (kalit, qiymat) => void xotira.set(kalit, String(qiymat)),
      removeItem: (kalit) => void xotira.delete(kalit),
    },
  };
  return xotira;
}

test('login so‘rovi: do‘kon kodi kiritilsa `workspace` bilan, bo‘sh bo‘lsa umuman yuborilmaydi', () => {
  assert.deepEqual(loginMalumoti('jamol', 'sir123', 'tepa-dokon'), { workspace: 'tepa-dokon', username: 'jamol', password: 'sir123' });
  assert.deepEqual(loginMalumoti('jamol', 'sir123', ''), { username: 'jamol', password: 'sir123' });
  assert.deepEqual(loginMalumoti('jamol', 'sir123', '   '), { username: 'jamol', password: 'sir123' });
  assert.deepEqual(loginMalumoti('jamol', 'sir123'), { username: 'jamol', password: 'sir123' });
  assert.equal('workspace' in loginMalumoti('jamol', 'sir123', null), false);
});

test('do‘kon kodining chetidagi bo‘sh joylar kesiladi, registr o‘zgarmaydi', () => {
  assert.equal(dokonKodiniTozalash('  Tepa-Dokon \n'), 'Tepa-Dokon');
  assert.equal(dokonKodiniTozalash(null), '');
  assert.equal(dokonKodiniTozalash(undefined), '');
  assert.equal(loginMalumoti('jamol', 'x', ' my-shop ').workspace, 'my-shop');
});

test('parol hech qachon o‘zgartirilmaydi (bo‘sh joylar ham saqlanadi)', () => {
  assert.equal(loginMalumoti('jamol', ' sir 123 ', 'a').password, ' sir 123 ');
});

test('faqat errors.user.workspace_required "kod kerak" hisoblanadi', () => {
  const xato = (code, status = 400) => ({ response: { status, data: { code } } });
  assert.equal(DOKON_KODI_KERAK_KODI, 'errors.user.workspace_required');
  assert.equal(dokonKodiKerakmi(xato('errors.user.workspace_required')), true);
  assert.equal(dokonKodiKerakmi(xato('errors.user.invalid_credentials', 401)), false);
  assert.equal(dokonKodiKerakmi(xato('errors.tenant.workspace_inactive', 401)), false);
  assert.equal(dokonKodiKerakmi(new Error('tarmoq')), false);
  assert.equal(dokonKodiKerakmi(null), false);
  assert.equal(dokonKodiKerakmi(undefined), false);
  assert.equal(dokonKodiKerakmi({ response: {} }), false);
});

test('muvaffaqiyatli kirishdan keyin kod eslab qolinadi va keyingi safar o‘qiladi', () => {
  soxtaBrauzer();
  assert.equal(saqlanganDokonKodi(), '');
  dokonKodiniSaqlash('  tepa-dokon ');
  assert.equal(saqlanganDokonKodi(), 'tepa-dokon');
});

test('kod olib tashlangan bo‘lsa (bo‘sh kirish) saqlangani o‘chiriladi', () => {
  const xotira = soxtaBrauzer({ 'yepost-dokon-kodi': 'eski-kod' });
  assert.equal(saqlanganDokonKodi(), 'eski-kod');
  dokonKodiniSaqlash('');
  assert.equal(saqlanganDokonKodi(), '');
  assert.equal(xotira.has('yepost-dokon-kodi'), false);
});

test('brauzer saqlashga ruxsat bermasa — xato tashlanmaydi, kod bo‘sh', () => {
  const buzuq = () => { throw new Error('SecurityError'); };
  globalThis.window = { localStorage: { getItem: buzuq, setItem: buzuq, removeItem: buzuq } };
  assert.equal(saqlanganDokonKodi(), '');
  assert.doesNotThrow(() => dokonKodiniSaqlash('tepa-dokon'));
  assert.doesNotThrow(() => dokonKodiniSaqlash(''));
});
