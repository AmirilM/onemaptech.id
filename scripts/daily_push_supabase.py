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

Log: tiap run tersimpan di logs/daily_push_YYYYMMDD_HHMMSS.log
     + salinan logs/daily_push_latest.log (folder logs/ di-gitignore).
"""

import argparse
import datetime
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
CLEAN_SCRIPT = ROOT / "scripts" / "clean" / "clean_store.py"
PUSH_SCRIPT = ROOT / "scripts" / "push" / "push_store.py"


class TeeLog:
    """Tulis ke file log sekaligus tampilkan di console."""

    def __init__(self, path: Optional[Path]):
        self.path = path
        self.fh = open(path, "a", encoding="utf-8") if path else None

    def write(self, text: str) -> None:
        print(text, end="", flush=True)
        if self.fh:
            self.fh.write(text)

    def line(self, text: str = "") -> None:
        self.write(text + "\n")

    def close(self) -> None:
        if self.fh:
            self.fh.close()
            self.fh = None


def run(cmd: List[str], label: str, log: TeeLog) -> None:
    log.line(f"\n=== {label} ===")
    log.line("$ " + " ".join(str(c) for c in cmd))
    start = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.stdout:
        log.write(proc.stdout if proc.stdout.endswith("\n") else proc.stdout + "\n")
    if proc.stderr:
        log.write(proc.stderr if proc.stderr.endswith("\n") else proc.stderr + "\n")
    elapsed = time.time() - start
    if proc.returncode != 0:
        log.line(f"GAGAL pada tahap '{label}' (exit {proc.returncode}, {elapsed:.1f}s). Berhenti.")
        log.close()
        sys.exit(1)
    log.line(f"OK ({elapsed:.1f}s)")


def refresh_views(log: TeeLog) -> None:
    """Refresh materialized view dashboard via RPC (best-effort, tidak fatal)."""
    import os

    from supabase import create_client

    log.line("\n=== 3/3 refresh dashboard views ===")
    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_SECRET_KEY", "").strip()
        or os.getenv("SUPABASE_ANON_KEY", "").strip()
    )
    if not url or not key:
        log.line("  Lewati refresh: SUPABASE_URL / key kosong.")
        return
    try:
        start = time.time()
        create_client(url, key).rpc("refresh_dashboard_views", {}).execute()
        log.line(f"  OK ({time.time() - start:.1f}s): mv_dashboard_store/daily/store_daily di-refresh.")
    except Exception as e:
        log.line(f"  WARNING refresh gagal (tidak fatal): {e}")
        log.line("  Pastikan sql/dashboard-views.sql sudah dijalankan di SQL Editor.")


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
    ap.add_argument("--skip-refresh", action="store_true", help="Lewati refresh dashboard views.")
    ap.add_argument("--log-dir", default=str(ROOT / "logs"), help="Folder file log.")
    ap.add_argument("--no-log", action="store_true", help="Jangan tulis file log (hanya console).")
    args = ap.parse_args()

    # Setup file log
    log_path: Optional[Path] = None
    if not args.no_log:
        log_dir = Path(args.log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        log_path = log_dir / f"daily_push_{stamp}.log"
    log = TeeLog(log_path)
    if log_path:
        log.line(f"Log: {log_path}")
    log.line(f"Mulai: {datetime.datetime.now().isoformat(timespec='seconds')}")
    log.line(f"Args: xlsx={args.xlsx} sheet={args.sheet} table={args.table} "
             f"batch={args.batch} replace={not args.no_clean} "
             f"skip_clean={args.skip_clean} skip_push={args.skip_push} "
             f"skip_refresh={args.skip_refresh}")

    xlsx = Path(args.xlsx)
    if not xlsx.is_absolute() and not xlsx.exists():
        for candidate in (ROOT / xlsx, ROOT / "data" / "raw" / xlsx.name):
            if candidate.exists():
                xlsx = candidate
                break
    if not xlsx.exists():
        log.line(f"File tidak ditemukan: {xlsx}")
        log.close()
        sys.exit(1)

    csv_path = ROOT / "data" / "clean" / (xlsx.stem + ".csv")
    total_start = time.time()

    if not args.skip_clean:
        run([sys.executable, str(CLEAN_SCRIPT), str(xlsx), args.sheet],
            f"1/3 clean ({xlsx.name})", log)
    else:
        log.line("Tahap clean dilewati (--skip-clean).")

    if not args.skip_push:
        push_cmd = [sys.executable, str(PUSH_SCRIPT),
                    "--csv", str(csv_path),
                    "--table", args.table,
                    "--batch", str(args.batch)]
        if not args.no_clean:
            push_cmd.append("--clean")
        run(push_cmd, f"2/3 push -> public.{args.table} (replace={not args.no_clean})", log)
    else:
        log.line("Tahap push dilewati (--skip-push).")

    if not args.skip_refresh:
        refresh_views(log)
    else:
        log.line("Refresh dashboard views dilewati (--skip-refresh).")

    log.line(f"\nDaily push selesai dalam {time.time() - total_start:.1f}s.")
    log.close()

    # Salinan latest untuk cek cepat
    if log_path:
        shutil.copyfile(log_path, log_path.parent / "daily_push_latest.log")
        print(f"Log tersimpan: {log_path}")


if __name__ == "__main__":
    main()
