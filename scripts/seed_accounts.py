"""Create or update the administrator and client in Supabase Auth and app_users.

Usage: set the Supabase URL/server key/Auth key, account emails, and passwords in .env,
then run `python scripts/seed_accounts.py` from the project root.
"""
from __future__ import annotations

import os
from pathlib import Path
import sys

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.config import validate_supabase_auth_settings, validate_supabase_settings  # noqa: E402

load_dotenv(ROOT / ".env")

PLACEHOLDER_EMAIL_SUFFIXES = ("@example.com", "@example.test", "@your-domain.com", "@forma.studio")


def server_headers(key: str) -> dict[str, str]:
    headers = {"apikey": key, "Content-Type": "application/json"}
    if key.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {key}"
    return headers


def find_auth_user(client: httpx.Client, email: str) -> dict | None:
    response = client.get("/auth/v1/admin/users", params={"page": 1, "per_page": 1000})
    response.raise_for_status()
    result = response.json()
    users = result.get("users", []) if isinstance(result, dict) else []
    return next((user for user in users if str(user.get("email", "")).casefold() == email.casefold()), None)


def ensure_auth_user(client: httpx.Client, *, email: str, password: str, display_name: str) -> str:
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"display_name": display_name},
    }
    current = find_auth_user(client, email)
    if current:
        auth_id = str(current["id"])
        response = client.put(f"/auth/v1/admin/users/{auth_id}", json=payload)
    else:
        response = client.post("/auth/v1/admin/users", json=payload)
    response.raise_for_status()
    body = response.json()
    auth_id = str(body.get("id") or body.get("user", {}).get("id") or "")
    if not auth_id:
        raise RuntimeError(f"Supabase Auth did not return a user ID for {email}.")
    return auth_id


def upsert_profile(client: httpx.Client, values: dict) -> dict:
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
        auth_key = validate_supabase_auth_settings(
            os.getenv("SUPABASE_URL", ""),
            os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
            os.getenv("SUPABASE_ANON_KEY", ""),
            app_env,
        )
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc

    if not url or not server_key or not auth_key:
        raise SystemExit(
            "Set SUPABASE_URL, exactly one server key, and exactly one Auth key before seeding. "
            "Use SUPABASE_SECRET_KEY plus SUPABASE_PUBLISHABLE_KEY where available."
        )

    accounts = [
        {
            "username": os.getenv("ADMIN_USERNAME", "studioadmin").strip(),
            "password": os.getenv("ADMIN_PASSWORD", "FormaAdmin!2026"),
            "email": os.getenv("ADMIN_EMAIL", "").strip().lower(),
            "display_name": os.getenv("ADMIN_DISPLAY_NAME", "Avery Chen").strip(),
            "role": "admin",
        },
        {
            "username": os.getenv("CLIENT_USERNAME", "client").strip(),
            "password": os.getenv("CLIENT_PASSWORD", "FormaClient!2026"),
            "email": os.getenv("CLIENT_EMAIL", "").strip().lower(),
            "display_name": os.getenv("CLIENT_DISPLAY_NAME", "Jordan Lee").strip(),
            "role": "client",
        },
    ]
    if len({item["username"].casefold() for item in accounts}) != 2:
        raise SystemExit("ADMIN_USERNAME and CLIENT_USERNAME must be different.")
    for account in accounts:
        if not account["email"] or "@" not in account["email"] or any(account["email"].endswith(suffix) for suffix in PLACEHOLDER_EMAIL_SUFFIXES):
            raise SystemExit("Set ADMIN_EMAIL and CLIENT_EMAIL to real, distinct addresses before creating Supabase Auth users.")
        if account["password"] in {"", "FormaAdmin!2026", "FormaClient!2026"} or len(account["password"]) < 14:
            raise SystemExit("Set unique ADMIN_PASSWORD and CLIENT_PASSWORD values of at least 14 characters before seeding.")
    if accounts[0]["email"] == accounts[1]["email"]:
        raise SystemExit("ADMIN_EMAIL and CLIENT_EMAIL must be different.")

    headers = server_headers(server_key)
    with httpx.Client(base_url=url, headers=headers, timeout=20.0) as client:
        for account in accounts:
            auth_id = ensure_auth_user(
                client,
                email=account["email"],
                password=account["password"],
                display_name=account["display_name"],
            )
            profile = upsert_profile(
                client,
                {
                    "username": account["username"],
                    "email": account["email"],
                    "display_name": account["display_name"],
                    "role": account["role"],
                    "auth_user_id": auth_id,
                    "password_hash": None,
                },
            )
            for standard in ("GDPR", "SOC 2 Type II", "ISO 27001"):
                payload = {
                    "owner_id": profile["id"],
                    "standard": standard,
                    "status": "not_configured",
                    "document_url": "",
                    "access_mode": "request",
                    "notes": "",
                }
                entry_response = client.post(
                    "/rest/v1/legal_entries?on_conflict=owner_id,standard",
                    json=payload,
                    headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
                )
                entry_response.raise_for_status()
            print(f"Configured {account['role']} account: {account['username']}")
    print("Account setup completed. Passwords are managed by Supabase Auth.")


if __name__ == "__main__":
    main()
