from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from app.config import validate_base_url, validate_supabase_auth_settings, validate_supabase_settings
from app.accounts import app_user_id

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware
from starlette.datastructures import UploadFile as StarletteUploadFile

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
# Uploaded brand assets use Supabase Storage in deployed environments. The local
# filesystem is only a development fallback, so never write to the bundled app
# directory during import (Vercel deployment filesystems are read-only).
UPLOAD_DIR = BASE_DIR / "uploads"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf", ".mp4", ".webm", ".glb", ".gltf", ".woff", ".woff2", ".ttf", ".otf", ".svg", ".zip", ".docx", ".pptx"}
APP_NAME = os.getenv("APP_NAME", "Forma Studio")
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-only-change-this-secret-before-deploying")
INSECURE_SESSION_SECRETS = {
    "dev-only-change-this-secret-before-deploying",
    "replace-with-a-long-random-secret-before-deploying",
}
if APP_ENV == "production" and (
    SESSION_SECRET in INSECURE_SESSION_SECRETS
    or len(SESSION_SECRET) < 32
    or "replace-with" in SESSION_SECRET.lower()
):
    raise RuntimeError("Set a unique, random SESSION_SECRET of at least 32 characters before running in production.")
# Prefer the modern server-only Secret key. Validation deliberately fails fast on partial,
# conflicting, publishable, malformed, or incorrectly named credentials.
SUPABASE_URL, SUPABASE_API_KEY = validate_supabase_settings(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SECRET_KEY", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    APP_ENV,
)


def supabase_headers(content_type: str = "application/json") -> dict[str, str]:
    """Build server-only database/storage headers for Supabase."""
    headers = {"apikey": SUPABASE_API_KEY, "Content-Type": content_type}
    # Legacy service-role JWTs are Bearer tokens; modern sb_secret keys are not JWTs.
    if SUPABASE_API_KEY.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {SUPABASE_API_KEY}"
    return headers


SUPABASE_AUTH_KEY = validate_supabase_auth_settings(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
    os.getenv("SUPABASE_ANON_KEY", ""),
    APP_ENV,
)


def supabase_auth_request(endpoint: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    """Call Supabase Auth without exposing Auth credentials in the browser."""
    if not SUPABASE_URL or not SUPABASE_AUTH_KEY:
        return None
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/auth/v1/{endpoint}",
            headers={"apikey": SUPABASE_AUTH_KEY, "Content-Type": "application/json"},
            json=payload,
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication is temporarily unavailable. Please try again.") from exc
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Authentication is temporarily unavailable. Please try again.")
    if response.status_code >= 400:
        return None
    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status_code=503, detail="Authentication returned an invalid response. Please try again.")
    return data if isinstance(data, dict) else None


# Future Supabase Auth password-login integration placeholder (intentionally disabled).
# Do not call Supabase Auth from the /login route unless the user explicitly asks to
# activate that integration. Forma Studio login is app-managed and does not query
# Supabase Auth or the Supabase database to validate a username/password.
#
# def verify_supabase_password(user_record: dict[str, Any], password: str) -> bool:
#     result = supabase_auth_request(
#         "token?grant_type=password",
#         {"email": user_record["email"], "password": password},
#     )
#     auth_user = result.get("user") if result else None
#     return bool(auth_user and str(auth_user.get("id")) == str(user_record["auth_user_id"]))


def send_supabase_email_otp(email: str, *, create_user: bool = True) -> bool:
    """Ask Supabase Auth to deliver an email OTP; no separate mail provider is used by the app."""
    result = supabase_auth_request("otp", {"email": email.lower(), "create_user": create_user})
    return result is not None


def verify_supabase_email_otp(email: str, token: str) -> bool:
    result = supabase_auth_request("verify", {"email": email.lower(), "token": token, "type": "email"})
    return bool(result and isinstance(result.get("user"), dict) and result["user"].get("email", "").lower() == email.lower())
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
if APP_ENV == "production" and not GEMINI_API_KEY:
    raise RuntimeError(
        "Set GEMINI_API_KEY before running Forma Studio in production; it powers core "
        "tagline, elevator-pitch, and brand-copy generation."
    )
# gemini-3.5-flash is deprecated and routed to 3.6; keep the model configurable.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip() or "gemini-3.6-flash"
QLOO_API_KEY = os.getenv("QLOO_API_KEY", "").strip()
QLOO_BASE_URL = os.getenv("QLOO_BASE_URL", "https://hackathon.api.qloo.com").strip().rstrip("/")
# Qloo host can be changed only to one approved for the supplied API key.
validate_base_url("QLOO_BASE_URL", QLOO_BASE_URL)
BLOCK_TYPES = [
    "Colors", "Typography", "Logos", "Visuals", "Videos", "Icons",
    "3D Models", "Collaterals", "Resources", "Brand Story",
]
LEGAL_STANDARDS = ["GDPR", "SOC 2 Type II", "ISO 27001"]

app = FastAPI(title=APP_NAME, version="0.1.0")
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="lax",
    https_only=APP_ENV == "production",
    max_age=60 * 60 * 8,
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value[:48] or "brand-kit"


def password_hash(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 240_000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(password: str, saved: str | None) -> bool:
    if not saved:
        return False
    try:
        scheme, salt, expected = saved.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 240_000).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def default_users() -> list[dict[str, Any]]:
    """Application sign-in accounts come from environment settings, not the database."""
    return [
        {
            "id": app_user_id("admin"), "username": os.getenv("ADMIN_USERNAME", "studioadmin"),
            "email": os.getenv("ADMIN_EMAIL", "avery.chen@example.test"), "display_name": "Avery Chen", "role": "admin",
            "password_hash": password_hash(os.getenv("ADMIN_PASSWORD", "FormaAdmin!2026"), "forma-admin-local-salt"),
        },
        {
            "id": app_user_id("client"), "username": os.getenv("CLIENT_USERNAME", "client"),
            "email": os.getenv("CLIENT_EMAIL", "jordan.lee@example.test"), "display_name": "Jordan Lee", "role": "client",
            "password_hash": password_hash(os.getenv("CLIENT_PASSWORD", "FormaClient!2026"), "forma-client-local-salt"),
        },
    ]


class DataStore:
    """Data layer: Supabase REST for configured environments, in-memory storage for local development."""

    def __init__(self) -> None:
        self.users = default_users()
        self.kits: list[dict[str, Any]] = []
        self.legal_entries: list[dict[str, Any]] = []
        self.legal_requests: list[dict[str, Any]] = []
        self.login_attempts: dict[str, list[float]] = {}
        if not self.supabase_enabled:
            self._seed_starter_content()

    @property
    def supabase_enabled(self) -> bool:
        return bool(SUPABASE_URL and SUPABASE_API_KEY)

    def _headers(self) -> dict[str, str]:
        return supabase_headers()

    def _request(self, method: str, table: str, *, params: dict[str, Any] | None = None,
                 payload: Any = None, prefer: str | None = None) -> Any:
        if not self.supabase_enabled:
            raise RuntimeError("Supabase is not configured")
        headers = self._headers()
        if prefer:
            headers["Prefer"] = prefer
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        try:
            response = httpx.request(method, url, headers=headers, params=params, json=payload, timeout=8.0)
            response.raise_for_status()
            if not response.content:
                return None
            return response.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="The workspace database is temporarily unavailable.") from exc

    def _seed_starter_content(self) -> None:
        kit_id = "starter-kit-001"
        admin_user = next((u for u in self.users if u.get("role") == "admin"), None)
        self.kits.append({
            "id": kit_id, "owner_id": admin_user["id"] if admin_user else app_user_id("admin"), "name": "Fieldnotes Coffee",
            "brand_name": "Fieldnotes Coffee", "slug": "fieldnotes-coffee",
            "description": "A bright, thoughtful coffee identity made for everyday rituals.",
            "tagline": "Good coffee, no ceremony.",
            "elevator_pitch": "Fieldnotes Coffee makes considered coffee for everyday rituals. We focus on thoughtful sourcing, tactile design, and an approachable experience that gives people a better cup without the performance or fuss.",
            "industry": "Specialty coffee", "audience": "Design-aware urban professionals, 25–40",
            "status": "published", "access_mode": "public", "access_password_hash": None,
            "allowed_emails": [], "blocks": [
                {"id": "b-colors", "type": "Colors", "title": "Core palette", "content": "Forest · #244E43\nOat · #F0E8D8\nApricot · #E8A16D\nInk · #242B29\nUse forest for key brand moments, oat for generous space, and apricot sparingly.", "asset_url": ""},
                {"id": "b-type", "type": "Typography", "title": "Type system", "content": "Headlines: Fraunces Semibold\nBody: Inter Regular\nTone: confident, human, unhurried\nKeep hierarchy clear; avoid using more than two type families.", "asset_url": ""},
                {"id": "b-logos", "type": "Logos", "title": "Logo suite", "content": "Primary wordmark, compact mark, and one-colour stamp. Maintain generous clear space and use the one-colour version when production is limited.", "asset_url": ""},
                {"id": "b-visuals", "type": "Visuals", "title": "Everyday rituals", "content": "Natural window light, tactile materials, lived-in settings, a little grain, and close-up details. Keep people and the coffee ritual more important than props.", "asset_url": ""},
                {"id": "b-videos", "type": "Videos", "title": "Motion language", "content": "Slow pours, small gestures, short cuts, natural sound, and no overproduced transitions. Keep social clips quiet and observational.", "asset_url": ""},
                {"id": "b-icons", "type": "Icons", "title": "Supporting symbols", "content": "Use simple, rounded line icons with a consistent stroke. Icons support navigation and instructions; they should not replace meaningful labels.", "asset_url": ""},
                {"id": "b-3d", "type": "3D Models", "title": "Packaging form studies", "content": "Reserve 3D renderings for packaging exploration and product launch scenes. Use soft light and believable materials; avoid glossy plastic finishes.", "asset_url": ""},
                {"id": "b-collateral", "type": "Collaterals", "title": "In the real world", "content": "Coffee bags, takeaway cups, loyalty cards, menu boards, and a compact wholesale one-sheet. Keep the wordmark and core palette consistent across each touchpoint.", "asset_url": ""},
                {"id": "b-resources", "type": "Resources", "title": "Working files and guidance", "content": "Store current logo exports, print-ready packaging files, social templates, photography selects, and the usage guide here. Add version dates to source files before handoff.", "asset_url": ""},
                {"id": "b-story", "type": "Brand Story", "title": "Good coffee, no ceremony", "content": "We make considered coffee for the everyday moments that deserve a little more attention. Small rituals, thoughtful sourcing, and a good cup without the performance.", "asset_url": ""},
            ], "created_at": now_iso(), "updated_at": now_iso(),
        })
        client_user = next((u for u in self.users if u.get("role") == "client"), None)
        if client_user:
            self.kits.append({
                "id": "starter-kit-002", "owner_id": client_user["id"], "name": "Northline Outdoors",
                "brand_name": "Northline Outdoors", "slug": "northline-outdoors-review",
                "description": "Durable outdoor goods for people who like the long way round.",
                "tagline": "Take the long way.",
                "elevator_pitch": "Northline makes durable outdoor apparel and equipment for people who want to spend more time outside. Practical details, lasting materials, and an understated design language help everyday explorers go farther without needing to prove anything.",
                "industry": "Outdoor apparel and equipment", "audience": "Weekend hikers, everyday explorers, and practical minimalists",
                "status": "draft", "access_mode": "password", "access_password_hash": password_hash("NorthlineReview!2026", "northline-local-salt"),
                "allowed_emails": [], "blocks": [
                    {"id": "n-colors", "type": "Colors", "title": "Trail palette", "content": "Moss · #49604A\nStone · #D6D0C1\nSignal · #D16F48", "asset_url": ""},
                    {"id": "n-story", "type": "Brand Story", "title": "Take the long way", "content": "Thoughtful gear for being outside more often, with less to prove and more to notice.", "asset_url": ""},
                    {"id": "n-visuals", "type": "Visuals", "title": "Image direction", "content": "Natural light, worn-in materials, trail details, honest scale, and people in motion.", "asset_url": ""},
                ], "created_at": now_iso(), "updated_at": now_iso(),
            })
        for user in self.users:
            for standard in LEGAL_STANDARDS:
                self.legal_entries.append({
                    "id": f"{user['id']}-{slugify(standard)}", "owner_id": user["id"],
                    "standard": standard, "status": "not_configured", "document_url": "",
                    "access_mode": "request", "notes": "", "updated_at": now_iso(),
                })

    def get_user(self, username: str) -> dict[str, Any] | None:
        """Find a configured application account without querying Supabase."""
        wanted = (username or "").casefold()
        return next((u for u in self.users if u["username"].casefold() == wanted), None)

    def list_users(self) -> list[dict[str, Any]]:
        if self.supabase_enabled:
            return self._request("GET", "app_users", params={"select": "id,username,email,display_name,role", "order": "created_at.asc"}) or []
        return self.users

    def list_kits(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        if self.supabase_enabled:
            rows = self._request("GET", "brand_kits", params={"select": "*", "order": "updated_at.desc"}) or []
        else:
            rows = self.kits
        if user["role"] != "admin":
            rows = [kit for kit in rows if kit.get("owner_id") == user["id"]]
        return rows

    def get_kit_by_id(self, kit_id: str) -> dict[str, Any] | None:
        if self.supabase_enabled:
            rows = self._request("GET", "brand_kits", params={"select": "*", "id": f"eq.{kit_id}", "limit": 1}) or []
            return rows[0] if rows else None
        return next((kit for kit in self.kits if kit["id"] == kit_id), None)

    def get_kit_by_slug(self, slug: str) -> dict[str, Any] | None:
        if self.supabase_enabled:
            rows = self._request("GET", "brand_kits", params={"select": "*", "slug": f"eq.{slug}", "limit": 1}) or []
            return rows[0] if rows else None
        return next((kit for kit in self.kits if kit["slug"] == slug), None)

    def create_kit(self, owner: dict[str, Any], name: str, brand_name: str = "", industry: str = "", audience: str = "") -> dict[str, Any]:
        kit_id = str(uuid.uuid4()) if self.supabase_enabled else f"kit-{secrets.token_hex(5)}"
        clean_name = name.strip() or "Untitled brand"
        base_slug = slugify(brand_name or clean_name)
        slug = f"{base_slug}-{secrets.token_hex(3)}"
        kit = {
            "id": kit_id, "owner_id": owner["id"], "name": clean_name,
            "brand_name": brand_name.strip() or clean_name, "slug": slug,
            "description": "", "tagline": "", "elevator_pitch": "", "industry": industry.strip(), "audience": audience.strip(),
            "status": "draft", "access_mode": "public", "access_password_hash": None,
            "allowed_emails": [], "blocks": [
                {"id": str(uuid.uuid4()), "type": "Brand Story", "title": "Brand story", "content": "What should people understand, feel, and remember?", "asset_url": ""},
                {"id": str(uuid.uuid4()), "type": "Colors", "title": "Color palette", "content": "Add your core colors and usage notes.", "asset_url": ""},
                {"id": str(uuid.uuid4()), "type": "Typography", "title": "Typography", "content": "Add headline, body, and supporting type choices.", "asset_url": ""},
            ], "created_at": now_iso(), "updated_at": now_iso(),
        }
        if self.supabase_enabled:
            rows = self._request("POST", "brand_kits", params={"select": "*"}, payload=kit, prefer="return=representation") or []
            return rows[0] if rows else kit
        self.kits.insert(0, kit)
        return kit

    def update_kit(self, kit_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        changes["updated_at"] = now_iso()
        if self.supabase_enabled:
            rows = self._request("PATCH", "brand_kits", params={"id": f"eq.{kit_id}", "select": "*"}, payload=changes, prefer="return=representation") or []
            return rows[0] if rows else None
        kit = self.get_kit_by_id(kit_id)
        if not kit:
            return None
        kit.update(changes)
        return kit

    def delete_kit(self, kit_id: str) -> None:
        kit = self.get_kit_by_id(kit_id)
        if not kit:
            return
        asset_names = {
            match.group(1)
            for block in kit.get("blocks", [])
            if (match := re.fullmatch(rf"/assets/{re.escape(kit_id)}/([A-Za-z0-9._-]+)", str(block.get("asset_url", ""))))
        }
        if self.supabase_enabled:
            for asset_name in asset_names:
                try:
                    response = httpx.delete(f"{SUPABASE_URL}/storage/v1/object/brand-assets/{kit_id}/{asset_name}",
                        headers=supabase_headers(), timeout=8.0)
                    if response.status_code not in {200, 204, 404}:
                        response.raise_for_status()
                except httpx.HTTPError:
                    # The deleted kit's authorization check still prevents app-level file access.
                    pass
            self._request("DELETE", "brand_kits", params={"id": f"eq.{kit_id}"})
        else:
            self.kits = [item for item in self.kits if item["id"] != kit_id]
            asset_dir = (UPLOAD_DIR / kit_id).resolve()
            if UPLOAD_DIR.resolve() in asset_dir.parents and asset_dir.exists():
                for asset in asset_dir.iterdir():
                    if asset.is_file():
                        asset.unlink(missing_ok=True)
                asset_dir.rmdir()

    def list_legal(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        if self.supabase_enabled:
            rows = self._request("GET", "legal_entries", params={"select": "*", "order": "standard.asc"}) or []
        else:
            rows = self.legal_entries
        if user["role"] != "admin":
            rows = [entry for entry in rows if entry.get("owner_id") == user["id"]]
        return rows

    def update_legal(self, entry_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        changes["updated_at"] = now_iso()
        if self.supabase_enabled:
            rows = self._request("PATCH", "legal_entries", params={"id": f"eq.{entry_id}", "select": "*"}, payload=changes, prefer="return=representation") or []
            return rows[0] if rows else None
        entry = next((item for item in self.legal_entries if item["id"] == entry_id), None)
        if entry:
            entry.update(changes)
        return entry

    def get_legal_entry(self, entry_id: str) -> dict[str, Any] | None:
        if self.supabase_enabled:
            rows = self._request("GET", "legal_entries", params={"select": "*", "id": f"eq.{entry_id}", "limit": 1}) or []
            return rows[0] if rows else None
        return next((entry for entry in self.legal_entries if str(entry.get("id")) == str(entry_id)), None)

    def list_legal_requests(self, owner_id: str | None = None) -> list[dict[str, Any]]:
        if self.supabase_enabled:
            rows = self._request("GET", "legal_access_requests", params={"select": "*", "order": "created_at.desc"}) or []
        else:
            rows = self.legal_requests
        if owner_id:
            rows = [row for row in rows if str(row.get("owner_id")) == str(owner_id)]
        return rows

    def get_legal_request(self, request_id: str) -> dict[str, Any] | None:
        if self.supabase_enabled:
            rows = self._request("GET", "legal_access_requests", params={"select": "*", "id": f"eq.{request_id}", "limit": 1}) or []
            return rows[0] if rows else None
        return next((row for row in self.legal_requests if str(row.get("id")) == str(request_id)), None)

    def create_legal_request_draft(self, entry: dict[str, Any], email: str, requester_name: str, reason: str, token: str) -> dict[str, Any]:
        payload = {"owner_id": entry["owner_id"], "entry_id": entry["id"], "standard": entry["standard"],
                   "email": email.lower(), "requester_name": requester_name[:140], "reason": reason[:1000],
                   "status": "verification_pending", "verification_token": token, "created_at": now_iso(), "approved_at": None}
        if self.supabase_enabled:
            existing_rows = self._request("GET", "legal_access_requests", params={"select": "*", "entry_id": f"eq.{entry['id']}", "email": f"eq.{email.lower()}", "limit": 1}) or []
            if existing_rows and existing_rows[0].get("status") == "approved":
                current = existing_rows[0]
                rows = self._request("PATCH", "legal_access_requests", params={"id": f"eq.{current['id']}", "select": "*"},
                                     payload={"verification_token": token}, prefer="return=representation") or []
                return rows[0] if rows else {**current, "verification_token": token}
            if existing_rows:
                current = existing_rows[0]
                rows = self._request("PATCH", "legal_access_requests", params={"id": f"eq.{current['id']}", "select": "*"},
                                     payload=payload, prefer="return=representation") or []
                return rows[0] if rows else current
            rows = self._request("POST", "legal_access_requests", params={"select": "*"}, payload=payload,
                                  prefer="return=representation") or []
            return rows[0] if rows else payload
        current = next((r for r in self.legal_requests if r["entry_id"] == entry["id"] and r["email"] == email.lower()), None)
        if current and current.get("status") == "approved":
            current["verification_token"] = token
            return current
        if current:
            current.update(payload)
            return current
        payload["id"] = str(uuid.uuid4())
        self.legal_requests.insert(0, payload)
        return payload

    def get_legal_request_by_token(self, token: str) -> dict[str, Any] | None:
        if self.supabase_enabled:
            rows = self._request("GET", "legal_access_requests", params={"select": "*", "verification_token": f"eq.{token}", "limit": 1}) or []
            return rows[0] if rows else None
        return next((row for row in self.legal_requests if row.get("verification_token") == token), None)

    def create_legal_request(self, entry: dict[str, Any], email: str, requester_name: str, reason: str) -> dict[str, Any]:
        payload = {"owner_id": entry["owner_id"], "entry_id": entry["id"], "standard": entry["standard"],
                   "email": email.lower(), "requester_name": requester_name[:140], "reason": reason[:1000],
                   "status": "pending", "verification_token": None, "created_at": now_iso(), "approved_at": None}
        if self.supabase_enabled:
            existing_rows = self._request("GET", "legal_access_requests", params={"select": "*", "entry_id": f"eq.{entry['id']}", "email": f"eq.{email.lower()}", "limit": 1}) or []
            if existing_rows and existing_rows[0].get("status") == "approved":
                return existing_rows[0]
            rows = self._request("POST", "legal_access_requests", params={"on_conflict": "entry_id,email", "select": "*"},
                                  payload=payload, prefer="resolution=merge-duplicates,return=representation") or []
            return rows[0] if rows else payload
        current = next((r for r in self.legal_requests if r["entry_id"] == entry["id"] and r["email"] == email.lower()), None)
        if current:
            if current.get("status") == "approved":
                return current
            current.update(payload)
            current["id"] = current.get("id") or str(uuid.uuid4())
            return current
        payload["id"] = str(uuid.uuid4())
        self.legal_requests.insert(0, payload)
        return payload

    def resolve_legal_request(self, request_id: str, status: str) -> dict[str, Any] | None:
        changes = {"status": status, "approved_at": now_iso() if status == "approved" else None, "verification_token": None}
        if self.supabase_enabled:
            rows = self._request("PATCH", "legal_access_requests", params={"id": f"eq.{request_id}", "select": "*"},
                                  payload=changes, prefer="return=representation") or []
            return rows[0] if rows else None
        item = self.get_legal_request(request_id)
        if item:
            item.update(changes)
        return item

    def record_login_attempt(self, key: str) -> bool:
        current = time.time()
        attempts = [t for t in self.login_attempts.get(key, []) if current - t < 300]
        if len(attempts) >= 5:
            self.login_attempts[key] = attempts
            return False
        attempts.append(current)
        self.login_attempts[key] = attempts
        return True

    def clear_login_attempts(self, key: str) -> None:
        self.login_attempts.pop(key, None)



store = DataStore()


def get_current_user(request: Request) -> dict[str, Any] | None:
    """Resolve the signed-in user from configured app identities, never the database."""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    user = next((u for u in store.users if str(u.get("id")) == str(user_id)), None)
    if user:
        return {"id": str(user["id"]), "username": user["username"], "email": user.get("email", ""),
                "display_name": user.get("display_name") or user["username"], "role": user.get("role", "client")}
    return None


def csrf_token(request: Request) -> str:
    token = request.session.get("csrf_token")
    if not token:
        token = secrets.token_urlsafe(24)
        request.session["csrf_token"] = token
    return token


async def check_csrf(request: Request) -> None:
    supplied = request.headers.get("x-csrf-token")
    if not supplied:
        try:
            form = await request.form()
            supplied = form.get("csrf_token")
        except Exception:
            supplied = None
    expected = request.session.get("csrf_token", "")
    if not expected or not supplied or not hmac.compare_digest(str(supplied), str(expected)):
        raise HTTPException(status_code=403, detail="Your session expired. Refresh the page and try again.")


def login_required(request: Request) -> dict[str, Any]:
    user = get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


def can_manage_kit(user: dict[str, Any], kit: dict[str, Any]) -> bool:
    return user["role"] == "admin" or str(kit.get("owner_id")) == str(user["id"])


def allowed_to_view_kit(request: Request, kit: dict[str, Any]) -> bool:
    if kit.get("access_mode", "public") == "public":
        return True
    if kit.get("access_mode") == "password":
        return bool(request.session.get(f"kit_password_access_{kit['id']}"))
    if kit.get("access_mode") == "email":
        return bool(request.session.get(f"kit_email_access_{kit['id']}"))
    return False


def render(request: Request, template: str, context: dict[str, Any], status_code: int = 200) -> HTMLResponse:
    base_context = {"request": request, "app_name": APP_NAME, "csrf_token": csrf_token(request),
                    "current_user": get_current_user(request), "app_env": APP_ENV}
    base_context.update(context)
    return templates.TemplateResponse(request=request, name=template, context=base_context, status_code=status_code)


@app.get("/", response_class=HTMLResponse)
def landing(request: Request) -> HTMLResponse:
    return render(request, "landing.html", {"page_title": "A sharper starting point for your brand"})


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, next: str = "/app") -> HTMLResponse:
    if get_current_user(request):
        return RedirectResponse("/app", status_code=303)
    return render(request, "login.html", {"page_title": "Sign in", "next_url": next, "error": None})


@app.post("/login", response_class=HTMLResponse)
async def login(request: Request) -> Any:
    await check_csrf(request)
    form = await request.form()
    username = str(form.get("username", "")).strip()
    password = str(form.get("password", ""))
    next_url = str(form.get("next", "/app"))
    if not next_url.startswith("/") or next_url.startswith("//"):
        next_url = "/app"
    ip = request.client.host if request.client else "unknown"
    attempt_key = f"{ip}:{username.casefold()}"
    if not store.record_login_attempt(attempt_key):
        return render(request, "login.html", {"page_title": "Sign in", "next_url": next_url,
                      "error": "Too many sign-in attempts. Please wait a few minutes before trying again."}, 429)
    # App sign-in is intentionally independent of Supabase Auth and the data store.
    # Supabase remains the persistence layer for kits and Legal Kit records only.
    user_record = store.get_user(username)
    valid = bool(user_record and verify_password(password, user_record.get("password_hash")))
    # Never allow the published starter passwords on a production deployment.
    if valid and APP_ENV == "production" and (
        password in {"FormaAdmin!2026", "FormaClient!2026"} or len(password) < 14
    ):
        valid = False
    if not valid:
        return render(request, "login.html", {"page_title": "Sign in", "next_url": next_url,
                      "error": "That username and password do not match. Check your details and try again."}, 401)
    store.clear_login_attempts(attempt_key)
    request.session.clear()
    request.session["user_id"] = str(user_record["id"])
    request.session["csrf_token"] = secrets.token_urlsafe(24)
    return RedirectResponse(next_url, status_code=303)


@app.post("/logout")
async def logout(request: Request) -> RedirectResponse:
    await check_csrf(request)
    request.session.clear()
    return RedirectResponse("/", status_code=303)


@app.get("/app", response_class=HTMLResponse)
def dashboard(request: Request) -> Any:
    user = get_current_user(request)
    if not user:
        return RedirectResponse("/login?next=/app", status_code=303)
    kits = store.list_kits(user)
    return render(request, "dashboard.html", {"page_title": "Your studio", "kits": kits,
                  "users": store.list_users() if user["role"] == "admin" else [],
                  "is_admin": user["role"] == "admin", "kit_count": len(kits),
                  "published_count": sum(1 for k in kits if k.get("status") == "published")})


@app.post("/kits/new")
async def create_kit(request: Request) -> RedirectResponse:
    await check_csrf(request)
    user = login_required(request)
    form = await request.form()
    name = str(form.get("name", "Untitled brand")).strip()[:120]
    brand_name = str(form.get("brand_name", "")).strip()[:120]
    industry = str(form.get("industry", "")).strip()[:100]
    audience = str(form.get("audience", "")).strip()[:240]
    kit = store.create_kit(user, name, brand_name, industry, audience)
    return RedirectResponse(f"/kits/{quote(str(kit['id']))}", status_code=303)


@app.get("/kits/{kit_id}", response_class=HTMLResponse)
def edit_kit(request: Request, kit_id: str) -> Any:
    user = get_current_user(request)
    if not user:
        return RedirectResponse(f"/login?next=/kits/{quote(kit_id)}", status_code=303)
    kit = store.get_kit_by_id(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    if not can_manage_kit(user, kit):
        raise HTTPException(status_code=403, detail="You do not have access to edit this brand kit.")
    return render(request, "kit_editor.html", {"page_title": kit.get("name", "Brand kit"), "kit": kit,
                  "block_types": BLOCK_TYPES, "share_url": str(request.base_url).rstrip("/") + f"/b/{kit['slug']}"})


class KitUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    brand_name: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=600)
    tagline: str = Field(default="", max_length=180)
    elevator_pitch: str = Field(default="", max_length=1000)
    industry: str = Field(default="", max_length=100)
    audience: str = Field(default="", max_length=240)
    blocks: list[dict[str, Any]] = Field(default_factory=list, max_length=40)
    access_mode: str = Field(default="public")
    access_password: str = Field(default="", max_length=160)
    allowed_emails_text: str = Field(default="", max_length=2000)


@app.put("/api/kits/{kit_id}")
async def save_kit(request: Request, kit_id: str, payload: KitUpdate) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    kit = store.get_kit_by_id(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    if not can_manage_kit(user, kit):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this kit.")
    if payload.access_mode not in {"public", "password", "email"}:
        raise HTTPException(status_code=422, detail="Choose a valid sharing option.")
    clean_blocks = []
    for block in payload.blocks:
        if block.get("type") not in BLOCK_TYPES:
            continue
        asset_url = str(block.get("asset_url", "")).strip()[:1500]
        if asset_url and not (asset_url.startswith("https://") or re.fullmatch(rf"/assets/{re.escape(kit_id)}/[A-Za-z0-9._-]+", asset_url)):
            raise HTTPException(status_code=422, detail="Asset links must use HTTPS or a file uploaded to this brand kit.")
        clean_blocks.append({
            "id": str(block.get("id") or uuid.uuid4()),
            "type": block["type"],
            "title": str(block.get("title", block["type"]))[:140],
            "content": str(block.get("content", ""))[:8000],
            "asset_url": asset_url,
        })
    if payload.access_mode == "password" and not payload.access_password and not kit.get("access_password_hash"):
        raise HTTPException(status_code=422, detail="Add a password before enabling password-protected sharing.")
    emails = sorted({e.strip().lower() for e in payload.allowed_emails_text.splitlines() if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", e.strip())})
    if payload.access_mode == "email" and not emails:
        raise HTTPException(status_code=422, detail="Add at least one valid email address for restricted sharing.")
    changes: dict[str, Any] = {
        "name": payload.name.strip(), "brand_name": payload.brand_name.strip() or payload.name.strip(),
        "description": payload.description.strip(), "tagline": payload.tagline.strip(),
        "elevator_pitch": payload.elevator_pitch.strip(), "industry": payload.industry.strip(),
        "audience": payload.audience.strip(), "blocks": clean_blocks,
        "access_mode": payload.access_mode, "allowed_emails": emails,
    }
    if payload.access_mode == "password" and payload.access_password:
        changes["access_password_hash"] = password_hash(payload.access_password)
    elif payload.access_mode != "password":
        changes["access_password_hash"] = None
    updated = store.update_kit(kit_id, changes)
    return JSONResponse({"ok": True, "kit": updated, "share_url": str(request.base_url).rstrip("/") + f"/b/{updated['slug']}"})


@app.post("/api/kits/{kit_id}/publish")
async def publish_kit(request: Request, kit_id: str) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    kit = store.get_kit_by_id(kit_id)
    if not kit or not can_manage_kit(user, kit):
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    updated = store.update_kit(kit_id, {"status": "published"})
    return JSONResponse({"ok": True, "share_url": str(request.base_url).rstrip("/") + f"/b/{updated['slug']}"})


@app.post("/api/kits/{kit_id}/unpublish")
async def unpublish_kit(request: Request, kit_id: str) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    kit = store.get_kit_by_id(kit_id)
    if not kit or not can_manage_kit(user, kit):
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    store.update_kit(kit_id, {"status": "draft"})
    return JSONResponse({"ok": True})


@app.delete("/api/kits/{kit_id}")
async def delete_kit(request: Request, kit_id: str) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    kit = store.get_kit_by_id(kit_id)
    if not kit or not can_manage_kit(user, kit):
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    store.delete_kit(kit_id)
    return JSONResponse({"ok": True})


@app.post("/api/kits/{kit_id}/assets")
async def upload_kit_asset(request: Request, kit_id: str) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    kit = store.get_kit_by_id(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found.")
    if not can_manage_kit(user, kit):
        raise HTTPException(status_code=403, detail="You do not have permission to add assets to this kit.")
    form = await request.form()
    uploaded = form.get("file")
    if not isinstance(uploaded, StarletteUploadFile) or not uploaded.filename:
        raise HTTPException(status_code=422, detail="Choose a file to upload.")
    original_name = Path(uploaded.filename).name
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=415, detail="This file type is not supported. Choose an image, document, font, video, or 3D asset.")
    content = await uploaded.read(MAX_UPLOAD_BYTES + 1)
    if not content:
        raise HTTPException(status_code=422, detail="The selected file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Files must be 15 MB or smaller.")
    # The stored filename is generated server-side; never trust an uploaded path.
    clean_suffix = slugify(Path(original_name).stem).replace("-", "_")[:60] or "asset"
    asset_name = f"{uuid.uuid4().hex[:16]}-{clean_suffix}{extension}"
    upload_content_types = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
        ".gif": "image/gif", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm",
        ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".woff": "font/woff", ".woff2": "font/woff2",
        ".ttf": "font/ttf", ".otf": "font/otf", ".svg": "image/svg+xml", ".zip": "application/zip",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    content_type = upload_content_types[extension]
    if store.supabase_enabled:
        storage_path = f"{kit_id}/{asset_name}"
        try:
            response = httpx.post(f"{SUPABASE_URL}/storage/v1/object/brand-assets/{storage_path}",
                headers={**supabase_headers(content_type), "x-upsert": "false"}, content=content, timeout=20.0)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="The file could not be stored. Please try again.") from exc
    else:
        destination = UPLOAD_DIR / kit_id
        destination.mkdir(parents=True, exist_ok=True)
        (destination / asset_name).write_bytes(content)
    return JSONResponse({"ok": True, "asset_url": f"/assets/{kit_id}/{asset_name}", "filename": original_name, "size": len(content)})


@app.get("/assets/{kit_id}/{asset_name}")
def serve_kit_asset(request: Request, kit_id: str, asset_name: str, inline: bool = False) -> Response:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", asset_name) or asset_name in {".", ".."}:
        raise HTTPException(status_code=404, detail="Asset not found.")
    kit = store.get_kit_by_id(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Asset not found.")
    user = get_current_user(request)
    if not ((user and can_manage_kit(user, kit)) or (kit.get("status") == "published" and allowed_to_view_kit(request, kit))):
        raise HTTPException(status_code=403, detail="This asset is not available with your current access.")
    referenced = any(str(block.get("asset_url", "")) == f"/assets/{kit_id}/{asset_name}" for block in kit.get("blocks", []))
    if not referenced:
        raise HTTPException(status_code=404, detail="Asset not found.")
    extension = Path(asset_name).suffix.lower()
    inline_types = {
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm",
    }
    if inline and extension not in inline_types:
        raise HTTPException(status_code=415, detail="This asset type cannot be previewed inline. Download it instead.")
    content_type = inline_types.get(extension, mimetypes.guess_type(asset_name)[0] or "application/octet-stream")
    if not inline and extension in {".svg", ".glb", ".gltf", ".zip", ".woff", ".woff2", ".ttf", ".otf"}:
        content_type = "application/octet-stream"
    if store.supabase_enabled:
        storage_path = f"{kit_id}/{asset_name}"
        try:
            response = httpx.get(f"{SUPABASE_URL}/storage/v1/object/brand-assets/{storage_path}",
                headers=supabase_headers(), timeout=20.0)
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Asset not found.")
            response.raise_for_status()
            content_type = response.headers.get("content-type", content_type).split(";")[0]
            body = response.content
        except HTTPException:
            raise
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="The asset is temporarily unavailable.") from exc
    else:
        path = (UPLOAD_DIR / kit_id / asset_name).resolve()
        if not path.is_file() or UPLOAD_DIR.resolve() not in path.parents:
            raise HTTPException(status_code=404, detail="Asset not found.")
        body = path.read_bytes()
    if inline:
        content_type = inline_types[extension]  # trust the allowlist, not stored/client-provided MIME metadata
    elif extension in {".svg", ".glb", ".gltf", ".zip", ".woff", ".woff2", ".ttf", ".otf"}:
        content_type = "application/octet-stream"  # do not render active SVG or binary source formats inline
    safe_name = asset_name.replace('"', "")
    disposition = "inline" if inline else "attachment"
    return Response(content=body, media_type=content_type, headers={"Content-Disposition": f'{disposition}; filename="{safe_name}"', "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store"})


@app.get("/b/{slug}", response_class=HTMLResponse)
def shared_kit(request: Request, slug: str, verify: str = "", email: str = "", message: str = "") -> HTMLResponse:
    kit = store.get_kit_by_slug(slug)
    if not kit or kit.get("status") != "published":
        raise HTTPException(status_code=404, detail="This brand kit is not published or no longer available.")
    unlocked = allowed_to_view_kit(request, kit)
    rendered_kit = {**kit, "blocks": []}
    for source_block in kit.get("blocks", []):
        block = dict(source_block)
        if block.get("type") == "Colors":
            swatches = []
            for line in str(block.get("content", "")).splitlines():
                match = re.search(r"#[0-9a-fA-F]{6}(?![0-9a-fA-F])", line)
                if match:
                    swatches.append({"hex": match.group(0).upper(), "name": line[:match.start()].strip(" ·:-") or "Color"})
            block["color_swatches"] = swatches[:12]
        rendered_kit["blocks"].append(block)
    return render(request, "shared_kit.html", {"page_title": kit.get("brand_name", kit["name"]), "kit": rendered_kit,
                  "unlocked": unlocked, "verify_email": email if verify == "1" else "",
                  "message": message, "needs_gate": kit.get("access_mode") != "public" and not unlocked,
                  "is_password_gate": kit.get("access_mode") == "password" and not unlocked,
                  "is_email_gate": kit.get("access_mode") == "email" and not unlocked})


@app.post("/b/{slug}/unlock")
async def unlock_kit(request: Request, slug: str) -> RedirectResponse:
    await check_csrf(request)
    form = await request.form()
    kit = store.get_kit_by_slug(slug)
    if not kit or kit.get("status") != "published":
        raise HTTPException(status_code=404, detail="This brand kit is not available.")
    if kit.get("access_mode") == "password":
        if verify_password(str(form.get("password", "")), kit.get("access_password_hash")):
            request.session[f"kit_password_access_{kit['id']}"] = True
            return RedirectResponse(f"/b/{quote(slug)}", status_code=303)
        return RedirectResponse(f"/b/{quote(slug)}?message=incorrect_password", status_code=303)
    if kit.get("access_mode") == "email":
        email = str(form.get("email", "")).strip().lower()
        if email not in {e.lower() for e in kit.get("allowed_emails", [])}:
            return RedirectResponse(f"/b/{quote(slug)}?message=email_not_allowed", status_code=303)
        if not store.supabase_enabled or not SUPABASE_AUTH_KEY:
            return RedirectResponse(f"/b/{quote(slug)}?message=email_verification_unavailable", status_code=303)
        try:
            sent = send_supabase_email_otp(email, create_user=True)
        except HTTPException:
            sent = False
        if not sent:
            return RedirectResponse(f"/b/{quote(slug)}?message=email_send_failed", status_code=303)
        request.session[f"pending_kit_email_{kit['id']}"] = email
        return RedirectResponse(f"/b/{quote(slug)}?verify=1&email={quote(email)}&message=verification_sent", status_code=303)
    return RedirectResponse(f"/b/{quote(slug)}", status_code=303)


@app.post("/b/{slug}/verify")
async def verify_kit_email(request: Request, slug: str) -> RedirectResponse:
    await check_csrf(request)
    form = await request.form()
    kit = store.get_kit_by_slug(slug)
    if not kit or kit.get("access_mode") != "email":
        raise HTTPException(status_code=404, detail="This access request is no longer available.")
    email = str(form.get("email", "")).strip().lower()
    code = str(form.get("code", "")).strip()
    pending_email = str(request.session.get(f"pending_kit_email_{kit['id']}", "")).lower()
    allowed_emails = {e.lower() for e in kit.get("allowed_emails", [])}
    if (email != pending_email or email not in allowed_emails or not re.fullmatch(r"\d{6}", code)
            or not verify_supabase_email_otp(email, code)):
        return RedirectResponse(f"/b/{quote(slug)}?verify=1&email={quote(email)}&message=invalid_code", status_code=303)
    request.session[f"kit_email_access_{kit['id']}"] = hashlib.sha256(email.encode()).hexdigest()
    request.session.pop(f"pending_kit_email_{kit['id']}", None)
    return RedirectResponse(f"/b/{quote(slug)}", status_code=303)


class CopyRequest(BaseModel):
    task: str = Field(min_length=3, max_length=80)
    brand_name: str = Field(default="", max_length=120)
    industry: str = Field(default="", max_length=100)
    audience: str = Field(default="", max_length=240)
    positioning: str = Field(default="", max_length=500)
    tone: str = Field(default="Clear, distinctive, human", max_length=200)
    key_points: str = Field(default="", max_length=1500)


@app.post("/api/ai/copy")
async def generate_copy(request: Request, payload: CopyRequest) -> JSONResponse:
    await check_csrf(request)
    login_required(request)
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Copy assistance is not connected yet. Add a Gemini API key to enable it.")
    task_key = payload.task.strip().casefold()
    task_guidance = {
        "tagline": "Write one memorable, ownable tagline of 3–8 words. It must be easy to say aloud and specific to the supplied brand brief. Return only the single tagline, with no quotation marks, alternatives, bullets, or preamble.",
        "elevator pitch": "Write one natural, spoken-sounding elevator pitch of 45–70 words. Explain what the brand offers, who it serves, and why it is meaningfully different. Do not add claims that are not in the brief. Return only the pitch, with no heading or preamble.",
    }.get(task_key, "Write clear, specific, non-generic brand copy appropriate to the requested task. Return only the requested copy, with no preamble.")
    prompt = f"""You are an experienced brand strategist and copywriter. Never invent credentials, certifications, customer numbers, product claims, or cultural research. If information is missing, write around it instead of fabricating facts.\n\nTask: {payload.task}\nInstruction: {task_guidance}\nBrand: {payload.brand_name or 'Not provided'}\nIndustry: {payload.industry or 'Not provided'}\nAudience: {payload.audience or 'Not provided'}\nPositioning: {payload.positioning or 'Not provided'}\nTone: {payload.tone}\nKey points: {payload.key_points or 'Not provided'}\n\nMake the result useful to a designer creating an identity system. Prefer vivid, ownable language over familiar marketing clichés. Avoid generic phrases such as 'unlock your potential', 'where innovation meets', and 'your journey starts here'."""
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        copy = (response.text or "").strip()
        if not copy:
            raise ValueError("The model returned no copy.")
        return JSONResponse({"ok": True, "copy": copy, "model": GEMINI_MODEL})
    except Exception as exc:
        # Do not return provider details, credentials, or raw upstream exception strings to the UI.
        raise HTTPException(status_code=502, detail="Copy assistance could not complete this request. Check the model connection and try again.") from exc


class CultureRequest(BaseModel):
    brand_name: str = Field(default="", max_length=120)
    industry: str = Field(min_length=2, max_length=100)
    audience: str = Field(default="", max_length=240)
    market: str = Field(default="North America", max_length=120)
    values: str = Field(default="", max_length=500)


def extract_qloo_entities(payload: Any) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    if not isinstance(payload, dict):
        return entities
    candidates: list[Any] = []
    for key in ("results", "entities", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            candidates.extend(value)
        elif isinstance(value, dict):
            for nested in value.values():
                if isinstance(nested, list):
                    candidates.extend(nested)
    for item in candidates[:12]:
        if isinstance(item, dict):
            entity_id = item.get("entity_id") or item.get("id") or item.get("uuid")
            name = item.get("name") or item.get("display_name") or item.get("label")
            if entity_id and name:
                entities.append({"id": str(entity_id), "name": str(name)})
    return entities


def extract_qloo_tags(payload: Any) -> list[dict[str, Any]]:
    tags: list[dict[str, Any]] = []
    if not isinstance(payload, dict):
        return tags
    results = payload.get("results", {})
    candidates: list[Any] = []
    if isinstance(results, dict):
        for key in ("tags", "entities", "brands", "places"):
            if isinstance(results.get(key), list):
                candidates.extend(results[key])
    for item in candidates[:12]:
        if isinstance(item, dict):
            name = item.get("name") or item.get("tag_name") or item.get("label")
            score = item.get("score") or item.get("affinity")
            if name:
                tags.append({"name": str(name), "score": score})
    return tags


@app.post("/api/ai/culture")
async def cultural_signals(request: Request, payload: CultureRequest) -> JSONResponse:
    await check_csrf(request)
    login_required(request)
    if not QLOO_API_KEY:
        raise HTTPException(status_code=503, detail="Cultural insights are not connected yet. Add a Qloo API key to enable evidence-based cultural signals.")
    query = " ".join(p for p in [payload.brand_name, payload.industry, payload.audience, payload.market] if p).strip()
    headers = {"X-Api-Key": QLOO_API_KEY, "Accept": "application/json"}
    try:
        with httpx.Client(timeout=6.0, headers=headers) as client:
            search_response = client.get(f"{QLOO_BASE_URL}/search", params={"query": query, "take": 8})
            search_response.raise_for_status()
            entities = extract_qloo_entities(search_response.json())
            if not entities:
                return JSONResponse({"ok": True, "source": "Qloo", "signals": [], "note": "No matching cultural entities were returned. Try a more specific brand or category."})
            insights_response = client.get(f"{QLOO_BASE_URL}/v2/insights", params={
                "filter.type": "urn:tag", "signal.interests.entities": entities[0]["id"], "take": 12,
            })
            insights_response.raise_for_status()
            tags = extract_qloo_tags(insights_response.json())
        interpretation = ""
        if tags and GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)
                summary_prompt = (
                    "Interpret these retrieved Qloo cultural tags as cautious brand design inputs. "
                    "Separate observed tags from hypotheses; do not infer protected traits or claim causation. "
                    "Give three concise implications for visual language, tone, or audience fit. "
                    f"Brand/category: {query}. Audience and values supplied by user: {payload.audience}; {payload.values}. "
                    f"Retrieved tags: {json.dumps(tags[:10], ensure_ascii=False)}"
                )
                generated = client.models.generate_content(model=GEMINI_MODEL, contents=summary_prompt)
                interpretation = (generated.text or "").strip()
            except Exception:
                interpretation = "Retrieved signals are available; interpretation could not be generated. Review the tags directly before making design decisions."
        return JSONResponse({"ok": True, "source": "Qloo", "matched_entity": entities[0], "signals": tags,
                             "interpretation": interpretation,
                             "note": "Cultural signals describe aggregate affinity patterns, not the preferences of every person in an audience."})
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="The cultural insights service did not return usable results. Review the API key and request settings, then try again.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="The cultural insights service is temporarily unavailable. Your brand brief has been preserved.") from exc


@app.get("/legal", response_class=HTMLResponse)
def legal_page(request: Request) -> Any:
    user = get_current_user(request)
    if not user:
        return RedirectResponse("/login?next=/legal", status_code=303)
    entries = store.list_legal(user)
    requests = store.list_legal_requests() if user["role"] == "admin" else store.list_legal_requests(str(user["id"]))
    return render(request, "legal.html", {"page_title": "Legal Kit", "entries": entries, "is_admin": user["role"] == "admin", "access_requests": requests})


class LegalUpdate(BaseModel):
    status: str
    document_url: str = Field(default="", max_length=1500)
    access_mode: str = "request"
    notes: str = Field(default="", max_length=1000)


@app.put("/api/legal/{entry_id}")
async def update_legal_entry(request: Request, entry_id: str, payload: LegalUpdate) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    if payload.status not in {"not_configured", "in_progress", "documented", "verified"}:
        raise HTTPException(status_code=422, detail="Choose a valid document status.")
    if payload.access_mode not in {"public", "request"}:
        raise HTTPException(status_code=422, detail="Choose a valid access setting.")
    if payload.document_url and not payload.document_url.startswith("https://"):
        raise HTTPException(status_code=422, detail="Document links must use HTTPS.")
    entries = store.list_legal(user)
    entry = next((row for row in entries if str(row.get("id")) == entry_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Legal entry not found.")
    updated = store.update_legal(entry_id, payload.model_dump())
    return JSONResponse({"ok": True, "entry": updated})


@app.get("/legal/share/{username}", response_class=HTMLResponse)
def public_legal(request: Request, username: str, verify: str = "", token: str = "", message: str = "") -> HTMLResponse:
    users = store.list_users()
    owner = next((u for u in users if u.get("username", "").casefold() == username.casefold()), None)
    if not owner:
        raise HTTPException(status_code=404, detail="Legal Kit not found.")
    entries = [e for e in store.list_legal({"id": owner["id"], "role": "client"}) if str(e.get("owner_id")) == str(owner["id"])]
    requests = store.list_legal_requests(str(owner["id"]))
    for entry in entries:
        current_hash = request.session.get(f"legal_access_{entry.get('id')}", "")
        entry["viewer_approved"] = any(str(r.get("entry_id")) == str(entry.get("id")) and r.get("status") == "approved" and hashlib.sha256(str(r.get("email", "")).lower().encode()).hexdigest() == current_hash for r in requests)
        entry["viewer_pending"] = any(str(r.get("entry_id")) == str(entry.get("id")) and r.get("status") == "pending" and hashlib.sha256(str(r.get("email", "")).lower().encode()).hexdigest() == current_hash for r in requests)
    return render(request, "legal_shared.html", {"page_title": f"{owner.get('display_name', owner['username'])} · Legal Kit",
                  "owner": owner, "entries": entries, "public_entries": [e for e in entries if e.get("access_mode") == "public" and e.get("document_url")],
                  "verify_token": token if verify == "1" else "", "message": message})


@app.post("/legal/share/{username}/request")
async def request_legal_access(request: Request, username: str) -> RedirectResponse:
    await check_csrf(request)
    form = await request.form()
    owner = next((u for u in store.list_users() if u.get("username", "").casefold() == username.casefold()), None)
    if not owner:
        raise HTTPException(status_code=404, detail="Legal Kit not found.")
    entry_id = str(form.get("entry_id", ""))
    entry = store.get_legal_entry(entry_id)
    if not entry or str(entry.get("owner_id")) != str(owner["id"]) or entry.get("access_mode") != "request":
        return RedirectResponse(f"/legal/share/{quote(username)}?message=access_unavailable", status_code=303)
    email = str(form.get("email", "")).strip().lower()
    name = str(form.get("requester_name", "")).strip()[:140]
    reason = str(form.get("reason", "")).strip()[:1000]
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return RedirectResponse(f"/legal/share/{quote(username)}?message=invalid_email", status_code=303)
    if not store.supabase_enabled or not SUPABASE_AUTH_KEY:
        return RedirectResponse(f"/legal/share/{quote(username)}?message=email_verification_unavailable", status_code=303)
    try:
        sent = send_supabase_email_otp(email, create_user=True)
    except HTTPException:
        sent = False
    if not sent:
        return RedirectResponse(f"/legal/share/{quote(username)}?message=email_send_failed", status_code=303)
    verification_token = secrets.token_urlsafe(24)
    store.create_legal_request_draft(entry, email, name, reason, verification_token)
    request.session[f"pending_legal_email_{verification_token}"] = email
    return RedirectResponse(f"/legal/share/{quote(username)}?verify=1&token={quote(verification_token)}&message=verification_sent", status_code=303)


@app.post("/legal/share/{username}/verify")
async def verify_legal_access_request(request: Request, username: str) -> RedirectResponse:
    await check_csrf(request)
    form = await request.form()
    token = str(form.get("request_token", "")).strip()
    code = str(form.get("code", "")).strip()
    pending = store.get_legal_request_by_token(token)
    if not pending or not secrets.compare_digest(str(pending.get("verification_token", "")), token):
        return RedirectResponse(f"/legal/share/{quote(username)}?message=request_expired", status_code=303)
    owner = next((u for u in store.list_users() if str(u.get("id")) == str(pending.get("owner_id"))), None)
    if not owner or owner.get("username", "").casefold() != username.casefold():
        return RedirectResponse(f"/legal/share/{quote(username)}?message=request_expired", status_code=303)
    email = str(pending.get("email", "")).lower()
    pending_email = str(request.session.get(f"pending_legal_email_{token}", "")).lower()
    if (email != pending_email or not re.fullmatch(r"\d{6}", code)
            or not verify_supabase_email_otp(email, code)):
        return RedirectResponse(f"/legal/share/{quote(username)}?verify=1&token={quote(token)}&message=invalid_code", status_code=303)
    request.session.pop(f"pending_legal_email_{token}", None)
    entry = store.get_legal_entry(str(pending["entry_id"]))
    if not entry:
        raise HTTPException(status_code=404, detail="Legal Kit entry not found.")
    access_request = store.create_legal_request(entry, email, str(pending.get("requester_name", "")), str(pending.get("reason", "")))
    # Clear the one-time request token after the email identity is verified, while preserving approval state.
    store.resolve_legal_request(str(access_request["id"]), "approved" if access_request.get("status") == "approved" else "pending")
    request.session[f"legal_access_{entry['id']}"] = hashlib.sha256(email.encode()).hexdigest()
    return RedirectResponse(f"/legal/share/{quote(username)}?message={'already_approved' if access_request.get('status') == 'approved' else 'request_submitted'}", status_code=303)


@app.put("/api/legal/requests/{request_id}")
async def review_legal_access_request(request: Request, request_id: str, payload: dict[str, Any]) -> JSONResponse:
    await check_csrf(request)
    user = login_required(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only a studio administrator can review access requests.")
    status = str(payload.get("status", ""))
    if status not in {"approved", "denied"}:
        raise HTTPException(status_code=422, detail="Choose approve or deny.")
    existing = store.get_legal_request(request_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Access request not found.")
    updated = store.resolve_legal_request(request_id, status)
    return JSONResponse({"ok": True, "request": updated})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if request.url.path.startswith("/api/"):
        detail = exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
        return JSONResponse({"ok": False, "detail": detail}, status_code=exc.status_code)
    return templates.TemplateResponse(request=request, name="error.html", context={
        "request": request, "app_name": APP_NAME, "current_user": get_current_user(request),
        "csrf_token": csrf_token(request), "status_code": exc.status_code,
        "message": exc.detail if isinstance(exc.detail, str) else "The request could not be completed.",
    }, status_code=exc.status_code)
