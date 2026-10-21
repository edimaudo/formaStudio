# Forma Studio accessibility review

**Target:** WCAG 2.2 Level AA. This is a source-level remediation record, not a claim of formal conformance or certification.

## Changes made in this revision

- Added a “Skip to main content” link that is fully visually clipped until keyboard focus, then becomes visible, with a focusable `<main>` target.
- Reworked the mobile workspace sidebar so a closed, off-screen sidebar is `inert` and hidden from assistive technology; the menu exposes its expanded state, moves focus into the drawer when opened, and closes on Escape.
- Made the public mobile menu expose `aria-expanded`, `aria-controls`, and Escape-to-close behavior.
- Improved dialog behavior: focus is moved into the Appearance dialog, the rest of the page is made inert, Tab is contained, Escape closes the dialog, and focus returns to the opener.
- Strengthened light/dark focus indicators and input borders; made placeholder text use the full muted-text color instead of a transparent version.
- Raised very small utility text to at least `0.75rem` (12 CSS pixels at the default root size) and allowed breadcrumbs to wrap rather than clip at narrow widths.
- Added reduced-motion behavior for scrolling and transitions.
- Reworked the “Clear thinking. Coherent design.” section to avoid an empty number column, list indentation, and unnecessary step numbering; heading and descriptions now use a responsive two-column layout that stacks cleanly on narrow screens.
- Hid the decorative landing-page brand-board artwork from screen readers because it is illustrative and its surrounding page text conveys the feature information.
- Added optional WebVTT caption upload and a `<track kind="captions">` on video blocks so a brand-kit owner can attach captions to prerecorded video. The owner remains responsible for providing accurate caption files.
- Removed requested redundant landing-page content, redundant navigation action, decorative card indices, and landing footer; also removed the “A living identity system” sign-in artwork label.

## Source checks

Automated tests check the requested landing copy, absence of removed content, main skip-link targets, presence of visible-focus rules, and contrast ratios for key theme text, focus, and field-border colors. Python compilation and JavaScript syntax checks should also be run before deployment.


## Brand and Legal Kit revision (2026-10-21)

- Brand Kits now uses a keyboard-operable top-level tab pattern for Existing and Create a brand kit. The two creation routes remain a nested tab pattern; inactive panels use the `hidden` attribute and are removed from the accessibility tree.
- Legal Kit now uses labelled native checkboxes for GDPR, ISO 27001, and SOC 2 Type II framework selection, a single action to analyze the selected brand, and a four-stage keyboard-operable radio workflow for each framework's evidence record. Evidence stages are Not started, Collecting evidence, Ready for review, and Reviewed.
- Gemini receives only the selected brand's kit material, only the selected frameworks, and a summary of existing evidence metadata. It is instructed not to determine compliance, certification, or audit readiness, and the frontend renders model output with `textContent`, not as HTML.
- Appearance navigation buttons no longer contain the decorative bullet marker.
- Automated contrast-token tests assert at least 4.5:1 for primary text tokens against the main light/dark surfaces and at least 3:1 for strong form-control boundary tokens against major surfaces.
- Additional rendered-page checks found no duplicate IDs, visible unnamed controls, visible unlabeled form controls, invalid `aria-controls` targets, or images missing `alt` across landing, login, overview, Brand Kits, editor, Legal Kit, and the shared brand kit routes.

Automated checks are useful but do not establish full WCAG 2.2 AA conformance. Keyboard interaction, 200% text resize/400% reflow, VoiceOver/NVDA behavior, live error announcements, and the deployed color combinations still need hands-on verification before making a conformance claim.

## Manual validation still required

Do not describe the application as WCAG-conformant until the deployed build is tested with keyboard-only interaction, at 200% text resizing and 400% zoom/reflow, with supported screen readers (for example VoiceOver and NVDA), and with an automated checker such as axe. Review each page and each state, including error and success messages, the Appearance dialog, the mobile sidebar, editable blocks, uploaded assets and video captions, Legal Kit access requests, and both light and dark themes. Verify actual keyboard behavior, caption timing/accuracy, and that video audio with meaningful visual-only information has equivalent description where needed. User-supplied brand colors and third-party assets also require content-specific accessibility review.

## Workspace database diagnostics

- Supabase REST failures now write a sanitized log entry with the HTTP status and provider error code, without logging keys or response bodies. The displayed error differentiates missing tables/schema, rejected keys, insufficient access, network failures, and upstream service failures.
- Client brand-kit queries include the client owner ID in the PostgREST query instead of fetching every kit with the privileged server key and filtering in Python.

## Additional browser checks (2026-10-21)

A Chromium browser run was performed against the rendered FastAPI test-client pages using the current local CSS and JavaScript. The following checks passed:

- Routes checked: landing, login, Overview, Brand Kits, Legal Kit with a selected brand, brand editor, public shared brand kit, and restricted Legal Kit share view; each returned HTTP 200 for the test account/data setup.
- Static markup scan across those responses: no duplicate IDs, visible inputs missing an accessible label, unnamed buttons/links/tabs, broken `aria-controls` targets, or images without `alt`; every tested page had a skip link with a matching `#main-content` target.
- Brand Kits top-level Existing/Create tabs switch correctly, keyboard arrow navigation updates selection, and the two creation-pathway tabs switch their panels.
- The Legal Kit showed the three framework checkboxes; selecting/deselecting a framework worked, and the evidence workflow radio choices were interactive.
- At a 320 CSS-pixel viewport, the landing page, Brand Kits, Legal Kit, and editor passed a document-level horizontal-overflow check.
- With the root font size forced to 200% at a 1280-pixel viewport as a text-enlargement stress test, the same pages had no document-level horizontal overflow. The editor's section tabs remain intentionally horizontally scrollable when they do not all fit in one row.
- The selected text and border tokens were recalculated from the current theme variables. The minimum text contrast across `ink`, `ink-soft`, `muted`, and `brand` against `bg`, `surface`, `surface-muted`, and `surface-raised` was 4.54:1 in light mode and 6.74:1 in dark mode. `line-strong` was at least 3.22:1 against the checked light surfaces and 4.03:1 against the checked dark surfaces.

The 200% root-font test is a useful stress test but is not identical to testing a browser's built-in text-only resizing or 400% browser zoom. These checks are not a formal WCAG audit. Automated tests do not evaluate meaningful alt-text quality, real screen-reader announcements, audio/video caption accuracy, every focus order and modal state, or content-specific contrast caused by user-supplied brand colors. Before making a full WCAG 2.2 AA conformance claim, manual keyboard testing and supported screen-reader testing (for example VoiceOver and NVDA) are still required, alongside automated scanning with a tool such as axe on the deployed app.

## Latest browser validation (2026-10-21)

Ran Chromium checks against the rendered test-client pages with the current source stylesheet and JavaScript. Results:

- All eight tested routes returned HTTP 200: landing, login, Overview, Brand Kits, Legal Kit with a selected brand, editor, public brand-kit page, and Legal Kit share page.
- No duplicate IDs, visible unlabeled input/select/textarea controls, visible unnamed interactive controls, missing `aria-controls` targets, images missing `alt`, or missing skip-link/main-content targets were found in those rendered responses.
- Brand Kits Existing/Create tabs worked by click; arrow-key navigation updated selected tab state; both inner creation pathways switched correctly.
- Legal Kit displayed three framework checkboxes; a checkbox could be selected/deselected; evidence-stage radio options could be changed.
- Appearance dialog opened with focus moved inside, was exposed as a modal, and Escape closed it and returned focus to the opener.
- At a 320 CSS-pixel viewport the landing page, Brand Kits, Legal Kit, and brand editor showed no document-level horizontal overflow. The closed mobile workspace sidebar was inert and hidden from accessibility, became available when the menu opened, and closed on Escape.
- With `html` root font size forced to 200% at 1280 CSS-pixel viewport, the same routes showed no document-level horizontal overflow. Editor section tabs use a horizontally scrollable tab strip when their labels do not fit.
- Visible keyboard focus on Appearance used a solid 3px outline in the tested light theme.
- Theme token ratios were recalculated: worst checked text-token ratio was 4.54:1 in light mode and 6.74:1 in dark mode; worst checked strong-boundary ratio was 3.22:1 in light mode and 4.03:1 in dark mode.

**These results support accessibility improvements; they are not a WCAG conformance certification.** The root-size stress test is not identical to the browser's built-in text-only resize or 400% zoom. No axe-core run or manual VoiceOver/NVDA session was performed in this pass. Full WCAG 2.2 AA verification still needs supported screen-reader testing, actual browser zoom/reflow checks, and a deployed-state scan of all important interaction states. User-supplied colors and media also require content-specific review.
