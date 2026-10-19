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

## Manual validation still required

Do not describe the application as WCAG-conformant until the deployed build is tested with keyboard-only interaction, at 200% text resizing and 400% zoom/reflow, with supported screen readers (for example VoiceOver and NVDA), and with an automated checker such as axe. Review each page and each state, including error and success messages, the Appearance dialog, the mobile sidebar, editable blocks, uploaded assets and video captions, Legal Kit access requests, and both light and dark themes. Verify actual keyboard behavior, caption timing/accuracy, and that video audio with meaningful visual-only information has equivalent description where needed. User-supplied brand colors and third-party assets also require content-specific accessibility review.

## Workspace database diagnostics

- Supabase REST failures now write a sanitized log entry with the HTTP status and provider error code, without logging keys or response bodies. The displayed error differentiates missing tables/schema, rejected keys, insufficient access, network failures, and upstream service failures.
- Client brand-kit queries include the client owner ID in the PostgREST query instead of fetching every kit with the privileged server key and filtering in Python.
