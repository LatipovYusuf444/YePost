import AsosiyLayout from "@/Components/layout/AsosiyPanel"
import Login from "@/Pages/Auth/Login"
import ForgotPassword from "@/Pages/Auth/ForgotPassword"
import ResetPassword from "@/Pages/Auth/ResetPassword"
import AuthLayout from "@/Pages/Auth/AuthLayout"
import AdminLayout from "@/Pages/Admin/AdminLayout"
import { Navigate, Route, Routes } from "react-router"
import ProtectedRoute from "./ProtectedRoute"
import { lazy, Suspense } from "react"
import { useTranslation } from "react-i18next"
import { LoaderCircle } from "lucide-react"

// Sahifalar alohida bo'lak (chunk) bo'lib yuklanadi: login va POS butun ilovani (4 MB) kutmaydi.
// Kirish sahifalari va layout'lar darrov kerak — ular asosiy bo'lakda qoladi.
const BoshSahifa = lazy(() => import("@/Pages/BoshSahifa"))
const Monitoring = lazy(() => import("@/Pages/Monitoring"))
const KassaUchot = lazy(() => import("@/Pages/KassaUchot"))
const IshlabChiqarish = lazy(() => import("@/Pages/IshlabChiqarish"))
const HisobotUchot = lazy(() => import("@/Pages/HisobotUchot"))
const KunlikKassa = lazy(() => import("@/Pages/HisobotUchot/KunlikKassa"))
const XodimUchot = lazy(() => import("@/Pages/XodimUchot"))
const QollabQuvvatlash = lazy(() => import("@/Pages/Support"))
const Mahsulotlar = lazy(() => import("@/Pages/Mahsulotlar"))
const AmalgaOshirilganlar = lazy(() => import("@/Pages/Ombor/AmalgaOshirilganlar"))
const Chiqimlar = lazy(() => import("@/Pages/Ombor/Chiqim"))
const Kochirishlar = lazy(() => import("@/Pages/Ombor/Kochirish"))
const OmborMahsulotlar = lazy(() => import("@/Pages/Ombor/Mahsulotlar"))
const OmborQoldigi = lazy(() => import("@/Pages/Ombor/OmborQoldigi"))
const Inventarizatsiya = lazy(() => import("@/Pages/Ombor/Inventarizatsiya"))
const Xaridlar = lazy(() => import("@/Pages/Ombor/Xaridlar"))
const Ombor = lazy(() => import("@/Pages/Ombor"))
const XaridorUchot = lazy(() => import("@/Pages/XaridorUchot"))
const Savdo = lazy(() => import("@/Pages/Savdo"))
const SozlamalarUchot = lazy(() => import("@/Pages/SozlamalarUchot"))
const AdminDashboard = lazy(() => import("@/Pages/Admin/Dashboard"))
const AdminKompaniyalar = lazy(() => import("@/Pages/Admin/Kompaniyalar"))
const AdminTariflar = lazy(() => import("@/Pages/Admin/Tariflar"))
const AdminObunalar = lazy(() => import("@/Pages/Admin/Obunalar"))
const AdminFoydalanuvchilar = lazy(() => import("@/Pages/Admin/Foydalanuvchilar"))
const AdminQollabQuvvatlash = lazy(() => import("@/Pages/Admin/QollabQuvvatlash"))

function SahifaYuklanmoqda() {
  const { t } = useTranslation("common")
  return (
    <div role="status" aria-label={t("actions.loading")} className="flex min-h-[50vh] w-full items-center justify-center">
      <LoaderCircle size={28} className="animate-spin text-blue-600" />
    </div>
  )
}

export default function AppRouter() {
  return (
    <Suspense fallback={<SahifaYuklanmoqda />}>
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
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
        <Route path="/ishlab-chiqarish" element={<IshlabChiqarish />} />
        <Route path="/ishlab-chiqarish/buyurtmalar" element={<IshlabChiqarish bolim="buyurtmalar" />} />
        <Route path="/ishlab-chiqarish/retseptlar" element={<IshlabChiqarish bolim="retseptlar" />} />
        <Route path="/ishlab-chiqarish/kalkulyatsiya" element={<IshlabChiqarish bolim="kalkulyatsiya" />} />
        <Route path="/ishlab-chiqarish/sexga-berish" element={<IshlabChiqarish bolim="sexga-berish" />} />
        <Route path="/ishlab-chiqarish/smena" element={<IshlabChiqarish bolim="smena" />} />
        <Route path="/ishlab-chiqarish/rulonlar" element={<IshlabChiqarish bolim="rulonlar" />} />
        <Route path="/kassa" element={<KassaUchot />} />
        <Route path="/hisobotlar" element={<Navigate to="/hisobotlar/tovar-harakati" replace />} />
        <Route path="/hisobotlar/tovar-harakati" element={<HisobotUchot tab="stock" />} />
        <Route path="/hisobotlar/ombor-qoldigi" element={<HisobotUchot tab="qoldiq" />} />
        <Route path="/hisobotlar/ozaro-hisob-kitob" element={<HisobotUchot tab="counterparty" />} />
        <Route path="/hisobotlar/foyda" element={<HisobotUchot tab="profit" />} />
        <Route path="/hisobotlar/foyda-xarajat" element={<HisobotUchot tab="foydaxarajat" />} />
        <Route path="/hisobotlar/kirim-chiqim" element={<HisobotUchot tab="income" />} />
        <Route path="/hisobotlar/kunlik-kassa" element={<KunlikKassa />} />
        <Route path="/hisobotlar/chegirmalar" element={<HisobotUchot tab="discount" />} />
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
    </Suspense>
  )
}
