# Unsere Leistungen — Clickable Cards & Service Pages

**Date:** 2026-04-16
**Scope:** Make the 4 cards in the `Unsere Leistungen` section clickable, and create 3 new placeholder pages for the services that don't yet have a dedicated page. The 4th card (Infusion) reuses the existing `/infusions` page.

## Goals

- Each of the 4 service cards on the home page navigates to a dedicated service page when clicked.
- Desktop and mobile have clear affordances that the cards are clickable.
- Three new placeholder pages (Beratung, Diagnostik, Mentoring) exist and are visually consistent with the rest of the site. Real copy to be added later.

## Non-Goals

- Writing real marketing copy for the three new pages.
- Redesigning the Unsere Leistungen card layout, animations, or typography.
- Replacing or modifying the existing `/infusions` page content.
- Any backend/Supabase changes.

## Cards → Routes

| Card label | Route | Page file | Status |
|---|---|---|---|
| Beratung | `/beratung` | `src/Pages/Beratung.js` | new |
| Diagnostik | `/diagnostik` | `src/Pages/Diagnostik.js` | new |
| Infusion | `/infusions` | `src/Pages/Infusions.js` | existing — reused |
| Mentoring | `/mentoring` | `src/Pages/Mentoring.js` | new |

## Changes

### 1. `src/App.js`

Register 3 new routes alongside the existing ones:

```jsx
<Route path="/beratung"   element={<Beratung />} />
<Route path="/diagnostik" element={<Diagnostik />} />
<Route path="/mentoring"  element={<Mentoring />} />
```

Add the three imports. The global `ScrollToTop` component already handles scrolling to top on route change, so no changes needed there.

### 2. `src/Components/NewGridHoverEffect.js` (desktop)

- Add a `route` field to each object in the `data2` array:
  - Beratung → `/beratung`
  - Diagnostik → `/diagnostik`
  - Infusion → `/infusions`
  - Mentoring → `/mentoring`
- Import `Link` from `react-router-dom`.
- Wrap each card's `<div>` content in a `<Link to={item.route}>`. The link must not break the existing `onMouseEnter`/`onMouseLeave` hover flex-grow behavior or the entrance animation.
- Add a "Mehr erfahren →" affordance at the bottom-left of each card (white text, same `font-base`/`text-base` sizing as the subtitle), positioned inside the existing absolute-positioned text block.
- Retain `cursor-pointer` (inherited from the Link, but add explicitly if the browser doesn't apply it through the wrapping structure).

### 3. `src/Components/NewGridHoverEffectMobile.js` (mobile)

- Add a `route` field to each object in the `data` array (same four routes as above).
- Import `useNavigate` from `react-router-dom`.
- Update the `onClick` handler so that:
  - If the tapped card is currently collapsed → expand it (current behavior, set `expandedIndex` to the index).
  - If the tapped card is the currently-expanded one → call `navigate(item.route)`.
  - Tapping a different expanded card switches expansion to the new card (current behavior — set `expandedIndex` to the new index).
- Inside the expanded card's content block, add a "Mehr erfahren →" text affordance so the second-tap-navigates behavior is discoverable.

### 4. New pages — `Beratung.js`, `Diagnostik.js`, `Mentoring.js`

Each page is a small functional component, ~20 lines, with the same structure. No shared abstraction — three copies is fine and easier to customize per page later.

Template:

```jsx
function Beratung() {
  return (
    <section className="bg-white min-h-screen px-6 md:px-12 pt-32 pb-24">
      <div className="max-w-4xl mx-auto">
        <h1
          className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter mb-6"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}
        >
          Beratung
        </h1>
        <p className="text-[#515757] text-lg md:text-xl max-w-2xl mb-12">
          Umfassende Anamnese und individueller Behandlungsplan, abgestimmt auf Körper, Lebensstil und persönliche Bedürfnisse.
        </p>
        <p className="text-[#515757]/60 italic">Inhalt folgt.</p>
      </div>
    </section>
  );
}
export default Beratung;
```

Per-page content:

- **Beratung** — title "Beratung"; subtitle = the existing Beratung card subtitle.
- **Diagnostik** — title "Diagnostik"; subtitle = the existing Diagnostik card subtitle.
- **Mentoring** — title "Mentoring"; subtitle = the existing Mentoring card subtitle.

All three use the teal `#43A9AB` heading color to match the rest of the site. `pt-32` clears the fixed `Navbar`. The global `Footer` in `App.js` renders below, so pages do not include it.

## Tradeoffs

- **Mobile double-tap semantics:** On mobile, a user who taps an expanded card expecting it to *collapse* will instead navigate. Accepted — the alternative (a visible "Mehr erfahren" link as the only navigation path) was considered and rejected in favor of whole-card tap-to-navigate on second tap.
- **No shared page template component:** Three near-identical ~20-line page files is preferred over a shared `<ServicePage>` component, because real copy will diverge significantly per page in a follow-up.

## Testing

Manual browser testing only (no test infrastructure for this project):

1. Load `/`, scroll to the Unsere Leistungen section.
2. Desktop: hover each card — hover grow/shrink animation still works. "Mehr erfahren →" visible on each card. Click each card — navigates to the correct route.
3. Mobile viewport: tap a collapsed card — expands. Tap the same expanded card — navigates. Tap a different card while one is expanded — the new card expands (no navigation).
4. Each of `/beratung`, `/diagnostik`, `/mentoring` renders the placeholder page with correct title and subtitle, Navbar and Footer visible, no horizontal scroll.
5. `/infusions` unchanged.
