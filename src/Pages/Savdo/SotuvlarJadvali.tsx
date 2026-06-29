import { ReceiptText } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  sotuvRaqami,
  sotuvSummasi,
} from "./savdoYordamchilari";

type SotuvlarJadvaliProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  boshMatn?: string;
};

function mijozId(sotuv: Sotuv) {
  const idManbasi = `${sotuv.documentNumber ?? ""}${sotuv.number ?? ""}${sotuv.id}`;
  const onlyDigits = idManbasi.replace(/\D/g, "");

  if (onlyDigits.length >= 8) return onlyDigits.slice(-8);

  let hash = 0;
  for (const belgi of sotuv.id) {
    hash = (hash * 31 + belgi.charCodeAt(0)) % 100_000_000;
  }

  return String(hash).padStart(8, "0");
}

function telefonRaqam(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "—";
}

function sanaVaVaqt(value?: string) {
  if (!value) return { sana: "—", vaqt: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { sana: value, vaqt: "" };

  return {
    sana: new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    vaqt: new Intl.DateTimeFormat("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

export default function SotuvlarJadvali({
  sotuvlar,
  onSotuvniOchish,
  boshMatn = "Sotuv topilmadi",
}: SotuvlarJadvaliProps) {
  return (
    <div className="px-10 pb-10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="text-[13px] font-medium text-orange-600">
            <tr>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Mijoz ID</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Mijoz nomi</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Summa</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Sana</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Mas'ul shaxs</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Telefon raqam</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#4B4B4B]">
            {sotuvlar.map((sotuv) => {
              const sana = sanaVaVaqt(sotuv.createdAt);

              return (
                <tr
                  key={sotuv.id}
                  onClick={() => onSotuvniOchish(sotuv)}
                  className="cursor-pointer transition hover:bg-orange-50/45"
                  title={`${sotuvRaqami(sotuv)} sotuvini ko'rish`}
                >
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {mijozId(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5 font-medium">
                    {mijozNomi(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5 font-semibold text-emerald-700">
                    {pulniFormatlash(sotuvSummasi(sotuv))}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    <span className="block">{sana.sana}</span>
                    {sana.vaqt && (
                      <span className="mt-0.5 block text-[10px] text-[#4B4B4B]">
                        {sana.vaqt}
                      </span>
                    )}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {masulNomi(sotuv)}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {telefonRaqam(sotuv)}
                  </td>
                </tr>
              );
            })}

            {sotuvlar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <ReceiptText className="mx-auto text-orange-200" size={40} />
                  <p className="mt-3 font-semibold text-gray-500">{boshMatn}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Serverdan ma'lumot kelganda shu yerda ko'rinadi.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
