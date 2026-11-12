import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as dates from '../src/lib/hujjatSanasi.ts';
import * as cash from '../src/lib/cashReports.ts';
import * as kassaTahriri from '../src/lib/kassaTahriri.ts';
import * as asosiyValyutaModuli from '../src/lib/asosiyValyuta.ts';

// Valyuta rejimi (backend 11.11.2026) — kassa amaliyoti oynasi: Faqat so'm / Faqat dollar rejimida valyuta va "qaysi qarz" tanlovlari,
// kurs maydoni yashirin, kurs talab qilinmaydi, `currency` va `settleCurrency` rejim valyutasida yuboriladi. Ikki valyuta rejimi o'zgarmaydi.

const require = createRequire(import.meta.url);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' ? [] : [value, ...nodes(value.props?.children)];
const text = value => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text(value.props?.children) : String(value ?? '');
const same = (left, right) => left && right && left.length === right.length && left.every((item, i) => Object.is(item, right[i]));

function page(path, dependencies, props = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  let cursor = 0;
  const slots = [], pending = [];
  const react = {
    useId: () => 'kassa-rejim-test',
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { return react.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps }; pending.push(() => { slots[i].cleanup = fn(); }); } },
  };
  const context = { exports: {}, window: { addEventListener() {}, removeEventListener() {} }, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === '@/lib/hujjatSanasi') return { ...dates, bugungiToshkentKuni: () => '2026-11-11' };
    if (name === '@/lib/cashReports') return cash;
    if (name === '@/api/sozlamalarApi') return { getApiErrorMessage: String };
    // Kassa amaliyoti oynasidagi amallar (11.11.2026): router, davr yopilishi, rol va amallar mantig'i.
    if (name === '@/store/davrStore') return { useDavrStore: selector => selector({ holat: null, yuklash: async () => {} }) };
    if (name === '@/lib/kassaTahriri') return kassaTahriri;
    if (name === '@/lib/asosiyValyuta') return asosiyValyutaModuli;
    if (name === '@/lib/roles') return { rolniNormallashtirish: value => String(value ?? '').toUpperCase() };
    if (name === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams(), () => {}], useNavigate: () => () => {}, Link: 'Link' };
    if (name in dependencies) return dependencies[name];
    return new Proxy({ __esModule: true, default: name.split('/').at(-1) }, { get(target, key) { return target[key] ?? String(key); } });
  } };
  runInNewContext(compiled, context);
  const render = () => { cursor = 0; return context.exports.default(props); };
  return { render, async settle() { render(); pending.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); return render(); } };
}

const PARTIYA = { taminot_tolovi: 'yetkazib', xaridor_tolovi: 'xaridor', xaridorga_qaytarish: 'xaridor' };

function kassaModal({ rejim, boshlangich = null, boshlangichTuri = 'taminot_tolovi', mijozlar = [], onSaqlash }) {
  const fxHolat = { oxirgi: null };
  const fx = { xato: key => fxHolat.oxirgi?.[key], ornat: value => { fxHolat.oxirgi = value; }, tozala() {}, serverdan() {} };
  // Do'kon holati xuddi lib/valyuta.ts dagidek: rejimYoniq faqat DUAL da, bir valyutali rejimda asosiyValyuta = rejim valyutasi; kurs yo'q.
  const holat = {
    rejim,
    rejimYoniq: rejim === 'DUAL',
    asosiyValyuta: rejim === 'USD_ONLY' ? 'USD' : 'UZS',
    kursBor: false,
    kurs: 0,
  };
  const screen = page('../src/Pages/KassaUchot/KassaAmaliyotModal.tsx', {
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/hooks/useMaydonXatolari': { useMaydonXatolari: () => fx },
    '@/hooks/useOzgarishBormi': { useOzgarishBormi: () => false },
    '@/lib/maydonXatolari': { xatoBelgisi: () => 0, belgidanKeyingiXato: () => undefined },
    '@/lib/kursChegarasi': { ENG_KAM_KURS: 1000, kursJudaKichik: value => value > 0 && value < 1000 },
    '@/lib/valyuta': { useValyutaStore: selector => selector(holat), valyutaKodi: value => (value === 'USD' ? 'USD' : 'UZS') },
    '@/store/authProfileStore': { useAuthProfileStore: selector => selector({ profil: { id: 'u1', username: 'kassir' }, profilniYuklash: async () => {} }) },
    '@/api/partnersApi': { mijozlarApi: { royxat: async () => mijozlar }, yetkazibBeruvchilarApi: { royxat: async () => [{ id: 'sup1', name: 'Taminotchi' }] } },
    '@/api/accountsApi': { foydalanuvchilarApi: { royxat: async () => [] } },
    './yordamchilar': {
      hozir: () => '2026-11-11T10:00', izohMajburiy: () => false, kassaSummasi: (summa, valyuta) => `${summa} ${valyuta ?? 'UZS'}`, keyingiRaqam: () => 'FP1', maydonKlass: '',
      partiyaTuri: turi => PARTIYA[turi] ?? null,
      turYonalishi: { taminot_tolovi: 'chiqim', boshqa_kirim: 'tushum', xaridor_tolovi: 'tushum', xaridorga_qaytarish: 'chiqim' },
      valyutaTanlanadiganTur: turi => turi === 'taminot_tolovi' || turi === 'xaridor_tolovi' || turi === 'xaridorga_qaytarish', yangiId: () => 'ks-1',
    },
  }, { boshlangich, boshlangichKanal: 'naqd', boshlangichTuri, onYopish() {}, onSaqlash });
  return { screen, fxHolat };
}

const tugma = (tree, matn) => nodes(tree).find(node => node.type === 'button' && text(node) === matn);
const summaMaydoni = tree => nodes(tree).find(node => node.type === 'SummaMaydoni');
const yetkazibTanlash = tree => nodes(tree).find(node => node.type === 'Tanlov' && node.props.qiymat === '').props.onChange('sup1');
const kalitBormi = (tree, kalit) => nodes(tree).some(node => typeof node.props?.label === 'string' && node.props.label === kalit) || JSON.stringify(text(tree)).includes(kalit);

async function saqla(screen, tree) {
  tugma(tree, 'common:actions.save').props.onClick();
  await new Promise(resolve => setImmediate(resolve));
}

test("Faqat dollar: valyuta/qarz tanlovi va kurs yo'q, kurssiz ham dollarda saqlanadi, currency va settleCurrency = USD", async () => {
  const saqlanganlar = [];
  const { screen, fxHolat } = kassaModal({ rejim: 'USD_ONLY', onSaqlash: amaliyot => { saqlanganlar.push(amaliyot); } });
  let tree = await screen.settle();
  yetkazibTanlash(tree);
  tree = screen.render();
  assert.equal(tugma(tree, 'modal.currencyUsd'), undefined, "valyuta tanlovi yashirin");
  assert.equal(tugma(tree, 'modal.currencyUzs'), undefined, "qarz valyutasi tanlovi yashirin");
  assert.equal(kalitBormi(tree, 'modal.rateLabel'), false, "kurs maydoni chiqmaydi");
  assert.equal(summaMaydoni(tree).props.kasr, 2, 'dollar summa kasr bilan');
  assert.ok(kalitBormi(tree, 'modal.amountLabelCurrency'), 'summa yorlig\'i valyuta bilan ($)');
  summaMaydoni(tree).props.onChange('150.5');
  tree = screen.render();
  await saqla(screen, tree);
  assert.equal(fxHolat.oxirgi?.amount, undefined, "kurs yo'qligi uchun bloklanmaydi");
  assert.equal(saqlanganlar.length, 1);
  assert.equal(saqlanganlar[0].valyuta, 'USD');
  assert.equal(saqlanganlar[0].hisobValyutasi, 'USD');
  assert.equal(saqlanganlar[0].kurs, undefined);
});

test("Faqat dollar: tanlovsiz tur (boshqa kirim) ham aniq USD bilan yuboriladi", async () => {
  const saqlanganlar = [];
  const { screen } = kassaModal({ rejim: 'USD_ONLY', boshlangichTuri: 'boshqa_kirim', onSaqlash: amaliyot => { saqlanganlar.push(amaliyot); } });
  let tree = await screen.settle();
  summaMaydoni(tree).props.onChange('20');
  tree = screen.render();
  await saqla(screen, tree);
  assert.equal(saqlanganlar.length, 1);
  assert.equal(saqlanganlar[0].valyuta, 'USD');
  assert.equal(saqlanganlar[0].hisobValyutasi, undefined);
});

test("Faqat so'm: tanlovlar yashirin, yorliq avvalgidek, so'mda yuboriladi", async () => {
  const saqlanganlar = [];
  const { screen } = kassaModal({ rejim: 'UZS_ONLY', onSaqlash: amaliyot => { saqlanganlar.push(amaliyot); } });
  let tree = await screen.settle();
  yetkazibTanlash(tree);
  tree = screen.render();
  assert.equal(tugma(tree, 'modal.currencyUsd'), undefined);
  assert.equal(nodes(tree).find(node => node.props?.label === 'modal.amountLabel') !== undefined, true, "yorliq avvalgidek \"Summa (so'm)\"");
  assert.equal(summaMaydoni(tree).props.kasr, 0);
  summaMaydoni(tree).props.onChange('450000');
  tree = screen.render();
  await saqla(screen, tree);
  assert.equal(saqlanganlar[0].valyuta, 'UZS');
  assert.equal(saqlanganlar[0].hisobValyutasi, 'UZS');
});

test("Faqat so'm: dollarda saqlangan eski qoralama tahrirlansa so'mda yuboriladi va ogohlantirish chiqadi", async () => {
  const saqlanganlar = [];
  const boshlangich = {
    id: 'op-1', kanal: 'naqd', yonalish: 'chiqim', turi: 'taminot_tolovi', holat: 'qoralama', supplierId: 'sup1', raqam: 'OP-1',
    nomi: "To'lov", kontragent: 'Taminotchi', summa: 100, valyuta: 'USD', hisobValyutasi: 'USD', kurs: 12500, sana: '2026-11-10',
    masul: 'kassir', izoh: '', backendSource: 'CASH_OPERATION', backendRefId: 'op-1',
  };
  const { screen } = kassaModal({ rejim: 'UZS_ONLY', boshlangich, boshlangichTuri: 'taminot_tolovi', onSaqlash: amaliyot => { saqlanganlar.push(amaliyot); } });
  let tree = await screen.settle();
  tugma(tree, 'common:actions.edit').props.onClick();
  tree = screen.render();
  assert.ok(text(tree).includes('modal.modeCurrencyChanged'), 'summani tekshirish ogohlantirishi');
  await saqla(screen, tree);
  assert.equal(saqlanganlar.length, 1);
  assert.equal(saqlanganlar[0].valyuta, 'UZS');
  assert.equal(saqlanganlar[0].hisobValyutasi, 'UZS');
  assert.equal(saqlanganlar[0].kurs, undefined, 'eski kurs yuborilmaydi');
});

test("Faqat dollar: mijoz to'lovida qarz taqsimoti oldindan ko'rish so'rovi USD bilan, kurssiz", async () => {
  const mijozlar = [{ id: 'c1', firstName: 'Ali', phone: '+998', balance: -50, balanceCurrency: 'USD' }];
  const { screen } = kassaModal({ rejim: 'USD_ONLY', boshlangichTuri: 'xaridor_tolovi', mijozlar, onSaqlash() {} });
  let tree = await screen.settle();
  nodes(tree).find(node => node.type === 'Tanlov' && node.props.qiymat === '').props.onChange('c1');
  tree = screen.render();
  summaMaydoni(tree).props.onChange('30');
  tree = screen.render();
  const panel = nodes(tree).find(node => node.type === 'QarzTaqsimotiPaneli');
  assert.ok(panel);
  assert.equal(panel.props.currency, 'USD');
  assert.equal(panel.props.rate, undefined);
  assert.equal(tugma(tree, 'modal.currencyUsd'), undefined);
});

test("Ikki valyuta: tanlovsiz tur avvalgidek currency'siz yuboriladi, $ tanlovi ko'rinadi", async () => {
  const saqlanganlar = [];
  const { screen } = kassaModal({ rejim: 'DUAL', boshlangichTuri: 'boshqa_kirim', onSaqlash: amaliyot => { saqlanganlar.push(amaliyot); } });
  let tree = await screen.settle();
  summaMaydoni(tree).props.onChange('1000');
  tree = screen.render();
  await saqla(screen, tree);
  assert.equal(saqlanganlar[0].valyuta, undefined);
  assert.equal(saqlanganlar[0].hisobValyutasi, undefined);

  const ikkinchi = kassaModal({ rejim: 'DUAL', onSaqlash() {} });
  let daraxt = await ikkinchi.screen.settle();
  yetkazibTanlash(daraxt);
  daraxt = ikkinchi.screen.render();
  assert.ok(tugma(daraxt, 'modal.currencyUsd'), '$ tanlovi DUAL da qoladi');
});
