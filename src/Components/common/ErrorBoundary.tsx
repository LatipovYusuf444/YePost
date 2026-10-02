import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "i18next";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { xato: Error | null };

// Kutilmagan render xatosi butun ilovani oq (bo'sh) sahifaga aylantirib qo'ymasligi uchun:
// xato matni ko'rsatiladi va sahifani qayta yuklash tugmasi beriladi.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { xato: null };

  static getDerivedStateFromError(xato: Error): State {
    return { xato };
  }

  componentDidCatch(xato: Error, info: ErrorInfo) {
    console.error("Kutilmagan xatolik:", xato, info.componentStack);
  }

  render() {
    const { xato } = this.state;
    if (!xato) return this.props.children;

    const t = (kalit: string) => i18n.t(kalit, { ns: "common" });
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-[28px] bg-white p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,.14)] ring-1 ring-slate-100">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={26} />
          </span>
          <h1 className="mt-4 text-xl font-black text-slate-950">{t("errorBoundary.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("errorBoundary.description")}</p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-slate-50 p-3 text-left text-xs font-semibold text-red-600">{xato.message}</pre>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
            >
              <RefreshCw size={16} /> {t("errorBoundary.reload")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
