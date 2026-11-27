# HPL Design System

Design system extracted from the HPL (Hyderabad Pickleball League) mobile app prototype built in this project — a fan-facing app for a pickleball league: live scores, standings, news, teams, merch, player draft.

Source: the working app in this project's root (`HPL Mobile App.html` + `app.jsx`, `screens-*.jsx`, `components.jsx`, `icons.jsx`, `data.js`). No external codebase, Figma file, or brand guideline doc was provided — everything here is reverse-engineered from that prototype. Palette comment in the original CSS says "pulled from thehpl.in".

## Index
- `styles.css` — entry point, imports everything below
- `tokens/` — colors, typography (+ fonts), spacing/radius/shadow
- `base/` — foundational classes: reset, cards, buttons, nav, visual effects (stadium/team-badge/marquee/etc placeholders)
- `components/core/` — Button, Chip, IconButton, Card
- `components/layout/` — AppHeader, SectionHead
- `components/navigation/` — BottomNav (pill / floating / flat variants)
- `components/match/` — TeamBadge, MatchScore, MarqueeTicker
- `assets/icons.jsx` — full icon set (~30 stroke icons) + HPLLogo mark
- `guidelines/` — foundation specimen cards (colors, type, spacing, brand)
- `HPL Mobile App.html` (root, tagged as the UI kit) — the full click-through app: home, live match, teams/standings, results/fixtures/bracket, draft, merch, article, account, auth

## Content fundamentals
- Copy is sports-newsroom voice: short match-report ledes, direct quotes from players/coaches, stat call-outs. See `data.js` (`HPL_NEWS`) for real examples.
- Labels and tags (eyebrows, chips, nav labels) are always uppercase, tracked, and terse ("LIVE", "FINAL", "MATCHDAY 12").
- No emoji anywhere in the UI.
- Team/player names are fictional (Mavericks, All Stars, Aarav Joshi, etc.) — placeholder league data, not a real league.

## Visual foundations
- **Palette**: deep navy surfaces (`--hpl-navy` family) with a single warm accent (orange → peach) for CTAs, highlights, and winning scores. Two accent colors max, semantic reds/greens reserved for live/win/loss states only.
- **Type**: Zuume Cut (condensed display face — copied into `fonts/`) for all headlines, eyebrows, nav labels, numbers, buttons — always uppercase, tight line-height. Montserrat for body copy and paragraph text.
- **Cards**: 18px radius, 1px hairline border (`rgba(255,255,255,.08)`), dark surface fill, no drop shadow on the card itself (shadows are reserved for floating elements like nav bars and buttons).
- **Buttons**: pill-shaped, orange fill, uppercase Zuume Cut label, soft orange glow shadow. Press state: translateY(1px), no scale change.
- **Tap feedback**: `.tap` utility — scale(0.97) + opacity 0.85 on `:active`. Used everywhere instead of hover states (mobile-first).
- **Bottom nav**: three interchangeable variants (pill/floating/flat) — a tweakable, not three separate products. Pill = frosted glass bar with an orange active pill; floating = detached card with a dot indicator; flat = full-bleed bar, accent-colored active label only.
- **Imagery**: no real photography supplied — hero/stadium/court/avatar imagery are all CSS-gradient placeholders (`.stadium-photo`, `.court-mini`, `.avatar-photo`, `.net-graphic`). Replace with real photography before shipping; keep the same warm-spotlight, cool-court color language if you do.
- **Live state**: red pulsing dot (`.live-dot`) + "LIVE" label is the only animated indicator in the system; otherwise the UI is static (no page transitions, no easing curves defined beyond the 0.12–0.18s tap/hover utilities).
- **Blur/glass**: used only on the bottom nav (pill/flat variants) — `backdrop-filter: blur(24px) saturate(160%)` over a translucent navy fill.

## Iconography
Custom 24×24 stroke icon set in `assets/icons.jsx` (~30 icons: nav, actions, sports/league-specific glyphs) plus one hand-built `HPLLogo` mark (shield + Charminar motif + pickleball). All stroke-based, `currentColor`, 2px default weight. No icon font, no emoji, no PNG icons. Copy `assets/icons.jsx` into a new project and load it as a script before any component that references `window.IconX`.

**No real logo was supplied** for this brand beyond the one placeholder mark built into the prototype (`HPLLogo`) — treat it as a stand-in, not a final brand asset.

## Caveats
- No real codebase, Figma, or brand guide was attached — this system is reverse-engineered entirely from one prototype file set. If a real brand guide or Figma exists, re-run against it for accuracy.
- Fonts are the real files already in the project (`fonts/zuume-cut-*.ttf`); no substitution was needed.
- Components cover what the prototype actually uses (no invented primitives like Tabs/Dialog/Toast — the app doesn't have them).
