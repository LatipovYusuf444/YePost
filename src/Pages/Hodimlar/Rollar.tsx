import {
  Boxes,
  BriefcaseBusiness,
  Crown,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import type { AccountRoli } from "@/types/account";

const rollar: Array<{
  kod: AccountRoli;
  nom: string;
  izoh: string;
  vazifalar: string[];
  icon: typeof Crown;
}> = [
  {
    kod: "DIRECTOR",
    nom: "Direktor",
    izoh: "Tizimdagi eng yuqori boshqaruv darajasi.",
    vazifalar: [
      "Foydalanuvchi va vakolatlarni boshqarish",
      "Tashkilot, tarif va obunalarni boshqarish",
      "Barcha asosiy bo'limlardan foydalanish",
    ],
    icon: Crown,
  },
  {
    kod: "ADMIN",
    nom: "Administrator",
    izoh: "Kundalik tizim boshqaruvi uchun mas'ul xodim.",
    vazifalar: [
      "Savdo va ombor jarayonlarini nazorat qilish",
      "Ma'lumotnomalar bilan ishlash",
      "Berilgan maxsus vakolatlardan foydalanish",
    ],
    icon: ShieldCheck,
  },
  {
    kod: "CASHIER",
    nom: "Kassir",
    izoh: "Savdo va kassa amallarini bajaruvchi xodim.",
    vazifalar: [
      "Yangi sotuvlarni rasmiylashtirish",
      "To'lovlarni qabul qilish",
      "Ruxsat berilgan kassa amallarini bajarish",
    ],
    icon: ShoppingCart,
  },
  {
    kod: "STOREKEEPER",
    nom: "Omborchi",
    izoh: "Tovar kirimi, chiqimi va qoldig'iga mas'ul xodim.",
    vazifalar: [
      "Ombor kirim va chiqim hujjatlari",
      "Omborlararo ko'chirish",
      "Inventarizatsiya va qoldiq nazorati",
    ],
    icon: Boxes,
  },
];

export default function Rollar() {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
          Tizim rollari
        </p>
        <h2 className="text-2xl font-black">Rollar va vazifalar</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rollar backend tomonidan belgilangan. Qo'shimcha imkoniyatlar
          “Vakolatlar” bo'limida biriktiriladi.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rollar.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.kod}
              className="rounded-[26px] border border-orange-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Icon size={23} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{item.nom}</h3>
                  <p className="text-xs font-bold text-orange-500">{item.kod}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">{item.izoh}</p>
              <ul className="mt-4 space-y-2">
                {item.vazifalar.map((vazifa) => (
                  <li
                    key={vazifa}
                    className="flex items-start gap-2 text-sm font-medium text-gray-700"
                  >
                    <BriefcaseBusiness
                      size={15}
                      className="mt-0.5 shrink-0 text-orange-500"
                    />
                    {vazifa}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
