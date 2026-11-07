// `responseType: "blob"` bilan yuklab olishda (Excel/PDF) xato javobi ham Blob bo'lib keladi — backend xabari yo'qolmasligi uchun
// uni matnga/JSON'ga o'giramiz. axios xato interseptori (`api/axios.ts`) yagona joyda chaqiradi.

/** Xato javobi Blob bo'lsa, ichidagi JSON (yoki matn) obyektini qaytaradi; o'qib bo'lmasa — asl qiymat. */
export async function blobXatosiniOqish(data: unknown): Promise<unknown> {
  if (typeof Blob === "undefined" || !(data instanceof Blob)) return data;
  try {
    const matn = (await data.text()).trim();
    if (!matn) return data;
    try {
      return JSON.parse(matn);
    } catch {
      // JSON bo'lmasa (masalan, HTML sahifa) — faqat qisqa oddiy matn xabar sifatida olinadi.
      return !matn.startsWith("<") && matn.length <= 300 ? { message: matn } : data;
    }
  } catch {
    return data;
  }
}
