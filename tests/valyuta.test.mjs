import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const stub = new URL('./helpers/valyutaApiStub.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === '@/api/valyutaApi') return { url: stub, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { useValyutaStore, korsatiladiganValyuta, pulMatni, oziValyutadaMatn } = await import('../src/lib/valyuta.ts');
// Kasr va minglik ajratgich tilga bog‘liq: bo‘shliqlar olib tashlanadi, vergul/nuqta farqi e’tiborga olinmaydi.
const tozala = (matn) => matn.replace(/[\s  ]/g, '').replace(',', '.');
const holat = (qism) => useValyutaStore.setState({ hisobotValyutasi: 'UZS', rejimYoniq: true, kurs: 12100, kursBor: true, yuklandi: true, ...qism });

test('hisobot valyutasi UZS (bu do‘kon): rejim yoniq bo‘lsa ham so‘mdagi summa so‘mda, dollarga o‘girilmaydi', () => {
  holat({});
  assert.equal(korsatiladiganValyuta(), 'UZS');
  assert.equal(tozala(pulMatni(728000)), "728000so'm");
  assert.equal(tozala(pulMatni(728000, 'UZS', true)), "728000so'm");
});

test('dollar summa (narx/qator o‘z valyutasi) hisobot valyutasidan qat’i nazar $ da qoladi', () => {
  holat({});
  assert.equal(tozala(pulMatni(100, 'USD')), '$100');
  holat({ hisobotValyutasi: 'USD' });
  assert.equal(tozala(pulMatni(100, 'USD')), '$100');
  holat({ rejimYoniq: false, kursBor: false, kurs: 0 });
  assert.equal(tozala(pulMatni(100, 'USD')), '$100');
});

test('hisobot valyutasi USD: faqat JAMI summalar (pulMatni) bugungi kurs bilan $ ga o‘giriladi', () => {
  holat({ hisobotValyutasi: 'USD' });
  assert.equal(korsatiladiganValyuta(), 'USD');
  assert.equal(tozala(pulMatni(1210000)), '$100');
});

test('rejim o‘chiq yoki kurs yo‘q bo‘lsa hisobot valyutasi USD bo‘lsa ham doim so‘m', () => {
  holat({ hisobotValyutasi: 'USD', rejimYoniq: false });
  assert.equal(korsatiladiganValyuta(), 'UZS');
  assert.equal(tozala(pulMatni(1210000)), "1210000so'm");
  holat({ hisobotValyutasi: 'USD', kursBor: false, kurs: 0 });
  assert.equal(korsatiladiganValyuta(), 'UZS');
});

test('oziValyutadaMatn: hujjat o‘z valyutasida — hisobot valyutasi USD bo‘lsa ham so‘mdagi sotuv so‘mda', () => {
  holat({ hisobotValyutasi: 'USD' });
  assert.equal(tozala(oziValyutadaMatn(728000, 'UZS')), "728000so'm");
  assert.equal(tozala(oziValyutadaMatn(60.169, 'USD')), '$60.17');
  assert.equal(tozala(oziValyutadaMatn(1234.6, 'UZS', true, 'сум')), '1235сум');
  assert.equal(tozala(oziValyutadaMatn(undefined, 'UZS')), "0so'm");
  assert.equal(tozala(oziValyutadaMatn('abc', 'USD')), '$0');
});

test('kursniYuklash: hisobot valyutasi GET /settings/currency dagi reportCurrency dan olinadi (eski tanlov ishlatilmaydi)', async () => {
  holat({ hisobotValyutasi: 'USD', rejimYoniq: false, kursBor: false, kurs: 0, yuklandi: false });
  await useValyutaStore.getState().kursniYuklash();
  const joriy = useValyutaStore.getState();
  assert.equal(joriy.hisobotValyutasi, 'UZS');
  assert.equal(joriy.rejimYoniq, true);
  assert.equal(joriy.kurs, 12100);
  assert.ok(!('valyuta' in joriy) && !('valyutaniTanlash' in joriy), 'foydalanuvchi tanlaydigan ko‘rinish valyutasi qolmagan');
});
