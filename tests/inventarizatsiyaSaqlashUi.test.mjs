import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual review handler without mounting API-backed page effects.
const source = readFileSync(new URL('../src/Pages/Ombor/Inventarizatsiya.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('Inventarizatsiya.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function find(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'koribChiqish') handler = node.getText(file);
  ts.forEachChild(node, find);
}
find(file);
assert.ok(handler);
const { outputText } = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } });

function review(summary, action = 'save') {
  const errors = [], steps = [];
  const context = {
    warehouseId: 'warehouse', inventarizatsiyaQatorlari: [{ modificationId: 'a' }, { modificationId: 'b' }],
    sanoqXulosasi: summary,
    store: { xatolikniTozalash() {} },
    setFormaXatosi: error => errors.push(error), setReviewAction: step => steps.push(step),
  };
  runInNewContext(outputText + `\nkoribChiqish(${JSON.stringify(action)});`, context);
  return { errors, steps };
}

test('one counted product and one uncounted product stay in the editor with a specific message', () => {
  for (const action of ['save', 'confirm']) {
    const result = review({ uncounted: ['Cola / Asosiy variant'], invalid: [], counted: 1 }, action);
    assert.equal(result.steps.length, 0, 'incomplete counts must not open the review screen');
    assert.equal(result.errors.at(-1).key, 'inventarizatsiya.createModal.errors.uncounted');
    assert.equal(result.errors.at(-1).params.count, 1);
  }
});

test('invalid quantities stay in the editor and identify the product', () => {
  const result = review({ uncounted: [], invalid: ['Pepsi'], counted: 1 });
  assert.equal(result.steps.length, 0);
  assert.equal(result.errors.at(-1).key, 'inventarizatsiya.createModal.errors.invalidQuantity');
  assert.equal(result.errors.at(-1).params.name, 'Pepsi');
});

test('complete valid counts continue to the selected review action', () => {
  for (const action of ['save', 'confirm']) {
    const result = review({ uncounted: [], invalid: [], counted: 2 }, action);
    assert.deepEqual(result.steps, [action]);
    assert.equal(result.errors.at(-1), null);
  }
});
