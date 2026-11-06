import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const fixture = new URL('./helpers/authLoginClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === '@/api/sozlamalarApi') return { url: fixture, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const xotira = new Map();
const manzillar = [];
globalThis.window = Object.assign(new EventTarget(), {
  localStorage: {
    getItem: (k) => (xotira.has(k) ? xotira.get(k) : null),
    setItem: (k, v) => void xotira.set(k, String(v)),
    removeItem: (k) => void xotira.delete(k),
  },
  location: { assign: (url) => manzillar.push(url) },
  atob: globalThis.atob,
});

const { holat } = await import('./helpers/authLoginClient.mjs');
const lib = await import('../src/lib/sessiyaIzolyatsiyasi.ts');
const { useAuthStore } = await import('../src/store/authStore.ts');

const jwt = (yuk) => `x.${Buffer.from(JSON.stringify(yuk)).toString('base64url')}.y`;
const kelajak = Math.floor(Date.now() / 1000) + 3600;
const tokenlar = (workspaceId, sub, refreshExp = kelajak + 6 * 86400) => ({
  accessToken: jwt({ sub, workspaceId, exp: kelajak }),
  refreshToken: jwt({ sub, workspaceId, exp: refreshExp }),
});
const savatBor = () => {
  xotira.set('yepost-pos-cart', '{"state":{"cart":[{"id":"m1","narx":12100}]}}');
  xotira.set('yepost-valyuta', '{"state":{"kurs":12100}}');
};

test('K4: chiqishda savatcha va valyuta keshi o‘chadi, sahifa /login ga to‘liq qayta yuklanadi', async () => {
  xotira.clear(); manzillar.length = 0;
  holat.tokenlar = tokenlar('ws-a', 'u1');
  await useAuthStore.getState().login({ username: 'kassir', password: 'x' });
  savatBor();
  xotira.set('lang', 'ru');
  await useAuthStore.getState().logout();
  assert.equal(xotira.has('yepost-pos-cart'), false);
  assert.equal(xotira.has('yepost-valyuta'), false);
  assert.equal(xotira.has(lib.SESSIYA_EGASI_KALITI), false);
  assert.equal(xotira.get('lang'), 'ru', 'til tanlovi do‘konga bog‘liq emas, qoladi');
  assert.deepEqual(manzillar, ['/login']);
  assert.equal(useAuthStore.getState().accessToken, null);
});

test('K4: boshqa do‘kon bilan kirish eski savatchani o‘chiradi va to‘liq qayta yuklashni so‘raydi', async () => {
  xotira.clear();
  holat.tokenlar = tokenlar('ws-a', 'u1');
  assert.equal(await useAuthStore.getState().login({ username: 'kassir', password: 'x' }), true, 'birinchi kirish');
  savatBor();
  // A sessiyasi tugadi (axios /login ga yubordi), endi B do'koni bilan kiriladi.
  holat.tokenlar = tokenlar('ws-b', 'u7');
  assert.equal(await useAuthStore.getState().login({ username: 'kassir', password: 'x' }), true);
  assert.equal(xotira.has('yepost-pos-cart'), false);
  assert.equal(xotira.has('yepost-valyuta'), false);
});

test('K4: xuddi shu kassir sessiya tugab qayta kirsa savatcha saqlanadi', async () => {
  xotira.clear();
  holat.tokenlar = tokenlar('ws-a', 'u1');
  await useAuthStore.getState().login({ username: 'kassir', password: 'x' });
  savatBor();
  assert.equal(await useAuthStore.getState().login({ username: 'kassir', password: 'x' }), false);
  assert.equal(xotira.has('yepost-pos-cart'), true);
});

test('M8: sessiya muddati refresh token `exp` iga bog‘lanadi (24 soat emas), o‘qib bo‘lmasa 24 soat', async () => {
  xotira.clear();
  const refreshExp = kelajak + 6 * 86400;
  holat.tokenlar = tokenlar('ws-a', 'u1', refreshExp);
  await useAuthStore.getState().login({ username: 'kassir', password: 'x' });
  assert.equal(useAuthStore.getState().expiresAt, refreshExp * 1000);
  holat.tokenlar = { accessToken: jwt({ sub: 'u1', workspaceId: 'ws-a', exp: kelajak }), refreshToken: 'shaffof-token' };
  const oldin = Date.now();
  await useAuthStore.getState().login({ username: 'kassir', password: 'x' });
  const muddat = useAuthStore.getState().expiresAt - oldin;
  assert.ok(muddat >= 24 * 3600_000 - 1000 && muddat <= 24 * 3600_000 + 1000);
});

test('sessiyaEgasi: token o‘qilmasa login nomiga tayanadi', () => {
  assert.equal(lib.sessiyaEgasi(jwt({ sub: 'u1', workspaceId: 'ws' }), 'a'), 'ws|u1');
  assert.equal(lib.sessiyaEgasi('buzuq', 'kassir'), '|login:kassir');
  assert.equal(lib.tokenMuddati('buzuq'), null);
});
