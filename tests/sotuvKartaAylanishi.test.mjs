import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/Pages/Savdo/SotuvStatistikasi.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source + '\nexport { AylanadiganValyutaKarta, ValyutaKarta };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : !node || typeof node !== 'object' ? [] : [node, ...nodes(node.props?.children)];
const stat = (savdo, tolov, qarz) => ({ savdo, tolov, qarz, qaytim: 0, savdoSoni: 2, qarzdorSotuvlar: 1, savdoToliq: true, tolovToliq: true, qarzToliq: true });
const natijalar = { USD: stat(274.91, 300, 274.91), UZS: stat(18207200, 15059200, 0) };

function card(tur = 'savdo', overrides = {}) {
  const states = [];
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useId: () => 'card-id', useEffect() {}, useRef: value => ({ current: value }), useMemo: fn => fn(),
  };
  const context = { exports: {}, require(name) {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-i18next') return { useTranslation: () => ({ t: (key, values) => `${key}${values ? JSON.stringify(values) : ''}` }) };
    return new Proxy({}, { get: (_target, key) => String(key) });
  } };
  runInNewContext(compiled, context);
  return { render() { cursor = 0; return context.exports.AylanadiganValyutaKarta({ tur, natijalar, yuklanmoqda: false, ...overrides }); } };
}

test('each money card flips USD → UZS → USD independently and keeps its original amounts', () => {
  const sales = card();
  const payments = card('tolov');
  let tree = sales.render();
  const front = nodes(tree).find(node => node.type?.name === 'ValyutaKarta' && node.props.valyuta === 'USD');
  const back = nodes(tree).find(node => node.type?.name === 'ValyutaKarta' && node.props.valyuta === 'UZS');
  assert.equal(front.props.natija.savdo, 274.91);
  assert.equal(back.props.natija.savdo, 18207200, 'UZS face uses its own statistics, not an exchange-rate conversion');
  const flip = node => nodes(node).find(element => element.type === 'button' && element.props['aria-describedby']);
  assert.match(flip(tree).props['aria-label'], /UZS/);
  flip(tree).props.onClick();
  tree = sales.render();
  assert.match(flip(tree).props['aria-label'], /USD/);
  assert.match(flip(payments.render()).props['aria-label'], /UZS/, 'other card stays on USD');
  flip(tree).props.onClick();
  assert.match(flip(sales.render()).props['aria-label'], /UZS/);
  const rotor = nodes(tree).find(node => node.props?.style?.transformStyle === 'preserve-3d');
  assert.equal(rotor.props.style.transform, 'rotateY(180deg)');
  assert.match(rotor.props.className, /motion-reduce:transition-none/);
  const inactive = nodes(tree).find(node => node.props?.['aria-hidden'] === true && node.props?.inert === true);
  assert.ok(inactive, 'the hidden face is excluded from keyboard and accessibility navigation');
  assert.equal(flip(tree).props.type, 'button', 'native button supports Enter, Space and touch');
});

test('debt list action stays separate from flipping and follows the currently visible currency', () => {
  let opened = 0;
  const debt = card('qarz', { onQarzniKorsatish: () => opened++ });
  let tree = debt.render();
  const action = nodes(tree).find(node => node.type === 'button' && !node.props['aria-describedby']);
  assert.ok(action);
  action.props.onClick();
  assert.equal(opened, 1);
  const flip = nodes(tree).find(node => node.type === 'button' && node.props['aria-describedby']);
  assert.match(flip.props['aria-label'], /UZS/, 'opening debt list does not flip the card');
  flip.props.onClick();
  tree = debt.render();
  assert.equal(nodes(tree).filter(node => node.type === 'button').length, 1, 'UZS zero-debt side has no debt-list action');
});
