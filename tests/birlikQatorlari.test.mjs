import test from 'node:test';
import assert from 'node:assert/strict';
import { birliklarTanasi } from '../src/lib/kopBirlik.ts';
import { birlikQatorlariImzosi, birlikQatorlariniOlish, birlikRoyxatiniYigish, bosBirlikQatori } from '../src/Pages/Mahsulotlar/birlikQatorlariMantiq.ts';

const kg = { id: 'u-kg', code: 'kg', name: 'Kilogramm', shortName: 'kg', isFractional: true };
const korobka = { id: 'u-korobka', code: 'korobka', name: 'Korobka', shortName: 'korobka', isFractional: false };
const birliklar = [kg, korobka];

test('1 korobka = 3 kg: backendga {units:[{unitId, factor, canReceive, canSell, retailPrice, wholesalePrice, barcode}]} ketadi', () => {
  const qator = { ...bosBirlikQatori(), unitId: 'u-korobka', koeff: '3' };
  const yigilgan = birlikRoyxatiniYigish([qator], birliklar, { unitId: 'u-kg', nomi: 'kg' });
  assert.ok('royxat' in yigilgan);
  assert.deepEqual(birliklarTanasi(yigilgan.royxat), {
    units: [{ unitId: 'u-korobka', factor: 3, canReceive: true, canSell: true, retailPrice: null, wholesalePrice: null, barcode: null }],
  });
});

test('narx, shtrix-kod va vergulli koeffitsient; kirim/sotuv belgilari', () => {
  const qator = { ...bosBirlikQatori(), unitId: 'u-korobka', koeff: '2,5', chakana: '12000', ulgurji: '', shtrix: ' 478123 ', qabul: false, sotuv: true };
  const yigilgan = birlikRoyxatiniYigish([qator], birliklar, { unitId: 'u-kg', nomi: 'kg' });
  assert.deepEqual(birliklarTanasi(yigilgan.royxat).units[0], { unitId: 'u-korobka', factor: 2.5, canReceive: false, canSell: true, retailPrice: 12000, wholesalePrice: null, barcode: '478123' });
});

test('xatolar: birlik tanlanmagan, koeffitsient 0/bo‘sh, takror va asosiy birlikning o‘zi', () => {
  const bosh = bosBirlikQatori();
  assert.deepEqual(birlikRoyxatiniYigish([bosh], birliklar, { unitId: 'u-kg', nomi: 'kg' }), { xato: 'unitRequired' });
  assert.deepEqual(birlikRoyxatiniYigish([{ ...bosh, unitId: 'u-korobka', koeff: '' }], birliklar, { unitId: 'u-kg', nomi: 'kg' }), { xato: 'factorInvalid' });
  assert.deepEqual(birlikRoyxatiniYigish([{ ...bosh, unitId: 'u-korobka', koeff: '0' }], birliklar, { unitId: 'u-kg', nomi: 'kg' }), { xato: 'factorInvalid' });
  const bir = { ...bosBirlikQatori(), unitId: 'u-korobka', koeff: '3' };
  const ikki = { ...bosBirlikQatori(), unitId: 'u-korobka', koeff: '4' };
  assert.deepEqual(birlikRoyxatiniYigish([bir, ikki], birliklar, { unitId: 'u-kg', nomi: 'kg' }), { xato: 'unitDuplicate' });
  const asosiyNing = { ...bosBirlikQatori(), unitId: 'u-kg', koeff: '3' };
  assert.deepEqual(birlikRoyxatiniYigish([asosiyNing], birliklar, { unitId: 'u-kg', nomi: 'kg' }), { xato: 'unitDuplicate' });
});

test('backenddan kelgan birliklar: asosiy tashlanadi, qatorlar qayta yig‘ilganda imzo o‘zgarmaydi', () => {
  const server = [
    { unitId: 'u-kg', kod: 'kg', nomi: 'Kilogramm', qisqa: 'kg', kasr: true, koeff: 1, asosiy: true, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null },
    { unitId: 'u-korobka', kod: 'korobka', nomi: 'Korobka', qisqa: 'korobka', kasr: false, koeff: 3, asosiy: false, qabul: true, sotuv: true, chakana: 45000, ulgurji: null, shtrix: '4780001' },
  ];
  const qatorlar = birlikQatorlariniOlish(server);
  assert.equal(qatorlar.length, 1);
  assert.equal(qatorlar[0].koeff, '3');
  assert.equal(qatorlar[0].chakana, '45000');
  const imzo = birlikQatorlariImzosi(qatorlar);
  assert.equal(imzo, birlikQatorlariImzosi(birlikQatorlariniOlish(server)));
  // o'zgartirilsa imzo o'zgaradi, kalit hisobga olinmaydi
  assert.notEqual(imzo, birlikQatorlariImzosi([{ ...qatorlar[0], koeff: '4' }]));
  assert.equal(birlikQatorlariImzosi([{ ...qatorlar[0], koeff: '3.0' }]), imzo.replace('"3"', '"3.0"'));
  assert.equal(birlikQatorlariImzosi([]), '[]');
  // PUT tanasi serverdagi bilan bir xil
  assert.deepEqual(birliklarTanasi(birlikRoyxatiniYigish(qatorlar, birliklar, { unitId: 'u-kg', nomi: 'kg' }).royxat).units[0],
    { unitId: 'u-korobka', factor: 3, canReceive: true, canSell: true, retailPrice: 45000, wholesalePrice: null, barcode: '4780001' });
});
