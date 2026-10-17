// Product Analytics — logika murni untuk halaman /products (produk perangkat).
//
// Klasifikasi perangkat (kesepakatan produk):
//   - APPLE  : brand_name = 'APPLE' AND lob ∈ {MAC, IPHONE, IPAD, APPLE WATCH, WATCH}
//   - ANDROID: brand_name <> 'APPLE' AND lob ∈ {PHONE, WATCH, TABLETS}
// Accessories & VAS TIDAK masuk di sini (section terpisah).
//
// Metrik utama = Qty, Revenue = opsi kedua.

export type DeviceMetric = "qty" | "revenue";

export const DEVICE_METRIC_DEFAULT: DeviceMetric = "qty";

/** Baris teragregasi dari RPC `product_analytics_devices`. */
export type DeviceProductRow = {
  brand: string;
  lob: string;
  sublob: string;
  qty: number;
  revenue: number;
  /** Daftar sap_article (SKU) unik pada baris ini; dipakai untuk hitung SKU aktif. */
  skus: string[];
};

export type DeviceMetrics = {
  /** Distinct sap_article (SKU) non-null di seluruh scope perangkat. */
  skuCount: number;
  /** Distinct sublob aktif (baris "(no sublob)" tidak dihitung). */
  sublobCount: number;
  /** Average Selling Price = total revenue / total qty (null bila qty 0). */
  asp: number | null;
  /** Konsentrasi: share (%) 10 produk (sublob) teratas, per metrik. */
  concentrationQty: number | null;
  concentrationRevenue: number | null;
  totalQty: number;
  totalRevenue: number;
};

export const NO_SUBLOB = "(no sublob)";

export function metricValue(row: DeviceProductRow, metric: DeviceMetric): number {
  return metric === "qty" ? row.qty : row.revenue;
}

export function rowKey(row: DeviceProductRow): string {
  return `${row.brand}|${row.lob}|${row.sublob}`;
}

/** Normalisasi hasil RPC: koersi angka, jamin array skus, buang baris tanpa identitas. */
export function normalizeDeviceRows(
  raw: readonly unknown[] | null | undefined,
): DeviceProductRow[] {
  const out: DeviceProductRow[] = [];
  for (const item of raw ?? []) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const brand = typeof r.brand === "string" ? r.brand : "";
    const lob = typeof r.lob === "string" ? r.lob : "";
    if (!brand || !lob) continue;
    out.push({
      brand,
      lob,
      sublob: typeof r.sublob === "string" && r.sublob ? r.sublob : NO_SUBLOB,
      qty: Number(r.qty ?? 0) || 0,
      revenue: Number(r.revenue ?? 0) || 0,
      skus: Array.isArray(r.skus)
        ? r.skus.filter((s): s is string => typeof s === "string" && s.length > 0)
        : [],
    });
  }
  return out;
}

function top10Share(
  rows: DeviceProductRow[],
  metric: DeviceMetric,
): number | null {
  const total = rows.reduce((a, r) => a + metricValue(r, metric), 0);
  if (total <= 0) return null;
  const sorted = [...rows].sort(
    (a, b) => metricValue(b, metric) - metricValue(a, metric),
  );
  const top = sorted.slice(0, 10).reduce((a, r) => a + metricValue(r, metric), 0);
  return (100 * top) / total;
}

export function computeDeviceMetrics(rows: DeviceProductRow[]): DeviceMetrics {
  const skuSet = new Set<string>();
  let totalQty = 0;
  let totalRevenue = 0;
  const sublobSet = new Set<string>();

  for (const r of rows) {
    totalQty += r.qty;
    totalRevenue += r.revenue;
    for (const s of r.skus) skuSet.add(s);
    if (r.sublob !== NO_SUBLOB) sublobSet.add(r.sublob);
  }

  return {
    skuCount: skuSet.size,
    sublobCount: sublobSet.size,
    asp: totalQty > 0 ? totalRevenue / totalQty : null,
    concentrationQty: top10Share(rows, "qty"),
    concentrationRevenue: top10Share(rows, "revenue"),
    totalQty,
    totalRevenue,
  };
}

/**
 * Ranking + share + cumulative per baris, dihitung terhadap seluruh himpunan
 * (bukan per halaman) dan mengikuti metrik terpilih.
 */
export type RankedDeviceRow = {
  row: DeviceProductRow;
  rank: number;
  value: number;
  share: number;
  cumulative: number;
};

export function rankDeviceRows(
  rows: DeviceProductRow[],
  metric: DeviceMetric,
): RankedDeviceRow[] {
  const total = rows.reduce((a, r) => a + metricValue(r, metric), 0);
  const sorted = [...rows].sort((a, b) => {
    const d = metricValue(b, metric) - metricValue(a, metric);
    if (d !== 0) return d;
    return a.sublob.localeCompare(b.sublob, "id");
  });
  let cumulative = 0;
  return sorted.map((row, i) => {
    const value = metricValue(row, metric);
    const share = total > 0 ? (100 * value) / total : 0;
    cumulative += share;
    return { row, rank: i + 1, value, share, cumulative };
  });
}

/** ASP per baris = revenue / qty (null bila qty 0). */
export function rowAsp(row: DeviceProductRow): number | null {
  return row.qty > 0 ? row.revenue / row.qty : null;
}

/** LOB perangkat Apple yang sah (anomali lob 'WATCH' dikecualikan). */
export const APPLE_LOBS = ["MAC", "IPHONE", "IPAD", "APPLE WATCH"] as const;
const APPLE_LOB_SET = new Set<string>(APPLE_LOBS);

/** Satu baris ringkasan: grup + sublob teratasnya (metrik terpilih). */
export type BestSeller = {
  /** Nama grup: lob (Apple) atau brand (Android). */
  group: string;
  /** Total metrik grup. */
  groupValue: number;
  /** Baris sublob teratas di grup. */
  top: DeviceProductRow;
  /** Nilai metrik sublob teratas. */
  topValue: number;
  /** Share (%) sublob teratas terhadap grup. */
  share: number;
  /** Jumlah varian sublob di grup. */
  variantCount: number;
};

/**
 * "Top Sublob per Lini": untuk setiap grup ambil satu sublob teratas.
 * - Apple : grup = lob (hanya APPLE_LOBS).
 * - Android: grup = brand.
 * Diurutkan menurut total grup (metrik terpilih) menurun.
 */
export function bestSellerByGroup(
  rows: DeviceProductRow[],
  metric: DeviceMetric,
  mode: "apple-lob" | "android-brand",
): BestSeller[] {
  const groups = new Map<string, { value: number; items: DeviceProductRow[] }>();

  for (const r of rows) {
    let group: string;
    if (mode === "apple-lob") {
      if (r.brand !== "APPLE" || !APPLE_LOB_SET.has(r.lob)) continue;
      group = r.lob;
    } else {
      if (r.brand === "APPLE") continue;
      group = r.brand;
    }
    const v = metricValue(r, metric);
    const g = groups.get(group);
    if (g) {
      g.value += v;
      g.items.push(r);
    } else {
      groups.set(group, { value: v, items: [r] });
    }
  }

  const out: BestSeller[] = [];
  for (const [group, g] of groups) {
    let top = g.items[0];
    let topValue = metricValue(top, metric);
    for (const r of g.items) {
      const v = metricValue(r, metric);
      if (v > topValue) {
        top = r;
        topValue = v;
      }
    }
    out.push({
      group,
      groupValue: g.value,
      top,
      topValue,
      share: g.value > 0 ? (100 * topValue) / g.value : 0,
      variantCount: g.items.length,
    });
  }
  out.sort((a, b) => b.groupValue - a.groupValue);
  return out;
}


/** Palet violet sekuensial untuk chart/treemap (konsisten dengan tema repo). */
export const VIOLET_SCALE = [
  "#7C3AED",
  "#8B5CF6",
  "#A78BFA",
  "#C4B5FD",
  "#DDD6FE",
] as const;
