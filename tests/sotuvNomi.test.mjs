import assert from "node:assert/strict";
import test from "node:test";
import { sotuvJadvalNomi, sotuvNomiIzohi, mijozgaMosSotuvNomi } from "../src/lib/sotuvNomi.ts";

test("jadval sotuv va qoralamaning kiritilgan nomini metadata ichidan oladi", () => {
  for (const prefix of ["Sotuv nomi", "Qoralama nomi", "Название продажи", "Название черновика"]) {
    const note = `${prefix}:   Akmal aka buyurtmasi  \nValyuta: UZS\nIzoh: ertaga yetkazish`;
    assert.equal(sotuvJadvalNomi(note, 3), "Akmal aka buyurtmasi");
  }
});

test("eski avtomatik sotuv nomi yangi mijozga moslashadi, qo'lda yozilgan nom saqlanadi", () => {
  assert.equal(mijozgaMosSotuvNomi("Hojiakbar Rahimov uchun yangi sotuv", "Mirmuhsin Rusatamov"), "Mirmuhsin Rusatamov uchun yangi sotuv");
  assert.equal(mijozgaMosSotuvNomi("Hojiakbar Rahimov uchun yangi qoralama", "Mirmuhsin Rusatamov"), "Mirmuhsin Rusatamov uchun yangi qoralama");
  assert.equal(mijozgaMosSotuvNomi("Новая продажа для Hojiakbar", "Mirmuhsin"), "Новая продажа для Mirmuhsin");
  assert.equal(mijozgaMosSotuvNomi("Новая черновик для Hojiakbar", "Mirmuhsin"), "Новая черновик для Mirmuhsin");
  assert.equal(mijozgaMosSotuvNomi("Akmal aka buyurtmasi", "Mirmuhsin"), "Akmal aka buyurtmasi");
  assert.equal(mijozgaMosSotuvNomi("", "Mirmuhsin"), "");
  assert.equal(mijozgaMosSotuvNomi("Hojiakbar uchun yangi sotuv", ""), "Hojiakbar uchun yangi sotuv");
  assert.equal(sotuvJadvalNomi("Sotuv nomi: Hojiakbar uchun yangi sotuv", 1, "Mirmuhsin"), "Mirmuhsin uchun yangi sotuv");
});

test("nomsiz sotuvlarda jadval tartib raqamini ko'rsatadi, izohni nomga aylantirmaydi", () => {
  for (const note of [undefined, "", "   ", "Valyuta: UZS\nIzoh: Sotuv nomi: test", "Mijoz: Akmal", "Sotuv nomi:   \nValyuta: UZS"]) {
    assert.equal(sotuvJadvalNomi(note, 1), "№1");
  }
  assert.equal(sotuvJadvalNomi(undefined, 11), "№11");
  assert.equal(sotuvJadvalNomi(undefined, 41), "№41");
});

test("nom bo'sh bo'lsa backend izohiga nom metadata yozilmaydi", () => {
  assert.equal(sotuvNomiIzohi("   ", "Sotuv nomi"), "");
  assert.equal(sotuvNomiIzohi("  Akmal aka buyurtmasi  ", "Sotuv nomi"), "Sotuv nomi: Akmal aka buyurtmasi");
  assert.equal(sotuvJadvalNomi(sotuvNomiIzohi("Buyurtma №6", "Название продажи"), 2), "Buyurtma №6");
});
