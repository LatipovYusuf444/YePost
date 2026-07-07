import apiClient from "./axios";
import { apiData, type ApiEnvelope } from "./response";
import type {
  JoriyFoydalanuvchi,
  ParolAlmashtirishMalumoti,
  ProfilYangilashMalumoti,
} from "@/types/tenant";

// Sozlamalar/ShaxsiyProfil.tsx: joriy foydalanuvchining real profil ma'lumotlari.
export const profilApi = {
  olish: async () => {
    const response = await apiClient.get<JoriyFoydalanuvchi | ApiEnvelope<JoriyFoydalanuvchi>>(
      "/auth/me"
    );

    return apiData(response.data);
  },
  yangilash: async (data: ProfilYangilashMalumoti) => {
    const response = await apiClient.patch<JoriyFoydalanuvchi | ApiEnvelope<JoriyFoydalanuvchi>>(
      "/auth/me",
      data
    );

    return apiData(response.data);
  },
};

// Sozlamalar/Xavsizlik.tsx: eski parolni tekshirtirib, yangi parol o'rnatadi.
export async function parolniAlmashtirish(data: ParolAlmashtirishMalumoti) {
  return (await apiClient.post("/auth/change-password", data)).data;
}
