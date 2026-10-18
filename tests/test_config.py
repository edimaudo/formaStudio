import base64
import json

import pytest

from app.config import validate_base_url, validate_supabase_auth_settings, validate_supabase_settings


def _fake_legacy_jwt(role: str) -> str:
    header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({"role": role}).encode()).decode().rstrip("=")
    return f"{header}.{payload}.signature"


def test_supabase_accepts_modern_server_secret_and_normalizes_url():
    url, key = validate_supabase_settings(
        "https://project-ref.supabase.co/", "sb_secret_sample-value", "", "production"
    )
    assert url == "https://project-ref.supabase.co"
    assert key == "sb_secret_sample-value"


def test_supabase_accepts_legacy_service_role_only():
    legacy = _fake_legacy_jwt("service_role")
    url, key = validate_supabase_settings(
        "https://project-ref.supabase.co", "", legacy, "production"
    )
    assert url == "https://project-ref.supabase.co"
    assert key == legacy


def test_supabase_rejects_partial_config_in_development_too():
    with pytest.raises(RuntimeError, match="configuration is incomplete"):
        validate_supabase_settings("https://project-ref.supabase.co", "", "", "development")
    with pytest.raises(RuntimeError, match="configuration is incomplete"):
        validate_supabase_settings("", "sb_secret_sample-value", "", "development")


def test_supabase_rejects_both_server_key_variables():
    with pytest.raises(RuntimeError, match="Set only one Supabase server key"):
        validate_supabase_settings(
            "https://project-ref.supabase.co", "sb_secret_sample-value", _fake_legacy_jwt("service_role"), "development"
        )


def test_supabase_rejects_publishable_key_and_anon_jwt_as_server_key():
    with pytest.raises(RuntimeError, match="publishable key"):
        validate_supabase_settings(
            "https://project-ref.supabase.co", "sb_publishable_sample-value", "", "development"
        )
    with pytest.raises(RuntimeError, match="anon JWT"):
        validate_supabase_settings(
            "https://project-ref.supabase.co", _fake_legacy_jwt("anon"), "", "development"
        )
    with pytest.raises(RuntimeError, match="not the anon/publishable key"):
        validate_supabase_settings(
            "https://project-ref.supabase.co", "", _fake_legacy_jwt("anon"), "development"
        )


def test_supabase_rejects_wrong_project_url_shape():
    with pytest.raises(RuntimeError, match="Do not append /rest/v1"):
        validate_supabase_settings(
            "https://project-ref.supabase.co/rest/v1", "sb_secret_sample-value", "", "development"
        )


def test_production_requires_supabase_server_configuration():
    with pytest.raises(RuntimeError, match="required in production"):
        validate_supabase_settings("", "", "", "production")


def test_supabase_auth_accepts_modern_publishable_key():
    assert validate_supabase_auth_settings(
        "https://project-ref.supabase.co", "sb_publishable_sample-value", "", "production"
    ) == "sb_publishable_sample-value"


def test_supabase_auth_accepts_legacy_anon_jwt():
    anon = _fake_legacy_jwt("anon")
    assert validate_supabase_auth_settings("https://project-ref.supabase.co", "", anon, "production") == anon


def test_supabase_auth_requires_key_with_project_and_rejects_conflicts():
    with pytest.raises(RuntimeError, match="Auth configuration is incomplete"):
        validate_supabase_auth_settings("https://project-ref.supabase.co", "", "", "development")
    with pytest.raises(RuntimeError, match="Set only one Supabase Auth key"):
        validate_supabase_auth_settings("https://project-ref.supabase.co", "sb_publishable_x", _fake_legacy_jwt("anon"), "development")
    with pytest.raises(RuntimeError, match="server Secret key"):
        validate_supabase_auth_settings("https://project-ref.supabase.co", "sb_secret_x", "", "development")


def test_supabase_auth_rejects_service_role_in_anon_key():
    with pytest.raises(RuntimeError, match="role claim anon"):
        validate_supabase_auth_settings("https://project-ref.supabase.co", "", _fake_legacy_jwt("service_role"), "development")


def test_base_url_rejects_paths_and_plain_http_for_external_hosts():
    with pytest.raises(RuntimeError, match="base URL"):
        validate_base_url("QLOO_BASE_URL", "https://api.example.com/v2")
    with pytest.raises(RuntimeError, match="HTTPS"):
        validate_base_url("QLOO_BASE_URL", "http://api.example.com")
    assert validate_base_url("SUPABASE_URL", "http://localhost:54321", allow_local_http=True) == "http://localhost:54321"
