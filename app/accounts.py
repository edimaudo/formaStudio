"""Stable application profile identifiers used independently of sign-in.

The login credentials live in the application's environment configuration. These
UUIDs link those application identities to persistent workspace data when Supabase
Postgres is enabled; they are identifiers, not secrets or Supabase Auth user IDs.
"""
from __future__ import annotations

import os

DEFAULT_ADMIN_USER_ID = "210ad331-4a00-55f4-af5b-28c4e441a799"
DEFAULT_CLIENT_USER_ID = "c5105d08-bd79-5d64-b813-754d7bb9f95f"


def app_user_id(role: str) -> str:
    if role == "admin":
        return os.getenv("ADMIN_USER_ID", DEFAULT_ADMIN_USER_ID).strip()
    if role == "client":
        return os.getenv("CLIENT_USER_ID", DEFAULT_CLIENT_USER_ID).strip()
    raise ValueError("Unsupported application role")
