// Accessories — logika murni untuk halaman /products/accessories.
//
// Sumber data: RPC `product_analytics_accessories` (kpi_group = 'ACCESSORIES').
// Satu baris RPC = satu sap_article; artikel selalu punya satu brand/lob/deskripsi.
//
// Satu pohon tiga level untuk halaman ini:
//   brand -> LOB -> produk (sap_description)
// Share selalu dihitung terhadap induknya: brand vs total, LOB vs brand, produk vs LOB.

export type AccessoryRow = {
  brand: string;
  lob: string;
  article: string;
  description: string;
  qty: number;
  revenue: number;
};

export type AccessoryShare = {
  /** Porsi terhadap induk (brand→total, LOB→brand, produk→LOB). */
  qtyShare: number;
  revenueShare: number;
  /** Porsi revenue terhadap total seluruh Accessories. */
  totalRevenueShare: number;
};

export type AccessoryProduct = AccessoryShare &
  AccessoryRow & {
    /** Average Selling Price = revenue / qty (null bila qty 0). */
    asp: number | null;
    /** Satu artikel = satu SKU. */
    skuCount: number;
  };

export type AccessoryLob = AccessoryShare & {
  lob: string;
  qty: number;
  revenue: number;
  asp: number | null;
  /** Distinct sap_article yang terjual di LOB ini. */
  skuCount: number;
  products: AccessoryProduct[];
};

export type AccessoryBrand = AccessoryShare & {
  brand: string;
  qty: number;
  revenue: number;
  asp: number | null;
  /** Distinct sap_article yang terjual di brand ini. */
  skuCount: number;
  lobs: AccessoryLob[];
};

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

type LobBucket = {
  qty: number;
  revenue: number;
  products: Map<string, AccessoryRow>;
};

/** Average Selling Price = revenue / qty (null bila qty 0). */
export function asp(qty: number, revenue: number): number | null {
  return qty > 0 ? revenue / qty : null;
}

/**
 * Pohon brand -> LOB -> produk, urut revenue menurun di tiap level.
 * Share induk: brand vs total, LOB vs brand, produk vs LOB.
 * totalRevenueShare selalu terhadap total seluruh Accessories.
 */
export function computeAccessoryBrands(rows: AccessoryRow[]): AccessoryBrand[] {
  const totals = computeAccessoryTotals(rows);
  const map = new Map<
    string,
    {
      qty: number;
      revenue: number;
      articles: Set<string>;
      lobs: Map<string, LobBucket>;
    }
  >();

  for (const r of rows) {
    let brand = map.get(r.brand);
    if (!brand) {
      brand = { qty: 0, revenue: 0, articles: new Set(), lobs: new Map() };
      map.set(r.brand, brand);
    }
    brand.qty += r.qty;
    brand.revenue += r.revenue;
    brand.articles.add(r.article);

    let lob = brand.lobs.get(r.lob);
    if (!lob) {
      lob = { qty: 0, revenue: 0, products: new Map() };
      brand.lobs.set(r.lob, lob);
    }
    lob.qty += r.qty;
    lob.revenue += r.revenue;

    const product = lob.products.get(r.article);
    if (product) {
      product.qty += r.qty;
      product.revenue += r.revenue;
    } else {
      lob.products.set(r.article, { ...r });
    }
  }

  const out: AccessoryBrand[] = [];
  for (const [name, brand] of map) {
    out.push({
      brand: name,
      qty: brand.qty,
      revenue: brand.revenue,
      asp: asp(brand.qty, brand.revenue),
      skuCount: brand.articles.size,
      qtyShare: share(brand.qty, totals.qty),
      revenueShare: share(brand.revenue, totals.revenue),
      totalRevenueShare: share(brand.revenue, totals.revenue),
      lobs: [...brand.lobs.entries()]
        .map(([lobName, lob]) => ({
          lob: lobName,
          qty: lob.qty,
          revenue: lob.revenue,
          asp: asp(lob.qty, lob.revenue),
          skuCount: lob.products.size,
          qtyShare: share(lob.qty, brand.qty),
          revenueShare: share(lob.revenue, brand.revenue),
          totalRevenueShare: share(lob.revenue, totals.revenue),
          products: [...lob.products.values()]
            .map((p) => ({
              ...p,
              asp: asp(p.qty, p.revenue),
              skuCount: 1,
              qtyShare: share(p.qty, lob.qty),
              revenueShare: share(p.revenue, lob.revenue),
              totalRevenueShare: share(p.revenue, totals.revenue),
            }))
            .sort(compareRevenue),
        }))
        .sort(compareRevenue),
    });
  }
  return out.sort(compareRevenue);
}
