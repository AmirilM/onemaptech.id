export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (v < 0) return "-Rp " + Math.abs(v).toLocaleString("id-ID");
  return "Rp " + v.toLocaleString("id-ID");
}

export function rupiahCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1_000_000_000)
    return `${sign}Rp ${(a / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1_000_000)
    return `${sign}Rp ${(a / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Jt`;
  if (a >= 1_000)
    return `${sign}Rp ${(a / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Rb`;
  return rupiah(v);
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  // Option B: never show 100% before the real value is >= 100.
  // 99.95%-99.99% would normally round to 100%, so cap it at 99.9%.
  const rounded1 = Math.round(v * 10) / 10;
  if (v < 100 && rounded1 >= 100) {
    return `${(99.9).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  }
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}

export function pctExact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (!Number.isFinite(v)) return "-";
  return `${v.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString("id-ID");
}

const MONTH_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// "2026-10-01" -> "01-Oct". Parse manually to stay safe from timezone shifts.
export function formatDayMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return iso;
  return `${m[3]}-${MONTH_SHORT_EN[mo - 1]}`;
}

// "2026-10" -> "Oct 2026".
export function formatMonthYear(isoMonth: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(isoMonth);
  if (!m) return isoMonth;
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return isoMonth;
  return `${MONTH_SHORT_EN[mo - 1]} ${m[1]}`;
}
