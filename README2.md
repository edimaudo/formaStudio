# Forma Studio

Forma Studio is a brand design workspace for designers, agencies, and in-house brand teams. It brings brand strategy, assisted copywriting, cultural research, and Legal insights into one workspace.

## AI configuration

- `GEMINI_API_KEY` powers brand stories, taglines, elevator pitches, and other brand-copy requests.
- `GEMINI_MODEL` defaults to `gemini-3.6-flash`; use a model supported by your key.
- `QLOO_API_KEY` enables cultural context. `QLOO_BASE_URL` defaults to `https://hackathon.api.qloo.com`.

If Qloo is not configured or a request fails, ordinary editing and copywriting remain available.

## Local setup

Use Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
uvicorn app.main:app --reload
```
