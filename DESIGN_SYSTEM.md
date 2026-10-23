# Forma Studio design system

Forma Studio uses one shared visual system across the public landing page, authenticated workspace, brand-kit editor, published kit, and Legal Kit. The aim is a creative-studio product with a clear hierarchy, not a generic chat interface. The system follows the design-system discipline described in the [Marvel Style Guide introduction](https://marvelapp.com/styleguide/overview/introduction): consistent foundations and repeatable interface patterns across pages. The implementation does not copy proprietary Marvel assets or tokens.

## Foundations

- **Display type:** a system-available editorial serif stack for headings and brand moments.
- **Interface type:** a sans-serif stack for navigation, forms, metadata, and long-form reading.
- **Color:** warm mineral paper and off-white surfaces; deep forest green for primary action; muted ink for text; apricot for occasional warmth. The dark theme uses slate surfaces and a lavender-blue accent rather than green; success and warning colors retain status meaning.
- **Spacing:** rem-based spacing with responsive `clamp()` sizing, so layout and components scale along with the selected text size.
- **Shapes:** restrained corner radii and thin borders; no decorative eyebrow labels above headings.
- **Components:** shared buttons, cards, form controls, status treatments, page headers, navigation, and brand-kit content blocks.

## Semantic tokens

| Token | Purpose |
|---|---|
| `--bg` | Page background |
| `--surface` / `--surface-muted` / `--surface-raised` | Layered surfaces |
| `--ink` / `--ink-soft` / `--muted` | Text hierarchy |
| `--line` / `--line-strong` | Borders and separators |
| `--brand` / `--brand-hover` / `--brand-soft` | Primary action and brand emphasis |
| `--danger` / `--danger-bg` | Errors and destructive actions |
| `--success` / `--success-bg` | Confirmed states |
| `--scale` | Global interface scale |

The canonical values and dark-mode overrides live in `app/static/css/app.css`; avoid hard-coding new colors or one-off button styles in templates.

## Interaction and accessibility

- **Appearance:** Light and Dark themes, plus Small (90%), Medium (100%, default), and Large (110%) scaling. Preferences are stored in the browser.
- **Keyboard:** visible focus styling, native form controls, labels, and keyboard-accessible controls. Dialog behavior includes focus management.
- **Motion:** respects `prefers-reduced-motion`.
- **Responsive behavior:** desktop navigation and editor layouts collapse at smaller breakpoints; controls remain usable on narrow screens.
- **Status communication:** state changes are paired with readable text, not conveyed by color alone; asynchronous feedback uses status/live regions.

These are accessibility-minded implementation choices, not a claim of formal WCAG conformance. Conduct manual keyboard, zoom, screen-reader, contrast, and automated accessibility testing before a production compliance statement.


## Core brand messaging

Brand Messaging is one primary editor tab with three sticky subtabs: Tagline, Elevator Pitch, and Brand Story. Tagline and Elevator Pitch each support writing manually or generating a draft from a description. The generated draft stays separate until explicitly applied. Brand Story is authored by the user and can be reframed for cohesion; the original is preserved until the user applies the revision. Tab changes trigger a save before navigation. Generated text must be reviewed by the brand owner and should not introduce claims unsupported by the brief.

## Workspace information architecture

- **Overview** is a summary of brands already created and their publication state. It does not include brand-creation forms.
- **Brand Kits** is the distinct management page for finding, creating, and editing kits.
- **Legal Kit** sits beside Cultural Lens in the brand editor. It assesses only the finalized tagline, elevator pitch, and Brand Story against selected GDPR, ISO 27001, and SOC 2 Type II messaging themes and stores one alignment report. It is not an operational audit or certification. The existing cross-brand Legal Kit page remains available outside the editor.


## Brand definition and component editors

The editor's six primary tabs are Brand Definition, Brand Messaging, Brand Components, Cultural Lens, Legal Kit, and Design Review. Brand Definition omits the short-description field and uses dropdowns for Category and Primary Audience. Brand Components shows Colors and Typography. Typography uses a curated 50-family selector with recommended complementary body pairings and live font samples. The app preserves older hidden component data when the kit is saved. Cultural Lens analyzes the finalized messaging against a selected country and state/province; the selected market is saved with the kit. Design Review aggregates the final definition, messaging, palette, and typography.
