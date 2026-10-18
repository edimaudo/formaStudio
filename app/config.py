"""Fail-fast validation for service credentials and base URLs.

This module validates configuration only; it never prints or logs secret values.
"""
from __future__ import annotations

import base64
import json
from urllib.parse import urlsplit


def _url_root_error(name: str) -> str:
    if name == "SUPABASE_URL":
        return (
            "SUPABASE_URL must be the Supabase Project URL, for example "
            "https://your-project-ref.supabase.co. Do not append /rest/v1, /storage/v1, "
            "a table name, query parameters, or a trailing API route."
        )
    return f"{name} must be an HTTPS base URL without a path, query string, or fragment."


def validate_base_url(name: str, value: str, *, allow_local_http: bool = False) -> str:
    value = (value or "").strip().rstrip("/")
    if not value:
        raise RuntimeError(f"{name} is required when this integration is configured.")
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        _ = parsed.port  # Accessing port validates malformed port values.
    except ValueError as exc:
        raise RuntimeError(_url_root_error(name)) from exc
    if (
        parsed.scheme not in {"https", "http"}
        or not parsed.netloc
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        raise RuntimeError(_url_root_error(name))
    if parsed.scheme != "https":
        local_hosts = {"localhost", "127.0.0.1", "::1"}
        if not (allow_local_http and hostname in local_hosts):
            raise RuntimeError(f"{name} must use HTTPS outside local development.")
    return value


def _jwt_role(key: str) -> str | None:
    """Read the role claim only to distinguish legacy Supabase key types.

    This is format validation, not JWT signature verification or authentication.
    Supabase validates the key on every actual API request.
    """
    parts = key.split(".")
    if len(parts) != 3:
        return None
    try:
        payload = parts[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload.encode("ascii")))
        role = data.get("role") if isinstance(data, dict) else None
        return role if isinstance(role, str) else None
    except (ValueError, UnicodeError, json.JSONDecodeError):
        return None


def validate_supabase_settings(
    url: str,
    secret_key: str,
    service_role_key: str,
    app_env: str,
) -> tuple[str, str]:
    """Return (normalized project URL, key) or raise a non-secret-bearing error."""
    url = (url or "").strip().rstrip("/")
    secret_key = (secret_key or "").strip()
    service_role_key = (service_role_key or "").strip()
    app_env = (app_env or "development").strip().lower()

    if secret_key and service_role_key:
        raise RuntimeError(
            "Set only one Supabase server key: use SUPABASE_SECRET_KEY for a modern "
            "sb_secret_… key, OR SUPABASE_SERVICE_ROLE_KEY for the legacy service_role JWT. "
            "Do not populate both variables."
        )

    selected_key = secret_key or service_role_key
    if bool(url) != bool(selected_key):
        raise RuntimeError(
            "Supabase configuration is incomplete. Set both SUPABASE_URL and one valid "
            "server key, or clear both to use local in-memory storage. This prevents an "
            "incomplete production configuration from silently using temporary data."
        )

    if not url and not selected_key:
        if app_env == "production":
            raise RuntimeError(
                "Supabase is required in production. Set SUPABASE_URL and SUPABASE_SECRET_KEY "
                "(recommended), or the legacy SUPABASE_SERVICE_ROLE_KEY."
            )
        return "", ""

    url = validate_base_url("SUPABASE_URL", url, allow_local_http=True)

    if secret_key:
        if secret_key.startswith("sb_publishable_"):
            raise RuntimeError(
                "SUPABASE_SECRET_KEY contains a publishable key. Use the server-only "
                "sb_secret_… key from Supabase Settings → API Keys. Publishable keys do not "
                "provide the elevated server access this application requires."
            )
        if secret_key.startswith("sb_secret_"):
            return url, secret_key
        if secret_key.startswith("eyJ"):
            role = _jwt_role(secret_key)
            if role == "service_role":
                raise RuntimeError(
                    "A legacy service_role JWT was placed in SUPABASE_SECRET_KEY. Move it to "
                    "SUPABASE_SERVICE_ROLE_KEY, or create a modern sb_secret_… key."
                )
            raise RuntimeError(
                "SUPABASE_SECRET_KEY must be a modern sb_secret_… key. Do not use the anon JWT; "
                "for a legacy key, use the service_role JWT in SUPABASE_SERVICE_ROLE_KEY."
            )
        raise RuntimeError(
            "SUPABASE_SECRET_KEY has an unrecognized format. Copy the Secret key (sb_secret_…) "
            "from Supabase Settings → API Keys, not the publishable key."
        )

    # A value supplied in SUPABASE_SERVICE_ROLE_KEY must be the legacy service_role JWT.
    if service_role_key.startswith("sb_secret_"):
        raise RuntimeError(
            "A modern sb_secret_… key was placed in SUPABASE_SERVICE_ROLE_KEY. Move it to "
            "SUPABASE_SECRET_KEY."
        )
    if service_role_key.startswith("sb_publishable_"):
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY contains a publishable key. Use a server-only secret key."
        )
    if not service_role_key.startswith("eyJ") or _jwt_role(service_role_key) != "service_role":
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY must be the legacy service_role JWT (role claim "
            "service_role), not the anon/publishable key. Prefer a modern sb_secret_… key."
        )
    return url, service_role_key


def validate_supabase_auth_settings(
    project_url: str, publishable_key: str, anon_key: str, app_env: str
) -> str:
    """Validate the public Auth key used by server-side Supabase Auth requests.

    This key is never rendered into the UI. Modern publishable keys and legacy anon
    JWTs are supported; server-only secret/service-role keys are rejected here.
    """
    project_url = (project_url or "").strip().rstrip("/")
    publishable_key = (publishable_key or "").strip()
    anon_key = (anon_key or "").strip()
    app_env = (app_env or "development").strip().lower()

    if publishable_key and anon_key:
        raise RuntimeError(
            "Set only one Supabase Auth key: use SUPABASE_PUBLISHABLE_KEY for a modern "
            "sb_publishable_… key OR SUPABASE_ANON_KEY for the legacy anon JWT. Do not set both."
        )
    key = publishable_key or anon_key
    # Supabase Auth is not used to sign users into Forma Studio. The branded login
    # validates application credentials locally; this optional key only enables
    # email OTP for email-restricted brand kits and Legal Kit access requests.
    # Missing Auth credentials must never prevent the main app from starting.
    if not project_url and not key:
        return ""
    if project_url:
        project_url = validate_base_url("SUPABASE_URL", project_url, allow_local_http=True)
    if not key:
        return ""
    if not project_url:
        raise RuntimeError(
            "Set SUPABASE_URL when configuring optional email verification through Supabase Auth."
        )

    if publishable_key:
        if publishable_key.startswith("sb_secret_"):
            raise RuntimeError(
                "SUPABASE_PUBLISHABLE_KEY contains a server Secret key. Use a key beginning "
                "sb_publishable_ in this variable; keep sb_secret_ in SUPABASE_SECRET_KEY."
            )
        if publishable_key.startswith("sb_publishable_"):
            return publishable_key
        if publishable_key.startswith("eyJ"):
            role = _jwt_role(publishable_key)
            if role == "anon":
                raise RuntimeError(
                    "A legacy anon JWT was placed in SUPABASE_PUBLISHABLE_KEY. Move it to "
                    "SUPABASE_ANON_KEY, or create a modern sb_publishable_ key."
                )
        raise RuntimeError(
            "SUPABASE_PUBLISHABLE_KEY must be a modern sb_publishable_ key. Do not use the "
            "server Secret key or legacy service_role JWT."
        )

    if anon_key.startswith("sb_publishable_"):
        raise RuntimeError(
            "A modern sb_publishable_ key was placed in SUPABASE_ANON_KEY. Move it to "
            "SUPABASE_PUBLISHABLE_KEY."
        )
    if not anon_key.startswith("eyJ") or _jwt_role(anon_key) != "anon":
        raise RuntimeError(
            "SUPABASE_ANON_KEY must be the legacy anon JWT (role claim anon), not a service_role "
            "JWT or modern key. Prefer SUPABASE_PUBLISHABLE_KEY."
        )
    return anon_key
