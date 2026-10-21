export type KpiPointKey = "apple" | "android" | "accessories" | "vas";

export type KpiPointTargets = {
  apple_target: number | null;
  android_target: number | null;
  accessories_target: number | null;
  vas_target: number | null;
};

export type KpiWeights = {
  apple: number;
  android: number;
  accessories: number;
  vas: number;
  mandatory: "apple" | "android" | null;
};

export type KpiPointResult = {
  weights: KpiWeights;
  points: Record<KpiPointKey, number | null>;
  total: number;
  totalPoint: number | null;
  achievable: boolean;
};

const hasTarget = (t: number | null): t is number => t !== null && t > 0;

// Bobot menyesuaikan KPI yang punya target: Apple & Android masing-masing 30,
// salah satu saja 60, Accessories 30, VAS 10. Total selalu 100 bila keempatnya ada.
export function kpiWeights(targets: KpiPointTargets): KpiWeights {
  const apple = hasTarget(targets.apple_target);
  const android = hasTarget(targets.android_target);
  const weights: KpiWeights = {
    apple: 0,
    android: 0,
    accessories: hasTarget(targets.accessories_target) ? 30 : 0,
    vas: hasTarget(targets.vas_target) ? 10 : 0,
    mandatory: null,
  };

  if (apple && android) {
    weights.apple = 30;
    weights.android = 30;
    weights.mandatory = "android";
  } else if (apple) {
    weights.apple = 60;
    weights.mandatory = "apple";
  } else if (android) {
    weights.android = 60;
    weights.mandatory = "android";
  }

  return weights;
}

// Over target tidak menambah poin (di-cap di bobot); actual negatif jadi 0.
export function kpiPoint(
  actual: number,
  target: number | null,
  weight: number,
): number | null {
  if (!hasTarget(target)) return null;
  const raw = Math.round((actual / target) * weight);
  return Math.max(0, Math.min(weight, raw));
}

export function computeKpiPoints(
  actual: Record<KpiPointKey, number>,
  targets: KpiPointTargets,
): KpiPointResult {
  const weights = kpiWeights(targets);
  const points: Record<KpiPointKey, number | null> = {
    apple: kpiPoint(actual.apple, targets.apple_target, weights.apple),
    android: kpiPoint(actual.android, targets.android_target, weights.android),
    accessories: kpiPoint(
      actual.accessories,
      targets.accessories_target,
      weights.accessories,
    ),
    vas: kpiPoint(actual.vas, targets.vas_target, weights.vas),
  };

  const total = Object.values(points).reduce<number>(
    (sum, point) => sum + (point ?? 0),
    0,
  );
  const mandatoryWeight = weights.mandatory ? weights[weights.mandatory] : 0;
  const mandatoryPoint = weights.mandatory ? points[weights.mandatory] : null;
  const achievable =
    weights.mandatory !== null &&
    total >= 85 &&
    mandatoryPoint === mandatoryWeight;
  // Tanpa satu pun target, total bukan angka 0 yang bermakna — sembunyikan.
  const hasAnyTarget =
    weights.apple + weights.android + weights.accessories + weights.vas > 0;

  return { weights, points, total, totalPoint: hasAnyTarget ? total : null, achievable };
}
