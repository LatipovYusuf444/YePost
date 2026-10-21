// Kassa jadvali: sotuv to'lovi qatoriga sotuv raqami va mahsulot nomlarini qo'shish uchun sotuvlarni fonda, bittadan emas oz-ozdan olib turadigan kesh.
// Faqat ekranda turgan qatorlar so'raydi (qator ko'rinmay qolsa, hali yuborilmagan so'rov bekor bo'ladi); har bir sotuv bir marta olinadi.
// UI'siz va importlarsiz yozilgan — alohida sinash mumkin.

export type KassaSotuvi = { raqam: string; mahsulotlar: string[] };

export class KassaSotuvKeshi {
  private readonly olish: (sotuvId: string) => Promise<KassaSotuvi>;
  private readonly birVaqtda: number;
  // null — olib bo'lmadi (xato yoki ruxsat yo'q): qayta urinilmaydi, jadval oddiy nomi bilan ko'rinaveradi.
  private readonly natijalar = new Map<string, KassaSotuvi | null>();
  private readonly kutayotgan: string[] = [];
  private readonly yuborilgan = new Set<string>();
  private readonly tinglovchilar = new Set<() => void>();
  private ishlayapti = false;

  constructor(olish: (sotuvId: string) => Promise<KassaSotuvi>, birVaqtda = 6) {
    this.olish = olish;
    this.birVaqtda = birVaqtda;
  }

  /** useSyncExternalStore uchun: natijalar o'zgarganda chaqiriladi. */
  obuna = (tinglovchi: () => void): (() => void) => {
    this.tinglovchilar.add(tinglovchi);
    return () => {
      this.tinglovchilar.delete(tinglovchi);
    };
  };

  /** Olingan sotuv (yoki hali olinmagan / olib bo'lmagan bo'lsa undefined). Bir sotuv uchun doim bitta obyekt qaytadi. */
  olingan = (sotuvId: string | undefined): KassaSotuvi | undefined => (sotuvId ? this.natijalar.get(sotuvId) ?? undefined : undefined);

  /** Sotuvni olishni so'raydi. Allaqachon olingan, yuborilgan yoki navbatda bo'lsa hech narsa qilmaydi. */
  talab(sotuvId: string): void {
    if (this.natijalar.has(sotuvId) || this.yuborilgan.has(sotuvId) || this.kutayotgan.includes(sotuvId)) return;
    this.kutayotgan.push(sotuvId);
    if (this.ishlayapti) return;
    // Bir chizishda (bir sahifadagi barcha qatorlar) kelgan talablar jamlanib, birgalikda yuboriladi.
    this.ishlayapti = true;
    queueMicrotask(() => void this.ishlash());
  }

  /** Qator ekrandan ketdi: hali yuborilmagan so'rov navbatdan olinadi. */
  bekor(sotuvId: string): void {
    const indeks = this.kutayotgan.indexOf(sotuvId);
    if (indeks !== -1) this.kutayotgan.splice(indeks, 1);
  }

  // Oxirgi so'ralganlar birinchi olinadi: foydalanuvchi sahifani almashtirsa, hozir ko'rib turgan qatorlar kutib qolmaydi.
  private async ishlash(): Promise<void> {
    try {
      while (this.kutayotgan.length) {
        const partiya = this.kutayotgan.splice(-this.birVaqtda);
        partiya.forEach((id) => this.yuborilgan.add(id));
        await Promise.all(
          partiya.map(async (id) => {
            try {
              this.natijalar.set(id, await this.olish(id));
            } catch {
              this.natijalar.set(id, null);
            }
          })
        );
        this.tinglovchilar.forEach((tinglovchi) => tinglovchi());
      }
    } finally {
      this.ishlayapti = false;
    }
  }
}
