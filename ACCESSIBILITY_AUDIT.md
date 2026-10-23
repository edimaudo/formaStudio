# Forma Studio accessibility review

**Target:** WCAG 2.2 Level AA. This is an implementation and verification record, not a claim of full conformance or certification.

## Implemented measures

- Application interface typography uses Inter for headings, navigation, forms, controls, and body text. Fonts selected in Brand Components → Typography are confined to explicit brand-typography specimens and the corresponding specimen samples in Design Review.
- Light and Dark themes retain readable foreground/surface tokens. Primary action buttons use the same dark-green background and white foreground in both themes; secondary, quiet, and destructive actions have defined variants.
- The shared layout includes a skip-to-main-content link, visible keyboard focus, labelled controls, a mobile navigation toggle with `aria-expanded`, Escape handling, and a focus-managed appearance dialog.
- Main editor tabs and Brand Messaging tabs support keyboard selection. The editor saves before tab changes. Legal Kit framework controls are labelled and use native checkboxes.
- Common navigation and icon buttons have improved target sizes. Focus indicators cover common custom controls, forced-colour styles are provided, and reduced-motion preferences are respected.
- Status changes use readable text and live regions. Copy Link success/failure is announced by a polite status region.
- Design Review combines brand definition, populated messaging, palette, typography, cultural review, and Legal Kit report content. Empty content sections are omitted. The “Who can view this kit?” access controls are temporarily hidden, while their in-DOM values are retained for save compatibility; the share URL and Copy link action remain visible.

## Checks run for this source revision

- `PYTHONPATH=. pytest -q`: **94 tests passed**.
- Python compilation passed (`python -m compileall -q app`).
- JavaScript syntax validation passed (`node --check app/static/js/app.js`).
- Sampled token contrast calculations passed WCAG AA text thresholds for the current common pairs: primary-button white text on the primary and hover fills is **7.87:1** and **10.39:1**; light-theme muted text on the surface is **5.34:1**; dark-theme muted text on the surface is **7.71:1**. Sampled strong border contrasts were **3.52:1** (light) and **4.03:1** (dark). These are token samples, not a complete contrast audit of every rendered element.
- A Chromium smoke check of the server-rendered editor and bundled CSS/JavaScript (with API responses mocked) confirmed the computed Inter body and heading stacks, consistent primary-button fill across themes, hidden access controls, no arrow on Copy link, working Design Review tab activation, visible focus outlines, and no root horizontal overflow at a 390 px viewport. External font downloads were not verified offline, and this smoke check does not replace real browser zoom/reflow, keyboard-only, screen-reader, or automated axe testing.

## Manual validation still required

Do not describe the deployed application as WCAG-conformant until the deployed build has been assessed with keyboard-only interaction, supported screen readers (such as VoiceOver or NVDA), browser zoom and reflow (including 400% zoom where applicable), and a current automated accessibility checker such as axe. Test form errors and success announcements, the appearance dialog, mobile navigation, tabsets, upload controls, both themes, and user-provided brand colours/assets. User-provided palette colours and uploaded assets can introduce contrast and alternative-text issues that cannot be guaranteed by the shared design tokens. Automated unit tests and token contrast checks do not replace these checks.

## Editor and brand-content behavior

The editor has six primary panels: Brand Definition, Brand Messaging, Brand Components, Cultural Lens, Legal Kit, and Design Review. Brand Messaging has sticky tabs for Tagline, Elevator Pitch, and Brand Story. Brand Components exposes Colors and Typography; hidden legacy component data is preserved when saving. Design Review shows populated content and hides empty sections. The access-mode selector has been hidden from this panel temporarily; the copy/share link remains available.

Legal Kit assesses finalized tagline, elevator pitch, and Brand Story wording against selected GDPR, ISO 27001, and SOC 2 Type II themes. It is a messaging alignment review, not a legal opinion, operational audit, or certification. Reports must not assert legal compliance or certification.
