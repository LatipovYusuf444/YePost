import type { HarakatKorinishQatori } from "./tovarHarakatiModeli.ts";
import { harakatKontragenti, harakatMiqdori, harakatSanaMatni, harakatTuriNomi } from "./tovarHarakatiModeli.ts";
import type { Tanlov } from "./types.ts";

export function harakatEksportQatorlari(rows: HarakatKorinishQatori[], customers: Tanlov[], suppliers: Tanlov[], warehouses: Tanlov[]) {
  return rows.flatMap(row => {
    const movement = row.harakat;
    if (!movement) return [];
    return [[harakatSanaMatni(movement.sana), harakatTuriNomi(movement), movement.hujjatRaqam || "Raqam berilmagan", movement.refId || "",
      row.nomi, movement.modificationName || "", harakatKontragenti(movement, customers, suppliers), movement.warehouseName || warehouses.find(w => w.id === movement.warehouseId)?.nomi || "—",
      row.boshQoldiq, harakatMiqdori(movement), row.oxirgiQoldiq, movement.narx ?? null, movement.valyuta || "Noma'lum", movement.kurs ?? null, movement.summa ?? null, movement.narxSom ?? null, movement.summaSom ?? null]];
  });
}

export async function tovarHarakatiniEksport(rows: HarakatKorinishQatori[], customers: Tanlov[], suppliers: Tanlov[], warehouses: Tanlov[], from: string, to: string) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  const sheet = workbook.addWorksheet("Tovar harakati", { views: [{ state: "frozen", ySplit: 1 }] });
  const names = ["Sana va vaqt (Toshkent)", "Hujjat turi", "Hujjat №", "Hujjat ID", "Mahsulot", "Variatsiya", "Mijoz / Kontragent", "Ombor", "Boshlang'ich qoldiq", "Harakat", "Oxirgi qoldiq", "Asl narx", "Asl valyuta", "Hujjat kursi", "Asl summa", "Narx (UZS)", "Summa (UZS)"];
  sheet.addRow(names);
  sheet.addRows(harakatEksportQatorlari(rows, customers, suppliers, warehouses));
  names.forEach((_, index) => { sheet.getColumn(index + 1).width = index === 3 ? 38 : [4, 5, 6].includes(index) ? 30 : 22; });
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: names.length } };
  for (const index of [9, 10, 11, 12, 14, 15, 16, 17]) sheet.getColumn(index).numFmt = "#,##0.######";
  const note = workbook.addWorksheet("Izoh");
  note.getColumn(1).width = 110;
  note.addRows([[`Davr: ${from} — ${to}`], ["Asl narx va summalar o'z valyutasida. Turli valyutalar qo'shilmagan."], ["UZS qiymatlari faqat hujjatning saqlangan kursi yoki hisobotning priceUzs/totalUzs qiymati bilan hisoblanadi."], ["Valyuta yoki hujjat kursi yetishmasa UZS katagi bo'sh qoladi. Bugungi kurs ishlatilmaydi."]]);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `tovar-harakati-${from}-${to}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
