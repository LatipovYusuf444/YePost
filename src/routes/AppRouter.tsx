import AsosiyLayout from "@/Components/layout/AsosiyPanel"
import Login from "@/Pages/Auth/Login"
import BoshSahifa from "@/Pages/BoshSahifa"
import Monitoring from "@/Pages/Monitoring"
import KassaUchot from "@/Pages/KassaUchot"
import HisobotUchot from "@/Pages/HisobotUchot"
import XodimUchot from "@/Pages/XodimUchot"
import QollabQuvvatlash from "@/Pages/Support"
import Mahsulotlar from "@/Pages/Mahsulotlar"
import AmalgaOshirilganlar from "@/Pages/Ombor/AmalgaOshirilganlar"
import Chiqimlar from "@/Pages/Ombor/Chiqim"
import Kochirishlar from "@/Pages/Ombor/Kochirish"
import OmborMahsulotlar from "@/Pages/Ombor/Mahsulotlar"
import OmborQoldigi from "@/Pages/Ombor/OmborQoldigi"
import Inventarizatsiya from "@/Pages/Ombor/Inventarizatsiya"
import Xaridlar from "@/Pages/Ombor/Xaridlar"
import Ombor from "@/Pages/Ombor"
import XaridorUchot from "@/Pages/XaridorUchot"
import Savdo from "@/Pages/Savdo"
import SozlamalarUchot from "@/Pages/SozlamalarUchot"
import AdminLayout from "@/Pages/Admin/AdminLayout"
import AdminDashboard from "@/Pages/Admin/Dashboard"
import AdminKompaniyalar from "@/Pages/Admin/Kompaniyalar"
import AdminTariflar from "@/Pages/Admin/Tariflar"
import AdminObunalar from "@/Pages/Admin/Obunalar"
import AdminFoydalanuvchilar from "@/Pages/Admin/Foydalanuvchilar"
import AdminQollabQuvvatlash from "@/Pages/Admin/QollabQuvvatlash"
import { Navigate, Route, Routes } from "react-router"
import ProtectedRoute from "./ProtectedRoute"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Super admin (isStaff) paneli: ProtectedRoute faqat shu foydalanuvchini /admin ga kiritadi. */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/kompaniyalar" element={<AdminKompaniyalar />} />
        <Route path="/admin/tariflar" element={<AdminTariflar />} />
        <Route path="/admin/obunalar" element={<AdminObunalar />} />
        <Route path="/admin/foydalanuvchilar" element={<AdminFoydalanuvchilar />} />
        <Route path="/admin/qollab-quvvatlash" element={<AdminQollabQuvvatlash />} />
      </Route>
      <Route
        element={
          <ProtectedRoute>
            <AsosiyLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<BoshSahifa />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/savdo" element={<Savdo />} />
        {/* <Route path="/pos" element={<Savdo />} /> */}
        <Route path="/mahsulotlar" element={<Mahsulotlar />} />
        {/* Xaridorlar, kompaniyalar va yetkazib beruvchilar real partner/CRM API'lariga ulangan. */}
        <Route path="/mijozlar" element={<XaridorUchot faolTab="xaridorlar" />} />
        <Route path="/mijozlar/kompaniya" element={<XaridorUchot faolTab="kompaniyalar" />} />
        <Route path="/mijozlar/yetkazib-beruvchilar" element={<XaridorUchot faolTab="yetkazib-beruvchilar" />} />
        {/* Ombor yo'nalishlari (hamkasb strukturasi saqlandi) */}
        <Route path="/ombor" element={<Navigate to="/ombor/inventarizatsiya" replace />} />
        <Route path="/ombor/omborlar" element={<Ombor />} />
        <Route path="/ombor/kirimlar" element={<Xaridlar />} />
        <Route path="/ombor/amalga-oshirilganlar" element={<AmalgaOshirilganlar />} />
        <Route path="/ombor/chiqimlar" element={<Chiqimlar />} />
        <Route path="/ombor/kochirishlar" element={<Kochirishlar />} />
        <Route path="/ombor/mahsulotlar" element={<OmborMahsulotlar />} />
        <Route path="/ombor/qoldiq" element={<OmborQoldigi />} />
        <Route path="/ombor/inventarizatsiya" element={<Inventarizatsiya />} />
        {/* Mock Kassa uchoti eski backendli Kassa sahifasi o'rnida
            (backend kodi Pages/Kassa da tegilmagan holda qoladi). */}
        <Route path="/kassa" element={<KassaUchot />} />
        <Route path="/hisobotlar" element={<Navigate to="/hisobotlar/tovar-harakati" replace />} />
        <Route path="/hisobotlar/tovar-harakati" element={<HisobotUchot tab="stock" />} />
        <Route path="/hisobotlar/ombor-qoldigi" element={<HisobotUchot tab="qoldiq" />} />
        <Route path="/hisobotlar/ozaro-hisob-kitob" element={<HisobotUchot tab="counterparty" />} />
        <Route path="/hisobotlar/foyda" element={<HisobotUchot tab="profit" />} />
        <Route path="/hisobotlar/foyda-xarajat" element={<HisobotUchot tab="foydaxarajat" />} />
        <Route path="/hisobotlar/kirim-chiqim" element={<HisobotUchot tab="income" />} />
        <Route path="/hisobotlar/audit-loglari" element={<HisobotUchot tab="audit" />} />
        {/* Mock Xodim uchoti eski backendli Hodimlar sahifasi o'rnida
            (backend kodi Pages/Hodimlar + accountStore da tegilmagan holda qoladi). */}
        <Route path="/hodimlar" element={<XodimUchot />} />
        <Route path="/qollab-quvvatlash" element={<QollabQuvvatlash />} />
        {/* Mock Sozlamalar uchoti eski backendli Sozlamalar sahifasi o'rnida
            (backend kodi Pages/Sozlamalar da tegilmagan holda qoladi). */}
        <Route path="/sozlamalar" element={<SozlamalarUchot />} />

        {/* Noto‘g‘ri route bo‘lsa bosh sahifaga qaytaradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
