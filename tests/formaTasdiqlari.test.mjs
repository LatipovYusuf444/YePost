import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { joriyOgohlantirish, ogohlantirishgaJavob, ogohlantirishniSorash, tasdiqniSorash } from '../src/lib/ogohlantirishSorovi.ts';

const require = createRequire(import.meta.url);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const same = (left, right) => left && right && left.length === right.length && left.every((item, i) => Object.is(item, right[i]));

// TSX/TS faylni soxta React bilan ishga tushiradi (cashPages.test.mjs usuli): useState/useRef/useEffect qo'lda boshqariladi.
function mount(path, props, dependencies = {}, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let cursor = 0;
  const slots = [], pending = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
  };
  react.useLayoutEffect = react.useEffect;
  const listeners = [];
  const window = {
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
    removeEventListener() {},
  };
  const context = {
    ...globals, exports: {}, window, document: { body: { style: {} }, documentElement: { style: {} }, addEventListener() {}, removeEventListener() {} },
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react-dom') return { createPortal: node => node };
      if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
      if (name in dependencies) return dependencies[name];
      return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get(target, key) { return target[key] ?? String(key); } });
    },
  };
  runInNewContext(compiled, context);
  const render = () => { cursor = 0; return context.exports.default(props); };
  return {
    render,
    listeners,
    exports: context.exports,
    qaytaBoshlash() { cursor = 0; },
    async settle() { render(); pending.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); },
  };
}

const butunlar = tree => nodes(tree).filter(node => node.type === 'button');
const oynaProps = extra => ({
  ikonka: null, sarlavha: 'S', nom: 'N', tavsif: 'T', ortgaMatni: 'Yo\'q', tasdiqMatni: 'Ha', jarayonMatni: '...',
  onYopish() {}, ...extra,
});

test('TasdiqlashOynasi: amal bajarilsa oyna yopiladi', async () => {
  let yopildi = 0;
  const oyna = mount('../src/Components/common/TasdiqlashOynasi.tsx', oynaProps({ onTasdiq: async () => true, onYopish: () => { yopildi += 1; } }));
  await butunlar(await oyna.settle())[1].props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(yopildi, 1);
});

test('TasdiqlashOynasi: hech narsa qaytarmasa (void) ham yopiladi', async () => {
  let yopildi = 0;
  const oyna = mount('../src/Components/common/TasdiqlashOynasi.tsx', oynaProps({ onTasdiq: async () => {}, onYopish: () => { yopildi += 1; } }));
  await butunlar(await oyna.settle())[1].props.onClick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(yopildi, 1);
});

test('TasdiqlashOynasi: amal xato bersa yoki false qaytarsa oyna ochiq qoladi va tugmalar qayta yoqiladi', async () => {
  for (const amal of [async () => { throw new Error('tarmoq'); }, async () => false]) {
    let yopildi = 0;
    const oyna = mount('../src/Components/common/TasdiqlashOynasi.tsx', oynaProps({ onTasdiq: amal, onYopish: () => { yopildi += 1; } }));
    await butunlar(await oyna.settle())[1].props.onClick();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(yopildi, 0, 'oyna yopilmasligi kerak');
    const tugmalar = butunlar(oyna.render());
    assert.equal(tugmalar[0].props.disabled, false);
    assert.equal(tugmalar[1].props.disabled, false, 'qayta urinish mumkin');
  }
});

test('TasdiqlashOynasi: sabab maydoni faqat so\'ralganda chiqadi va yozilgan matn onTasdiq ga uzatiladi', async () => {
  const oddiy = mount('../src/Components/common/TasdiqlashOynasi.tsx', oynaProps({ onTasdiq: async () => true }));
  assert.equal(nodes(await oddiy.settle()).some(node => node.type === 'textarea'), false);

  let olingan = null;
  const oyna = mount('../src/Components/common/TasdiqlashOynasi.tsx', oynaProps({
    sabab: { yorliq: 'Sabab' },
    onTasdiq: async sabab => { olingan = sabab; return true; },
  }));
  const maydon = nodes(await oyna.settle()).find(node => node.type === 'textarea');
  assert.ok(maydon);
  maydon.props.onChange({ target: { value: '  noto\'g\'ri summa ' } });
  await butunlar(oyna.render())[1].props.onClick();
  assert.equal(olingan, 'noto\'g\'ri summa');
});

test('tasdiqniSorash sababni qaytaradi, ogohlantirishniSorash esa avvalgidek boolean', async () => {
  const sorov = tasdiqniSorash('Bekor qilasizmi?', '', { sababYorligi: 'Sabab' });
  const { id, matnlar } = joriyOgohlantirish();
  assert.equal(matnlar.sababYorligi, 'Sabab');
  ogohlantirishgaJavob(id, true, 'xato kiritilgan');
  assert.deepEqual(await sorov, { rozi: true, sabab: 'xato kiritilgan' });

  const oddiy = ogohlantirishniSorash('Davom etamizmi?');
  ogohlantirishgaJavob(joriyOgohlantirish().id, true, 'e\'tibor berilmaydi');
  assert.equal(await oddiy, true);

  const yoq = tasdiqniSorash('Yana?');
  ogohlantirishgaJavob(joriyOgohlantirish().id, false);
  assert.deepEqual(await yoq, { rozi: false, sabab: '' });
});

function appModal(props) {
  return mount('../src/Components/common/AppModal.tsx', { children: null, ...props });
}
const tasdiqOynasi = tree => nodes(tree).find(node => node.type === 'TasdiqlashOynasi');
function esc() {
  const hodisa = { key: 'Escape', toxtatildi: false, stopImmediatePropagation() { this.toxtatildi = true; }, preventDefault() {} };
  return hodisa;
}

test('AppModal: o\'zgarish bo\'lmasa Esc tegilmaydi va tasdiq so\'ralmaydi', async () => {
  const modal = appModal({ onClose() {}, ozgarishBor: false });
  const tree = await modal.settle();
  const tinglovchi = modal.listeners.find(item => item.type === 'keydown' && item.capture);
  assert.ok(tinglovchi, 'Esc capture bosqichida tinglanadi');
  const hodisa = esc();
  tinglovchi.fn(hodisa);
  assert.equal(hodisa.toxtatildi, false);
  assert.equal(tasdiqOynasi(modal.render()), undefined);
  assert.equal(tasdiqOynasi(tree), undefined);
});

test('AppModal: o\'zgarish bor bo\'lsa Esc yopmaydi, tasdiq so\'raydi; "Saqlamasdan yopish" onClose ni chaqiradi', async () => {
  let yopildi = 0;
  const modal = appModal({ onClose: () => { yopildi += 1; }, ozgarishBor: true });
  await modal.settle();
  const hodisa = esc();
  modal.listeners.find(item => item.type === 'keydown' && item.capture).fn(hodisa);
  assert.equal(hodisa.toxtatildi, true, 'modalning o\'z Esc ishlovchisiga yetmaydi');
  assert.equal(yopildi, 0);
  const oyna = tasdiqOynasi(modal.render());
  assert.ok(oyna, 'tasdiq oynasi chiqdi');
  assert.equal(oyna.props.sarlavha, 'unsavedGuard.title');
  await oyna.props.onTasdiq();
  assert.equal(yopildi, 1);
});

test('AppModal: "Oynada qolish" modalni yopmaydi va oyna yo\'qoladi', async () => {
  let yopildi = 0;
  const modal = appModal({ onClose: () => { yopildi += 1; }, ozgarishBor: true });
  await modal.settle();
  modal.listeners.find(item => item.type === 'keydown' && item.capture).fn(esc());
  tasdiqOynasi(modal.render()).props.onYopish();
  await modal.settle();
  assert.equal(tasdiqOynasi(modal.render()), undefined);
  assert.equal(yopildi, 0);
});

test('AppModal: tasdiq oynasi ochiq paytda ikkinchi Esc uni qayta ochmaydi', async () => {
  const modal = appModal({ onClose() {}, ozgarishBor: true });
  await modal.settle();
  const tinglovchi = modal.listeners.find(item => item.type === 'keydown' && item.capture).fn;
  tinglovchi(esc());
  await modal.settle();
  const ikkinchi = esc();
  tinglovchi(ikkinchi);
  assert.equal(ikkinchi.toxtatildi, false, 'tasdiq oynasining o\'z Esc ishlovchisi ishlashi kerak');
});

test('useOzgarishBormi: boshlang\'ich holat bilan solishtiradi, yopiq oynada o\'zgarish yo\'q', () => {
  const modul = mount('../src/hooks/useOzgarishBormi.ts', {});
  const chaqirish = (joriy, faol) => { modul.qaytaBoshlash(); return modul.exports.useOzgarishBormi(joriy, faol); };
  assert.equal(chaqirish({ a: '' }, true), false, 'ochilganda o\'zgarish yo\'q');
  assert.equal(chaqirish({ a: 'x' }, true), true);
  assert.equal(chaqirish({ a: '' }, true), false, 'qaytarilsa yana toza');
  assert.equal(chaqirish({ a: 'x' }, false), false, 'yopiq oyna');
  assert.equal(chaqirish({ a: 'x' }, true), false, 'qayta ochilganda yangi boshlang\'ich holat');
  assert.equal(chaqirish({ a: 'y' }, true), true);
});

test('forma modallari AppModal ga ozgarishBor beradi va yopish tugmalarini belgilaydi', () => {
  const fayllar = [
    '../src/Pages/Ombor/YangiKirimModal.tsx',
    '../src/Pages/Ombor/YangiChiqimModal.tsx',
    '../src/Pages/Ombor/KochirishYaratishModal.tsx',
    '../src/Pages/Ombor/Inventarizatsiya.tsx',
    '../src/Pages/Mahsulotlar/index.tsx',
    '../src/Pages/KassaUchot/KassaAmaliyotModal.tsx',
    '../src/Pages/Savdo/SotuvTafsilotlariModal.tsx',
    '../src/Pages/Savdo/YangiSotuvModal.tsx',
  ];
  for (const fayl of fayllar) {
    const matn = readFileSync(new URL(fayl, import.meta.url), 'utf8');
    assert.match(matn, /<AppModal[^>]*ozgarishBor=\{/, `${fayl}: AppModal ozgarishBor oladi`);
    assert.match(matn, /data-modal-yopish/, `${fayl}: yopish tugmasi belgilangan`);
  }
});

test('foydalanuvchi oynalarida window.confirm/prompt qolmagan (ilova ichidagi TasdiqlashOynasi ishlatiladi)', () => {
  const tekshirish = ['../src/Pages/Savdo/index.tsx', '../src/Pages/Savdo/Savatcha.tsx', '../src/Pages/Mahsulotlar/index.tsx', '../src/Pages/BoshSahifa/index.tsx'];
  for (const fayl of tekshirish) {
    assert.doesNotMatch(readFileSync(new URL(fayl, import.meta.url), 'utf8'), /window\.(confirm|prompt)\(/, fayl);
  }
});

test('Savatcha: sotuvni bekor qilishda sabab API ga avvalgidek yuboriladi', () => {
  const matn = readFileSync(new URL('../src/Pages/Savdo/Savatcha.tsx', import.meta.url), 'utf8');
  assert.match(matn, /cancelDraft\(sotuv\.id, javob\.sabab\.trim\(\) \|\| t\("savatcha\.alerts\.cancelReasonMissing"\)\)/);
});
