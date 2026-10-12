# onemaptech.id

Pipeline: Excel → CSV → Supabase (`public.store_transactions`).

## Struktur

```
.
├── data/
│   ├── store-transactions.xlsx   # sumber
│   └── store-transactions.csv    # hasil convert (empty -> NULL)
├── scripts/
│   ├── convert_xlsx_to_csv.py    # xlsx -> csv + sql
│   └── push_to_supabase.py       # csv -> supabase
├── sql/
│   └── store-transactions.sql    # CREATE TABLE
├── .env                          # SUPABASE_URL + KEY (jangan commit)
└── README.md
```

## Cara pakai

```bash
# 1. Convert
python3 scripts/convert_xlsx_to_csv.py

# 2. Buat tabel (sekali saja): jalankan sql/store-transactions.sql
#    di Supabase Dashboard -> SQL Editor

# 3. Push
python3 scripts/push_to_supabase.py
python3 scripts/push_to_supabase.py --clean   # hapus isi tabel dulu (hindari duplikat)
```

## Catatan

- Literal `NULL` di CSV = null di Postgres. Nilai `0` valid tetap `0`.
- Butuh: `pip install openpyxl pandas supabase python-dotenv`
