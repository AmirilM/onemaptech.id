export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return "Rp" + Number(n).toLocaleString("id-ID");
}

export function rupiahCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000_000)
    return `Rp${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (Math.abs(v) >= 1_000_000)
    return `Rp${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
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
