# Forma Studio design system

Forma Studio uses one shared visual system across the public landing page, authenticated workspace, brand-kit editor, published kit, and Legal Kit. The aim is a creative-studio product with a clear hierarchy, not a generic chat interface. The system follows the design-system discipline described in the [Marvel Style Guide introduction](https://marvelapp.com/styleguide/overview/introduction): consistent foundations and repeatable interface patterns across pages. The implementation does not copy proprietary Marvel assets or tokens.

## Foundations

- **Application type:** Inter for all application UI, including headings, navigation, forms, controls, metadata, and long-form reading.
- **Brand typography:** fonts selected in Brand Components → Typography are confined to typography specimen previews; they do not change the surrounding Forma Studio interface.
- **Color:** warm mineral paper and off-white surfaces; deep forest green with white text for primary actions in both themes; muted ink for text; apricot for occasional warmth. The dark theme uses slate surfaces and a lavender-blue accent for links and brand emphasis; success and warning colors retain status meaning.
- **Spacing:** rem-based spacing with responsive `clamp()` sizing, so layout and components scale along with the selected text size.
- **Shapes:** restrained corner radii and thin borders; no decorative eyebrow labels above headings.
- **Buttons:** primary actions use one dark-green fill and white text in both themes; secondary actions use a surface fill and strong border; destructive actions use a restrained danger outline; quiet actions are text-first. The visual hierarchy is based on action role, not page-specific one-off styling.
- **Components:** shared buttons, cards, form controls, status treatments, page headers, navigation, and brand-kit content blocks.

## Semantic tokens

| Token | Purpose |
|---|---|
| `--bg` | Page background |
| `--surface` / `--surface-muted` / `--surface-raised` | Layered surfaces |
| `--ink` / `--ink-soft` / `--muted` | Text hierarchy |
| `--line` / `--line-strong` | Borders and separators |
| `--brand` / `--brand-hover` / `--brand-soft` | Links, selected states, and brand emphasis |
| `--button-primary-bg` / `--button-primary-hover` / `--button-primary-text` | Theme-independent primary action style |
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


## Application typography

All Forma Studio application UI uses **Inter**, including headings. Playfair Display remains available as one option in the brand typography specimen only; brand font selections must not change the application navigation, forms, headings, controls, or other UI.
