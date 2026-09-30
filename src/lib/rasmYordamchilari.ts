// Profil/xodim rasmlarini tanlash va yuklashga tayyorlash yordamchilari.

export const RASM_TURLARI = ["image/jpeg", "image/png", "image/webp"];
export const RASM_MAX_HAJM = 5 * 1024 * 1024;

// Fayl yaroqsiz bo'lsa i18n kaliti qaytariladi, yaroqli bo'lsa null.
export function rasmniTekshirish(file: File): "avatar.errors.type" | "avatar.errors.size" | null {
  if (!RASM_TURLARI.includes(file.type)) return "avatar.errors.type";
  if (file.size > RASM_MAX_HAJM) return "avatar.errors.size";
  return null;
}

// Rasmni markazdan kvadrat qilib qirqadi va kichraytiradi (yuklash tez va yengil bo'lishi uchun).
export async function rasmniTayyorlash(file: File, olcham = 320): Promise<{ blob: Blob; dataUrl: string }> {
  const manba = URL.createObjectURL(file);
  try {
    const rasm = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi"));
      element.src = manba;
    });
    const tomon = Math.min(rasm.naturalWidth, rasm.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = olcham;
    canvas.height = olcham;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Rasmni qayta ishlab bo'lmadi");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, olcham, olcham);
    context.drawImage(
      rasm,
      (rasm.naturalWidth - tomon) / 2,
      (rasm.naturalHeight - tomon) / 2,
      tomon,
      tomon,
      0,
      0,
      olcham,
      olcham
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((natija) => (natija ? resolve(natija) : reject(new Error("Rasmni qayta ishlab bo'lmadi"))), "image/jpeg", 0.86)
    );
    return { blob, dataUrl: canvas.toDataURL("image/jpeg", 0.86) };
  } finally {
    URL.revokeObjectURL(manba);
  }
}
