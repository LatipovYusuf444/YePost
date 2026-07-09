import { useEffect, useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import type { Sotuv } from "@/types/savdo";
import {
  masulNomi,
  mijozNomi,
  pulniFormatlash,
  sotuvJadvalId,
  sotuvRaqami,
  sotuvSummasi,
} from "./savdoYordamchilari";

type SotuvlarJadvaliProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  boshMatn?: string;
};

function telefonRaqam(sotuv: Sotuv) {
  return sotuv.customer?.phone || sotuv.clientCompany?.phone || "-";
}

function sanaVaVaqt(value?: string) {
  if (!value) return { sana: "-", vaqt: "" };

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
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(Math.ceil(sotuvlar.length / pageSize), 1);

  useEffect(() => {
    setCurrentPage(1);
  }, [sotuvlar]);

  const visibleRows = useMemo(
    () => sotuvlar.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, sotuvlar]
  );

  return (
    <div className="px-10 pb-10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="text-[13px] font-medium text-orange-600">
            <tr>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Savdo raqami</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Mijoz nomi</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Summa</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Sana</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Mas'ul shaxs</th>
              <th className="border-b border-gray-200 px-4 py-3 font-medium">Telefon raqam</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#4B4B4B]">
            {visibleRows.map((sotuv) => {
              const sana = sanaVaVaqt(sotuv.createdAt);

              return (
                <tr
                  key={sotuv.id}
                  onClick={() => onSotuvniOchish(sotuv)}
                  className="cursor-pointer transition hover:bg-orange-50/45"
                  title={`${sotuvRaqami(sotuv)} sotuvini ko'rish`}
                >
                  <td className="border-b border-gray-100 px-4 py-3.5">
                    {sotuvJadvalId(sotuv)}
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

      {sotuvlar.length > pageSize && (
        <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-5 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {sotuvlar.length} ta yozuvdan {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sotuvlar.length)} ko'rsatilmoqda
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 rounded-lg border border-gray-200 px-3 font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Oldingi
            </button>
            <span className="min-w-16 text-center font-semibold text-gray-700">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-9 rounded-lg border border-gray-200 px-3 font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Keyingi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
