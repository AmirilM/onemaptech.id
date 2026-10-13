export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (v < 0) return "-Rp" + Math.abs(v).toLocaleString("id-ID");
  return "Rp" + v.toLocaleString("id-ID");
}

export function rupiahCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1_000_000_000)
    return `${sign}Rp${(a / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (a >= 1_000_000)
    return `${sign}Rp${(a / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  return rupiah(v);
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("id-ID");
}
