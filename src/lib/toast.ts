import { toast } from "sonner";

// Bir xil matnli toast bir necha marta ketma-ket chiqsa (masalan bir nechta
// so'rov birgalikda yuborilganda), ustma-ust to'planib ketmasligi uchun
// bir xil `id` beriladi — sonner buni yangi qator sifatida emas, mavjudini
// yangilash sifatida ko'rsatadi.
export function muvaffaqiyatXabari(matn: string) {
  toast.success(matn, { id: matn });
}

export function xatolikXabari(matn: string) {
  toast.error(matn, { id: matn });
}
