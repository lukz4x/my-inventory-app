# MyInventoryApp — Project Context for Claude Code / Desktop Commander

## What this is
A web-based personal inventory management app. Photo-first, AI-assisted naming, hierarchical spaces.
The product promise: "Find anything you own in seconds. Never lose a hammer again."

**Platform: Next.js 14+ Progressive Web App.** Native iOS is deferred to v2.

## Required reading at session start
Before doing anything in this project, read these three files in order:
1. `docs/My_Inventory_App_Foundation_v1.md` — full design spec (v1.19) with WEB PIVOT NOTICE at the top
2. `docs/Web_v1_Addendum.md` — overrides Sections 14/15/16 of the foundation doc with web-specific specs
3. `docs/My_Inventory_App_v7_migration.sql` — database schema, deployed to Supabase

Then summarize back what you understand before writing code. The user will confirm or correct.

**Important:** The foundation doc has Swift/SwiftUI sections that DO NOT apply to web v1. Treat the Web v1 Addendum as authoritative for anything related to architecture, visual design, or monetization. The foundation doc is authoritative for everything else (mental model, schema, AI pipeline, telemetry, sync concepts, UX flows).

## Stack (locked, do not relitigate)
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **State:** React `useState` / `useReducer`; Zustand only if state grows complex
- **Local persistence:** Dexie.js (IndexedDB wrapper)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Auth:** Supabase Auth — Apple + Google + Email/password (all first-class)
- **Payments:** Stripe (Stripe Checkout for one-time pack purchases)
- **AI:** Cloud APIs only — Anthropic Vision (or OpenAI Vision) + OpenAI for embeddings/text classification
- **Camera:** Browser `getUserMedia` API
- **Deployment:** Vercel (frontend); Supabase manages backend
- **Icons:** Lucide React

## Key conventions
- File structure follows Web v1 Addendum Section 4
- Feature-based folders: `app/`, `components/`, `features/`, `lib/`, `hooks/`, `types/`
- Optimistic UI: write to Dexie immediately, queue cloud sync, never block on network
- All primary keys are client-generated UUIDs (idempotent on retry)
- Server Components for static surfaces; Client Components for interactive ones
- One feature module per area (spaces, items, search, capture, billing)
- Tailwind utility classes only — no custom CSS files except `globals.css`
- Use Lucide icons; treat them as the SF Symbols equivalent for web

## Hard rules
- Never commit secrets to git; `.env.local` is gitignored
- Never push directly to main without explicit user approval
- Never modify the database schema without first updating the migration file in `docs/`
- After any database migration, run the verification checklist (items 1–27) at the bottom of the SQL file
- Always run `npm run build` and confirm no errors before saying "done"
- Always run `npm run lint` before committing
- Use the credit reservation pattern (reserve → commit/release) for every paid AI call — never deduct directly
- Every AI Edge Function MUST check `system_config.ai_globally_enabled` before running
- Every successful AI call MUST call `record_ai_spend(usd_amount)` to update budget tracking
- Free users get text classification on every manual item; image AI Captures are gated behind 20 lifetime / paid pack

## Where things live
- Source: `~/Projects/MyInventoryApp/web/` (Next.js project)
- Docs: `~/Projects/MyInventoryApp/docs/`
- Secrets: `~/Projects/MyInventoryApp/web/.env.local` (NEVER commit)
- Edge Functions: `~/Projects/MyInventoryApp/web/supabase/functions/`

## Build commands
- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Format: `npx prettier --write .`
- Deploy: `vercel --prod` (from project root, after `vercel login`)

## Build order (12 steps — see Web v1 Addendum Section 9)
Each step is shippable and committable. Always confirm with user which step is current before starting work.

1. **Project bootstrap** — Next.js + Tailwind + TypeScript + Vercel deploy
2. **Supabase client** — `lib/supabase.ts` setup, verify connection
3. **Auth pages** — login with Apple + Google + Email/password
4. **Onboarding flow** — 3-screen welcome (promise, sign-in, first space)
5. **App shell** — main layout with home, navigation, global search bar
6. **Spaces list + detail** — Supabase queries, item display
7. **Add Item flow** — camera capture, manual entry, post-capture, save flow
8. **Item detail + edit** — all editable fields, use marker
9. **Search** — full-text, debounced, location path
10. **AI pipeline integration** — Edge Functions, credit reservation, free vs. paid logic
11. **Stripe checkout + paywall** — pack purchase, webhook handler, credit refill
12. **PWA setup + polish** — manifest, service worker, install prompt, animations

## Current build step
NONE — pre-build setup phase. Ask the user before starting work.

## Important context flags
- Solo builder, working a few hours per week
- User is the architect/PM; AI agent does ~95% of typing
- Foundation doc + Web v1 Addendum represent settled decisions — do NOT relitigate design choices
- If a real implementation question reveals a spec gap, surface it explicitly rather than guessing
- User's hardware is a 2012 MacBook Pro on patched Sequoia — cannot run modern Xcode/iOS Simulator. This is why we pivoted from iOS to web. Don't suggest iOS-specific tools, Xcode, or anything requiring AVX2 CPU instructions.

## When you're stuck
1. First, re-read the relevant section of the foundation doc + Web v1 Addendum
2. Check the verification checklist in the SQL migration for database behavior
3. Ask the user — don't guess on product or design questions
4. For pure technical issues, search Next.js, Supabase, or Stripe docs

## Testing protocol
- After every code change: run `npm run build` and confirm clean build
- After every database change: run the relevant verification checks from the SQL migration
- After every step in the 12-step build order: commit with a descriptive message and confirm the user can run the app
- Test on real phone (iPhone Safari and Android Chrome) once the camera flow lands at step 7

## Git protocol
- One commit per build-order step minimum
- Commit messages follow conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Never force-push
- Never commit `.env.local`, `node_modules/`, `.next/`, or any file matching `*secret*`

## Cost & risk reminders
- Global monthly AI budget cap: $1,200
- Phone push alerts at 50% / 75% / 90% via ntfy.sh or Pushover
- AI globally pauses (across all users) if budget cap hit
- Free user lifetime limit: 20 image AI Captures
- Paid pack: $9.99 / 1,000 image AI Captures, never expires
- Per-user text classification: unlimited (capped only by global budget)
- No subscription tier in v1
- No ads, ever (probably)

## Admin tooling
No custom admin UI in v1. Use Supabase dashboard + SQL helpers:
- `admin_grant_credits(email, amount, reason)` — additive
- `admin_set_credits(email, new_balance, reason)` — for resets
- `admin_set_ai_enabled(boolean)` — global kill switch
- `record_ai_spend(amount)` — auto-called after AI calls
