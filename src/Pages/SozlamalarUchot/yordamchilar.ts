export const maydonKlass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold outline-none transition focus:border-[#FF6A00] focus:ring-4 focus:ring-orange-100";

export function yangiId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
