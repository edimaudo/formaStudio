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
    assert "Build the brand your fans can recognize." in landing
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



def test_landing_page_matches_requested_copy_and_removes_redundant_elements() -> None:
    response = TestClient(app).get("/")
    assert response.status_code == 200
    html = response.text
    assert "Build the brand your fans can recognize." in html
    assert "IDENTITY / 01" not in html
    assert "Made for designers, agencies, and brand teams" not in html
    assert "From first thought" not in html
    assert "Less chasing files" not in html
    assert 'class="card-index"' not in html
    assert '<footer class="site-footer' not in html
    assert 'id="public-navigation"' in html
    assert 'aria-expanded="false" aria-controls="public-navigation"' in html
    # The header navigation should contain exactly one login/studio action.
    nav = re.search(r'<nav id="public-navigation".*?</nav>', html, re.S).group(0)
    assert nav.count('href="/login"') == 1
    assert "Skip to main content" in html
    assert 'id="main-content" tabindex="-1"' in html


def test_accessibility_baseline_has_contrast_tokens_and_skip_link_targets() -> None:
    from pathlib import Path
    templates = Path(__file__).parents[1] / "app" / "templates"
    css = (Path(__file__).parents[1] / "app" / "static" / "css" / "app.css").read_text()
    assert "--muted: #626d66" in css
    assert "--focus: #005fcc" in css
    assert "--focus: #ffd166" in css
    for template in templates.glob("*.html"):
        if template.name in {"base.html", "settings_modal.html"}:
            continue
        body = template.read_text()
        assert 'id="main-content" tabindex="-1"' in body, template.name


def test_accessibility_theme_tokens_meet_contrast_thresholds() -> None:
    from pathlib import Path
    css = (Path(__file__).parents[1] / "app" / "static" / "css" / "app.css").read_text()

    def luminance(hex_color: str) -> float:
        channels = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    def contrast(foreground: str, background: str) -> float:
        lighter, darker = sorted((luminance(foreground), luminance(background)), reverse=True)
        return (lighter + 0.05) / (darker + 0.05)

    assert contrast("#626d66", "#f5f4ee") >= 4.5  # muted body text on light page
    assert contrast("#626d66", "#fffefa") >= 4.5  # muted text on cards and fields
    assert contrast("#005fcc", "#f5f4ee") >= 3.0  # focus indicator on light surface
    assert contrast("#7f8b81", "#f5f4ee") >= 3.0  # light input/control borders
    assert contrast("#ffd166", "#151d19") >= 3.0  # focus indicator in dark theme
    assert contrast("#6c7b70", "#1e2923") >= 3.0  # dark input/control borders


def test_video_blocks_support_uploaded_webvtt_captions() -> None:
    from pathlib import Path
    root = Path(__file__).parents[1]
    editor = (root / "app" / "templates" / "kit_editor.html").read_text(encoding="utf-8")
    shared = (root / "app" / "templates" / "shared_kit.html").read_text(encoding="utf-8")
    main_source = (root / "app" / "main.py").read_text(encoding="utf-8")
    js = (root / "app" / "static" / "js" / "app.js").read_text(encoding="utf-8")
    assert 'data-block-caption-url' in editor
    assert 'data-caption-file' in editor
    assert 'data-upload-captions' in editor
    assert '<track kind="captions"' in shared
    assert '".vtt": "text/vtt; charset=utf-8"' in main_source
    assert 'caption_url: block.querySelector' in js



def test_shared_video_includes_webvtt_track_when_configured() -> None:
    from copy import deepcopy

    kit = store.get_kit_by_id("starter-kit-001")
    assert kit is not None
    original_blocks = deepcopy(kit["blocks"])
    try:
        blocks = deepcopy(original_blocks)
        blocks.append({
            "id": "wcag-caption-test",
            "type": "Videos",
            "title": "Accessible product film",
            "content": "A film with an accompanying caption track.",
            "asset_url": "/assets/starter-kit-001/product-film.mp4",
            "caption_url": "/assets/starter-kit-001/product-film.en.vtt",
        })
        store.update_kit("starter-kit-001", {"blocks": blocks})
        response = TestClient(app).get("/b/fieldnotes-coffee")
        assert response.status_code == 200
        assert '<track kind="captions" src="/assets/starter-kit-001/product-film.en.vtt?inline=1" srclang="en" label="English captions" default>' in response.text
    finally:
        store.update_kit("starter-kit-001", {"blocks": original_blocks})

def test_generated_copy_textarea_has_an_accessible_label() -> None:
    from pathlib import Path
    editor = (Path(__file__).parents[1] / "app" / "templates" / "kit_editor.html").read_text(encoding="utf-8")
    assert '<label class="sr-only" for="copy-result">Generated copy</label>' in editor
    assert '<textarea id="copy-result" data-copy-result' in editor

def test_approved_legal_request_can_reverify_without_losing_approval() -> None:
    if store.supabase_enabled:
        return  # This focused unit test exercises the in-memory data layer only.
    isolated = DataStore()
    entry = next(row for row in isolated.legal_entries if row["standard"] == "GDPR" and row["owner_id"] == isolated.users[0]["id"])
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


def test_app_login_does_not_call_supabase_auth_or_query_users_table(monkeypatch):
    from app import main as main_module

    # Simulate Supabase being configured for workspace persistence. Authentication itself
    # must use only the app-configured account list; no database/Auth request is allowed.
    monkeypatch.setattr(main_module, "SUPABASE_URL", "https://project-ref.supabase.co")
    monkeypatch.setattr(main_module, "SUPABASE_API_KEY", "sb_secret_unit-test")
    monkeypatch.setattr(main_module, "SUPABASE_AUTH_KEY", "")

    def fail_request(*args, **kwargs):
        raise AssertionError("App sign-in must not call Supabase or query app_users")

    monkeypatch.setattr(main_module.httpx, "post", fail_request)
    monkeypatch.setattr(main_module.store, "_request", fail_request)

    client = TestClient(app)
    page = client.get("/login")
    token = re.search(r'name="csrf_token" value="([^"]+)', page.text).group(1)
    response = client.post(
        "/login",
        data={"csrf_token": token, "username": "client", "password": "FormaClient!2026", "next": "/app"},
        follow_redirects=False,
    )
    assert response.status_code == 303
    assert response.headers["location"] == "/app"


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


def test_builtin_application_credentials_work_in_production_without_login_env_vars(monkeypatch):
    from app import main as main_module

    monkeypatch.setattr(main_module, "APP_ENV", "production")
    for username, password, role in [
        ("studioadmin", "FormaAdmin!2026", "admin"),
        ("client", "FormaClient!2026", "client"),
    ]:
        client = TestClient(app)
        page = client.get("/login")
        token = re.search(r'name="csrf_token" value="([^"]+)', page.text).group(1)
        response = client.post(
            "/login",
            data={"csrf_token": token, "username": username, "password": password, "next": "/app"},
            follow_redirects=False,
        )
        assert response.status_code == 303
        assert response.headers["location"] == "/app"
        assert main_module.store.get_user(username)["role"] == role
