#!/usr/bin/env python3
"""
Daily push store-transactions: clean -> push (replace penuh).

Alur harian:
  1. Update manual file data/raw/store-transactions.xlsx
  2. Jalankan script ini dari root proyek:
         python3 scripts/daily_push_supabase.py

Ekuivalen dengan:
  python3 scripts/clean/clean_store.py [XLSX] [SHEET]
  python3 scripts/push/push_store.py --clean

Replace penuh: tabel dikosongkan dulu (--clean) lalu diisi ulang dari CSV terbaru,
jadi aman dari duplikat saat file diupdate manual setiap hari.
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLEAN_SCRIPT = ROOT / "scripts" / "clean" / "clean_store.py"
PUSH_SCRIPT = ROOT / "scripts" / "push" / "push_store.py"


def run(cmd: list[str], label: str) -> None:
    print(f"\n=== {label} ===")
    print("$ " + " ".join(str(c) for c in cmd))
    start = time.time()
    proc = subprocess.run(cmd)
    elapsed = time.time() - start
    if proc.returncode != 0:
        sys.exit(f"GAGAL pada tahap '{label}' (exit {proc.returncode}, {elapsed:.1f}s). Berhenti.")
    print(f"OK ({elapsed:.1f}s)")


def main():
    ap = argparse.ArgumentParser(description="Daily clean + push store-transactions (replace).")
    ap.add_argument("--xlsx", default=str(ROOT / "data" / "raw" / "store-transactions.xlsx"))
    ap.add_argument("--sheet", default="RAW")
    ap.add_argument("--table", default="store_transactions")
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--no-clean", action="store_true",
                    help="Jangan kosongkan tabel dulu (default: replace penuh dengan --clean).")
    ap.add_argument("--skip-clean", action="store_true", help="Lewati tahap clean.")
    ap.add_argument("--skip-push", action="store_true", help="Lewati tahap push.")
    args = ap.parse_args()

    xlsx = Path(args.xlsx)
    if not xlsx.is_absolute() and not xlsx.exists():
        for candidate in (ROOT / xlsx, ROOT / "data" / "raw" / xlsx.name):
            if candidate.exists():
                xlsx = candidate
                break
    if not xlsx.exists():
        sys.exit(f"File tidak ditemukan: {xlsx}")

    csv_path = ROOT / "data" / "clean" / (xlsx.stem + ".csv")
    total_start = time.time()

    if not args.skip_clean:
        run([sys.executable, str(CLEAN_SCRIPT), str(xlsx), args.sheet],
            f"1/2 clean ({xlsx.name})")
    else:
        print("Tahap clean dilewati (--skip-clean).")

    if not args.skip_push:
        push_cmd = [sys.executable, str(PUSH_SCRIPT),
                    "--csv", str(csv_path),
                    "--table", args.table,
                    "--batch", str(args.batch)]
        if not args.no_clean:
            push_cmd.append("--clean")
        run(push_cmd, f"2/2 push -> public.{args.table} (replace={not args.no_clean})")
    else:
        print("Tahap push dilewati (--skip-push).")

    print(f"\nDaily push selesai dalam {time.time() - total_start:.1f}s.")


if __name__ == "__main__":
    main()
