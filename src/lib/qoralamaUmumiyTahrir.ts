import type { Sotuv, SotuvYaratishMalumoti } from "../types/savdo.ts";
import { toshkentKuni } from "./hujjatSanasi.ts";
import { mijozgaMosSotuvNomi, sotuvSarlavhaMijozi } from "./sotuvNomi.ts";

const kalitlar = {
  nom: ["Sotuv nomi", "Qoralama nomi", "Название продажи", "Название черновика"],
  bosqich: ["Bosqich", "Этап"],
  boshlanish: ["Boshlanish sanasi", "Дата начала"],
  tugash: ["Tugash sanasi", "Дата окончания"],
  izoh: ["Izoh", "Комментарий"],
  currency: ["Valyuta", "Валюта"],
} as const;
type IzohKaliti = keyof typeof kalitlar;

function izohniOqish(note = "") {
  const values: Record<IzohKaliti, string> = { nom: "", bosqich: "", boshlanish: "", tugash: "", izoh: "", currency: "" };
  const labels: Partial<Record<IzohKaliti, string>> = {};
  const qolgan: string[] = [];
  let izohBoshlandi = false;
  for (const line of note.split("\n")) {
    if (izohBoshlandi) { values.izoh += `\n${line}`; continue; }
    const match = /^([^:]+):[\t ]*(.*)$/.exec(line);
    const key = match && (Object.keys(kalitlar) as IzohKaliti[]).find((key) => (kalitlar[key] as readonly string[]).includes(match[1].trim()));
    if (key && match) {
      values[key] = match[2].trim();
      labels[key] = match[1].trim();
      if (key === "izoh") izohBoshlandi = true;
    } else if (line.trim()) qolgan.push(line);
  }
  return { values, labels, qolgan };
}

export function qoralamaFormasi(sotuv: Sotuv) {
  const { values } = izohniOqish(sotuv.note);
  return {
    nom: mijozgaMosSotuvNomi(values.nom, sotuvSarlavhaMijozi(sotuv)), bosqich: values.bosqich, boshlanish: values.boshlanish, tugash: values.tugash, izoh: values.izoh,
    warehouseId: sotuv.warehouseId ?? sotuv.warehouse?.id ?? "",
    customerId: sotuv.customerId ?? sotuv.customer?.id ?? "",
    clientCompanyId: sotuv.clientCompanyId ?? sotuv.clientCompany?.id ?? "",
    currency: String(sotuv.currency || "UZS").toUpperCase(),
    date: toshkentKuni(sotuv.date ?? sotuv.createdAt),
    walkInCustomerName: sotuv.walkInCustomerName ?? "",
    walkInCustomerPhone: sotuv.walkInCustomerPhone ?? "",
  };
}
export type QoralamaForma = ReturnType<typeof qoralamaFormasi>;

export function qoralamaTahrirSummasi(summa: number, qatorValyutasi: string, sotuvValyutasi: string, kurs: number): number | null {
  if (qatorValyutasi === sotuvValyutasi) return summa;
  if (!(kurs > 0)) return null;
  return sotuvValyutasi === "USD" ? summa / kurs : summa * kurs;
}

export function qoralamaPatch(sotuv: Sotuv, forma: QoralamaForma): Partial<SotuvYaratishMalumoti> {
  const asl = qoralamaFormasi(sotuv);
  const patch: Partial<SotuvYaratishMalumoti> = {};
  for (const key of ["warehouseId", "customerId", "clientCompanyId", "currency", "date", "walkInCustomerName", "walkInCustomerPhone"] as const) {
    if (forma[key] !== asl[key]) patch[key] = forma[key];
  }
  if (!asl.customerId && !asl.clientCompanyId && (forma.customerId || forma.clientCompanyId)) patch.saleType = "CLIENT";
  const metadataOzgarish = (["nom", "bosqich", "boshlanish", "tugash", "izoh"] as const).some((key) => forma[key].trim() !== asl[key].trim());
  const eskiAvtomatikNom = izohniOqish(sotuv.note).values.nom.trim() !== forma.nom.trim();
  if (metadataOzgarish || eskiAvtomatikNom || forma.currency !== asl.currency) {
    const { values, labels, qolgan } = izohniOqish(sotuv.note);
    const keys: IzohKaliti[] = ["nom", "bosqich", "currency", "boshlanish", "tugash"];
    const metadata = keys.map((key) => {
      const value = key === "currency" && forma.currency === asl.currency ? values.currency : forma[key];
      return value.trim() ? `${labels[key] ?? kalitlar[key][0]}: ${value.trim()}` : "";
    }).filter(Boolean);
    patch.note = [...metadata, ...qolgan, ...(forma.izoh.trim() ? [`${labels.izoh ?? "Izoh"}: ${forma.izoh.trim()}`] : [])].join("\n");
  }
  return patch;
}
