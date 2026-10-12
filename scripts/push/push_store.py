#!/usr/bin/env python3
"""
Push store-transactions.csv ke Supabase (public.store_transactions).

Penggunaan (dari root proyek):
    python3 scripts/push/push_store.py [--csv data/clean/store-transactions.csv] [--table store_transactions] [--batch 100] [--clean]

- Membaca koneksi dari .env di root proyek: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  (fallback: SUPABASE_SECRET_KEY / SUPABASE_ANON_KEY).
- Mapping NULL: literal 'NULL' di CSV -> None (null di Postgres).
- Integer: qty_item, year, localamount -> int / None.
- Jika tabel belum ada, script berhenti dengan instruksi menjalankan sql/store-transactions.sql
  di Supabase SQL Editor terlebih dulu.
"""

import argparse
import csv
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]

INT_COLUMNS = {"qty_item", "year", "localamount"}
NULL_LITERAL = "NULL"


def get_client():
    from supabase import create_client

    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_SECRET_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )
    if not url or not key:
        sys.exit("SUPABASE_URL / key kosong. Isi .env dulu.")
    return create_client(url, key)


def convert_row(raw: dict) -> dict:
    out = {}
    for col, val in raw.items():
        if val is None:
            out[col] = None
            continue
        v = val.strip() if isinstance(val, str) else val
        if v == NULL_LITERAL or v == "":
            out[col] = None
        elif col in INT_COLUMNS:
            try:
                out[col] = int(float(v))
            except ValueError:
                out[col] = None
        else:
            out[col] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(ROOT / "data" / "clean" / "store-transactions.csv"))
    ap.add_argument("--table", default="store_transactions")
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--clean", action="store_true",
                    help="Hapus semua baris di tabel sebelum insert (hindari duplikat saat rerun).")
    args = ap.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_absolute() and not csv_path.exists():
        for candidate in (ROOT / csv_path, ROOT / "data" / "clean" / Path(csv_path).name):
            if candidate.exists():
                csv_path = candidate
                break
    if not csv_path.exists():
        sys.exit(f"CSV tidak ditemukan: {csv_path}")

    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        header = reader.fieldnames or []
        rows = [convert_row(r) for r in reader]

    print(f"CSV   : {csv_path} ({len(rows)} baris, {len(header)} kolom)")
    print(f"Tabel : public.{args.table}")

    sb = get_client()

    # 1. Cek tabel ada (select 1 baris)
    try:
        sb.table(args.table).select("*", count="exact").limit(1).execute()
    except Exception as e:
        print(f"\nGAGAL akses tabel '{args.table}': {e}")
        print("Kemungkinan tabel belum dibuat (API tidak bisa DDL).")
        print("Jalankan sql/store-transactions.sql di Supabase Dashboard -> SQL Editor, lalu ulangi script ini.")
        sys.exit(1)

    # 2. Opsional: bersihkan tabel dulu
    if args.clean:
        print("Membersihkan tabel...")
        try:
            sb.table(args.table).delete().neq("brand_name", "__never_match__").execute()
            # fallback jika brand_name nullable: hapus via filter lain
        except Exception as e:
            # coba tanpa filter (beberapa versi postgrest menolak delete tanpa filter)
            print(f"  clean dengan filter gagal ({e}), coba delete penuh...")
            sb.table(args.table).delete().gte("qty_item", 0).execute()
        print("  tabel dikosongkan.")

    # 3. Insert batch
    ok, fail = 0, 0
    errors = []
    for i in range(0, len(rows), args.batch):
        batch = rows[i:i + args.batch]
        n = i // args.batch + 1
        try:
            sb.table(args.table).insert(batch).execute()
            ok += len(batch)
            print(f"  batch {n}: +{len(batch)} ok (total {ok})")
        except Exception as e:
            fail += len(batch)
            errors.append(f"batch {n}: {e}")
            print(f"  batch {n}: GAGAL ({e})")

    print(f"\nSelesai: {ok} sukses, {fail} gagal dari {len(rows)} baris.")
    if errors:
        print("Detail error:")
        for e in errors[:5]:
            print(f"  - {e}")
        sys.exit(1)

    # 4. Verifikasi count
    try:
        res = sb.table(args.table).select("*", count="exact").limit(1).execute()
        print(f"Verifikasi count di Supabase: {res.count}")
    except Exception as e:
        print(f"Insert ok, tapi verifikasi count gagal: {e}")


if __name__ == "__main__":
    main()
