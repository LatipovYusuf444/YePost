import test from 'node:test';
import assert from 'node:assert/strict';
import { joriyOgohlantirish, ogohlantirishgaJavob, ogohlantirishgaObuna, ogohlantirishniSorash } from '../src/lib/ogohlantirishSorovi.ts';

test('so‘rov navbatga tushadi, "ha" javobi promise ni true bilan hal qiladi', async () => {
  assert.equal(joriyOgohlantirish(), null);
  const hal = ogohlantirishniSorash('Matn', 'INV-1');
  const sorov = joriyOgohlantirish();
  assert.equal(sorov.matn, 'Matn');
  assert.equal(sorov.nom, 'INV-1');
  ogohlantirishgaJavob(sorov.id, true);
  assert.equal(await hal, true);
  assert.equal(joriyOgohlantirish(), null);
});

test('ikki marta javob berilsa (tasdiq + yopish) birinchi javob hisobga olinadi', async () => {
  const hal = ogohlantirishniSorash('Matn');
  const { id } = joriyOgohlantirish();
  ogohlantirishgaJavob(id, true);
  ogohlantirishgaJavob(id, false);
  assert.equal(await hal, true);
});

test('navbat tartibida ishlaydi va obunachilarga xabar beradi', async () => {
  let chaqiruvlar = 0;
  const bekor = ogohlantirishgaObuna(() => { chaqiruvlar += 1; });
  const birinchi = ogohlantirishniSorash('1');
  const ikkinchi = ogohlantirishniSorash('2');
  assert.equal(joriyOgohlantirish().matn, '1');
  ogohlantirishgaJavob(joriyOgohlantirish().id, false);
  assert.equal(await birinchi, false);
  assert.equal(joriyOgohlantirish().matn, '2');
  ogohlantirishgaJavob(joriyOgohlantirish().id, true);
  assert.equal(await ikkinchi, true);
  assert.equal(chaqiruvlar, 4);
  bekor();
});
