export type LeaderboardRow = {
  store_code: string;
  store_name: string | null;
  trx_count: number;
  revenue_total: number;
  total_target: number | null;
  ach_total_pct: number | null;
  rank_achievement: number;
  rank_revenue: number;
};

export type DailyRow = {
  date: string;
  trx_count: number;
  total_qty: number;
  revenue_total: number;
  revenue_apple: number;
  revenue_android: number;
  revenue_accessories: number;
  revenue_vas: number;
  revenue_samsung: number;
  revenue_oppo: number;
  revenue_xiaomi: number;
  revenue_huawei: number;
  revenue_infinix: number;
  revenue_motorola: number;
  qty_mac: number;
  qty_iphone: number;
  qty_ipad: number;
  qty_apple_watch: number;
  qty_airpods: number;
  qty_samsung: number;
  qty_oppo: number;
  qty_xiaomi: number;
  qty_huawei: number;
  qty_infinix: number;
  qty_motorola: number;
};

export type StoreDailyRow = DailyRow & {
  store_code: string;
  store_name: string | null;
};

export type TopProductRow = {
  product: string;
  trx_count: number;
  total_qty: number;
  revenue_total: number;
  rank_revenue: number;
  rank_qty: number;
};

export type StoreRow = {
  revenue_total: number;
  revenue_apple: number;
  revenue_android: number;
  revenue_accessories: number;
  revenue_vas: number;
  total_target: number | null;
  apple_target: number | null;
  android_target: number | null;
  accessories_target: number | null;
  vas_target: number | null;
};

export type Profile = {
  sales_id: string;
  sales_name: string;
  store_code: string | null;
  store_name: string | null;
  role: string;
  avatar_url?: string | null;
};
