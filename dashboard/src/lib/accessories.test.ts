import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accessoryLobOptions,
  computeAccessoryBrands,
  computeAccessoryItems,
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

test("brands: kontribusi terhadap total, LOB terhadap brand, urut revenue", () => {
  const brands = computeAccessoryBrands(rows);
  assert.deepEqual(
    brands.map((b) => b.brand),
    ["APPLE", "SAMSUNG"],
  );
  assert.equal(brands[0].qty, 10);
  assert.equal(brands[0].revenue, 1000);
  assert.equal(brands[0].revenueShare, 100);
  assert.equal(brands[0].qtyShare, 50);

  const appleLobs = brands[0].lobs;
  assert.deepEqual(
    appleLobs.map((l) => [l.lob, l.revenue, l.revenueShare, l.qtyShare]),
    [
      ["CHARGER", 900, 90, 80],
      ["CASE", 100, 10, 20],
    ],
  );

  // SAMSUNG: revenue 0, share total tetap dihitung dari qty.
  assert.equal(brands[1].revenueShare, 0);
  assert.equal(brands[1].qtyShare, 50);
  assert.equal(brands[1].lobs[0].revenueShare, 0);
});

test("items: satu baris per artikel, share dari total, urut revenue", () => {
  const items = computeAccessoryItems(rows);
  assert.equal(items.length, 4);
  assert.deepEqual(
    items.map((i) => i.article),
    ["A1", "A2", "A3", "S1"],
  );
  assert.equal(items[0].revenueShare, 60);
  assert.equal(items[3].revenueShare, 0);
});

test("items: artikel ganda digabung", () => {
  const items = computeAccessoryItems([
    ...rows,
    { brand: "APPLE", lob: "CHARGER", article: "A1", description: "20W ADAPTER", qty: 1, revenue: 100 },
  ]);
  const a1 = items.find((i) => i.article === "A1");
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
  assert.deepEqual(computeAccessoryItems([]), []);
});

test("lobOptions: unik dan urut abjad", () => {
  assert.deepEqual(accessoryLobOptions(rows), ["CASE", "CHARGER"]);
});
