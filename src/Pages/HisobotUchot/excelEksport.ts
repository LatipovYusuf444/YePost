import ExcelJS from "exceljs";

// Foyda hisobotini foydalanuvchining Excel namunasi ko'rinishida yuklaydi:
//   A2: Muddat    B2: 01.01.2026-01.04.2026
//   A3: Kompaniya B3: Aisa
//   6-qator: Xaridor | {Oy} Jami savdo | {Oy} Jami foyda | ... | Jami savdo | Jami foyda | Rentabellik
//   7-qatordan: ma'lumot (Jami ustunlari FORMULA bilan: =B7+D7+F7+H7)

export type FoydaEksportQatori = {
  nomi: string;
  oylik: Record<string, { savdo: number; foyda: number }>;
};

// 1 → A, 2 → B, 27 → AA
function ustunHarfi(n: number) {
  let s = "";
  let son = n;
  while (son > 0) {
    const qoldiq = (son - 1) % 26;
    s = String.fromCharCode(65 + qoldiq) + s;
    son = Math.floor((son - 1) / 26);
  }
  return s;
}

function sanaFormat(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

const PUL_FORMAT = "#,##0";
const FOIZ_FORMAT = "0.00%";
const SARLAVHA_FON = "FFFFE8D6"; // och to'q sariq
const JAMI_FON = "FFFFF3E2";

function faylniYuklash(buffer: ArrayBuffer, nom: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nom;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function foydaHisobotiniYuklash({
  qatorlar,
  oylar,
  oyNomlari,
  dateFrom,
  dateTo,
  kompaniya,
}: {
  qatorlar: FoydaEksportQatori[];
  oylar: string[];
  oyNomlari: string[]; // oylar bilan bir xil tartibda ("Yanvar", ...)
  dateFrom: string;
  dateTo: string;
  kompaniya: string;
}) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Foyda hisoboti");

  // --- Yuqori sarlavha: Muddat / Kompaniya ---
  ws.getCell("A2").value = "Muddat";
  ws.getCell("B2").value = `${sanaFormat(dateFrom)}-${sanaFormat(dateTo)}`;
  ws.getCell("A3").value = "Kompaniya";
  ws.getCell("B3").value = kompaniya;
  for (const kat of ["A2", "A3"]) ws.getCell(kat).font = { bold: true };

  // --- Ustunlar ---
  const oyN = oylar.length;
  const sarlavhalar = [
    "Xaridor",
    ...oyNomlari.flatMap((nom) => [`${nom} Jami savdo`, `${nom} Jami foyda`]),
    "Jami savdo",
    "Jami foyda",
    "Rentabellik",
  ];

  const SARLAVHA_QATOR = 6;
  const sarlavhaQatori = ws.getRow(SARLAVHA_QATOR);
  sarlavhalar.forEach((nom, i) => {
    const katak = sarlavhaQatori.getCell(i + 1);
    katak.value = nom;
    katak.font = { bold: true };
    katak.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", wrapText: true };
    katak.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SARLAVHA_FON } };
    katak.border = { bottom: { style: "thin", color: { argb: "FFE5C9A8" } } };
  });
  sarlavhaQatori.height = 30;

  // Ustun raqamlari: A=1 Xaridor, keyin har oy uchun 2 ta, so'ng jami ustunlar
  const jamiSavdoUstun = 2 + oyN * 2;
  const jamiFoydaUstun = jamiSavdoUstun + 1;
  const rentabellikUstun = jamiFoydaUstun + 1;

  const savdoHarflari = oylar.map((_, i) => ustunHarfi(2 + i * 2));
  const foydaHarflari = oylar.map((_, i) => ustunHarfi(3 + i * 2));

  // --- Ma'lumot qatorlari ---
  const boshQator = SARLAVHA_QATOR + 1;
  qatorlar.forEach((q, i) => {
    const r = boshQator + i;
    const qator = ws.getRow(r);
    qator.getCell(1).value = q.nomi;

    oylar.forEach((oy, oyIdx) => {
      const qiymat = q.oylik[oy];
      const savdoKatak = qator.getCell(2 + oyIdx * 2);
      const foydaKatak = qator.getCell(3 + oyIdx * 2);
      savdoKatak.value = qiymat?.savdo ?? 0;
      foydaKatak.value = qiymat?.foyda ?? 0;
      savdoKatak.numFmt = PUL_FORMAT;
      foydaKatak.numFmt = PUL_FORMAT;
    });

    // Jami ustunlari — namunadagidek FORMULA
    const jamiSavdo = qator.getCell(jamiSavdoUstun);
    jamiSavdo.value = { formula: savdoHarflari.map((h) => `${h}${r}`).join("+") };
    jamiSavdo.numFmt = PUL_FORMAT;
    jamiSavdo.font = { bold: true };

    const jamiFoyda = qator.getCell(jamiFoydaUstun);
    jamiFoyda.value = { formula: foydaHarflari.map((h) => `${h}${r}`).join("+") };
    jamiFoyda.numFmt = PUL_FORMAT;
    jamiFoyda.font = { bold: true };

    // Rentabellik = Jami foyda / Jami savdo
    const rent = qator.getCell(rentabellikUstun);
    const savdoAdr = `${ustunHarfi(jamiSavdoUstun)}${r}`;
    const foydaAdr = `${ustunHarfi(jamiFoydaUstun)}${r}`;
    rent.value = { formula: `IFERROR(${foydaAdr}/${savdoAdr},0)` };
    rent.numFmt = FOIZ_FORMAT;
    rent.font = { bold: true };
  });

  // --- Jami qatori ---
  const jamiQatorRaqami = boshQator + qatorlar.length;
  const jamiQator = ws.getRow(jamiQatorRaqami);
  jamiQator.getCell(1).value = "Jami";
  const birinchi = boshQator;
  const oxirgi = boshQator + qatorlar.length - 1;

  for (let ustun = 2; ustun <= jamiFoydaUstun; ustun++) {
    const h = ustunHarfi(ustun);
    const katak = jamiQator.getCell(ustun);
    katak.value =
      qatorlar.length > 0 ? { formula: `SUM(${h}${birinchi}:${h}${oxirgi})` } : 0;
    katak.numFmt = PUL_FORMAT;
  }
  const jamiRent = jamiQator.getCell(rentabellikUstun);
  jamiRent.value = {
    formula: `IFERROR(${ustunHarfi(jamiFoydaUstun)}${jamiQatorRaqami}/${ustunHarfi(
      jamiSavdoUstun
    )}${jamiQatorRaqami},0)`,
  };
  jamiRent.numFmt = FOIZ_FORMAT;

  jamiQator.eachCell({ includeEmpty: true }, (katak) => {
    katak.font = { bold: true };
    katak.fill = { type: "pattern", pattern: "solid", fgColor: { argb: JAMI_FON } };
    katak.border = { top: { style: "thin", color: { argb: "FFE5C9A8" } } };
  });

  // --- Ustun kengliklari ---
  ws.getColumn(1).width = 26;
  for (let u = 2; u <= rentabellikUstun; u++) ws.getColumn(u).width = 18;

  // --- Yuklash ---
  faylniYuklash(await wb.xlsx.writeBuffer(), "Foyda hisoboti.xlsx");
}

// ---------------------------------------------------------------------------
// O'ZARO HISOB-KITOB — foydalanuvchi shabloni (Ozaro hisob kitob.xls):
//   B3: Ozaro hisob-kitob
//   B5: Qidiruv     C5: <qidiruv matni>
//   B6: Muddat      C6: 01.01.2025-17.07.2026
//   B10: Xaridorlar | Boshlangich qoldiq | Kirim | Chiqim | Yakuniy qoldiq
//   B11+: ma'lumot, oxirida "Jami:" qatori
// ---------------------------------------------------------------------------

export type OzaroEksportQatori = {
  nomi: string;
  bosh: number;
  kirim: number;
  chiqim: number;
  yakuniy: number;
};

export async function ozaroHisobKitobniYuklash({
  qatorlar,
  dateFrom,
  dateTo,
  qidiruv,
}: {
  qatorlar: OzaroEksportQatori[];
  dateFrom: string;
  dateTo: string;
  qidiruv: string;
}) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet("Ozaro hisob-kitob");

  // --- Sarlavha bloki ---
  ws.getCell("B3").value = "Ozaro hisob-kitob";
  ws.getCell("B3").font = { bold: true, size: 14 };

  ws.getCell("B5").value = "Qidiruv";
  ws.getCell("C5").value = qidiruv || "—";
  ws.getCell("B6").value = "Muddat";
  ws.getCell("C6").value = `${sanaFormat(dateFrom)}-${sanaFormat(dateTo)}`;
  for (const kat of ["B5", "B6"]) ws.getCell(kat).font = { bold: true };

  // --- Ustunlar (B..F, 10-qator) ---
  const SARLAVHA_QATOR = 10;
  const sarlavhalar = ["Xaridorlar", "Boshlangich qoldiq", "Kirim", "Chiqim", "Yakuniy qoldiq"];
  const sarlavhaQatori = ws.getRow(SARLAVHA_QATOR);
  sarlavhalar.forEach((nom, i) => {
    const katak = sarlavhaQatori.getCell(2 + i); // B = 2
    katak.value = nom;
    katak.font = { bold: true };
    katak.alignment = { vertical: "middle", horizontal: i === 0 ? "left" : "right", wrapText: true };
    katak.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SARLAVHA_FON } };
    katak.border = { bottom: { style: "thin", color: { argb: "FFE5C9A8" } } };
  });
  sarlavhaQatori.height = 28;

  // --- Ma'lumot qatorlari ---
  const boshQator = SARLAVHA_QATOR + 1;
  qatorlar.forEach((q, i) => {
    const r = boshQator + i;
    const qator = ws.getRow(r);
    qator.getCell(2).value = q.nomi; // B
    qator.getCell(3).value = q.bosh; // C
    qator.getCell(4).value = q.kirim; // D
    qator.getCell(5).value = q.chiqim; // E
    // Yakuniy qoldiq — formula: bosh + kirim − chiqim
    qator.getCell(6).value = { formula: `C${r}+D${r}-E${r}` }; // F
    for (const u of [3, 4, 5, 6]) qator.getCell(u).numFmt = PUL_FORMAT;
    qator.getCell(6).font = { bold: true };
  });

  // --- Jami qatori ---
  const jamiQatorRaqami = boshQator + qatorlar.length;
  const jamiQator = ws.getRow(jamiQatorRaqami);
  jamiQator.getCell(2).value = "Jami:";
  const birinchi = boshQator;
  const oxirgi = boshQator + qatorlar.length - 1;
  for (const u of [3, 4, 5, 6]) {
    const h = ustunHarfi(u);
    const katak = jamiQator.getCell(u);
    katak.value = qatorlar.length > 0 ? { formula: `SUM(${h}${birinchi}:${h}${oxirgi})` } : 0;
    katak.numFmt = PUL_FORMAT;
  }
  for (let u = 2; u <= 6; u++) {
    const katak = jamiQator.getCell(u);
    katak.font = { bold: true };
    katak.fill = { type: "pattern", pattern: "solid", fgColor: { argb: JAMI_FON } };
    katak.border = { top: { style: "thin", color: { argb: "FFE5C9A8" } } };
  }

  // --- Ustun kengliklari ---
  ws.getColumn(1).width = 3;
  ws.getColumn(2).width = 30;
  for (let u = 3; u <= 6; u++) ws.getColumn(u).width = 20;

  faylniYuklash(await wb.xlsx.writeBuffer(), "Ozaro hisob-kitob.xlsx");
}
