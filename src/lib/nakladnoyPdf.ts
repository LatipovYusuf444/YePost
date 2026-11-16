// Nakladnoy / hisob-faktura PDF'i uchun kirill harfli shrift (DejaVu Sans, litsenziya: src/assets/fonts/DejaVu-LICENSE.txt).
// Shriftlar faqat PDF yuklab olinganda bir marta yuklanadi (asosiy bundle'ga kirmaydi).
import oddiyUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import qalinUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?url";
import { PdfShrifti, pdfYigish, ttfOqish, type TtfShrift } from "./pdfShrift";

let kesh: Promise<{ oddiy: TtfShrift; qalin: TtfShrift }> | null = null;

async function yuklash(url: string) {
  const javob = await fetch(url);
  if (!javob.ok) throw new Error(`Shrift yuklanmadi (${javob.status})`);
  return new Uint8Array(await javob.arrayBuffer());
}

function shriftlarniOlish() {
  kesh ??= Promise.all([yuklash(oddiyUrl), yuklash(qalinUrl)])
    .then(([oddiy, qalin]) => ({ oddiy: ttfOqish(oddiy, "DejaVuSans"), qalin: ttfOqish(qalin, "DejaVuSans-Bold", true) }))
    .catch((xato) => {
      kesh = null;
      throw xato;
    });
  return kesh;
}

/** F1 — oddiy, F2 — qalin shrift; `pdf(buyruqlar)` — tayyor PDF baytlari. */
export async function nakladnoyPdfShriftlari() {
  const { oddiy, qalin } = await shriftlarniOlish();
  const shriftlar = { F1: new PdfShrifti(oddiy), F2: new PdfShrifti(qalin) };
  return { shriftlar, pdf: (buyruqlar: string) => pdfYigish(buyruqlar, shriftlar) };
}
