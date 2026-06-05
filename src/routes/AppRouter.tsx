import AsosiyLayout from "@/Components/layout/AsosiyPanel"
import BoshSahifa from "@/Pages/BoshSahifa"
import Kassa from "@/Pages/Kassa"
import Mahsulotlar from "@/Pages/Mahsulotlar"
import AmalgaOshirilganlar from "@/Pages/Ombor/AmalgaOshirilganlar"
import Chiqimlar from "@/Pages/Ombor/Chiqim"
import Kochirishlar from "@/Pages/Ombor/Kochirish"
import OmborMahsulotlar from "@/Pages/Ombor/Mahsulotlar"
import Mijozlar from "@/Pages/Mijozlar"
import Ombor from "@/Pages/Ombor"
import Savdo from "@/Pages/Savdo"
import Sozlamalar from "@/Pages/Sozlamalar"
import { Navigate, Route, Routes } from "react-router"

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AsosiyLayout />}>
        <Route path="/" element={<BoshSahifa />} />
        <Route path="/savdo" element={<Savdo />} />
        {/* <Route path="/pos" element={<Savdo />} /> */}
        <Route path="/mahsulotlar" element={<Mahsulotlar />} />
        <Route path="/mijozlar" element={<Mijozlar />} />
        <Route path="/ombor" element={<Ombor />} />
        <Route path="/ombor/amalga-oshirilganlar" element={<AmalgaOshirilganlar />} />
        <Route path="/ombor/chiqimlar" element={<Chiqimlar />} />
        <Route path="/ombor/kochirishlar" element={<Kochirishlar />} />
        <Route path="/ombor/mahsulotlar" element={<OmborMahsulotlar />} />
        <Route path="/kassa" element={<Kassa />} />
        <Route path="/sozlamalar" element={<Sozlamalar />} />

        {/* Noto‘g‘ri route bo‘lsa bosh sahifaga qaytaradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
