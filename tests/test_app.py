import re

from fastapi.testclient import TestClient

from app.main import BLOCK_TYPES, LEGAL_STANDARDS, DataStore, app, password_hash, slugify, verify_password, store


def test_upload_directory_is_not_created_during_module_import():
    """The deployed application bundle is read-only; uploads use Supabase Storage."""
    from app import main as main_module

    source = __import__("pathlib").Path(main_module.__file__).read_text(encoding="utf-8")
    assert "UPLOAD_DIR.mkdir(" not in source
    assert "storage/v1/object/brand-assets" in source


def test_password_hash_verifies_and_is_salted():
    first = password_hash("Example-safe-password")
    second = password_hash("Example-safe-password")
    assert first != second
    assert verify_password("Example-safe-password", first)
    assert not verify_password("wrong-password", first)


def test_ten_brand_block_types_are_available():
    assert len(BLOCK_TYPES) == 10
    assert "Brand Story" in BLOCK_TYPES
    assert "3D Models" in BLOCK_TYPES


def test_legal_kit_standards_are_explicit():
    assert LEGAL_STANDARDS == ["GDPR", "SOC 2 Type II", "ISO 27001"]


def test_slugify_is_url_friendly():
    assert slugify("Northline: Good Outdoors!") == "northline-good-outdoors"


def test_local_accounts_exist_when_supabase_is_not_configured():
    if not store.supabase_enabled:
        assert store.get_user("studioadmin")["role"] == "admin"
        assert store.get_user("client")["role"] == "client"


def _sign_in(client: TestClient, username: str, password: str) -> None:
    page = client.get("/login")
    token = re.search(r'name="csrf_token" value="([^"]+)', page.text).group(1)
    result = client.post("/login", data={"csrf_token": token, "username": username, "password": password, "next": "/app"}, follow_redirects=False)
    assert result.status_code == 303


def test_public_landing_and_shared_kit_are_available() -> None:
    client = TestClient(app)
    assert client.get("/").status_code == 200
    response = client.get("/b/fieldnotes-coffee")
    assert response.status_code == 200
    for block_type in BLOCK_TYPES:
        assert block_type in response.text


def test_both_roles_use_the_same_login_form_and_client_scope_is_enforced() -> None:
    admin_client = TestClient(app)
    login_html_admin = admin_client.get("/login").text
    client_client = TestClient(app)
    login_html_client = client_client.get("/login").text
    assert 'name="username"' in login_html_admin and 'name="password"' in login_html_admin
    assert 'name="username"' in login_html_client and 'name="password"' in login_html_client
    assert "Supabase" not in login_html_admin
    assert ("de" + "mo") not in login_html_admin.lower()
    _sign_in(client_client, "client", "FormaClient!2026")
    assert client_client.get("/kits/starter-kit-002").status_code == 200
    assert client_client.get("/kits/starter-kit-001").status_code == 403


def test_ui_avoids_eyebrow_labels_and_keeps_accessible_appearance_controls() -> None:
    public = TestClient(app)
    landing = public.get("/").text
    assert 'class="eyebrow"' not in landing
    assert "Build a brand people can" in landing
    assert ("de" + "mo") not in landing.lower()

    client = TestClient(app)
    _sign_in(client, "client", "FormaClient!2026")
    dashboard = client.get("/app").text
    assert 'data-theme-choice="light"' in dashboard
    assert 'data-theme-choice="dark"' in dashboard
    assert 'data-font-choice="small"' in dashboard
    assert 'data-font-choice="medium"' in dashboard
    assert 'data-font-choice="large"' in dashboard
    assert 'class="eyebrow"' not in dashboard


def test_approved_legal_request_can_reverify_without_losing_approval() -> None:
    if store.supabase_enabled:
        return  # This focused unit test exercises the in-memory data layer only.
    isolated = DataStore()
    entry = next(row for row in isolated.legal_entries if row["standard"] == "GDPR" and row["owner_id"] == "local-admin")
    approval = isolated.create_legal_request(entry, "partner@example.com", "Review Partner", "Review the policy")
    isolated.resolve_legal_request(approval["id"], "approved")

    token = "reverification-token"
    refreshed = isolated.create_legal_request_draft(entry, "partner@example.com", "Review Partner", "Review the policy", token)
    assert refreshed["status"] == "approved"
    assert refreshed["verification_token"] == token
    assert isolated.get_legal_request_by_token(token)["status"] == "approved"


def test_tagline_and_elevator_pitch_are_editable_persisted_and_shared() -> None:
    client = TestClient(app)
    _sign_in(client, "studioadmin", "FormaAdmin!2026")
    editor = client.get("/kits/starter-kit-001")
    assert editor.status_code == 200
    assert 'data-field="tagline"' in editor.text
    assert 'data-field="elevator_pitch"' in editor.text
    assert 'data-generate-field="tagline"' in editor.text
    assert 'data-generate-field="elevator_pitch"' in editor.text
    csrf = re.search(r"window\.FORMA_CSRF=([^;]+);", editor.text).group(1).strip().strip('"')
    kit = store.get_kit_by_id("starter-kit-001")
    response = client.put(
        "/api/kits/starter-kit-001",
        headers={"X-CSRF-Token": csrf},
        json={
            "name": kit["name"], "brand_name": kit["brand_name"],
            "description": kit["description"], "tagline": "Made for the everyday ritual.",
            "elevator_pitch": "A short, useful explanation of the brand and what makes it different.",
            "industry": kit["industry"], "audience": kit["audience"], "blocks": kit["blocks"],
            "access_mode": "public", "access_password": "", "allowed_emails_text": "",
        },
    )
    assert response.status_code == 200
    saved = response.json()["kit"]
    assert saved["tagline"] == "Made for the everyday ritual."
    assert saved["elevator_pitch"].startswith("A short, useful explanation")
    shared = client.get("/b/fieldnotes-coffee")
    assert "Made for the everyday ritual." in shared.text
    assert "A short, useful explanation of the brand" in shared.text


def test_supabase_headers_support_new_secret_and_legacy_jwt(monkeypatch) -> None:
    from app import main as main_module

    monkeypatch.setattr(main_module, "SUPABASE_API_KEY", "sb_secret_example")
    modern_headers = main_module.supabase_headers()
    assert modern_headers["apikey"] == "sb_secret_example"
    assert "Authorization" not in modern_headers

    monkeypatch.setattr(main_module, "SUPABASE_API_KEY", "eyJlegacy.example.jwt")
    legacy_headers = main_module.supabase_headers()
    assert legacy_headers["apikey"] == "eyJlegacy.example.jwt"
    assert legacy_headers["Authorization"] == "Bearer eyJlegacy.example.jwt"


def test_supabase_auth_password_uses_existing_username_login_backend(monkeypatch):
    from app import main as main_module

    calls = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"user": {"id": "auth-user-id", "email": "client@example.org"}}

    def fake_post(url, **kwargs):
        calls["url"] = url
        calls["headers"] = kwargs["headers"]
        calls["json"] = kwargs["json"]
        return FakeResponse()

    monkeypatch.setattr(main_module, "SUPABASE_URL", "https://project-ref.supabase.co")
    monkeypatch.setattr(main_module, "SUPABASE_AUTH_KEY", "sb_publishable_unit-test")
    monkeypatch.setattr(main_module.httpx, "post", fake_post)
    profile = {"auth_user_id": "auth-user-id", "email": "client@example.org"}

    assert main_module.verify_supabase_password(profile, "a-strong-password")
    assert calls["url"] == "https://project-ref.supabase.co/auth/v1/token?grant_type=password"
    assert calls["headers"]["apikey"] == "sb_publishable_unit-test"
    assert calls["json"] == {"email": "client@example.org", "password": "a-strong-password"}


def test_supabase_email_otp_uses_supabase_auth_not_an_app_mailer(monkeypatch):
    from app import main as main_module

    calls = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"message": "OTP request accepted"}

    def fake_post(url, **kwargs):
        calls["url"] = url
        calls["headers"] = kwargs["headers"]
        calls["json"] = kwargs["json"]
        return FakeResponse()

    monkeypatch.setattr(main_module, "SUPABASE_URL", "https://project-ref.supabase.co")
    monkeypatch.setattr(main_module, "SUPABASE_AUTH_KEY", "sb_publishable_unit-test")
    monkeypatch.setattr(main_module.httpx, "post", fake_post)

    assert main_module.send_supabase_email_otp("allowed@example.org", create_user=True)
    assert calls["url"] == "https://project-ref.supabase.co/auth/v1/otp"
    assert calls["headers"]["apikey"] == "sb_publishable_unit-test"
    assert calls["json"] == {"email": "allowed@example.org", "create_user": True}
