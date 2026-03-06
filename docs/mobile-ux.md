# Mobile UX — Audit & Retrofit Plan

## A. Page/Component Structure

### Top-level pages

| Page | Route | Components used |
|------|-------|-----------------|
| Home | `/` | `loadMarkdown`, inline JSX (hero, hero-level-card, grid, card) |
| AI Me | `/ai` | Inline JSX (hero, chat-shell, chat-transcript, chat-input-row, chat-suggestions) |
| Services | `/services` | `loadMarkdown`, `ServicesAccordion`, `ServicesLevelsVisual` |
| Projects | `/projects` | `loadMarkdown`, `loadMarkdownCollection`, `ProjectsFilters`, inline accordion (`projects-details`) |
| Partners | `/partners` | `PartnersAccordion` (hardcoded `PARTNERS` data) |
| Contact | `/contact` | Inline JSX (hero, contact-include-list, contact-email-cta) |
| About | `/about` | Inline JSX (section, card, list) |
| Project detail | `/projects/[slug]` | `loadMarkdown`, inline JSX (hero, card, markdown) |
| Privacy | `/privacy` | Inline JSX (section, card, list) |
| Security | `/security` | Inline JSX (section, card, list) |
| Timeline | `/timeline` | Inline JSX (section, card, list) |
| Sign-in | `/sign-in` | Inline JSX (section, card, list) |

### Shared components

- **Layout (root):** `layout.tsx` — header, main, footer, `AccordionCloseFix`, `FloatingAskAiMe`
- **AccordionCloseFix** — global click handler for smooth accordion close (no UI)
- **FloatingAskAiMe** — floating CTA button (hidden on `/ai`)
- **ServicesAccordion** — Services page only
- **ServicesLevelsVisual** — Services page only (Level 1/2/3 pills)
- **PartnersAccordion** — Partners page only
- **ProjectsFilters** — Projects page only

### Page-specific components

- Home: hero-level accordion (homepage levels), homepage-conversion-grid
- AI Me: chat UI (transcript, input, suggestions, clear modal)
- Services: ServicesAccordion, ServicesLevelsVisual
- Projects: ProjectsFilters, projects-details accordion
- Partners: PartnersAccordion (PartnerCard)
- Contact: contact-email-cta, contact-include-list

---

## B. Layout Wrappers

### Main layout

| Element | File | Definition |
|---------|------|------------|
| **Container** | `globals.css` | `.container` — `max-width: 980px`, `margin: 0 auto`, `padding: 0 24px` |
| **Main** | `layout.tsx` | `<main className="container">{children}</main>` |
| **Header** | `layout.tsx` | `.site-header` — sticky, border-bottom, backdrop-filter |
| **Footer** | `layout.tsx` | `.footer` — border-top, `padding: 32px 0`, `margin-top: 48px` |

### Section spacing

| Class | Definition |
|-------|------------|
| `.section` | `padding: 36px 0` |
| `.hero` | `padding: 72px 0 48px` |
| `.hero` (AI Me) | `.ai-me-page .hero` — `padding-bottom: 24px` |
| `.hero` (Services) | `.services-page .hero` — `padding-bottom: 24px` |

### Width constraints

- `.container` — `max-width: 980px`, `padding: 0 24px`
- `.hero p` — `max-width: 640px`
- `.hero .hero-summary` — `max-width: 800px`
- `.hero-levels-intro` — `max-width: 640px`
- `.contact-include-list` — `max-width: 640px`
- `.chat-clear-modal` — `max-width: 360px`

**No breakpoint-specific container padding** — same 24px on all viewports.

---

## C. Navigation and Floating Elements

### Files

| Element | File | Notes |
|---------|------|------|
| Navbar | `layout.tsx` | `.site-header` > `.container.nav` > logo + `.nav-links` |
| Footer | `layout.tsx` | `.footer` > `.container.footer-inner` |
| Floating AI button | `FloatingAskAiMe.tsx` | `.floating-ask-ai-me` — fixed bottom-right |

### Navbar structure

```html
<header className="site-header">
  <div className="container nav">
    <Link href="/"><strong>Tomas Valiukas</strong></Link>
    <nav className="nav-links">
      <!-- AI Me, Services, Projects, Partners, Contact -->
    </nav>
  </div>
</header>
```

- `.nav` — `display: flex`, `justify-content: space-between`, `flex-wrap: wrap`, `gap: 32px`, `padding: 18px 0`
- `.nav-links` — `display: flex`, `gap: 18px`, `flex-wrap: wrap`, `font-size: 14px`, `flex: 1`, `justify-content: center`

**Breakpoint behavior:** No media queries. Relies on `flex-wrap`; links wrap but there is no mobile menu (hamburger) or stacked layout.

### Footer

- `.footer-inner` — `display: flex`, `flex-wrap: wrap`, `justify-content: space-between`, `align-items: center`, `gap: 16px`
- `.footer-copyright` — `text-align: right`

**Breakpoint behavior:** Wraps on narrow viewports; no specific mobile layout.

### Floating AI button

- Position: `fixed`, `bottom: 24px`, `right: 24px`, `z-index: 20`
- Size: `padding: 10px 16px`, `font-size: 14px`, `white-space: nowrap` on label
- Hidden on `/ai` via `usePathname()`

**Breakpoint behavior:** Fixed 24px from edges on all viewports. No mobile-specific position or size. Can overlap content on small screens.

---

## D. Responsive Logic Already Present

### Media queries in `globals.css`

| Query | Purpose |
|-------|---------|
| `@media (max-width: 640px)` | `.homepage-proof-fit-grid` — `grid-template-columns: 1fr` (stack 2-column grid) |
| `@media (hover: hover)` | Hover effects for cards, accordions, buttons (disable on touch) |
| `@media (hover: hover) and (prefers-reduced-motion: reduce)` | Disable transitions on hover |
| `@media (prefers-reduced-motion: reduce)` | Accordion: no transitions, instant open/close |

### Component-level responsive styles

- **Homepage:** Only `.homepage-proof-fit-grid` has a breakpoint (640px).
- **Services:** `.services-levels-visual` — `flex-wrap: wrap`; `.services-levels-item` — `min-width: 100px`, `max-width: 180px`, `flex: 1 1 0`.
- **Projects:** `.projects-filters` — `flex-wrap: wrap`; `.projects-ai-strip` — `flex-wrap: wrap`; `.projects-ai-strip-text` — `min-width: 200px`.
- **Chat:** `.chat-suggestions` — `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`.
- **Grid:** `.grid` — `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`.

### Summary

- **Single breakpoint:** 640px (homepage proof grid only).
- **No mobile-first or tablet breakpoints.**
- **Flex-wrap** used in nav, footer, filters, hero-actions, cta-two-buttons — helps but does not replace proper mobile layout.

---

## E. Typography System

### Where defined

All typography is in `globals.css`; no separate typography file.

### Heading sizes

| Selector | Size |
|----------|------|
| `.hero h1` | `40px` |
| `.section h2` | `22px` |
| `.services-details-content h3` | `14px` |
| `.markdown h2` | `20px` |
| `.chat-heading` | `1em` |
| `.partners-section-title` | `1.1rem` |

### Paragraph / body

- `body` — `line-height: 1.6`, system font stack
- `.hero p` — inherits; `max-width: 640px`, `color: var(--muted)`
- `.nav-links` — `font-size: 14px`
- `.prompt-chip` — `font-size: 12px`
- `.chat-role` — `font-size: 12px`
- `.projects-meta` — `font-size: 11px`

### Spacing

- Inline in components via margins (e.g. `margin-top: 18px`, `margin-bottom: 12px`).
- No shared typography scale or spacing tokens.

### Centralization

- Typography is centralized in `globals.css` but not via design tokens.
- Sizes are repeated per component (e.g. `.hero h1`, `.section h2`).
- No responsive typography (e.g. `clamp()` or media-query font sizes).

---

## F. Accordion Implementation

### Accordion types

| Type | Used on | Component / markup | Shared CSS |
|------|----------|--------------------|------------|
| Hero levels | Home | `<details className="hero-level-card">` | `.hero-level-*` |
| Services | Services | `ServicesAccordion` → `<details className="services-details">` | `.services-*`, `.accordion-expand-wrapper` |
| Projects | Projects | `<details className="projects-details card">` | `.projects-details`, `.accordion-expand-wrapper` |
| Partners | Partners | `PartnersAccordion` → `<details className="projects-details partners-details">` | `.partners-*`, `.accordion-expand-wrapper` |

### Shared behavior

- **AccordionCloseFix** — global handler for smooth close on all accordions.
- **accordionUtils.ts** — `smoothCloseAccordion()` used by AccordionCloseFix and PartnersAccordion.
- **CSS:** `.accordion-expand-wrapper` used by Services, Projects, Partners; `.hero-level-content-wrapper` for Home.

### Spacing and behavior

- **Summary padding:** `14px 40px 14px 16px` (right space for chevron).
- **Content padding:** `14px 16px 16px` (services), `12px` top + border (projects).
- **Chevron:** `::after` with `right: 16px`, `font-size: 32px`.
- **Animations:** Grid-based expand + opacity; Safari fallbacks; `prefers-reduced-motion` support.

### Per-page differences

- **Home:** `.hero-level-card`, `.hero-level-content-wrapper`, `.hero-level-content`.
- **Services:** `.services-details`, `.services-summary`, `.services-details-content`.
- **Projects:** `.projects-details`, `.projects-summary`, `.projects-details-content`.
- **Partners:** `.partners-details` (reuses `.projects-summary`), `.partners-card-wrap` (card wrapper).

Spacing is defined in shared `.accordion-expand-wrapper` and per-type content classes; behavior is shared via AccordionCloseFix and accordionUtils.

---

## G. Chat Page Structure

### AI Me page (`/ai`)

| Section | Class | Reusable? | Notes |
|---------|-------|-----------|-------|
| Hero | `.hero` | Yes (shared) | "AI Me" + subtitle |
| Supporting text | `.chat-scope-notice` | Page-specific | Boundary/scope notice |
| Empty state | Initial message in transcript | Inline | First assistant message |
| Suggested prompts | `.chat-suggestions` | Page-specific | Grid of buttons |
| Chat window | `.chat-transcript` | Page-specific | Scrollable message list |
| Input area | `.chat-input-row` | Page-specific | Input + Send button |
| Status row | `.chat-status` | Page-specific | Quota, Clear chat |
| Clear modal | `.chat-clear-modal` | Page-specific | Overlay + confirm dialog |

### Hardcoded elements

- `suggestedQuestions` — array in `ai/page.tsx`
- `initialMessage` — first assistant message
- Scope notice text — "This is not a general-purpose assistant..."
- Input placeholder — "Ask about product, process, or company systems..."

### Reusable parts

- `.hero` — shared hero pattern
- `.section` — shared section spacing
- `.chat-message`, `.chat-role`, `.chat-inline-code`, `.chat-blockquote`, `.chat-list` — message styling (could be reused for other chat UIs)

### Layout

- `.chat-shell` — `display: grid`, `gap: 16px`
- `.chat-transcript` — `min-height: 320px`, `max-height: 520px`, `overflow-y: auto`
- `.chat-input-row` — `grid-template-columns: 1fr auto`
- `.chat-suggestions` — `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`

---

## H. Known Layout Risk Points

### High risk

| Component | Issue |
|-----------|-------|
| **Navbar** | No mobile menu; 5 links + logo can overflow or wrap awkwardly on small screens |
| **Projects filters** | 4 selects + Filter button; `min-width: 140px` per select; `margin-left: auto` on last group — can overflow |
| **Projects AI strip** | `min-width: 200px` on text; `margin-left: auto` on button — can squeeze or wrap poorly |
| **Services levels visual** | 3 pills + arrows; `min-width: 100px`, `max-width: 180px` — may wrap oddly on very narrow screens |
| **Floating AI button** | Fixed `bottom: 24px`, `right: 24px`; can overlap content, especially with mobile browser chrome |
| **Chat input row** | `grid-template-columns: 1fr auto` — Send button may be too small or cramped on mobile |
| **CTA two buttons** | `min-width: 200px` each — two full-width buttons on mobile can be tall |

### Medium risk

| Component | Issue |
|-----------|-------|
| **Hero h1** | `40px` — may feel large on small screens |
| **Container padding** | `24px` — may be tight on very narrow viewports |
| **Accordion summary** | `padding: 14px 40px 14px 16px` — right padding for chevron; long titles can truncate or wrap awkwardly |
| **Card padding** | `18px` — generally fine but combined with small width can feel cramped |
| **Footer** | Two-column flex; copyright `text-align: right` — can look odd when stacked |

### Lower risk

| Component | Issue |
|-----------|-------|
| **Homepage proof grid** | Already has `max-width: 640px` → single column |
| **Chat suggestions** | `minmax(220px, 1fr)` — will stack on narrow screens |
| **Grid (.grid)** | `minmax(220px, 1fr)` — responsive |
| **Contact page** | Simple layout; `contact-email-cta` is `inline-flex` column |

### Summary

- **Wide layouts:** Projects filters, Projects AI strip, Services levels.
- **Fixed widths:** `min-width` on filters, CTAs, chat suggestions.
- **Large padding:** Hero, sections — acceptable but could be tuned.
- **Long text:** Accordion summaries, partner taglines (`.partners-tagline` has `-webkit-line-clamp: 2`).
- **Sticky/floating:** Navbar (sticky), Floating AI button (fixed) — need mobile-safe placement.

---

## I. CSS Strategy

### Approach

- **Primary:** Global CSS in `globals.css` (no Tailwind).
- **No CSS modules** — all styles in one file.
- **Semantic class names** — e.g. `.hero`, `.section`, `.card`, `.chat-transcript`.
- **Components** use `className` to apply these classes.

### Where to make responsive changes

1. **`globals.css`** — Add media queries for existing classes. Lowest risk of side effects if scoped to specific selectors (e.g. `.site-header`, `.projects-filters`).
2. **Avoid** — Inline styles in components (minimal use today).
3. **Avoid** — New global classes that affect many pages without a clear scope.

### Risk of side effects

- **High:** Changing `.container`, `.section`, `.hero` — used on almost every page.
- **Medium:** Changing `.card`, `.nav`, `.footer` — shared across multiple pages.
- **Low:** Changing page-specific classes (e.g. `.projects-filters`, `.chat-input-row`, `.services-levels-visual`).

### Recommendation

- Prefer **new media queries** in `globals.css` that override existing rules at breakpoints (e.g. `@media (max-width: 768px)`).
- Use **page-specific parent classes** (e.g. `.projects-page`, `.ai-me-page`) to scope overrides and avoid leaking styles.
- Consider **CSS custom properties** for breakpoints or spacing if the number of overrides grows.

---

## J. Safe Retrofit Plan

### Phase 1: Global layout (low risk)

1. **Container padding** — Reduce horizontal padding on small screens (e.g. `padding: 0 16px` below 640px).
2. **Hero** — Reduce vertical padding on mobile (e.g. `padding: 48px 0 32px`).
3. **Section** — Slightly reduce `padding` on mobile.
4. **Footer** — Ensure stacked layout and alignment when wrapped.

### Phase 2: Navigation (medium risk)

5. **Navbar** — Add mobile layout:
   - Option A: Hamburger menu for links below ~768px.
   - Option B: Stack logo above links, center or left-align.
   - Option C: Horizontal scroll for links if space is tight.
6. **Floating AI button** — Adjust position/size on mobile (e.g. smaller, or `bottom: 16px`, `right: 16px`).

### Phase 3: Page-specific (higher risk, test per page)

7. **Home** — Verify hero-level accordion, conversion grid, CTA buttons on narrow viewports.
8. **Services** — Services levels visual (stack or scroll), accordion summaries.
9. **Projects** — Filters (stack vertically or horizontal scroll), AI strip, project cards.
10. **Partners** — Accordion cards, taglines.
11. **Contact** — Email CTA, list layout.
12. **AI Me** — Chat transcript height, input row, suggestions grid, clear modal.

### Phase 4: Typography and polish

13. **Headings** — Consider `clamp()` or smaller sizes on mobile for `.hero h1`.
14. **Touch targets** — Ensure buttons, links, accordion summaries are at least 44×44px.
15. **Floating button** — Ensure it does not overlap key content (e.g. chat input).

### Suggested breakpoints

- **640px** — Already used for homepage; good "mobile" cutoff.
- **768px** — Add for "tablet" (e.g. nav, filters).
- **980px** — Container max-width; no need for a larger breakpoint unless targeting wide screens.

### Order summary

1. Container + hero + section (global)
2. Footer
3. Navbar
4. Floating button
5. Home
6. Services
7. Projects
8. Partners
9. Contact
10. AI Me
11. Typography + touch targets
12. Final pass

Test each phase on real devices or browser DevTools device emulation before moving to the next.
