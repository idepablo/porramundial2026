# Porra Mundial 2026

Quiniela / prediction pool for the 2026 FIFA World Cup — a static site (HTML/CSS/JS)
backed by Supabase. Friends register, predict every group match, the full knockout
bracket, and the individual awards; points accumulate as real results come in.

Live site: **https://porradelmundial.com**

## Stack

- **Frontend:** static HTML/CSS/JS, no build step. Hosted on GitHub Pages / Vercel.
- **Backend:** Supabase (Postgres + Auth + Storage). The site talks to it directly
  with the anon key via `supabase.js`.
- **Shared code:** `supabase.js` holds the Supabase client, nav, auth helpers,
  Spanish team-name map, the FAQ/Contacto widgets, the scoring boxes, and the
  user Settings modal — it loads on every page.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Tiny redirect → `porra-mundial-2026.html` |
| `porra-mundial-2026.html` | Public landing (rules, points system, prizes) |
| `porra-register.html` | Sign-up (validation, real-time email check, payment info) |
| `porra-login.html` | Login + password-reset handler |
| `porra-home.html` | Logged-in home (position, Top 3, puntos del día) |
| `porra-predict.html` | The picks wizard (groups → bracket → honours → resumen) + **El Oráculo** |
| `porra-mypredictions.html` | A user's picks (own, or another user's via `?user=<id>`) |
| `porra-leaderboard.html` | Clasificación + Top 3 podium |
| `porra-groups-bracket-daily.html` | Resultados: group tables, the FIFA bracket view, daily points |
| `porra-admin.html` | Admin panel (users, results entry, overview) |
| `squads-wc2026.js` | Player squad data for the honours pickers |

## Scoring (cumulative · 1.480 pts total)

- **Groups (per match):** result 1·X·2 **+1**, goal difference **+2**, exact score **+3**
- **Group standings:** **+5** per correct final position (×48)
- **Knockouts — team qualified to the round:** R32 **+4**, R16 **+6**, QF **+8**, SF **+10**, Final **+12**
- **Knockouts — match score** (only if both teams in the tie are correct, cumulative):
  R32 2/3/4 · R16 3/4/5 · QF 4/5/6 · SF 5/6/7 · Final 10/15/20
- **Title:** Campeón **+35**, Subcampeón **+20**
- **Individual:** Balón de Oro **+10**, Bota de Oro **+10**

Knockout third-place pairings follow the official FIFA 2026 bracket.

## First-time setup

1. Create a Supabase project.
2. Run **`setup-supabase.sql`** in the SQL Editor (creates every table, the
   `settings` rows, the `avatars` storage bucket, and its policies — idempotent).
3. **Authentication → URL Configuration:**
   - Site URL: `https://porradelmundial.com`
   - Redirect URLs: add `https://porradelmundial.com/porra-login.html`
4. Put your Supabase **project URL** and **anon key** in `supabase.js`.
5. Load the match fixtures into the `matches` table.
6. Make yourself admin:
   `update public.users set is_admin = true where email = 'you@example.com';`

## Deploy

Static files — just push to the repo serving `porradelmundial.com`
(GitHub Pages / Vercel). No build step.

## Notes / still to build

- **Scoring engine** (`recalculate_all_scores`): reconstructs the real bracket and
  computes everyone's points from real results. Recommended to build & test against
  a fake completed tournament before results start.
- **Mis Predicciones** "real result below each pick" + group-positions tab — depends
  on the scoring engine.
- **Post-launch ideas:** admin Excel export (one tab per user), past/future game
  views, manual result & KO-team overrides, editable WhatsApp daily message,
  automatic results via an API.
- RLS is intentionally **disabled** for this private pool (see the SQL header).
