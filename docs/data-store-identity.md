# Data Store Identity — store-transactions

Identitas dataset transaksi toko. Sumber: `data/raw/store-transactions.xlsx`
(sheet `RAW`) → `data/clean/store-transactions.csv` → `public.store_transactions`.

- Baris: **773** (+ header), kolom: **22**
- Periode: `2026-10-01` s.d. `2026-10-08` (8 tanggal unik), `October 2026`
- Store: 17 (`store_code`/`store_name`), brand: 34, item unik: 289
- Tanpa primary key. `NULL` CSV = null Postgres; `0` adalah nilai valid
  (bukan kosong) di `localamount` (104 baris) dan `sublob` (392 baris).

## Kamus kolom

| Kolom | Tipe Supabase | Nullable | Unik | Contoh | Catatan |
|---|---|---|---|---|---|
| `brand_name` | text | tidak | 34 | `APPLE`, `INFINIX`, `KOALA` | Nama brand |
| `product_division` | text | tidak | 1 | `HEALTH EQUIPMENT` | Satu nilai di dataset ini |
| `product_group` | text | tidak | 2 | `ACCESSORIES`, `DEVICES` | — |
| `product_category` | text | tidak | 23 | `CHARGER`, `PHONE`, `CONNECTOR` | `text` karena di Excel campur teks+angka |
| `date` | date | tidak | 8 | `2026-10-01` | Format ISO `YYYY-MM-DD` |
| `item` | text | tidak | 289 | `APPMD3J4ZA/A / 20W USB-C POWER ADAPTER` | Gabungan kode + deskripsi |
| `qty_item` | integer | tidak | 7 | `1`, `3`, `2` | Qty terjual |
| `localamount` | integer | tidak | 181 | `0`, `549000`, `1647000` | Rupiah; `0` = valid (bukan NULL) |
| `store_code` | text | tidak | 17 | `QF37`, `QF20`, `QF05` | Kunci relasi ke `master_target`/`profiles` (bukan FK formal) |
| `month` | text | tidak | 1 | `October` | — |
| `year` | integer | tidak | 1 | `2026` | — |
| `sap_article` | text | tidak | 289 | `APPMD3J4ZA/A` | Kode artikel SAP |
| `sap_description` | text | tidak | 280 | `20W USB-C POWER ADAPTER` | Deskripsi SAP |
| `brand_code` | text | tidak | 34 | `APP`, `IFX`, `KLA` | Kode brand |
| `lob` | text | tidak | 37 | `CHARGER`, `IPHONE`, `CONNECTOR` | Line of business |
| `sublob` | text | **ya (42 NULL)** | 79 | `0`, `iPhone 16`, `iPhone 17 Pro Max` | Satu-satunya kolom nullable; `text` karena campur angka+teks |
| `kpi_group` | text | tidak | 4 | `ACCESSORIES`, `APPLE`, `ANDROID` | Grup KPI |
| `store_name` | text | tidak | 17 | `DIGIPLUS JOGJA CITY MALL` | Nama toko |
| `concept` | text | tidak | 2 | `Multibrand`, `Samsung` | Konsep toko |
| `week_apple` | text | tidak | 2 | `W1`, `W2` | Minggu kalender Apple |
| `quarter_apple` | text | tidak | 1 | `Q1` | Kuartal kalender Apple |
| `week_sf` | text | tidak | 2 | `W40`, `W41` | Minggu kalender SF |

## Relasi

- `store_transactions.store_code` ↔ `master_target.store_code` (target per toko)
- `store_transactions.store_code` ↔ `profiles.store_code` (supervisor per toko)
- Belum ada foreign key formal di database.

## Pipeline terkait

- Clean: `scripts/clean/clean_store.py`
- Push (replace harian): `scripts/daily_push_supabase.py` / `scripts/push/push_store.py`
- DDL: `sql/store-transactions.sql`
