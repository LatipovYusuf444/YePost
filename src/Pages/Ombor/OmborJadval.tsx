import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type OmborJadvalProps = {
  children: ReactNode;
  className?: string;
};

type ScrollHolati = {
  left: number;
  clientWidth: number;
  scrollWidth: number;
};

const BOSHLANGICH_SCROLL = { left: 0, clientWidth: 0, scrollWidth: 0 };

/**
 * Ombor bo'limidagi jadvallar uchun yagona UI qobig'i.
 * Jadvalning o'z ma'lumoti va actionlari children ichida o'zgarishsiz qoladi.
 */
export default function OmborJadval({ children, className = "" }: OmborJadvalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [scroll, setScroll] = useState<ScrollHolati>(BOSHLANGICH_SCROLL);

  const scrollHolatiniYangilash = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const keyingi = {
      left: element.scrollLeft,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
    setScroll((oldingi) =>
      oldingi.left === keyingi.left &&
      oldingi.clientWidth === keyingi.clientWidth &&
      oldingi.scrollWidth === keyingi.scrollWidth
        ? oldingi
        : keyingi,
    );
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    scrollHolatiniYangilash();
    const observer = new ResizeObserver(scrollHolatiniYangilash);
    observer.observe(element);
    const table = element.querySelector("table");
    if (table) observer.observe(table);
    element.addEventListener("scroll", scrollHolatiniYangilash, { passive: true });

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", scrollHolatiniYangilash);
    };
  }, [scrollHolatiniYangilash]);

  const maksimalScroll = Math.max(0, scroll.scrollWidth - scroll.clientWidth);
  const thumbKengligi = scroll.scrollWidth > 0
    ? Math.max(8, Math.min(100, (scroll.clientWidth / scroll.scrollWidth) * 100))
    : 100;
  const thumbChap = maksimalScroll > 0
    ? (scroll.left / maksimalScroll) * (100 - thumbKengligi)
    : 0;

  const yonTomongaYurish = (yonalish: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: yonalish * Math.max(260, element.clientWidth * 0.72),
      behavior: "smooth",
    });
  };

  const resizeBoshlash = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const th = target.closest("th") as HTMLTableCellElement | null;
    if (!th || !scrollRef.current?.contains(th)) return;

    const rect = th.getBoundingClientRect();
    if (Math.abs(event.clientX - rect.right) > 9) return;

    event.preventDefault();
    event.stopPropagation();
    const table = th.closest("table") as HTMLTableElement | null;
    const boshlangichX = event.clientX;
    const boshlangichKenglik = rect.width;
    const tableKengligi = table?.getBoundingClientRect().width ?? 0;
    const eskiCursor = document.body.style.cursor;
    const eskiTanlash = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const yurish = (moveEvent: MouseEvent) => {
      const farq = moveEvent.clientX - boshlangichX;
      const yangiKenglik = Math.max(90, boshlangichKenglik + farq);
      const haqiqiyFarq = yangiKenglik - boshlangichKenglik;
      th.style.width = `${yangiKenglik}px`;
      th.style.minWidth = `${yangiKenglik}px`;
      th.style.maxWidth = `${yangiKenglik}px`;
      if (table) {
        table.style.width = `${Math.max(scrollRef.current?.clientWidth ?? 0, tableKengligi + haqiqiyFarq)}px`;
      }
      scrollHolatiniYangilash();
    };

    const tugatish = () => {
      document.removeEventListener("mousemove", yurish);
      document.removeEventListener("mouseup", tugatish);
      document.body.style.cursor = eskiCursor;
      document.body.style.userSelect = eskiTanlash;
      scrollHolatiniYangilash();
    };

    document.addEventListener("mousemove", yurish);
    document.addEventListener("mouseup", tugatish);
  };

  const resizeCursor = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const th = target.closest("th") as HTMLTableCellElement | null;
    if (!th) {
      event.currentTarget.style.cursor = "";
      return;
    }
    const rect = th.getBoundingClientRect();
    event.currentTarget.style.cursor = Math.abs(event.clientX - rect.right) <= 9 ? "col-resize" : "";
  };

  const thumbniSurish = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const element = scrollRef.current;
    const track = trackRef.current;
    if (!element || !track || maksimalScroll <= 0) return;
    const boshlangichX = event.clientX;
    const boshlangichScroll = element.scrollLeft;
    const yurishMaydoni = track.clientWidth * (1 - thumbKengligi / 100);

    const yurish = (moveEvent: MouseEvent) => {
      if (yurishMaydoni <= 0) return;
      element.scrollLeft = Math.max(
        0,
        Math.min(maksimalScroll, boshlangichScroll + ((moveEvent.clientX - boshlangichX) / yurishMaydoni) * maksimalScroll),
      );
    };
    const tugatish = () => {
      document.removeEventListener("mousemove", yurish);
      document.removeEventListener("mouseup", tugatish);
    };
    document.addEventListener("mousemove", yurish);
    document.addEventListener("mouseup", tugatish);
  };

  return (
    <div className={`overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-sm ${className}`}>
      <div
        ref={scrollRef}
        onMouseDown={resizeBoshlash}
        onMouseMove={resizeCursor}
        onMouseLeave={(event) => { event.currentTarget.style.cursor = ""; }}
        className="scrollbar-hidden overflow-x-auto [&_table]:min-w-full [&_thead]:bg-[#fff9f3] [&_thead]:text-orange-600 [&_thead_th]:relative [&_thead_th]:h-[74px] [&_thead_th]:whitespace-nowrap [&_thead_th]:border-r [&_thead_th]:border-orange-200 [&_thead_th]:px-7 [&_thead_th]:py-4 [&_thead_th]:text-xs [&_thead_th]:font-black [&_thead_th]:uppercase [&_thead_th:last-child]:border-r-0 [&_tbody]:divide-y [&_tbody]:divide-orange-100 [&_tbody_td]:px-7 [&_tbody_td]:py-5"
      >
        {children}
      </div>

      <div className="flex h-[70px] items-center gap-4 border-t border-orange-100 px-5">
        <button
          type="button"
          onClick={() => yonTomongaYurish(-1)}
          disabled={scroll.left <= 1}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-default disabled:opacity-40"
          aria-label="Jadvalni chapga surish"
        >
          <ChevronLeft size={22} />
        </button>
        <div ref={trackRef} className="relative h-3 flex-1 rounded-full bg-[#fff4e8]">
          <div
            onMouseDown={thumbniSurish}
            className={`absolute inset-y-0 rounded-full bg-orange-500 ${maksimalScroll > 0 ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ left: `${thumbChap}%`, width: `${thumbKengligi}%` }}
          />
        </div>
        <button
          type="button"
          onClick={() => yonTomongaYurish(1)}
          disabled={scroll.left >= maksimalScroll - 1}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-500 shadow-sm transition hover:bg-orange-50 disabled:cursor-default disabled:opacity-40"
          aria-label="Jadvalni o'ngga surish"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}
