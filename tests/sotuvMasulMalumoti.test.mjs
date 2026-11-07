import test from 'node:test';
import assert from 'node:assert/strict';
import { sotuvMasulMalumoti } from '../src/lib/sotuvMasulMalumoti.ts';

test('cashier ID is resolved from the existing directory when the sale has no embedded employee', () => {
  const sale = Object.freeze({ cashierId: 'employee-1' });
  const directory = Object.freeze([Object.freeze({ id: 'employee-1', fullName: 'Employee One', phone: '+998900000001' })]);
  assert.deepEqual(sotuvMasulMalumoti(sale, directory), { nom: 'Employee One', telefon: '+998900000001' });
  assert.equal(sale.responsible, undefined);
});

test('ID-only and partially populated relations do not hide a known employee name or phone', () => {
  const directory = [{ id: 'employee-1', fullName: 'Employee One', phone: '+998900000001' }];
  assert.deepEqual(sotuvMasulMalumoti({ cashierId: 'employee-1', responsible: { id: 'employee-1' } }, directory), { nom: 'Employee One', telefon: '+998900000001' });
  assert.deepEqual(sotuvMasulMalumoti({ responsibleId: 'employee-1', responsible: { id: 'employee-1', fullName: 'Original Name', phone: ' ' } }, directory), { nom: 'Original Name', telefon: '+998900000001' });
  assert.deepEqual(sotuvMasulMalumoti({ responsibleId: 'employee-1', responsible: { id: 'employee-1', name: 'Original Name' } }, directory), { nom: 'Original Name', telefon: '+998900000001' });
});

test('employee first/last names and usernames are supported without displaying UUIDs', () => {
  assert.deepEqual(sotuvMasulMalumoti({ responsible: { id: 'employee-1', firstName: 'Ali', lastName: 'Valiyev', phone: '+998900000001' } }), { nom: 'Ali Valiyev', telefon: '+998900000001' });
  assert.deepEqual(sotuvMasulMalumoti({ responsible: { id: 'employee-1', username: 'employee-login' } }), { nom: 'employee-login', telefon: '-' });
  assert.deepEqual(sotuvMasulMalumoti({ responsible: { id: 'employee-1' } }), { nom: '-', telefon: '-' });
});

test('current profile is used only for matching employee ID, including when directory permission is absent', () => {
  const profile = { id: 'employee-1', fullName: 'Current Employee', phone: '+998900000001' };
  assert.deepEqual(sotuvMasulMalumoti({ cashierId: 'employee-1' }, [], profile), { nom: 'Current Employee', telefon: '+998900000001' });
  assert.deepEqual(sotuvMasulMalumoti({ cashierId: 'employee-2' }, [], profile), { nom: '-', telefon: '-' });
  assert.deepEqual(sotuvMasulMalumoti({}, [], profile), { nom: '-', telefon: '-' });
});

test('explicit responsible ID wins over creator and mismatched embedded/profile data is not substituted', () => {
  const directory = [{ id: 'assigned', fullName: 'Assigned Employee', phone: '+998900000002' }];
  const profile = { id: 'creator', fullName: 'Creator', phone: '+998900000001' };
  assert.deepEqual(sotuvMasulMalumoti({ responsibleId: 'assigned', cashierId: 'creator', responsible: profile }, directory, profile), { nom: 'Assigned Employee', telefon: '+998900000002' });
  assert.deepEqual(sotuvMasulMalumoti({ responsibleId: 'assigned', cashierId: 'creator' }, [], profile), { nom: '-', telefon: '-' });
});

test('blank responsible ID does not block a valid cashier ID, and later directory data fills display fields', () => {
  const sale = Object.freeze({ responsibleId: '', cashierId: 'employee-1' });
  assert.deepEqual(sotuvMasulMalumoti(sale, []), { nom: '-', telefon: '-' });
  assert.deepEqual(sotuvMasulMalumoti(sale, [{ id: 'employee-1', fullName: ' Employee One ', phone: ' +998900000001 ' }]), { nom: 'Employee One', telefon: '+998900000001' });
});

test('customer and walk-in phones are never shown as the responsible employee phone', () => {
  const sale = { cashierId: 'employee-1', customer: { id: 'customer', phone: '+998900000099' }, walkInCustomerPhone: '+998900000098' };
  assert.deepEqual(sotuvMasulMalumoti(sale, [{ id: 'employee-1', fullName: 'Employee One', phone: null }]), { nom: 'Employee One', telefon: '-' });
});
