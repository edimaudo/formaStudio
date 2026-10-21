# Forma Studio accessibility review

**Target:** WCAG 2.2 Level AA. This is an implementation and test record, not a claim of full conformance or certification.

## Current interface measures

- Shared layout uses a skip-to-main-content link, a focusable main target, visible focus indicators, labelled controls, and a mobile navigation drawer with `aria-expanded`, Escape-to-close, and inert/hidden closed state.
- Appearance dialog moves focus into the dialog, contains Tab navigation, closes on Escape, and returns focus to the trigger.
- Light and dark themes define text, surface, border, and focus tokens. Very small utility text is avoided, and content/navigation is designed to wrap or use intentional horizontal scrolling instead of forcing document-level overflow.
- Brand Kits uses two full-width tab panels: **Existing Brand Kits** and **Create a Brand Kit**. The creation panel has a keyboard-operable nested tab set for a direct brief or Guided Brand Design.
- The editor keeps section tabs sticky, supports keyboard tab selection, includes labels for generated-copy fields, and supports optional WebVTT caption tracks for video blocks.
- Legal Kit uses native, labelled framework checkboxes; one saved content-alignment report; a single report-level review stage; a change-note field; and a timestamped history. It no longer represents each framework as a separate workflow card.
- Report findings from Gemini are rendered using DOM text properties rather than inserted as HTML. The analysis prompt is restricted to the selected brand's content and selected frameworks and must not declare legal compliance or certification.

## Checks run for this source revision

- Python compilation passed.
- JavaScript syntax validation passed.
- `PYTHONPATH=. pytest -q`: 66 tests passed. Tests cover rendered-page semantics, keyboard-operable tab state, login independence, brand-scoped analysis, report persistence in the local store, review-stage updates and timestamped history, schema/migration presence, sanitized workspace errors, and existing application workflows.
- ZIP integrity was verified before packaging.

Prior revisions tested theme-token contrast (lowest sampled normal-text contrast 4.54:1 in light mode and 6.74:1 in dark mode; lowest sampled strong-boundary contrast 3.22:1 light and 4.03:1 dark) and performed 320 CSS-pixel and 200% root-font-size layout stress checks. Those checks do not replace a fresh browser audit of this revision, including the changed Legal Kit report and history states.

## Manual validation still required

Do not describe the deployed application as WCAG-conformant until the deployed build is tested with keyboard-only interaction, actual browser zoom/reflow (including 400% zoom where applicable), a supported screen reader such as VoiceOver or NVDA, and an automated checker such as axe. Test success/error announcements, dialog and mobile drawer behavior, the Brand Kits nested tabs, review history/time announcements, upload controls, access-request flows, video caption accuracy, both themes, and user-supplied brand colors/assets. The local automated tests do not establish these behaviors in a deployed browser and do not certify WCAG conformance.
