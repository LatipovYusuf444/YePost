import { useCallback } from "react";
import { hujjatQatoriTanlangan, type HujjatQatoriTanlovi } from "@/lib/hujjatQatoriTanlovi";

export function useHisobotQatori(tanlov?: HujjatQatoriTanlovi) {
  const ref = useCallback((element: HTMLElement | null) => {
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return (item: Parameters<typeof hujjatQatoriTanlangan>[1]) => hujjatQatoriTanlangan(tanlov, item)
    ? { "data-report-highlight": "true", ref }
    : {};
}
