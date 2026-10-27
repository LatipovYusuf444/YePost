import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
const { usePosStore, savatchaChegirma, savatchaSotuvNarxi, savatchaNarxTuri } = await import('../src/store/posStore.ts');
const {
  chegirmadanSotuvNarxi, chegirmaFoizi, foizdanChegirma, jadvalXulosasi, kategoriyaFiltri, shtrixKodTopish,
} = await import('../src/Pages/BoshSahifa/savatchaHisobi.ts');

const qator = (qolgan = {}) => ({ id: 'm1::w1', modificationId: 'm1', nom: 'iPhone 15', narx: 1000000, chakanaNarx: 1000000, ulgurjiNarx: 900000, qoldiq: 10, soni: 1, ...qolgan });

test('xulosa: qatorlar soni, umumiy miqdor, narx chegirmalari va sotuv narxlaridagi jami', () => {
  const cart = [qator({ soni: 2, sotuvNarxi: 950000 }), qator({ id: 'b', narx: 500, soni: 3 })];
  assert.deepEqual(jadvalXulosasi(cart), { mahsulotlar: 2, miqdor: 5, chegirma: 100000, jami: 1900000 + 1500 });
  assert.deepEqual(jadvalXulosasi([]), { mahsulotlar: 0, miqdor: 0, chegirma: 0, jami: 0 });
});

test('chegirma so‘mda: sotuv narxiga aylanadi va savatcha shu chegirmani qaytaradi', () => {
  for (const [narx, soni, chegirma] of [[1000000, 1, 50000], [1000000, 3, 120000], [99900, 7, 1000], [18000, 12.5, 333]]) {
    const item = qator({ narx, soni });
    const sotuvNarxi = chegirmadanSotuvNarxi(item, chegirma);
    assert.equal(savatchaChegirma({ ...item, sotuvNarxi }), chegirma, `${narx} × ${soni} − ${chegirma}`);
  }
  // 0, manfiy yoki noto'g'ri chegirma — katalog narxiga qaytish
  for (const bad of [0, -5, NaN, undefined]) assert.equal(chegirmadanSotuvNarxi(qator(), bad), undefined);
});

test('chegirma qator jamidan oshsa sotuv narxi 0 bo‘lmaydi (kamida 1 so‘m)', () => {
  const item = qator({ narx: 1000, soni: 2 });
  const sotuvNarxi = chegirmadanSotuvNarxi(item, 999999);
  assert.equal(sotuvNarxi, 1);
  assert.equal(savatchaSotuvNarxi({ ...item, sotuvNarxi }), 1);
});

test('chegirma foizda: so‘mga va qaytib foizga aylanadi', () => {
  const item = qator({ narx: 200000, soni: 3 });
  assert.equal(foizdanChegirma(item, 10), 60000);
  assert.equal(foizdanChegirma(item, 150), 600000, 'foiz 100 dan oshmaydi');
  assert.equal(foizdanChegirma(item, 0), 0);
  const sotuvNarxi = chegirmadanSotuvNarxi(item, foizdanChegirma(item, 12.5));
  assert.equal(chegirmaFoizi({ ...item, sotuvNarxi }), 12.5);
  assert.equal(chegirmaFoizi(item), 0);
  assert.equal(chegirmaFoizi({ ...item, sotuvNarxi: 250000 }), 0, 'ustama chegirma emas');
});

const iphone = { modificationId: 'm-ip', productId: 'p-ip', modification: { id: 'm-ip', barcode: ' 4000111 ', article: 'IP-15', product: { id: 'p-ip', name: 'iPhone 15' } } };
const samsung = { modificationId: 'm-sm', productId: 'p-sm', modification: { id: 'm-sm', barcode: '4000222', product: { id: 'p-sm', name: 'Samsung S24' } } };
const idsiz = { modificationId: 'm-x', modification: { id: 'm-x', product: { id: '', name: 'Nomsiz' } } };

test('kategoriya filtri: faqat shu kategoriya mahsulotlari; filtr yo‘q (null) bo‘lsa hammasi', () => {
  const hammasi = [iphone, samsung, idsiz];
  assert.deepEqual(kategoriyaFiltri(hammasi, new Set(['p-ip'])), [iphone]);
  assert.deepEqual(kategoriyaFiltri(hammasi, new Set(['p-ip', 'p-sm'])), [iphone, samsung]);
  assert.deepEqual(kategoriyaFiltri(hammasi, new Set()), []);
  assert.equal(kategoriyaFiltri(hammasi, null), hammasi);
  // mahsulot id'si modifikatsiyada bo'lmasa, qoldiq qatoridagi productId olinadi
  const faqatQatorda = { modificationId: 'm-y', productId: 'p-ip', modification: { id: 'm-y', product: { id: '', name: '' } } };
  assert.deepEqual(kategoriyaFiltri([faqatQatorda], new Set(['p-ip'])), [faqatQatorda]);
});

test('shtrix-kod: aniq moslik (registrsiz, bo‘sh joylarsiz), artikul ham ishlaydi, topilmasa topilmadi', () => {
  const royxat = [iphone, samsung];
  assert.deepEqual(shtrixKodTopish(royxat, '4000111'), { holat: 'topildi', item: iphone });
  assert.deepEqual(shtrixKodTopish(royxat, '  ip-15 '), { holat: 'topildi', item: iphone });
  assert.deepEqual(shtrixKodTopish(royxat, '4000'), { holat: 'topilmadi' }, 'qisman moslik emas');
  assert.deepEqual(shtrixKodTopish(royxat, ''), { holat: 'topilmadi' });
});

test('qator narx turi: bitta qator ulgurjiga o‘tadi, boshqalari va umumiy tur o‘zgarmaydi', () => {
  const store = usePosStore;
  store.setState({ cart: [], narxTuri: 'chakana' });
  store.getState().addToCart({ ...qator(), id: 'a' }, 1);
  store.getState().addToCart({ ...qator(), id: 'b' }, 1);
  assert.deepEqual(store.getState().cart.map((q) => q.narxTuri), ['chakana', 'chakana']);

  store.getState().setSotuvNarxi('a', 950000);
  store.getState().setItemNarxTuri('a', 'ulgurji');
  const [a, b] = store.getState().cart;
  assert.equal(a.narx, 900000);
  assert.equal(a.narxTuri, 'ulgurji');
  assert.equal(a.sotuvNarxi, undefined, 'katalog narxi o‘zgargach qo‘lda narx tashlanadi');
  assert.equal(b.narx, 1000000);
  assert.equal(store.getState().narxTuri, 'chakana');
  assert.equal(savatchaNarxTuri(a, 'chakana'), 'ulgurji');
  assert.equal(savatchaNarxTuri({}, 'chakana'), 'chakana');

  // Narxi o'zgarmasa (ulgurji narx yo'q — chakana narxga qaytiladi) qo'lda kiritilgan sotuv narxi saqlanadi.
  store.setState({ cart: [qator({ id: 'c', ulgurjiNarx: 0, sotuvNarxi: 990000 })], narxTuri: 'chakana' });
  store.getState().setItemNarxTuri('c', 'ulgurji');
  assert.equal(store.getState().cart[0].sotuvNarxi, 990000);
});

test('umumiy narx turi barcha qatorlarni o‘tkazadi; sahifa ochilganda faqat o‘z turi yo‘q qatorlar tenglashadi', () => {
  const store = usePosStore;
  store.setState({
    narxTuri: 'chakana',
    cart: [qator({ id: 'a', narxTuri: 'ulgurji', narx: 900000 }), qator({ id: 'b' })],
  });
  // sahifa ochilishi: qatorning o'z turi (a — ulgurji) saqlanadi, turi yo'q qator (b) umumiy turga tenglashadi
  store.getState().updatePriceType('chakana', true);
  let [a, b] = store.getState().cart;
  assert.equal(a.narx, 900000);
  assert.equal(a.narxTuri, 'ulgurji');
  assert.equal(b.narxTuri, 'chakana');

  // umumiy tugma: hamma qatorlar shu turga o'tadi
  store.getState().updatePriceType('ulgurji');
  [a, b] = store.getState().cart;
  assert.deepEqual([a.narx, a.narxTuri, b.narx, b.narxTuri], [900000, 'ulgurji', 900000, 'ulgurji']);
  store.getState().updatePriceType('chakana');
  assert.deepEqual(store.getState().cart.map((q) => [q.narx, q.narxTuri]), [[1000000, 'chakana'], [1000000, 'chakana']]);
});

test('mavjud qatorga qayta qo‘shilganda qatorning o‘z narx turi saqlanadi (umumiy tur boshqacha bo‘lsa ham)', () => {
  const store = usePosStore;
  store.setState({ cart: [], narxTuri: 'chakana' });
  store.getState().addToCart({ ...qator(), id: 'a' }, 1);
  store.getState().setItemNarxTuri('a', 'ulgurji');
  // header qidiruvi umumiy (chakana) tur bo'yicha narxlangan mahsulotni qo'shadi
  store.getState().addToCart({ ...qator(), id: 'a' }, 2);
  const a = store.getState().cart[0];
  assert.equal(a.soni, 3);
  assert.equal(a.narxTuri, 'ulgurji');
  assert.equal(a.narx, 900000);
});
