import SavdoGrafiki from "@/Components/common/SavdoGrafiki";
import {
  ShoppingCart,
  Package,
  Users,
  Wallet,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const statistikalar = [
  {
    nom: "Bugungi savdo",
    qiymat: "12 450 000 so‘m",
    izoh: "+18% kechagidan ko‘p",
    icon: ShoppingCart,
    path: "/savdo",
  },
  {
    nom: "Mahsulotlar",
    qiymat: "1 248 ta",
    izoh: "Ombordagi jami mahsulot",
    icon: Package,
    path: "/mahsulotlar",
  },
  {
    nom: "Mijozlar",
    qiymat: "386 ta",
    izoh: "Faol mijozlar bazasi",
    icon: Users,
    path: "/mijozlar",
  },
  {
    nom: "Kassa",
    qiymat: "8 200 000 so‘m",
    izoh: "Bugungi kassa holati",
    icon: Wallet,
    path: "/kassa",
  },
];

const topMahsulotlar = [
  { nom: "Coca-Cola 1.5L", sotildi: "124 dona", summa: "1 860 000 so‘m" },
  { nom: "Pepsi 1L", sotildi: "98 dona", summa: "1 176 000 so‘m" },
  { nom: "Non mahsulotlari", sotildi: "76 dona", summa: "380 000 so‘m" },
  { nom: "Shakar 1kg", sotildi: "52 kg", summa: "728 000 so‘m" },
];

const oxirgiSavdolar = [
  { mijoz: "Akmal Market", summa: "850 000 so‘m", status: "To‘landi" },
  { mijoz: "Bekzod aka", summa: "320 000 so‘m", status: "Qarz" },
  { mijoz: "Zarina do‘kon", summa: "1 250 000 so‘m", status: "To‘landi" },
];

export default function BoshSahifa() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Sahifa sarlavhasi */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bosh sahifa</h1>
          <p className="mt-1 text-sm text-gray-500">
            Savdo, ombor, kassa va mijozlar bo‘yicha umumiy ma’lumotlar.
          </p>
        </div>

        <button
          onClick={() => navigate("/savdo")}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
        >
          Yangi savdo
        </button>
      </div>

      {/* Statistik cardlar */}
      <div className="grid grid-cols-4 gap-5">
        {statistikalar.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.nom}
              onClick={() => navigate(item.path)}
              className="group rounded-[28px] border border-orange-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-100"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <Icon size={23} />
                </div>

                <ArrowRight
                  size={18}
                  className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-orange-500"
                />
              </div>

              <p className="text-sm text-gray-500">{item.nom}</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {item.qiymat}
              </h2>
              <p className="mt-2 text-xs text-gray-400">{item.izoh}</p>
            </button>
          );
        })}
      </div>

      {/* O‘rta qism */}
      <div className="grid grid-cols-[2fr_1fr] gap-5">
        {/* Savdo grafigi */}
        <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
          <SavdoGrafiki />
        </div>

        {/* Ogohlantirishlar */}
        <div className="rounded-[30px] border border-orange-100 bg-orange-50 p-6">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600">
            <AlertTriangle size={23} />
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            Ombor ogohlantirishlari
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            6 ta mahsulot minimal qoldiqdan kamaygan. Omborni tekshirish kerak.
          </p>

          <button
            onClick={() => navigate("/ombor")}
            className="mt-6 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Omborga o‘tish
          </button>
        </div>
      </div>

      {/* Pastki qism */}
      <div className="grid grid-cols-2 gap-5">
        {/* Top mahsulotlar */}
        <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            Eng ko‘p sotilgan mahsulotlar
          </h2>

          <div className="mt-5 space-y-4">
            {topMahsulotlar.map((item, index) => (
              <div
                key={item.nom}
                className="flex items-center justify-between rounded-2xl bg-gray-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.nom}</p>
                    <p className="text-xs text-gray-500">{item.sotildi}</p>
                  </div>
                </div>

                <p className="text-sm font-bold text-gray-900">{item.summa}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Oxirgi savdolar */}
        <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Oxirgi savdolar</h2>

          <div className="mt-5 space-y-4">
            {oxirgiSavdolar.map((item) => (
              <div
                key={item.mijoz}
                className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.mijoz}</p>
                  <p className="text-sm text-gray-500">{item.summa}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "To‘landi"
                      ? "bg-green-50 text-green-600"
                      : "bg-orange-50 text-orange-600"
                    }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
