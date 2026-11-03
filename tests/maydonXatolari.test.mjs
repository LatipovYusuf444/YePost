import test from 'node:test';
import assert from 'node:assert/strict';
import { apiXatosiniYozish, belgidanKeyingiXato, serverXatoMaydonlari, xatoBelgisi } from '../src/lib/maydonXatolari.ts';

test('only an API error that arrived after the form took its mark is handed to the form', () => {
  apiXatosiniYozish({ message: 'eski' }, '/a');
  const belgi = xatoBelgisi();
  assert.equal(belgidanKeyingiXato(belgi), undefined, 'eski xato formaga tegishli emas');
  apiXatosiniYozish({ message: 'yangi', errors: [{ field: 'customerId', constraints: [{ message: 'Mijoz topilmadi' }] }] }, '/sales');
  assert.deepEqual(belgidanKeyingiXato(belgi), { message: 'yangi', errors: [{ field: 'customerId', constraints: [{ message: 'Mijoz topilmadi' }] }] });
  assert.deepEqual(serverXatoMaydonlari(belgidanKeyingiXato(belgi), {}), { customerId: 'Mijoz topilmadi' });
});

test('row paths, rule keys, code tail and message words', () => {
  const qoidalar = { mijoz: { maydonlar: ['customerId'], kodlar: ['customer'], sozlar: ['mijoz', 'клиент'] } };
  assert.deepEqual(serverXatoMaydonlari({ errors: [{ field: 'customerId', constraints: [{ message: 'x' }] }] }, qoidalar), { mijoz: 'x' });
  assert.deepEqual(serverXatoMaydonlari({ message: 'm', errors: [{ field: 'items[2].quantity' }] }, qoidalar), { 'items.2.quantity': 'm' });
  assert.deepEqual(serverXatoMaydonlari({ code: 'errors.sales.customer_blocked', message: 'Bloklangan' }, qoidalar), { mijoz: 'Bloklangan' });
  assert.deepEqual(serverXatoMaydonlari({ code: 'errors.customer.x', message: 'Boshqa' }, {}), {});
  assert.deepEqual(serverXatoMaydonlari({ code: 'errors.http.400', message: 'Клиент не найден' }, qoidalar), { mijoz: 'Клиент не найден' });
});

test("a background GET failure is not taken as the form's error when the store returns undefined", () => {
  const belgi = xatoBelgisi();
  apiXatosiniYozish({ message: 'fon' }, '/support/unread', 'get');
  assert.equal(belgidanKeyingiXato(belgi, true), undefined);
  assert.deepEqual(belgidanKeyingiXato(belgi), { message: 'fon' });
  apiXatosiniYozish({ message: 'saqlash' }, '/customers', 'post');
  assert.deepEqual(belgidanKeyingiXato(belgi, true), { message: 'saqlash' });
});
