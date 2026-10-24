// Accessories — logika murni untuk halaman /products/accessories.
//
// Sumber data: RPC `product_analytics_accessories` (kpi_group = 'ACCESSORIES').
// Satu baris RPC = satu sap_article; artikel selalu punya satu brand/lob/deskripsi.
//
// Tiga lapis agregasi di halaman ini:
//   - brand  : kontribusi tiap brand terhadap total accessories
//   - LOB    : kontribusi tiap lob di dalam brand-nya
//   - artikel: detail per sap_description, kontribusi terhadap total accessories

export type AccessoryRow = {
  brand: string;
  lob: string;
  article: string;
  description: string;
  qty: number;
  revenue: number;
};

export type AccessoryShare = {
  qtyShare: number;
  revenueShare: number;
};

export type AccessoryLob = AccessoryShare & {
  lob: string;
  qty: number;
  revenue: number;
};

export type AccessoryBrand = AccessoryShare & {
  brand: string;
  qty: number;
  revenue: number;
  lobs: AccessoryLob[];
};

export type AccessoryItem = AccessoryShare & AccessoryRow;

export type AccessoryTotals = {
  qty: number;
  revenue: number;
  brandCount: number;
  articleCount: number;
};

// Alias ejaan yang jelas sama. LOB yang mirip tapi beda arti
// (FRONT SCREEN, SCREEN PROTECTOR, SCREEN LENS) sengaja dipisah.
const LOB_ALIAS: Record<string, string> = {
  CASING: "CASE",
  POWERBANK: "POWER BANK",
  "KEY BOARD": "KEYBOARD",
  EARPHONE: "EARPHONES",
  BAND: "BANDS",
  SPEAKER: "SPEAKERS",
};

export function normalizeLob(lob: string): string {
  const key = lob.trim().replace(/\s+/g, " ").toUpperCase();
  return LOB_ALIAS[key] ?? key;
}

/** Normalisasi hasil RPC: koersi angka, rapikan brand/lob, buang baris tanpa identitas. */
export function normalizeAccessoryRows(
  raw: readonly unknown[] | null | undefined,
): AccessoryRow[] {
  const out: AccessoryRow[] = [];
  for (const item of raw ?? []) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const brand = typeof r.brand === "string" ? r.brand.trim().toUpperCase() : "";
    const lob = typeof r.lob === "string" ? normalizeLob(r.lob) : "";
    const article = typeof r.article === "string" ? r.article.trim() : "";
    if (!brand || !lob || !article) continue;
    out.push({
      brand,
      lob,
      article,
      description:
        typeof r.description === "string" && r.description.trim()
          ? r.description.trim()
          : article,
      qty: Number(r.qty ?? 0) || 0,
      revenue: Number(r.revenue ?? 0) || 0,
    });
  }
  return out;
}

function share(part: number, total: number): number {
  return total > 0 ? (100 * part) / total : 0;
}

function compareRevenue(a: { revenue: number }, b: { revenue: number }): number {
  return b.revenue - a.revenue;
}

export function computeAccessoryTotals(rows: AccessoryRow[]): AccessoryTotals {
  const brands = new Set<string>();
  const articles = new Set<string>();
  let qty = 0;
  let revenue = 0;
  for (const r of rows) {
    qty += r.qty;
    revenue += r.revenue;
    brands.add(r.brand);
    articles.add(r.article);
  }
  return { qty, revenue, brandCount: brands.size, articleCount: articles.size };
}

/** Brand + LOB-nya, urut revenue menurun. Share dihitung terhadap total accessories. */
export function computeAccessoryBrands(rows: AccessoryRow[]): AccessoryBrand[] {
  const totals = computeAccessoryTotals(rows);
  const map = new Map<
    string,
    { qty: number; revenue: number; lobs: Map<string, { qty: number; revenue: number }> }
  >();

  for (const r of rows) {
    let brand = map.get(r.brand);
    if (!brand) {
      brand = { qty: 0, revenue: 0, lobs: new Map() };
      map.set(r.brand, brand);
    }
    brand.qty += r.qty;
    brand.revenue += r.revenue;

    const lob = brand.lobs.get(r.lob) ?? { qty: 0, revenue: 0 };
    lob.qty += r.qty;
    lob.revenue += r.revenue;
    brand.lobs.set(r.lob, lob);
  }

  const out: AccessoryBrand[] = [];
  for (const [name, brand] of map) {
    out.push({
      brand: name,
      qty: brand.qty,
      revenue: brand.revenue,
      qtyShare: share(brand.qty, totals.qty),
      revenueShare: share(brand.revenue, totals.revenue),
      lobs: [...brand.lobs.entries()]
        .map(([lob, v]) => ({
          lob,
          qty: v.qty,
          revenue: v.revenue,
          qtyShare: share(v.qty, brand.qty),
          revenueShare: share(v.revenue, brand.revenue),
        }))
        .sort(compareRevenue),
    });
  }
  return out.sort(compareRevenue);
}

/** Detail per artikel (sap_description), urut revenue menurun. */
export function computeAccessoryItems(rows: AccessoryRow[]): AccessoryItem[] {
  const totals = computeAccessoryTotals(rows);
  const map = new Map<string, AccessoryRow>();

  for (const r of rows) {
    const item = map.get(r.article);
    if (item) {
      item.qty += r.qty;
      item.revenue += r.revenue;
    } else {
      map.set(r.article, { ...r });
    }
  }

  return [...map.values()]
    .map((r) => ({
      ...r,
      qtyShare: share(r.qty, totals.qty),
      revenueShare: share(r.revenue, totals.revenue),
    }))
    .sort(compareRevenue);
}

/** Pilihan filter LOB (sudah dinormalisasi), urut abjad. */
export function accessoryLobOptions(rows: AccessoryRow[]): string[] {
  return [...new Set(rows.map((r) => r.lob))].sort((a, b) =>
    a.localeCompare(b, "id"),
  );
}
