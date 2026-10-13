# Data Store Identity — store-transactions

Identitas dataset transaksi toko. Sumber: `data/raw/store-transactions.xlsx`
(sheet `RAW`) → `data/clean/store-transactions.csv` → `public.store_transactions`.

- **23 kolom** tetap. Isi diperbarui harian (replace penuh via `scripts/daily_push_supabase.py`).
- Tanpa primary key. `NULL` di CSV = null di Postgres; `0` adalah nilai valid
  (bukan kosong), misal di `localamount` dan `sublob`.
- Kolom `area_manager`: nama Area Manager per baris (1 AM = banyak store,
  referensi `master_stores`). Tidak pernah NULL di data bersih.

## Kamus kolom

| Kolom | Tipe Supabase | Dapat null | Contoh | Catatan |
|---|---|---|---|---|
| `brand_name` | text | tidak | `APPLE`, `INFINIX` | Nama brand |
| `product_division` | text | tidak | `HEALTH EQUIPMENT` | Divisi produk |
| `product_group` | text | tidak | `ACCESSORIES`, `DEVICES` | — |
| `product_category` | text | tidak | `CHARGER`, `PHONE` | `text` Kategori Produk |
| `date` | date | tidak | `2026-10-01` | Format ISO `YYYY-MM-DD` |
| `item` | text | tidak | `APPMD3J4ZA/A / 20W USB-C POWER ADAPTER` | Gabungan kode + deskripsi (Produk) |
| `qty_item` | integer | tidak | `1`, `3` | Qty terjual |
| `localamount` | integer | tidak | `0`, `549000` | Harga produk |
| `store_code` | text | tidak | `QF37`, `QF20` | Kunci relasi ke `master_target`/`profiles` (bukan FK formal) |
| `month` | text | tidak | `October` | Nama bulan |
| `year` | integer | tidak | `2026` | Tahun |
| `sap_article` | text | tidak | `APPMD3J4ZA/A` | Kode artikel SAP |
| `sap_description` | text | tidak | `20W USB-C POWER ADAPTER` | Deskripsi SAP |
| `brand_code` | text | tidak | `APP`, `IFX` | Kode brand |
| `lob` | text | tidak | `CHARGER`, `IPHONE` | Line of business |
| `sublob` | text | **ya** | `0`, `iPhone 16` | Tipe produk |
| `kpi_group` | text | tidak | `ACCESSORIES`, `APPLE` | Grup KPI |
| `store_name` | text | tidak | `DIGIPLUS JOGJA CITY MALL` | Nama toko |
| `concept` | text | tidak | `Multibrand`, `Samsung` | Konsep toko |
| `week_apple` | text | tidak | `W1`, `W2` | Minggu kalender Apple |
| `quarter_apple` | text | tidak | `Q1` | Kuartal kalender Apple |
| `week_sf` | text | tidak | `W40`, `W41` | Minggu kalender SF |
| `area_manager` | text | tidak | `Andri Wiyoga`, `SUHARTONO` | 9 AM; 1 AM = banyak store (lihat `master-stores`) |

## Relasi

- `store_transactions.store_code` ↔ `master_target.store_code` (target per toko)
- `store_transactions.store_code` ↔ `profiles.store_code` (supervisor per toko)
- Belum ada foreign key formal di database.

## Pipeline terkait

- Clean: `scripts/clean/clean_store.py`
- Push (replace harian): `scripts/daily_push_supabase.py` / `scripts/push/push_store.py`
- DDL: `sql/store-transactions.sql`
