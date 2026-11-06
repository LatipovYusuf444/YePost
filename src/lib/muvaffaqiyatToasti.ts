// Muvaffaqiyat toasti (api/axios.ts): qaysi so'rovga qaysi matn chiqishi. Hech narsa saqlamaydigan POST'larga (hisob-kitob, ko'rib chiqish,
// qidiruv, "o'qildi" belgisi) toast chiqmaydi; tasdiqlash/bekor qilish kabi harakatlar "yaratildi" emas, "saqlandi" deb yoziladi.

export type MuvaffaqiyatKaliti = "created" | "deleted" | "saved";

// Hech narsa saqlanmaydigan POST'lar: oxirgi yo'l bo'lagi bo'yicha.
const SAQLAMAYDIGAN_POST = new Set(["preview", "allocation-preview", "calculate", "calculation", "search", "quote", "check", "validate", "estimate", "lookup", "read", "read-all"]);
// Mavjud hujjat ustidagi harakatlar: yangi narsa yaratilmaydi.
const HARAKAT_POST = new Set(["confirm", "cancel", "restore", "send", "receive", "complete", "pin", "unpin", "set-primary", "assign", "notify", "clock-in", "clock-out", "import"]);

/** i18n kaliti (`common:toast.*` oxiri) yoki toast kerak bo'lmasa `null`. */
export function muvaffaqiyatKaliti(usul: string | undefined, url: string | undefined): MuvaffaqiyatKaliti | null {
  const metod = usul?.toLowerCase();
  if (metod === "delete") return "deleted";
  if (metod === "put" || metod === "patch") return "saved";
  if (metod !== "post") return null;
  const oxirgi = (url ?? "").split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "";
  if (SAQLAMAYDIGAN_POST.has(oxirgi)) return null;
  return HARAKAT_POST.has(oxirgi) ? "saved" : "created";
}
