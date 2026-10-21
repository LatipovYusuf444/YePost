import test from 'node:test';
import assert from 'node:assert/strict';
import { inventarizatsiyaQatorFarqi, inventarizatsiyaQatorXulosasi } from '../src/lib/inventarizatsiyaKorinish.ts';

test('display uses expectedQuantity first, including an explicit zero', () => {
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: '5', expectedQuantity: '3', systemQuantity: 99 }), 2);
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: 2, expectedQuantity: 0, systemQuantity: 10 }), 2);
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: 2, systemQuantity: 5 }), -3);
});

test('missing or invalid quantities are unknown, never a matching count', () => {
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: 4 }), null);
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: 'bad', expectedQuantity: 0 }), null);
  assert.equal(inventarizatsiyaQatorFarqi({ actualQuantity: 4, expectedQuantity: '' }), null);
});

test('summary counts rows without adding quantities from different products or units', () => {
  assert.deepEqual(inventarizatsiyaQatorXulosasi([
    { actualQuantity: 4, expectedQuantity: 3 },
    { actualQuantity: 0, expectedQuantity: 0 },
    { actualQuantity: 1.5, expectedQuantity: 2 },
    { actualQuantity: 5 },
  ]), { jami: 4, mos: 1, ortiqcha: 1, kamomad: 1, noaniq: 1 });
  assert.deepEqual(inventarizatsiyaQatorXulosasi([]), { jami: 0, mos: 0, ortiqcha: 0, kamomad: 0, noaniq: 0 });
});
