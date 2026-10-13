#!/usr/bin/env python3
"""
Push data/clean/master-stores.csv ke Supabase (public.master_stores).

Penggunaan (dari root proyek):
    python3 scripts/push/push_stores.py [--csv data/clean/master-stores.csv] [--table master_stores] [--batch 100] [--clean]

- Membaca koneksi dari .env di root proyek: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  (fallback: SUPABASE_SECRET_KEY / SUPABASE_ANON_KEY).
- Mapping NULL: literal 'NULL' di CSV -> None (null di Postgres).
- Semua kolom text, tidak ada konversi integer.
- Upsert on_conflict=store_code (store_code PK) -> aman di-rerun.
- Jika tabel belum ada, script berhenti dengan instruksi menjalankan sql/master-stores.sql
  di Supabase SQL Editor terlebih dulu.
"""

import argparse
import csv
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]

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
        else:
            out[col] = v
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(ROOT / "data" / "clean" / "master-stores.csv"))
    ap.add_argument("--table", default="master_stores")
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--clean", action="store_true",
                    help="Hapus semua baris di tabel sebelum upsert.")
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
        print("Jalankan sql/master-stores.sql di Supabase Dashboard -> SQL Editor, lalu ulangi script ini.")
        sys.exit(1)

    # 2. Opsional: bersihkan tabel dulu
    if args.clean:
        print("Membersihkan tabel...")
        sb.table(args.table).delete().neq("store_code", "__never_match__").execute()
        print("  tabel dikosongkan.")

    # 3. Upsert batch (on_conflict=store_code karena PK)
    ok, fail = 0, 0
    errors = []
    for i in range(0, len(rows), args.batch):
        batch = rows[i:i + args.batch]
        n = i // args.batch + 1
        try:
            sb.table(args.table).upsert(batch, on_conflict="store_code").execute()
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
        print(f"Upsert ok, tapi verifikasi count gagal: {e}")


if __name__ == "__main__":
    main()
