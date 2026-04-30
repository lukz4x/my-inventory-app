# MyInventoryApp — Web v1 Implementation Addendum

**Read alongside the foundation doc, not in place of it.**

This addendum tells Claude Code (or any AI agent) what's different for the **web v1** build versus the original iOS spec. Most of the foundation doc still applies — the schema, AI pipeline concept, telemetry, mental model, user flows are platform-agnostic. Only the user-facing implementation layer is different.

---

## 1. What overrides what

The foundation doc has three sections that are iOS-specific. **For web v1, ignore those sections and use this addendum instead:**

| Foundation doc section | Web v1 replacement |
|---|---|
| Section 14 (SwiftUI architecture) | Section 4 of this addendum |
| Section 15 (visual design system) | Section 5 of this addendum |
| Section 16 (StoreKit/IAP monetization) | Section 6 of this addendum |

Everything else in the foundation doc — schema (Section 5), mental model (1–9), UX flows (10), sync (11), AI pipeline (12), telemetry (13) — applies as written.

---

## 2. Platform decision

**Web v1 = Progressive Web App (PWA), not native iOS.**

- Built with Next.js 14+ (App Router)
- Deployed on Vercel (free tier)
- Same Supabase backend, unchanged
- Installable to phone home screen, runs full-screen, basic offline support
- Native iOS becomes v2 when hardware permits — Capacitor wrapper kept as an option

**Why PWA, not plain web:** users can "install" to home screen, getting close to app-feel without an App Store. Service worker enables offline drafts. Cost is one `manifest.json` and a minimal service worker — about 30 minutes of setup.

---

## 3. Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS |
| State | React `useState` / `useReducer`; Zustand only if state grows complex |
| Local persistence | Dexie.js (IndexedDB wrapper) — for offline drafts and capture survival |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) — unchanged |
| Auth | Supabase Auth: Apple + Google + Email/password (all first-class on web) |
| Payments | Stripe (Stripe Checkout for one-time purchases) |
| AI | Cloud APIs only (Anthropic Vision, OpenAI text classification + embeddings) |
| Camera | Browser `getUserMedia` API + image compression before upload |
| Deployment | Vercel for frontend; Supabase manages backend |
| Domain | TBD — `.app` or `.com` once name is locked |

**Explicitly NOT in v1:**
- Capacitor wrapper (kept as v2+ option, but not built now)
- Server-side rendering for the app surface (use SSR only for marketing pages)
- Custom backend services beyond Supabase Edge Functions
- Analytics tools (Mixpanel, Amplitude) — Supabase usage_events is enough

---

## 4. Web architecture (replaces foundation doc Section 14)

### Pattern

**Feature-based React with hooks, no MVVM, no Redux.** Lightweight by design.

- Pages live in `app/` (Next.js App Router)
- Reusable UI in `components/`
- Feature logic in `features/` — one folder per feature (spaces, items, search, capture, billing)
- Backend client wrappers in `lib/`
- Shared types in `types/`

### Folder structure

```
my-inventory-app-web/
├── app/                        Next.js App Router pages
│   ├── (auth)/
│   │   ├── login/
│   │   └── onboarding/
│   ├── (app)/
│   │   ├── home/
│   │   ├── spaces/[id]/
│   │   ├── items/[id]/
│   │   └── search/
│   ├── api/                    Next.js route handlers (thin proxy to Supabase Edge Functions)
│   ├── layout.tsx
│   ├── manifest.ts             PWA manifest
│   └── globals.css
├── components/
│   ├── ui/                     buttons, inputs, modals, toasts
│   ├── space/
│   ├── item/
│   ├── capture/                CameraView, PostCaptureView
│   └── shared/                 GlassOverlay, CategoryChip, LocationChip
├── features/
│   ├── auth/
│   ├── spaces/
│   ├── items/
│   ├── search/
│   ├── ai/                     classification orchestration (calls Edge Functions)
│   └── billing/                Stripe checkout, paywall logic
├── lib/
│   ├── supabase.ts             Supabase client setup
│   ├── stripe.ts               Stripe client setup
│   ├── dexie.ts                IndexedDB schema and queries
│   └── api.ts                  fetch wrappers for Edge Functions
├── hooks/
│   ├── useUser.ts
│   ├── useSpace.ts
│   ├── useCredits.ts
│   └── useNetworkStatus.ts
├── types/
├── public/
│   ├── icons/                  PWA icons
│   └── sw.js                   service worker
└── tailwind.config.ts
```

### Data flow

The same principles as the iOS spec, adapted for web:

1. User action triggers a function in a feature folder
2. Feature function writes to Dexie (IndexedDB) immediately for optimistic UI
3. Feature function calls Supabase or an Edge Function for cloud persistence
4. On success, Dexie is reconciled with server state
5. UI re-renders from local state (which is sourced from Dexie)

**Invariant:** UI never blocks waiting for network. Offline drafts survive page refreshes.

### Camera implementation

- Use `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` for back camera on phones
- Capture to canvas, downscale to 1024px max dimension, JPEG quality 0.8
- Result is a Blob; saved to local IndexedDB immediately, queued for Supabase Storage upload
- File size after compression: typically 80–200KB

**UX expectation:** "fast enough" rather than "instant." Web cameras have ~200–800ms warmup. Set realistic expectations in user-facing copy.

### Authentication

- Supabase Auth handles OAuth (Apple + Google) and email/password
- `@supabase/auth-helpers-nextjs` for session management
- Sign-in with Apple on web works fine — no Apple Developer Program enrollment needed *just* for web auth (only required for iOS app distribution)
- Auth state stored in cookies by Supabase helpers; no manual Keychain equivalent needed

### Concurrency

- React Server Components for static parts of pages
- Client Components for any interactive surface
- Async work via `useEffect` hooks or React Query if state caching grows complex
- No actors needed — JavaScript's event loop handles async naturally

### Error handling

Same philosophy as iOS spec:
- Network errors: silent retry, never block user
- AI errors: silent failure, leave fields null
- Auth errors: surface immediately
- Storage upload errors: silent retry, photo already saved locally

---

## 5. Visual design (replaces foundation doc Section 15)

### Visual identity

The HomeKit-feel concept transfers but loses some fidelity on web. Replicate as closely as possible:

- **Background:** space photo + glass overlay using `backdrop-filter: blur(20px) saturate(1.5)` + per-space color tint at 30% opacity
- **Glass effect:** Tailwind's `backdrop-blur-xl` + custom RGBA tints
- **Mobile-first responsive:** primary form factor is phone-sized; desktop layout adds breathing room but keeps phone-style flow

### Color palette (same six tints as foundation doc Section 15)

| Name | Hex |
|---|---|
| Sage | #7BA886 |
| Slate | #6B7B8C |
| Clay | #B8866D |
| Lilac | #9A8AB8 |
| Sand | #C4A875 |
| Mist | #7B9AA8 |

### Typography

- System font stack: `-apple-system, BlinkMacSystemFont, 'Inter', sans-serif`
- Three roles: heading (semibold, 1.25–1.5rem), body (regular, 1rem), caption (0.875rem, 60% opacity)

### Spacing & shape

- Tailwind's default 4px scale, use 2 / 3 / 4 / 6 / 8 (= 8px / 12px / 16px / 24px / 32px)
- Card radius: `rounded-2xl` (16px)
- Pill radius: `rounded-full`

### Iconography

- **Lucide React** for icons (close to SF Symbols feel, well-maintained, free)
- Anchor icons: `Home` (default space), `Inbox` (Unsorted), `Camera`, `Search`, `Plus`, `Hand` (use marker)

### Animation

- Tailwind's default transitions: `transition-all duration-200 ease-in-out`
- Modals/sheets: slide up from bottom, 250ms
- AI suggestion fade-in: opacity 0→1 over 300ms
- No spring physics in v1

### PWA-specific

- `manifest.ts` declares: name, icons (192px, 512px, maskable), theme_color, background_color, display: 'standalone'
- Service worker: minimal — caches app shell, queues failed POST requests for retry
- "Add to Home Screen" prompt shown after user completes first space (not on initial load)

---

## 6. Monetization (replaces foundation doc Section 16)

### Locked v1 economic model

| Component | Value |
|---|---|
| Free tier — manual items / photos / spaces | Unlimited |
| Free tier — text classification on manual entries | Unlimited (capped only by global budget) |
| Free tier — image AI Captures | **20 lifetime** |
| Paywall trigger | At 16/20 used (80%) |
| Paid pack | **$9.99 one-time, 1,000 image AI Captures, never expire** |
| Subscription | **Deferred to v2** |
| Smaller packs ($2.99 etc.) | Deferred — minimum floor $2.99 due to Stripe flat fee |
| Payment processor | **Stripe** (not Apple IAP) |
| Behavior at 0 image scans | All AI paused for that user; manual entry unchanged; honest CTA shown |

### Cost per AI call (in scans)

Unchanged from foundation doc Section 12:
- Cloud vision call: 5 scans
- Text classification: 1 scan
- Embedding generation: 1 scan each (typically 3 per item)

Average per image AI Capture: ~6 scans = $0.012–0.02 in real cost.

### Free user flow (the critical insight)

Free users get text classification on every manually-entered item. This:
- Costs ~$0.001/item — negligible
- Keeps platform taxonomy growing from all users (the data asset)
- Gives free users genuine organization value (auto-suggested user_category)
- Reserves the "automatic from photo" magic for paid users

### Global cost protection (locked)

| Control | Value |
|---|---|
| Monthly budget cap | **$1,200/month** |
| Alerts | Phone push (ntfy.sh or Pushover) at 50% / 75% / 90% |
| Behavior at cap | All AI globally disabled; manual entry continues; user-facing message: "AI suggestions temporarily paused — please try again later" |

Implementation:
- Every Edge Function checks `system_config.ai_globally_enabled` before running AI
- Every successful AI call calls `record_ai_spend(usd_amount)` which auto-resets monthly
- When `record_ai_spend` returns false, Edge Function refuses further AI work
- Phone push alerts fire when `current_month_spend_usd` crosses thresholds

### Stripe integration

- Use **Stripe Checkout** for the first sale (simpler than Stripe Elements)
- Webhook handler in a Supabase Edge Function listens for `checkout.session.completed`
- On successful payment, increment `credits_balance` by 1000, log `credits_purchased` event
- Use Stripe's "test mode" until production launch
- Stripe Customer Portal for users to manage their purchase history (optional v1.1)

### Admin tooling

No custom admin UI in v1. Use the Supabase dashboard (Table Editor + SQL Editor) plus the SQL helper functions defined in v7 migration:
- `admin_grant_credits(email, amount, reason)` for comps and refunds
- `admin_set_credits(email, new_balance, reason)` for resets and bug recovery
- `admin_set_ai_enabled(boolean)` for the AI kill switch
- `record_ai_spend(amount)` called automatically by AI Edge Functions

To add yourself as admin after running the migration:
```sql
insert into public.admin_users (user_id, notes)
values ((select id from auth.users where email = 'YOUR_EMAIL'), 'founder');
```

---

## 7. What stays from the foundation doc (do not re-derive these)

These are **unchanged and authoritative**:

- **Mental model** (Sections 1–9): household, locations, items, three-name model, hierarchical platform categories, user_categories, item_photos, usage_events
- **Schema** (Section 5 + v7 migration): all tables and triggers exactly as specified
- **UX flows** (Section 10): Add Item, Find Item, Add Space, Edit Item, Move Item, Use Tracking — concepts apply, just translated to web idioms (no swipe gestures since web)
- **Sync architecture** (Section 11): local-first with optimistic UI, two-phase commit on credits, conflict rules — all apply (Dexie replaces SwiftData)
- **AI pipeline** (Section 12): four cases (high-conf vision, low-conf vision, text-only, no-input), embedding dedup, vague-input guardrail, no automatic re-classification
- **Telemetry** (Section 13): 20 event types, JSONB metadata, session_id, all carry over identically

---

## 8. What's NOT in web v1

Same list as foundation doc Section 7, plus:

- Native iOS app (deferred to v2)
- Capacitor wrapper (deferred to v2+)
- Subscription tier (deferred to v2 once data shows usage patterns)
- Multi-pack pricing options (deferred — single $9.99 pack only)
- Ads (probably never)
- Open-source AI hosting (deferred until scale justifies)
- Custom admin UI (use Supabase dashboard)
- User-facing reports / insurance documentation (v2 paid feature)
- Rich offline mode beyond capture survival (v2)
- Family/household sharing (v2)

---

## 9. Build order (web-adjusted, 12 steps)

Each step is shippable and committable. Don't skip ahead.

1. **Project bootstrap** — `npx create-next-app`, Tailwind, TypeScript, ESLint, Prettier, basic deployment to Vercel
2. **Supabase client** — `lib/supabase.ts` with auth helpers; verify connection
3. **Auth pages** — `(auth)/login` with Apple + Google + Email/password via Supabase Auth UI
4. **Onboarding flow** — 3-screen welcome (promise, sign-in already done, first space)
5. **App shell** — `(app)/layout.tsx` with home, navigation, global search bar
6. **Spaces list + detail** — `(app)/spaces/[id]` reads from Supabase, displays items
7. **Add Item flow** — camera capture, manual entry, post-capture screen, save to Dexie + Supabase
8. **Item detail + edit** — `(app)/items/[id]` with all editable fields, use marker
9. **Search** — `(app)/search` with full-text, debounced, location path display
10. **AI pipeline integration** — Edge Functions deployed, credit reservation, free vs. paid logic
11. **Stripe checkout + paywall** — pack purchase flow, webhook handler, credit refill
12. **PWA setup + polish** — `manifest.ts`, service worker, install prompt, animations, mobile responsiveness final pass

---

## 10. Pre-flight checklist before starting build

- [ ] Supabase project created and v7 migration deployed
- [ ] Yourself added to `admin_users` table
- [ ] Stripe account created with test mode enabled
- [ ] ntfy.sh or Pushover set up for cost alerts
- [ ] Vercel account created (free tier)
- [ ] GitHub repo initialized for the web app
- [ ] `secrets/.env.local` populated with all keys (Supabase, Stripe, Anthropic, OpenAI)
- [ ] Foundation doc + this addendum + v7 migration saved in `docs/`
- [ ] CLAUDE.md updated to reflect web stack

---

*Addendum version: 1.0 — paired with foundation doc v1.18 + SQL migration v7*
