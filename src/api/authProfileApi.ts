import apiClient from "./axios";
import type {
  JoriyFoydalanuvchi,
  ParolAlmashtirishMalumoti,
  ProfilYangilashMalumoti,
} from "@/types/tenant";

// Sozlamalar/ShaxsiyProfil.tsx: joriy foydalanuvchining real profil ma'lumotlari.
export const profilApi = {
  olish: async () =>
    (await apiClient.get<JoriyFoydalanuvchi>("/auth/me")).data,
  yangilash: async (data: ProfilYangilashMalumoti) =>
    (await apiClient.patch<JoriyFoydalanuvchi>("/auth/me", data)).data,
};

// Sozlamalar/Xavsizlik.tsx: eski parolni tekshirtirib, yangi parol o'rnatadi.
export async function parolniAlmashtirish(data: ParolAlmashtirishMalumoti) {
  return (await apiClient.post("/auth/change-password", data)).data;
}
