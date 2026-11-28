import test from "node:test";
import assert from "node:assert/strict";
import {
  ertagagaSurish,
  jamiVazifalar,
  kechikishKunlari,
  kunQismlari,
  kunlarBoyichaGuruhlash,
  muddatBoyichaSaralash,
  muddatiOtganmi,
  surishErtagadanKeyinmi,
  vazifaniOlibTashlash,
} from "../src/Pages/BugungiIshlar/bugungiIshlar.ts";

// 2026-11-28 12:00 Toshkent
const HOZIR = new Date("2026-11-28T07:00:00Z");

test("ertagagaSurish: bugungi vazifa ertaga shu vaqtga", () => {
  assert.equal(ertagagaSurish("2026-11-28T15:30:00+05:00", HOZIR), "2026-11-29T15:30:00+05:00");
});

test("ertagagaSurish: muddati o'tgan vazifa ham ertaga (o'tmishda qolmaydi)", () => {
  assert.equal(ertagagaSurish("2026-11-20T09:15:00+05:00", HOZIR), "2026-11-29T09:15:00+05:00");
});

test("ertagagaSurish: ertangi/keyingi vazifa bir kunga suriladi", () => {
  assert.equal(ertagagaSurish("2026-11-29T10:00:00+05:00", HOZIR), "2026-11-30T10:00:00+05:00");
  assert.equal(ertagagaSurish("2026-12-03T18:00:00+05:00", HOZIR), "2026-12-04T18:00:00+05:00");
  assert.equal(surishErtagadanKeyinmi("2026-11-28T15:30:00+05:00", HOZIR), false);
  assert.equal(surishErtagadanKeyinmi("2026-11-29T10:00:00+05:00", HOZIR), true);
});

test("ertagagaSurish: UTC ko'rinishidagi muddat Toshkent vaqtida saqlanadi; muddatsiz — ertaga 10:00", () => {
  // 2026-11-28T19:30Z = 29-noyabr 00:30 Toshkent
  assert.equal(ertagagaSurish("2026-11-28T19:30:00Z", HOZIR), "2026-11-30T00:30:00+05:00");
  assert.equal(ertagagaSurish(undefined, HOZIR), "2026-11-29T10:00:00+05:00");
  assert.equal(ertagagaSurish("bad", HOZIR), "2026-11-29T10:00:00+05:00");
});

test("kechikishKunlari", () => {
  assert.equal(kechikishKunlari("2026-11-28T09:00:00+05:00", HOZIR), 0);
  assert.equal(kechikishKunlari("2026-11-26T09:00:00+05:00", HOZIR), 2);
  assert.equal(kechikishKunlari("2026-11-30T09:00:00+05:00", HOZIR), -2);
  assert.equal(kechikishKunlari(null, HOZIR), null);
});

test("kunlarBoyichaGuruhlash: kunlar va vaqt tartibida, muddatsiz oxirida", () => {
  const guruhlar = kunlarBoyichaGuruhlash([
    { id: "c", dueAt: "2026-12-01T15:00:00+05:00" },
    { id: "x" },
    { id: "a", dueAt: "2026-11-30T18:00:00+05:00" },
    { id: "b", dueAt: "2026-12-01T09:00:00+05:00" },
  ]);
  assert.deepEqual(
    guruhlar.map((g) => [g.kun, g.vazifalar.map((v) => v.id)]),
    [
      ["2026-11-30", ["a"]],
      ["2026-12-01", ["b", "c"]],
      ["", ["x"]],
    ]
  );
});

test("muddatBoyichaSaralash asl ro'yxatni o'zgartirmaydi", () => {
  const asl = [{ id: "2", dueAt: "2026-11-28T12:00:00+05:00" }, { id: "1", dueAt: "2026-11-28T09:00:00+05:00" }];
  assert.deepEqual(muddatBoyichaSaralash(asl).map((v) => v.id), ["1", "2"]);
  assert.equal(asl[0].id, "2");
});

test("kunQismlari", () => {
  assert.deepEqual(kunQismlari("2026-11-28"), { haftaKuni: 6, kun: 28, oy: 10, yil: 2026 });
  assert.equal(kunQismlari("2026-02-30"), null);
  assert.equal(kunQismlari(""), null);
});

test("jamiVazifalar va vazifaniOlibTashlash", () => {
  const tartib = { overdue: [{ id: "1" }], today: [{ id: "2" }, { id: "3" }], tomorrow: [], later: [{ id: "4" }] };
  assert.equal(jamiVazifalar(tartib), 4);
  assert.equal(jamiVazifalar(null), 0);
  const yangi = vazifaniOlibTashlash(tartib, "2");
  assert.deepEqual(yangi.today.map((v) => v.id), ["3"]);
  assert.equal(jamiVazifalar(yangi), 3);
});

test("muddatiOtganmi: bayroq yoki o'tgan muddat", () => {
  assert.equal(muddatiOtganmi({ id: "1", overdue: true, dueAt: "2026-11-29T10:00:00+05:00" }, HOZIR), true);
  assert.equal(muddatiOtganmi({ id: "2", overdue: false, dueAt: "2026-11-28T11:00:00+05:00" }, HOZIR), true);
  assert.equal(muddatiOtganmi({ id: "3", overdue: false, dueAt: "2026-11-28T13:00:00+05:00" }, HOZIR), false);
  assert.equal(muddatiOtganmi({ id: "4" }, HOZIR), false);
});
