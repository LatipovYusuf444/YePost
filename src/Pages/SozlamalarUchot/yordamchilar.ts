export const maydonKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100";

export function yangiId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
