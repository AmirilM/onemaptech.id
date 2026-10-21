import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeKpiPoints,
  kpiPoint,
  kpiWeights,
  type KpiPointTargets,
} from "./kpi-points.ts";

const allTargets: KpiPointTargets = {
  apple_target: 1,
  android_target: 1,
  accessories_target: 1,
  vas_target: 1,
};

test("weights: Apple and Android both targeted", () => {
  assert.deepEqual(kpiWeights(allTargets), {
    apple: 30,
    android: 30,
    accessories: 30,
    vas: 10,
    mandatory: "android",
  });
});

test("weights: only Android targeted", () => {
  assert.deepEqual(
    kpiWeights({ ...allTargets, apple_target: 0 }),
    {
      apple: 0,
      android: 60,
      accessories: 30,
      vas: 10,
      mandatory: "android",
    },
  );
});

test("weights: only Apple targeted", () => {
  assert.deepEqual(
    kpiWeights({ ...allTargets, android_target: null }),
    {
      apple: 60,
      android: 0,
      accessories: 30,
      vas: 10,
      mandatory: "apple",
    },
  );
});

test("weights: neither Apple nor Android targeted", () => {
  assert.deepEqual(
    kpiWeights({ ...allTargets, apple_target: 0, android_target: 0 }),
    {
      apple: 0,
      android: 0,
      accessories: 30,
      vas: 10,
      mandatory: null,
    },
  );
});

test("point: caps at its weight", () => {
  assert.equal(kpiPoint(200, 100, 30), 30);
  assert.equal(kpiPoint(200, 100, 60), 60);
});

test("point: rounds to nearest integer", () => {
  assert.equal(kpiPoint(39, 100, 30), 12);
  assert.equal(kpiPoint(46, 100, 30), 14);
  assert.equal(kpiPoint(33, 100, 10), 3);
});

test("point: no target yields null", () => {
  assert.equal(kpiPoint(100, 0, 30), null);
  assert.equal(kpiPoint(100, null, 30), null);
});

test("point: negative actual never scores below zero", () => {
  assert.equal(kpiPoint(-50, 100, 30), 0);
});

test("reference case totals 59 points", () => {
  const result = computeKpiPoints(
    {
      apple: 2_560_344_000,
      android: 308_706_000,
      accessories: 89_324_450,
      vas: 54_414_000,
    },
    {
      apple_target: 2_446_796_207,
      android_target: 798_660_732,
      accessories_target: 194_727_416,
      vas_target: 165_859_077,
    },
  );

  assert.deepEqual(result.points, {
    apple: 30,
    android: 12,
    accessories: 14,
    vas: 3,
  });
  assert.equal(result.total, 59);
  assert.equal(result.achievable, false);
});

test("total excludes KPIs without a target", () => {
  const result = computeKpiPoints(
    { apple: 500, android: 100, accessories: 100, vas: 100 },
    { apple_target: 0, android_target: 100, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.points.apple, null);
  assert.equal(result.points.android, 60);
  assert.equal(result.total, 100);
  assert.equal(result.achievable, true);
});

test("achievable: total 85 with mandatory Android full", () => {
  const result = computeKpiPoints(
    { apple: 50, android: 100, accessories: 100, vas: 100 },
    { apple_target: 100, android_target: 100, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.total, 85);
  assert.equal(result.achievable, true);
});

test("achievable: total 84 is not enough", () => {
  const result = computeKpiPoints(
    { apple: 47, android: 100, accessories: 100, vas: 100 },
    { apple_target: 100, android_target: 100, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.total, 84);
  assert.equal(result.achievable, false);
});

test("achievable: mandatory Android must be full even when total is high", () => {
  const result = computeKpiPoints(
    { apple: 60, android: 98, accessories: 100, vas: 100 },
    { apple_target: 100, android_target: 100, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.total, 87);
  assert.equal(result.points.android, 29);
  assert.equal(result.achievable, false);
});

test("achievable: when Android is absent, Apple becomes mandatory", () => {
  const result = computeKpiPoints(
    { apple: 100, android: 0, accessories: 100, vas: 100 },
    { apple_target: 100, android_target: 0, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.total, 100);
  assert.equal(result.achievable, true);
});

test("totalPoint is null when no KPI has a target", () => {
  const result = computeKpiPoints(
    { apple: 0, android: 0, accessories: 0, vas: 0 },
    {
      apple_target: null,
      android_target: null,
      accessories_target: null,
      vas_target: null,
    },
  );

  assert.equal(result.total, 0);
  assert.equal(result.totalPoint, null);
  assert.equal(result.achievable, false);
});

test("totalPoint equals total when at least one KPI has a target", () => {
  const result = computeKpiPoints(
    { apple: 0, android: 100, accessories: 100, vas: 100 },
    { apple_target: 0, android_target: 100, accessories_target: 100, vas_target: 100 },
  );

  assert.equal(result.totalPoint, 100);
});
