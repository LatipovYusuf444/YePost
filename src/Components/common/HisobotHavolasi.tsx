import { ExternalLink } from "lucide-react";
import type { HujjatHisobotManbasi } from "@/lib/hujjatQatoriTanlovi";

export default function HisobotHavolasi({ manba }: { manba?: HujjatHisobotManbasi }) {
  return manba ? <a href={manba.href} target="_blank" rel="noopener noreferrer" className="mx-6 my-3 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"><ExternalLink size={16} />{manba.nom}</a> : null;
}
