import { toast } from "sonner";
import { apiTiliniOlish } from "@/api/apiLanguage";
import { taqsimotXabari, taqsimotniOqish } from "@/lib/qarzTaqsimoti";

// Mijoz to'lovi tasdiqlangach: "2 ta savdo yopildi: №07839743, №41633428" va "Hisobga: $0" (javobdagi `allocation`dan).
export function taqsimotXabariniKorsatish(javob: unknown) {
  const xabar = taqsimotXabari(taqsimotniOqish(javob), apiTiliniOlish());
  if (xabar) toast.success(xabar.sarlavha, { id: `taqsimot:${xabar.sarlavha}`, description: xabar.tafsilot, duration: 12_000 });
}
