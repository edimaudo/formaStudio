# Forma Studio accessibility review

**Target:** WCAG 2.2 Level AA. This is an implementation and test record, not a claim of full conformance or certification.

## Current interface measures

- Shared layout uses a skip-to-main-content link, a focusable main target, visible focus indicators, labelled controls, and a mobile navigation drawer with `aria-expanded`, Escape-to-close, and inert/hidden closed state.
- Appearance dialog moves focus into the dialog, contains Tab navigation, closes on Escape, and returns focus to the trigger.
- Light and dark themes define text, surface, border, and focus tokens. Very small utility text is avoided, and content/navigation is designed to wrap or use intentional horizontal scrolling instead of forcing document-level overflow.
- Brand Kits uses two full-width tab panels: **Existing Brand Kits** and **Create a Brand Kit**. The creation panel has a keyboard-operable nested tab set for a direct brief or Guided Brand Design.
- The editor keeps main and Brand Messaging tabs sticky, supports keyboard tab selection, saves before tab changes, and labels generated-draft controls. Optional WebVTT caption tracks remain available for preserved video-block data.
- Legal Kit is available beside Cultural Lens in the brand editor. It uses native, labelled framework checkboxes and scope dropdowns to generate one saved alignment report based only on tagline, elevator pitch, and brand story. At least one framework must be selected. The content review is not a legal opinion, security audit, or certification.
- Report findings from Gemini are rendered using DOM text properties rather than inserted as HTML. The analysis prompt is restricted to the selected brand's content and selected frameworks and must not declare legal compliance or certification.

## Checks run for this source revision

- Python compilation passed.
- JavaScript syntax validation passed.
- `PYTHONPATH=. pytest -q`: 83 tests passed. Tests cover rendered-page semantics, tab navigation and autosave wiring, login independence, brand-scoped messaging analysis, country/region validation and persistence, report persistence, schema/migration presence, sanitized workspace errors, and existing application workflows.
- A Chromium UI smoke check exercised main and nested tabs, mocked save requests, story reframing output, Legal Kit checkbox gating, report rendering, and a 390-pixel viewport. External browser font loading was not available in this isolated check.
- ZIP integrity was verified before packaging.

Prior revisions tested theme-token contrast (lowest sampled normal-text contrast 4.54:1 in light mode and 6.74:1 in dark mode; lowest sampled strong-boundary contrast 3.22:1 light and 4.03:1 dark) and performed 320 CSS-pixel and 200% root-font-size layout stress checks. Those checks do not replace a fresh browser audit of this revision.

## Manual validation still required

Do not describe the deployed application as WCAG-conformant until the deployed build is tested with keyboard-only interaction, actual browser zoom/reflow (including 400% zoom where applicable), a supported screen reader such as VoiceOver or NVDA, and an automated checker such as axe. Test success/error announcements, dialog and mobile drawer behavior, the Brand Kits nested tabs, upload controls, access-request flows, video caption accuracy, both themes, and user-supplied brand colors/assets. The local automated tests do not establish these behaviors in a deployed browser and do not certify WCAG conformance.

## Latest brand editor controls

The current brand editor exposes six primary tab panels: Brand Definition, Brand Messaging, Brand Components, Cultural Lens, Legal Kit, and Design Review. Only the selected top-level panel is displayed, and the active tab can be opened by a URL fragment. Brand Messaging has a second, keyboard-operable sticky tablist for Tagline, Elevator Pitch, and Brand Story. The component tab list exposes Colors and Typography; hidden Logos, Icons, Visuals, Videos, Resources, 3D Models, and Collaterals data is preserved on save.

Typography controls use explicit labels for the 50-family headline/body/accent font selectors, a suggested complementary body pairing, and visible live sample previews. Cultural Lens includes labelled country and state/province selectors for Canada and the USA, and its selected market is saved with the kit. The analysis request includes the finalized tagline, elevator pitch, and Brand Story.

Automated regression checks currently pass for these controls. This source-level review is not a formal WCAG 2.2 AA certification: manual testing with keyboard-only operation, screen readers, real browser zoom/reflow, and contrast evaluation on user-selected logo colors is still required.
