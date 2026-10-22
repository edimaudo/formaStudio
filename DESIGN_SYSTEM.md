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

The brand editor includes persistent tagline and elevator-pitch fields alongside the project brief. Each field has a dedicated generation action, remains editable after generation, and is saved with the kit. Published kits display both fields when they are populated. Generated text is a draft, must be reviewed by the brand owner, and should not introduce claims unsupported by the brief.

## Workspace information architecture

- **Overview** is a summary of brands already created and their publication state. It does not include brand-creation forms.
- **Brand Kits** is the distinct management page for finding, creating, and editing kits.
- **Legal Kit** selects a brand, assesses its content against chosen frameworks, and stores one content-alignment report. Frameworks are shown as findings inside the report, not as separate workflow cards.


## Brand definition and component editors

The editor's primary navigation separates definition, messaging, components, story, cultural lens, and design review into tab panels. Typography uses a curated 50-family selector with recommended complementary body pairings and live font samples. Logo templates are selectable concept layouts whose previews inherit the current brand palette and headline family. Component navigation currently shows Colors, Typography, Logos, and Icons. Existing Visuals, Videos, and Resources blocks are preserved in serialized hidden state; 3D Models and Collaterals remain hidden legacy content.
