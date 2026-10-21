import type { NomliMalumot, Sotuv } from "../types/savdo.ts";

// Sotuv nomi mavjud note shartnomasida saqlanadi; boshqa izohlar nom hisoblanmaydi.
const NOM_QATORI = /^(?:Sotuv nomi|Qoralama nomi|Название продажи|Название черновика):[\t ]*([^\r\n]*)/u;

export function sotuvNomiIzohi(nom: string, prefix: string): string {
  return nom.trim() ? `${prefix}: ${nom.trim()}` : "";
}

// Eski avtomatik nomlar mijoz nomini o'z ichiga olgan. Erkin yozilgan nomlar o'zgarmaydi.
export function mijozgaMosSotuvNomi(nom: string, mijoz: string): string {
  if (!mijoz.trim()) return nom;
  const uz = /^.+ uchun yangi (sotuv|qoralama)$/.exec(nom.trim());
  if (uz) return `${mijoz.trim()} uchun yangi ${uz[1]}`;
  const ru = /^(Новая (?:продажа|черновик) для ).+$/.exec(nom.trim());
  return ru ? `${ru[1]}${mijoz.trim()}` : nom;
}

export function sotuvSarlavhaMijozi(sotuv: Pick<Sotuv, "customer" | "clientCompany" | "walkInCustomerName">): string {
  const shaxsNomi = (item?: NomliMalumot) => [item?.firstName, item?.lastName].filter(Boolean).join(" ").trim() || item?.fullName?.trim() || item?.name?.trim() || "";
  return shaxsNomi(sotuv.customer) || shaxsNomi(sotuv.clientCompany) || sotuv.walkInCustomerName?.trim() || "";
}

export function sotuvJadvalNomi(note: string | null | undefined, tartibRaqami: number, mijoz = ""): string {
  const nom = NOM_QATORI.exec(note?.trim() ?? "")?.[1]?.trim();
  return nom ? mijozgaMosSotuvNomi(nom, mijoz) : `№${tartibRaqami}`;
}
