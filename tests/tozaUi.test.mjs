import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hujjatRaqamiMatni, RAQAM_YOQ } from "../src/lib/hujjatRaqamiMatni.ts";
import { muvaffaqiyatKaliti } from "../src/lib/muvaffaqiyatToasti.ts";
import { blobXatosiniOqish } from "../src/lib/blobXatosi.ts";
import { gildirakSonniOzgartirmasin } from "../src/lib/sonMaydoniGildiragi.ts";
import { foydalanuvchiAdminmi } from "../src/lib/roles.ts";

const oqi = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), "utf8");
const json = (til, nom) => JSON.parse(oqi(`src/i18n/locales/${til}/${nom}.json`));
const yoli = (obyekt, kalit) => kalit.split(".").reduce((x, k) => (x == null ? x : x[k]), obyekt);

// U1 / U4 / U10 -----------------------------------------------------------------------------------------------------------

test("U1: kassirga API yo'llari ko'rsatilmaydi", () => {
  for (const til of ["uz", "ru"]) {
    const matn = JSON.stringify(json(til, "bosh_sahifa"));
    assert.ok(!matn.includes("/sales"), `${til}: /sales yo'li`);
    assert.equal(yoli(json(til, "bosh_sahifa"), "paymentModal.apiNote"), undefined);
  }
  assert.ok(!oqi("src/Pages/BoshSahifa/index.tsx").includes("paymentModal.apiNote"));
});

test("U4: texnik tugmalar olib tashlangan, xom JSON maydoni faqat ADMIN/DIREKTOR'ga", () => {
  assert.ok(!oqi("src/Components/common/AppModal.tsx").includes("text/plain"));
  assert.ok(!oqi("src/Components/common/AppModal.tsx").includes(".txt"));
  assert.ok(!oqi("src/Components/common/ModalActionRail.tsx").includes("yuklab olish"));
  assert.ok(!oqi("src/Pages/XaridorUchot/TezkorPanel.tsx").includes("application/json"));
  assert.ok(!oqi("src/Pages/Mahsulotlar/index.tsx").includes("const parametrlarKerak=editing&&"));
  assert.ok(oqi("src/Pages/Mahsulotlar/index.tsx").includes("foydalanuvchiAdminmi("));
  assert.equal(foydalanuvchiAdminmi({ role: "ADMIN" }), true);
  assert.equal(foydalanuvchiAdminmi({ role: "director" }), true);
  assert.equal(foydalanuvchiAdminmi({ role: "CASHIER" }), false);
  assert.equal(foydalanuvchiAdminmi({ roleName: "OMBORCHI" }), false);
  assert.equal(foydalanuvchiAdminmi(null), false);
});

test("U10: so'm belgisi bir xil (so'm / сум), 'uzs' va 'UZS' matn sifatida chiqmaydi", () => {
  assert.equal(json("uz", "bosh_sahifa").customer.currency, "so'm");
  assert.equal(json("ru", "bosh_sahifa").customer.currency, "сум");
  const manba = oqi("src/Pages/BoshSahifa/index.tsx");
  assert.ok(!/"uzs"\)/.test(manba));
  // To'lov oynasidagi `somMatni` (" uzs`") #4 bilan bir qatorda o'zgaradi — #4 birlashgach alohida almashtiriladi.
});

// U5 ----------------------------------------------------------------------------------------------------------------------

test("U5: hujjat raqami yo'q bo'lsa chiziqcha, UUID emas", () => {
  assert.equal(hujjatRaqamiMatni(undefined, "", "  ", null), RAQAM_YOQ);
  assert.equal(hujjatRaqamiMatni(), "—");
  assert.equal(hujjatRaqamiMatni(undefined, " SOT-000014 ", "x"), "SOT-000014");
  assert.equal(hujjatRaqamiMatni(null, 15), "15");
  for (const yol of ["src/Pages/Savdo/SotuvHujjatlariTab.tsx", "src/Pages/KassaUchot/index.tsx", "src/Pages/XaridorUchot/XaridorTolovlariTab.tsx", "src/Pages/Ombor/omborYordamchilari.ts"]) {
    assert.ok(!/id\??\.slice\(0, ?8\)/.test(oqi(yol)), yol);
  }
  assert.ok(!oqi("src/Pages/Ombor/KirimTafsilotModal.tsx").includes("hujjat.warehouseId}"));
});

// U9 ----------------------------------------------------------------------------------------------------------------------

function kalitlar(manba, boshlanishi) {
  const topilgan = new Set();
  for (const m of manba.matchAll(/\bt\(\s*["'`]([\w.${}]+)["'`]/g)) if (m[1].startsWith(boshlanishi)) topilgan.add(m[1]);
  return topilgan;
}

test("U9: KunlikKassa, AuditLoglari, MahsulotModal matnlari uz va ru da bor, ruscha matn o'zbekcha emas", () => {
  const rejalar = [
    ["src/Pages/HisobotUchot/KunlikKassa.tsx", "hisobotlar", "kunlikKassa."],
    ["src/Pages/HisobotUchot/AuditLoglari.tsx", "hisobotlar", "auditLog."],
    ["src/Pages/HisobotUchot/MahsulotModal.tsx", "mahsulotlar", "hisobotModal."],
  ];
  for (const [yol, nom, old] of rejalar) {
    const kalitlarRoyxati = kalitlar(oqi(yol), old);
    assert.ok(kalitlarRoyxati.size > 5, yol);
    for (const kalit of kalitlarRoyxati) {
      if (kalit.includes("${")) continue;
      for (const til of ["uz", "ru"]) assert.equal(typeof yoli(json(til, nom), kalit), "string", `${til}:${kalit}`);
    }
  }
  const sarlavha = (obj) => Object.keys(obj).sort().join();
  for (const blok of ["kunlikKassa", "auditLog"]) assert.equal(sarlavha(json("uz", "hisobotlar")[blok]), sarlavha(json("ru", "hisobotlar")[blok]));
  assert.equal(sarlavha(json("uz", "mahsulotlar").hisobotModal), sarlavha(json("ru", "mahsulotlar").hisobotModal));
  for (const kalit of ["columns.cashSom", "columns.totalUsd"]) {
    assert.equal(typeof yoli(json("uz", "hisobotlar").kunlikKassa, kalit), "string");
    assert.equal(typeof yoli(json("ru", "hisobotlar").kunlikKassa, kalit), "string");
  }
  const kunlik = JSON.stringify(json("ru", "hisobotlar").kunlikKassa) + JSON.stringify(json("ru", "hisobotlar").auditLog) + JSON.stringify(json("ru", "mahsulotlar").hisobotModal);
  assert.ok(!/(Kunlik|Yakuniy|Bekor|Saqlanmoqda|Barchasi|Tozalash)/.test(kunlik));
  // Endi qattiq yozilgan o'zbekcha sarlavhalar komponentlarda yo'q.
  assert.ok(!oqi("src/Pages/HisobotUchot/KunlikKassa.tsx").includes(">Kunlik kassa<"));
  assert.ok(!oqi("src/Pages/HisobotUchot/AuditLoglari.tsx").includes(">Amallar tarixi<"));
  assert.ok(!oqi("src/Pages/HisobotUchot/MahsulotModal.tsx").includes("Mahsulotni tahrirlash"));
});

// U11 ---------------------------------------------------------------------------------------------------------------------

test("U11: g'ildirak fokusdagi number maydonni fokusdan chiqaradi, boshqa maydonlarga tegmaydi", () => {
  let blur = 0;
  const son = { tagName: "INPUT", type: "number", blur: () => blur++ };
  assert.equal(gildirakSonniOzgartirmasin({ target: son }, son), true);
  assert.equal(blur, 1);
  // Fokusda emas: sahifa aylanadi, hech narsa qilinmaydi.
  assert.equal(gildirakSonniOzgartirmasin({ target: son }, {}), false);
  const matn = { tagName: "INPUT", type: "text", blur: () => blur++ };
  assert.equal(gildirakSonniOzgartirmasin({ target: matn }, matn), false);
  assert.equal(gildirakSonniOzgartirmasin({ target: { tagName: "DIV" } }, null), false);
  assert.equal(gildirakSonniOzgartirmasin({ target: null }, null), false);
  assert.equal(blur, 1);
  assert.ok(oqi("src/main.tsx").includes("gildirakniOrnatish()"));
});

// M10 ---------------------------------------------------------------------------------------------------------------------

test("M10: toast faqat saqlaydigan so'rovlarda; hisob-kitob/ko'rib chiqish POST'larida yo'q", () => {
  assert.equal(muvaffaqiyatKaliti("post", "/sales"), "created");
  assert.equal(muvaffaqiyatKaliti("POST", "/partners/customers"), "created");
  assert.equal(muvaffaqiyatKaliti("post", "/finance/cash-operations/allocation-preview"), null);
  assert.equal(muvaffaqiyatKaliti("post", "/x/search?q=1"), null);
  assert.equal(muvaffaqiyatKaliti("post", "/crm/notifications/read-all"), null);
  assert.equal(muvaffaqiyatKaliti("post", "/sales/123/confirm"), "saved");
  assert.equal(muvaffaqiyatKaliti("post", "/returns/9/cancel/"), "saved");
  assert.equal(muvaffaqiyatKaliti("put", "/catalog/products/1"), "saved");
  assert.equal(muvaffaqiyatKaliti("patch", "/a"), "saved");
  assert.equal(muvaffaqiyatKaliti("delete", "/a/1"), "deleted");
  assert.equal(muvaffaqiyatKaliti("get", "/a"), null);
  assert.equal(muvaffaqiyatKaliti(undefined, undefined), null);
  for (const til of ["uz", "ru"]) for (const k of ["created", "deleted", "saved"]) assert.equal(typeof json(til, "common").toast[k], "string");
  assert.notEqual(json("uz", "common").toast.created, json("ru", "common").toast.created);
  assert.ok(!oqi("src/api/axios.ts").includes("Muvaffaqiyatli"));
});

// M11 ---------------------------------------------------------------------------------------------------------------------

test("M11: blob xato javobidan backend xabari o'qiladi", async () => {
  const xato = await blobXatosiniOqish(new Blob([JSON.stringify({ message: "Davr juda uzun" })], { type: "application/json" }));
  assert.deepEqual(xato, { message: "Davr juda uzun" });
  assert.deepEqual(await blobXatosiniOqish(new Blob(["Filial topilmadi"])), { message: "Filial topilmadi" });
  const html = new Blob(["<html>502</html>"]);
  assert.equal(await blobXatosiniOqish(html), html);
  const bosh = new Blob([]);
  assert.equal(await blobXatosiniOqish(bosh), bosh);
  const oddiy = { message: "x" };
  assert.equal(await blobXatosiniOqish(oddiy), oddiy);
  assert.equal(await blobXatosiniOqish(undefined), undefined);
  assert.ok(oqi("src/api/axios.ts").includes("blobXatosiniOqish(error.response.data)"));
});
