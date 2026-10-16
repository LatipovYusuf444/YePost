import test from 'node:test';
import assert from 'node:assert/strict';
import { narxTurlariniTozalash, kassaNarxTurlari, ruxsatEtilganNarxTuri, standartKassaNarxTuri } from '../src/lib/savdoNarxTurlari.ts';

test('the backend order is preserved because the first price type is the default', () => {
  assert.deepEqual(narxTurlariniTozalash({ priceTypes: ['WHOLESALE', 'RETAIL'] }), ['WHOLESALE', 'RETAIL']);
  assert.deepEqual(narxTurlariniTozalash({ priceTypes: ['COST', 'RETAIL', 'WHOLESALE'] }), ['COST', 'RETAIL', 'WHOLESALE']);
  assert.deepEqual(narxTurlariniTozalash({ priceTypes: ['RETAIL', 'RETAIL', 'SPECIAL', 'WHOLESALE'] }), ['RETAIL', 'WHOLESALE']);
});

test('the till starts on the first enabled retail or wholesale type and ignores cost', () => {
  assert.equal(standartKassaNarxTuri(['WHOLESALE', 'RETAIL']), 'ulgurji');
  assert.equal(standartKassaNarxTuri(['RETAIL', 'WHOLESALE']), 'chakana');
  assert.equal(standartKassaNarxTuri(['COST', 'WHOLESALE']), 'ulgurji');
  assert.equal(standartKassaNarxTuri(['COST']), null);
  assert.equal(standartKassaNarxTuri(null), null);
});

test('an empty, malformed or unknown settings response is treated as unknown, never as "nothing allowed"', () => {
  assert.equal(narxTurlariniTozalash({ priceTypes: [] }), null);
  assert.equal(narxTurlariniTozalash({ priceTypes: ['SPECIAL'] }), null);
  assert.equal(narxTurlariniTozalash({}), null);
  assert.equal(narxTurlariniTozalash(null), null);
  assert.equal(narxTurlariniTozalash('RETAIL'), null);
});

test('the till offers exactly the enabled retail and wholesale types', () => {
  assert.deepEqual(kassaNarxTurlari(['RETAIL', 'WHOLESALE']), { chakana: true, ulgurji: true });
  assert.deepEqual(kassaNarxTurlari(['RETAIL']), { chakana: true, ulgurji: false });
  assert.deepEqual(kassaNarxTurlari(['WHOLESALE']), { chakana: false, ulgurji: true });
});

test('unknown settings or cost-only settings keep the till usable instead of blocking every sale', () => {
  assert.deepEqual(kassaNarxTurlari(null), { chakana: true, ulgurji: true });
  assert.deepEqual(kassaNarxTurlari(undefined), { chakana: true, ulgurji: true });
  assert.deepEqual(kassaNarxTurlari(['COST']), { chakana: true, ulgurji: true });
});

test('a disabled selected type switches to the enabled one, an enabled one is left alone', () => {
  assert.equal(ruxsatEtilganNarxTuri('chakana', { chakana: false, ulgurji: true }), 'ulgurji');
  assert.equal(ruxsatEtilganNarxTuri('ulgurji', { chakana: true, ulgurji: false }), 'chakana');
  assert.equal(ruxsatEtilganNarxTuri('ulgurji', { chakana: true, ulgurji: true }), 'ulgurji');
  assert.equal(ruxsatEtilganNarxTuri('chakana', { chakana: true, ulgurji: false }), 'chakana');
});
