import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeAccessoryBrands,
  computeAccessoryTotals,
  normalizeAccessoryRows,
  normalizeLob,
  type AccessoryRow,
} from "./accessories.ts";

const rows: AccessoryRow[] = [
  { brand: "APPLE", lob: "CHARGER", article: "A1", description: "20W ADAPTER", qty: 6, revenue: 600 },
  { brand: "APPLE", lob: "CHARGER", article: "A2", description: "45W ADAPTER", qty: 2, revenue: 300 },
  { brand: "APPLE", lob: "CASE", article: "A3", description: "SILICONE CASE", qty: 2, revenue: 100 },
  { brand: "SAMSUNG", lob: "CASE", article: "S1", description: "GALAXY CASE", qty: 10, revenue: 0 },
];

test("normalizeLob: trim, uppercase, dan alias ejaan", () => {
  assert.equal(normalizeLob(" casing "), "CASE");
  assert.equal(normalizeLob("POWERBANK"), "POWER BANK");
  assert.equal(normalizeLob("Key  Board"), "KEYBOARD");
  assert.equal(normalizeLob("Speaker"), "SPEAKERS");
  assert.equal(normalizeLob("Front Screen"), "FRONT SCREEN");
});

test("normalizeAccessoryRows: koersi angka dan buang baris tanpa identitas", () => {
  const out = normalizeAccessoryRows([
    { brand: " apple ", lob: "charger", article: " A1 ", description: " 20W ", qty: "6", revenue: "600" },
    { brand: "APPLE", lob: "CHARGER", article: "" },
    { brand: "", lob: "CHARGER", article: "X" },
    null,
  ]);
  assert.deepEqual(out, [
    { brand: "APPLE", lob: "CHARGER", article: "A1", description: "20W", qty: 6, revenue: 600 },
  ]);
});

test("totals: qty, revenue, jumlah brand & artikel", () => {
  assert.deepEqual(computeAccessoryTotals(rows), {
    qty: 20,
    revenue: 1000,
    brandCount: 2,
    articleCount: 4,
  });
});

test("pohon: brand -> LOB -> produk, share terhadap induk, urut revenue", () => {
  const brands = computeAccessoryBrands(rows);
  assert.deepEqual(
    brands.map((b) => b.brand),
    ["APPLE", "SAMSUNG"],
  );

  const apple = brands[0];
  assert.equal(apple.qty, 10);
  assert.equal(apple.revenue, 1000);
  assert.equal(apple.qtyShare, 50);
  assert.equal(apple.revenueShare, 100);
  assert.equal(apple.totalRevenueShare, 100);
  assert.equal(apple.asp, 100);
  assert.equal(apple.skuCount, 3);

  assert.deepEqual(
    apple.lobs.map((l) => [l.lob, l.revenue, l.revenueShare, l.qtyShare]),
    [
      ["CHARGER", 900, 90, 80],
      ["CASE", 100, 10, 20],
    ],
  );

  const charger = apple.lobs[0];
  assert.equal(charger.asp, 112.5);
  assert.equal(charger.skuCount, 2);
  assert.equal(charger.totalRevenueShare, 90);
  assert.deepEqual(
    charger.products.map((p) => [p.article, p.qty, p.revenue, p.qtyShare]),
    [
      ["A1", 6, 600, 75],
      ["A2", 2, 300, 25],
    ],
  );
  assert.equal(
    Math.round(charger.products[0].revenueShare * 10) / 10,
    66.7,
  );
  assert.equal(charger.products[0].asp, 100);
  assert.equal(charger.products[0].totalRevenueShare, 60);
  assert.equal(charger.products[0].skuCount, 1);

  // SAMSUNG: revenue 0 -> share revenue 0, qty tetap dihitung.
  const samsung = brands[1];
  assert.equal(samsung.revenueShare, 0);
  assert.equal(samsung.qtyShare, 50);
  assert.equal(samsung.asp, 0);
  assert.equal(samsung.lobs[0].lob, "CASE");
  assert.equal(samsung.lobs[0].products[0].qtyShare, 100);
  assert.equal(samsung.lobs[0].products[0].revenueShare, 0);
});

test("artikel ganda dalam satu LOB digabung", () => {
  const brands = computeAccessoryBrands([
    ...rows,
    { brand: "APPLE", lob: "CHARGER", article: "A1", description: "20W ADAPTER", qty: 1, revenue: 100 },
  ]);
  const a1 = brands[0].lobs[0].products.find((p) => p.article === "A1");
  assert.equal(a1?.qty, 7);
  assert.equal(a1?.revenue, 700);
});

test("data kosong: share 0, bukan NaN", () => {
  assert.deepEqual(computeAccessoryTotals([]), {
    qty: 0,
    revenue: 0,
    brandCount: 0,
    articleCount: 0,
  });
  assert.deepEqual(computeAccessoryBrands([]), []);
});
