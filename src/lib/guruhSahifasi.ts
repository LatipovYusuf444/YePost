/** Mahsulotning sarlavhasi va barcha harakatlari bir sahifada qoladi. */
export function guruhSahifasi<T>(rows: T[], key: (row: T) => string, page: number, pageSize: number) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(row);
  }
  const size = Math.max(1, pageSize);
  const current = Math.min(Math.max(1, page), Math.max(1, Math.ceil(groups.size / size)));
  return { rows: [...groups.values()].slice((current - 1) * size, current * size).flat(), total: groups.size, page: current };
}
