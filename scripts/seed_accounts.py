"""Create the admin and client profile rows used by workspace features.

This script DOES NOT create Supabase Auth users and DOES NOT store or validate
application passwords. Sign-in is handled by Forma Studio's own configured
application accounts. Usage: configure the Supabase project URL/server key and
profile details in .env, then run `python scripts/seed_accounts.py`.
"""
from __future__ import annotations

import os
from pathlib import Path
import sys

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.accounts import app_user_id  # noqa: E402
from app.config import validate_supabase_settings  # noqa: E402

load_dotenv(ROOT / ".env")

PLACEHOLDER_EMAIL_SUFFIXES = ("@example.com", "@example.test", "@your-domain.com", "@forma.studio")


def server_headers(key: str) -> dict[str, str]:
    headers = {"apikey": key, "Content-Type": "application/json"}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


def profile_for_username(client: httpx.Client, username: str) -> dict | None:
    response = client.get("/rest/v1/app_users", params={
        "select": "id,username,email,display_name,role",
        "username": f"eq.{username}",
        "limit": 1,
    })
    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else None


def upsert_profile(client: httpx.Client, values: dict) -> dict:
    existing = profile_for_username(client, values["username"])
    if existing and str(existing["id"]) != str(values["id"]):
        raise RuntimeError(
            f"The existing {values['role']} profile has ID {existing['id']}, but Forma Studio is configured "
            f"with {values['id']}. Set {values['role'].upper()}_USER_ID to the existing ID in .env and "
            "your hosting environment, then rerun this script. No database row was changed."
        )
    response = client.post(
        "/rest/v1/app_users?on_conflict=username",
        json=values,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    response.raise_for_status()
    rows = response.json()
    if not rows:
        raise RuntimeError(f"Supabase did not return the application profile for {values['username']!r}.")
    return rows[0]


def main() -> None:
    app_env = os.getenv("APP_ENV", "development").lower()
    try:
        url, server_key = validate_supabase_settings(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_SECRET_KEY", ""),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
            app_env,
        )
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc
    if not url or not server_key:
        raise SystemExit("Set SUPABASE_URL and exactly one server key before provisioning workspace profiles.")

    accounts = [
        {
            "id": app_user_id("admin"),
            "username": os.getenv("ADMIN_USERNAME", "studioadmin").strip(),
            "email": os.getenv("ADMIN_EMAIL", "").strip().lower(),
            "display_name": os.getenv("ADMIN_DISPLAY_NAME", "Avery Chen").strip(),
            "role": "admin",
        },
        {
            "id": app_user_id("client"),
            "username": os.getenv("CLIENT_USERNAME", "client").strip(),
            "email": os.getenv("CLIENT_EMAIL", "").strip().lower(),
            "display_name": os.getenv("CLIENT_DISPLAY_NAME", "Jordan Lee").strip(),
            "role": "client",
        },
    ]
    if not accounts[0]["username"] or not accounts[1]["username"] or accounts[0]["username"].casefold() == accounts[1]["username"].casefold():
        raise SystemExit("ADMIN_USERNAME and CLIENT_USERNAME must be non-empty and different.")
    if accounts[0]["email"] == accounts[1]["email"]:
        raise SystemExit("ADMIN_EMAIL and CLIENT_EMAIL must be different.")
    for account in accounts:
        if not account["email"] or "@" not in account["email"] or any(account["email"].endswith(suffix) for suffix in PLACEHOLDER_EMAIL_SUFFIXES):
            raise SystemExit("Set ADMIN_EMAIL and CLIENT_EMAIL to real, distinct addresses for workspace profiles.")

    headers = server_headers(server_key)
    with httpx.Client(base_url=url, headers=headers, timeout=20.0) as client:
        for account in accounts:
            profile = upsert_profile(client, account)
            for standard in ("GDPR", "SOC 2 Type II", "ISO 27001"):
                payload = {
                    "owner_id": profile["id"],
                    "standard": standard,
                    "status": "not_configured",
                    "document_url": "",
                    "access_mode": "request",
                    "notes": "",
                }
                response = client.post(
                    "/rest/v1/legal_entries?on_conflict=owner_id,standard",
                    json=payload,
                    headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
                )
                response.raise_for_status()
            print(f"Provisioned {account['role']} workspace profile: {account['username']}")
    print("Workspace profiles are ready. Application sign-in credentials remain in Forma Studio environment settings.")


if __name__ == "__main__":
    main()
