import test from "node:test";
import assert from "node:assert/strict";
import { mijozMasuli, tahrirMasuli, xodimNomi, yaratishMasuli } from "../src/lib/mijozMasuli.ts";

test("xodimNomi: to'liq ism, ism, ism+familiya, login tartibida", () => {
  assert.equal(xodimNomi({ fullName: " Ali Valiyev ", name: "x" }), "Ali Valiyev");
  assert.equal(xodimNomi({ name: "Ali" }), "Ali");
  assert.equal(xodimNomi({ firstName: "Ali", lastName: "Valiyev" }), "Ali Valiyev");
  assert.equal(xodimNomi({ username: "ali" }), "ali");
  assert.equal(xodimNomi(null), "");
});

test("mijozMasuli: responsibleId yoki responsible.id", () => {
  assert.deepEqual(mijozMasuli({ responsibleId: "u1", responsible: { id: "u1", fullName: "Ali" } }), { id: "u1", nom: "Ali" });
  assert.deepEqual(mijozMasuli({ responsible: { id: "u2", name: "Vali" } }), { id: "u2", nom: "Vali" });
  assert.deepEqual(mijozMasuli({ responsibleId: "u3" }), { id: "u3", nom: "" });
  assert.deepEqual(mijozMasuli({ responsibleId: null, responsible: null }), { id: "", nom: "" });
  assert.deepEqual(mijozMasuli({}), { id: "", nom: "" });
});

test("yaratishMasuli: bo'sh bo'lsa yuborilmaydi", () => {
  assert.deepEqual(yaratishMasuli(""), {});
  assert.deepEqual(yaratishMasuli(undefined), {});
  assert.deepEqual(yaratishMasuli("u1"), { responsibleId: "u1" });
});

test("tahrirMasuli: o'zgarmasa yuborilmaydi, tozalansa null", () => {
  assert.deepEqual(tahrirMasuli("u1", "u1"), {});
  assert.deepEqual(tahrirMasuli(undefined, ""), {});
  assert.deepEqual(tahrirMasuli("", undefined), {});
  assert.deepEqual(tahrirMasuli("u1", ""), { responsibleId: null });
  assert.deepEqual(tahrirMasuli("", "u2"), { responsibleId: "u2" });
  assert.deepEqual(tahrirMasuli("u1", "u2"), { responsibleId: "u2" });
});
