import test from 'node:test';
import assert from 'node:assert/strict';
import { kirimYetkazibBeruvchiNomi, kirimYetkazibBeruvchilariniToldirish } from '../src/lib/kirimYetkazibBeruvchi.ts';

test('a partial supplier relation does not hide the complete directory name', () => {
  const document = { supplierId: 's', supplier: { id: 's', name: '  ' } };
  assert.equal(kirimYetkazibBeruvchiNomi(document, [{ id: 's', name: '  Long Supplier Company Full Name  ' }]), 'Long Supplier Company Full Name');
  assert.equal(kirimYetkazibBeruvchiNomi({ supplierId: 's', supplier: { id: 's', name: '', fullName: 'Full Supplier Name' } }), 'Full Supplier Name');
});

test('missing suppliers are hydrated by ID once per list and purchase values stay unchanged', async () => {
  const documents = [
    { id: 'a', supplierId: 'old', items: [{ price: 5, quantity: 2 }], totalAmount: 10, status: 'CONFIRMED' },
    { id: 'b', supplierId: 'old', supplier: { id: 'old' }, currency: 'USD' },
    { id: 'c', supplierId: 'known', supplier: { id: 'known', name: 'Already complete' } },
  ];
  const calls = [];
  const result = await kirimYetkazibBeruvchilariniToldirish(documents, async id => { calls.push(id); return { id, name: 'Original Supplier Full Name' }; });
  assert.deepEqual(calls, ['old']);
  assert.equal(kirimYetkazibBeruvchiNomi(result[0]), 'Original Supplier Full Name');
  assert.equal(kirimYetkazibBeruvchiNomi(result[1]), 'Original Supplier Full Name');
  assert.equal(result[0].items, documents[0].items);
  assert.equal(result[0].totalAmount, 10);
  assert.equal(result[0].status, 'CONFIRMED');
  assert.equal(result[2], documents[2]);
  assert.equal(documents[0].supplier, undefined, 'do not mutate cached purchase objects');
});

test('unavailable suppliers do not break purchases or invent a name from an ID', async () => {
  const documents = [{ id: 'a', supplierId: 'removed' }];
  const result = await kirimYetkazibBeruvchilariniToldirish(documents, async () => { throw new Error('404'); });
  assert.equal(result[0], documents[0]);
  assert.equal(kirimYetkazibBeruvchiNomi(result[0]), '');
});

test('a supplier partner ID can resolve its directory name without confusing another supplier', () => {
  assert.equal(kirimYetkazibBeruvchiNomi({ supplierId: 'partner' }, [{ id: 'supplier', partner: { id: 'partner' }, name: 'Supplier Company' }]), 'Supplier Company');
  assert.equal(kirimYetkazibBeruvchiNomi({ supplierId: 'unknown' }, [{ id: 'supplier', name: 'Wrong Company' }]), '');
  assert.equal(kirimYetkazibBeruvchiNomi({}, [{ id: 'supplier', name: 'Wrong Company' }]), '');
});
