import AsosiyLayout from "@/Components/layout/AsosiyPanel"
import Login from "@/Pages/Auth/Login"
import BoshSahifa from "@/Pages/BoshSahifa"
import Kassa from "@/Pages/Kassa"
import HisobotUchot from "@/Pages/HisobotUchot"
import Hodimlar from "@/Pages/Hodimlar"
import Mahsulotlar from "@/Pages/Mahsulotlar"
import AmalgaOshirilganlar from "@/Pages/Ombor/AmalgaOshirilganlar"
import Chiqimlar from "@/Pages/Ombor/Chiqim"
import Kochirishlar from "@/Pages/Ombor/Kochirish"
import OmborMahsulotlar from "@/Pages/Ombor/Mahsulotlar"
import OmborQoldigi from "@/Pages/Ombor/OmborQoldigi"
import Inventarizatsiya from "@/Pages/Ombor/Inventarizatsiya"
import Xaridlar from "@/Pages/Ombor/Xaridlar"
import Mijozlar from "@/Pages/Mijozlar"
import Ombor from "@/Pages/Ombor"
import OmborUchot from "@/Pages/OmborUchot"
import XaridorUchot from "@/Pages/XaridorUchot"
import Savdo from "@/Pages/Savdo"
import Sozlamalar from "@/Pages/Sozlamalar"
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
        <Route path="/mijozlar" element={<Mijozlar />} />
        <Route path="/ombor" element={<Ombor />} />
        <Route path="/ombor/kirimlar" element={<Xaridlar />} />
        <Route path="/ombor/amalga-oshirilganlar" element={<AmalgaOshirilganlar />} />
        <Route path="/ombor/chiqimlar" element={<Chiqimlar />} />
        <Route path="/ombor/kochirishlar" element={<Kochirishlar />} />
        <Route path="/ombor/mahsulotlar" element={<OmborMahsulotlar />} />
        <Route path="/ombor/qoldiq" element={<OmborQoldigi />} />
        <Route path="/ombor/inventarizatsiya" element={<Inventarizatsiya />} />
        <Route path="/ombor-uchot" element={<OmborUchot />} />
        <Route path="/xaridor-uchot" element={<XaridorUchot />} />
        <Route path="/kassa" element={<Kassa />} />
        <Route path="/hisobotlar" element={<HisobotUchot />} />
        <Route path="/hodimlar" element={<Hodimlar />} />
        <Route path="/sozlamalar" element={<Sozlamalar />} />

        {/* Noto‘g‘ri route bo‘lsa bosh sahifaga qaytaradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
