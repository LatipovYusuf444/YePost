import AsosiyLayout from "@/Components/layout/AsosiyPanel"
import Login from "@/Pages/Auth/Login"
import BoshSahifa from "@/Pages/BoshSahifa"
import KassaUchot from "@/Pages/KassaUchot"
import HisobotUchot from "@/Pages/HisobotUchot"
import XodimUchot from "@/Pages/XodimUchot"
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
import { Navigate, Route, Routes } from "react-router"
import ProtectedRoute from "./ProtectedRoute"

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AsosiyLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<BoshSahifa />} />
        <Route path="/savdo" element={<Savdo />} />
        {/* <Route path="/pos" element={<Savdo />} /> */}
        <Route path="/mahsulotlar" element={<Mahsulotlar />} />
        {/* Mock Xaridor uchoti eski backendli Mijozlar sahifasi o'rnida
            (backend kodi Pages/Mijozlar da tegilmagan holda qoladi). */}
        <Route path="/mijozlar" element={<XaridorUchot />} />
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
        <Route path="/hisobotlar" element={<HisobotUchot />} />
        {/* Mock Xodim uchoti eski backendli Hodimlar sahifasi o'rnida
            (backend kodi Pages/Hodimlar + accountStore da tegilmagan holda qoladi). */}
        <Route path="/hodimlar" element={<XodimUchot />} />
        {/* Mock Sozlamalar uchoti eski backendli Sozlamalar sahifasi o'rnida
            (backend kodi Pages/Sozlamalar da tegilmagan holda qoladi). */}
        <Route path="/sozlamalar" element={<SozlamalarUchot />} />

        {/* Noto‘g‘ri route bo‘lsa bosh sahifaga qaytaradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
