#!/usr/bin/env python3
"""
Seed Supabase Auth dari public.profiles.

- Email konvensi: {sales_id}@onemaptech.id  (profiles tidak punya kolom email)
- Password: kolom password profiles (plaintext sementara)
- Metadata: sales_id, sales_name, role, store_code (dipakai aplikasi + RLS)
- Idempoten: user yang sudah ada di-update (password + metadata).

Butuh service/secret key (JANGAN pakai anon key):
    python3 scripts/seed_auth.py [--dry-run]

Jalankan dari root proyek.
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "onemaptech.id"


def get_admin():
    from supabase import create_client

    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL", "").strip()
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_SECRET_KEY", "").strip()
    )
    if not url or not key:
        sys.exit("Butuh SUPABASE_URL + SERVICE_ROLE/SECRET key di .env (anon key tidak bisa admin).")
    return create_client(url, key)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="Tampilkan rencana tanpa eksekusi.")
    args = ap.parse_args()

    sb = get_admin()
    profiles = sb.table("profiles").select("sales_id,sales_name,store_code,role,password").execute().data
    print(f"Profiles: {len(profiles)} baris")

    existing = {}
    try:
        page = 1
        while True:
            resp = sb.auth.admin.list_users(page=page, per_page=100)
            users = resp.users if hasattr(resp, "users") else resp
            if not users:
                break
            for u in users:
                email = u.get("email", "") if isinstance(u, dict) else (u.email or "")
                uid = u.get("id") if isinstance(u, dict) else u.id
                existing[email] = uid
            if len(users) < 100:
                break
            page += 1
    except Exception as e:
        sys.exit(f"Gagal list auth users: {e}")
    print(f"Auth users existing: {len(existing)}")

    created, updated = 0, 0
    for p in profiles:
        email = f"{p['sales_id']}@{DOMAIN}"
        meta = {"sales_id": p["sales_id"], "sales_name": p.get("sales_name"),
                "role": p.get("role"), "store_code": p.get("store_code")}
        if args.dry_run:
            print(f"  {'UPDATE' if email in existing else 'CREATE'} {email} role={p.get('role')} store={p.get('store_code')}")
            continue
        try:
            if email in existing:
                sb.auth.admin.update_user_by_id(existing[email], {"password": p["password"], "user_metadata": meta})
                updated += 1
                print(f"  UPDATE {email}")
            else:
                sb.auth.admin.create_user({"email": email, "password": p["password"],
                                           "email_confirm": True, "user_metadata": meta})
                created += 1
                print(f"  CREATE {email}")
        except Exception as e:
            print(f"  GAGAL {email}: {e}")

    print(f"\nSelesai: {created} create, {updated} update." + (" (dry-run)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
