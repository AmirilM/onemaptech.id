# onemaptech.id

Pipeline: Excel → CSV → Supabase (`store_transactions`, `master_target`, `profiles`).

## Struktur

```
.
├── data/
│   ├── raw/                      # sumber xlsx
│   │   ├── store-transactions.xlsx
│   │   └── master-target.xlsx
│   └── clean/                    # hasil convert (empty -> NULL)
│       ├── store-transactions.csv
│       └── master-target.csv
├── scripts/
│   ├── clean/                    # xlsx -> csv + sql
│   │   ├── clean_store.py
│   │   └── clean_target.py
│   └── push/                     # csv -> supabase
│       ├── push_store.py
│       └── push_target.py
├── sql/
│   ├── store-transactions.sql
│   ├── master-target.sql
│   └── profiles.sql
├── .env                          # SUPABASE_URL + KEY (jangan commit)
└── README.md
```

## Cara pakai

```bash
# 1. Convert
python3 scripts/clean/clean_store.py
python3 scripts/clean/clean_target.py

# 2. Buat tabel (sekali saja): jalankan sql/*.sql
#    di Supabase Dashboard -> SQL Editor

# 3. Push
python3 scripts/push/push_store.py
python3 scripts/push/push_target.py
python3 scripts/push/push_store.py --clean    # hapus isi tabel dulu (hindari duplikat)
python3 scripts/push/push_target.py --clean
```

## Catatan

- Literal `NULL` di CSV = null di Postgres. Nilai `0` valid tetap `0`.
- Kolom `*_target` dibulatkan ke integer (ROUND_HALF_UP).
- Butuh: `pip install openpyxl pandas supabase python-dotenv`

## Dashboard

Web dashboard Next.js di `dashboard/` (lihat `dashboard/README.md`).
Butuh 2 SQL dijalankan di SQL Editor: `sql/dashboard-views.sql` lalu
`sql/dashboard-rls.sql`. Seed akun: `python3 scripts/seed_auth.py`.
