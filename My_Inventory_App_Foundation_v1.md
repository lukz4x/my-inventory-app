# My_Inventory_App — Foundation Document

> **⚠️ WEB PIVOT NOTICE (v1.19):** v1 ships as a **Next.js Progressive Web App**, not native iOS. iOS native is deferred to v2. See `Web_v1_Addendum.md` for what overrides this doc:
>
> - **Section 14 (SwiftUI architecture)** → use Web Addendum Section 4
> - **Section 15 (visual design system)** → use Web Addendum Section 5
> - **Section 16 (StoreKit/IAP)** → use Web Addendum Section 6
> - **Free tier** is now **20 image AI Captures lifetime** (not 500). Manual entry, photos, search, and text classification remain unlimited.
> - **Payment processor** is **Stripe**, not Apple IAP.
> - **Pack pricing** is **$9.99 / 1,000 scans**, never expires. No subscription in v1.
> - **Global cost cap** is **$1,200/month** with phone push alerts at 50/75/90%.
> - **SQL migration is now v7** (`My_Inventory_App_v7_migration.sql`) — adds system_config, admin_users, admin helper functions, and lowers free-tier seed to 20.
>
> Everything else in this doc (mental model, schema, UX flows, AI pipeline, telemetry) applies as written.

---

**Step 1 Status:** Mental Model & Architecture — LOCKED
**Next:** Step 2 — Core Flows (starting with Add Item)

---

## 1. Product Vision

A camera-first mobile app that lets users:
- Capture what they own by pointing their phone
- Organize things by named "Spaces" (with optional sub-spaces to unlimited depth)
- Find any item in seconds

**First killer use case:** "I own three hammers. Which one is in which toolbox?"

**Real product promise:** "I don't need to remember anymore." Retrieval speed is as important as capture speed — both are first-class KPIs.

**Strategic positioning:** Not an inventory app. A **structured household data platform** with a camera-first UX — an operating system for your physical stuff.

---

## 2. Target User & Distribution

- **v1 user:** Lucas himself (builder = first user).
- **Distribution intent:** App Store launch, product from day one.
- **Build model:** Solo + Claude Code (~99% of coding).
- **Pace:** A few hours per week, casual.
- **Realistic timeline to App Store:** ~5–6 months, accounting for mobile friction unrelated to coding (provisioning, TestFlight, App Store review).

---

## 3. Technology Stack (Locked)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Swift + SwiftUI (iOS 17+) | Native feel (HomeKit-style) only achievable this way |
| Backend | Supabase (Postgres + Auth + Storage) | Postgres for SQL-heavy queries; portable for Android later |
| Auth | Sign-in with Apple (primary), email (fallback) | App Store requirement if any social auth used |
| AI (naming) | Apple Vision on-device (first pass) + cloud API fallback | Free first pass, paid only when needed |
| Dev tools | Xcode + Claude Code → TestFlight → App Store Connect | — |

**Rejected:** CloudKit (too locked into Apple), React Native (won't match HomeKit feel), Firebase (NoSQL wrong for inventory queries).

---

## 4. Mental Model (Locked)

### Core Concepts

**Household** — Top-level ownership unit. Auto-created at signup. v1: one user per household. Future: multi-user households (schema ready).

**Location** (user-facing: "Space") — Named, icon-tagged container. Hierarchical via `parent_location_id`. No depth cap in schema. UI exposes 2–3 levels comfortably.

**Item** — A single physical thing belonging to exactly one location at any depth. Per-instance by default (three hammers = three items). Quantity >1 only for genuine fungibles (batteries, screws).

**Photo** — Zero or many per item. Exactly one marked primary in v1 UI. `photo_type` field available for future metadata (main, receipt, serial).

**Platform Category** — *Invisible to users.* Hierarchical, emergent from AI (no seed, no fixed taxonomy). Powers analytics, replacement cycles, commerce, data asset value. Embedding-dedup + canonical_name mechanism to control drift.

**User Category** — *Visible to users.* Household-scoped. Free-form organization. AI suggests; user controls.

### Core Rules

1. Every user gets a default household on signup.
2. Every household gets a default "Unsorted" location.
3. AI never blocks item creation — runs async post-save.
4. Items carry **three names**:
   - `name` — user display ("Richard")
   - `ai_suggested_name` — frozen AI snapshot at creation ("hammer")
   - `category_id` — live FK, re-classifiable over time
5. Search looks at all three plus user_category.
6. Usage events emitted from day one (telemetry, not enforcement).
7. Platform categories are platform-wide, not per-household.

---

## 5. Database Schema (Locked)

**Eight custom tables + Supabase's `auth.users`.**

### `households`
id, owner_user_id, name, created_at, updated_at

### `household_members`
id, household_id, user_id, role, created_at

### `locations`
id, household_id, parent_location_id (nullable), name, icon, background_photo_url (nullable), color_tint, sort_order, created_at, updated_at
*(No depth constraint in schema.)*

### `categories` — platform taxonomy
id, name, parent_category_id (nullable), embedding (vector), usage_count, canonical_name (nullable), is_canonical (boolean), created_at
*(Starts empty. Grows emergently via AI. UI targets 3 levels; schema allows more.)*

### `user_categories` — household-scoped
id, household_id, name, created_at, updated_at

### `items`
id, household_id, location_id, name, ai_suggested_name, ai_confidence, ai_source, ai_last_classified_at (nullable), category_id (nullable), user_category_id (nullable), user_category_name_cache (nullable, denormalized for search), quantity (default 1), use_count (default 0), last_used_at (nullable), notes (text, nullable), acquired_at (nullable), last_seen_at, created_at, updated_at, **search_vector (Postgres tsvector, trigger-maintained from name + ai_suggested_name + user_category_name_cache + notes; GIN indexed)**

### `item_photos`
id, item_id, photo_url, is_primary, photo_type (nullable), created_at

### `usage_events`
id, household_id, user_id, event_type, metadata (JSONB), created_at

---

## 6. AI Strategy

### Principle
AI is invisible infrastructure. No "processing..." spinners. No blocking waits. Suggestions appear already filled in, editable.

### Pipeline
1. User takes photo → item saves instantly with whatever name user typed (or blank).
2. Apple Vision (on-device) classifies. High confidence common object → populate `ai_suggested_name`.
3. Low confidence → cloud API fallback.
4. AI generates 3-level category path. Each level embedding-dedup'd against existing. Item links to leaf.
5. AI suggests `user_category`: first matches user's existing user_categories, falls back to leaf platform category name.

### Cost Control
- On-device Vision handles the majority of cases for free.
- Cloud only when necessary.
- `usage_events` tracks every AI call from day one for real cost data.
- Taxonomy canonicalization runs as periodic background job (not at insert).

---

## 7. What's Explicitly NOT in MVP

- ~~Monetization / quotas / scan packs~~ → **NOW IN MVP. See Section 16 (Step 9). Active paid tiers ship in v1 with 500 free AI scans, $7/mo subscription, $9.99 scan pack.**
- Sharing / multi-user households
- Rental / marketplace
- Recommendations / commerce / affiliate
- Reports / insurance exports
- Barcode scanning
- Multi-photo UI *(schema supports; UI shows single primary)*
- Offline-first *(online required in v1)*
- Category management UI *(platform categories fully invisible)*
- Settings beyond account/logout

Every excluded feature has a schema hook — none requires migration to add later.

---

## 8. Phased Roadmap

| Phase | Scope |
|---|---|
| 1 (MVP) | Auth (Apple), Spaces, Items, Photos, Search, AI naming, **paid tiers + scan packs (Section 16)** |
| 2 | Multi-user households, sharing permissions, taxonomy canonicalization workflows, Google + email auth |
| 3 | Pricing optimization based on real v1 cohort data, additional scan pack sizes |
| 4 | Commerce layer (recommendations, replacement-cycle nudges, affiliate) |
| 5 | Marketplace (rent, lend, sell unused items; transaction fees) |
| 6 | B2B data insights (aggregated, anonymized) |

---

## 9. Advisors

- **Clo** (Claude, second advisor): Pushes for simplicity, UI-first thinking, concrete build decisions.
- **Compa** (first advisor): Pushes for platform-grade schema, data asset thinking, future-proofing.

**Framework:** Tension between advisors is productive. Decisions lock when both converge OR when one makes a clearly stronger argument.

---

## 10. Step 2: Core Flows & UI

### 2.0 Home Screen Design — LOCKED

**Visual identity:**
- Background: space photo + color glass overlay (per-space color tint)
- **Home view** is the navigation anchor (always present, always reachable via swipe)
- v1 Home view: minimal background, can show global summary content as it's added in future versions
- v2+ Home enhancements (deferred): global top-3 favorites, recent additions across spaces, total counts

**Inside any space:**
- **Top:** profile/menu icon (left), tappable space name with breadcrumb if nested (center)
- **Main canvas:** sub-space cards/pills if this space has children (max 4–6 visible; if more exist, show "+ X more" card that opens full sub-space list); "+ Add sub-space" card alongside
- **Above search bar:** 3 most-used items in this space (favorite pills with thumbnail + name)
- **Bottom:** persistent search bar with subtle camera icon

**Gestures:**
- Swipe left/right → cycle through Home → Spaces → Add Space → Home (circular, see Add Space flow for full geography)
- Swipe down (top 30% zone) → add item
- Swipe up (bottom 30% zone) → search
- Swipe-from-left-edge or breadcrumb tap → go up one level (within nested sub-spaces)
- Long-press on background → optional camera shortcut (future)

**Gesture activation rules:**
- Gestures only trigger when starting from the background canvas (not on UI elements)
- Velocity/distance threshold required — slow drags are treated as scrolls/ignored, only fast intentional flicks trigger actions
- This prevents accidental activation during exploration and scrolling

**Rule:** Every gesture has a visible UI fallback. Nothing is gesture-only.

---

### 2.1 Add Item Flow — LOCKED

**Goal:** <5 seconds from "I see a thing" to "it's saved," with near-zero thinking.

**Entry Points:**
- Global camera button (always visible)
- Inside-a-location camera button (contextual)
- Swipe-down gesture (top 30% zone)
- "Add new [query]" row in search results (text-only adding)

**Location assignment rules:**
1. Launched from inside a location → save to that location
2. Launched globally → save to last-used location
3. No last-used location → save to "Unsorted"
4. User can change location after capture

**Flow:**
1. User taps camera (or swipes down)
2. Camera opens immediately — no modal, no form
3. User takes photo
4. **Item created immediately in app state** (offline-safe; sync/upload/AI happen afterward)
5. Photo queued for upload to Supabase storage
6. Post-capture view: photo thumbnail, editable name field (focused, empty), tappable location chip, "Saved ✓" + light haptic
7. AI runs in background:
   - Apple Vision on-device first
   - Cloud fallback only on low confidence
   - If user hasn't typed → auto-fill name (fade-in)
   - If user has typed → show suggestion as dismissable chip
8. AI populates `category_id` (platform, invisible) and suggests `user_category_id` (chip)
9. User may optionally: edit name, tap location chip to change, accept/change user_category suggestion
10. No explicit save button

**Field defaults on creation:**
- `name` = empty string
- `location_id` = per rules above
- `ai_suggested_name`, `ai_confidence`, `ai_source`, `ai_last_classified_at` = null until AI runs

**Edge cases:**
- No internet → item created locally, photo queued, AI deferred
- AI fails → no suggestion, `ai_suggested_name` stays null
- User exits immediately → item exists with photo only, intentional
- User types before AI returns → user's text wins, AI becomes suggestion chip

---

### 2.2 Find Item Flow — LOCKED

**Goal:** "I type 2–3 letters and instantly know where my thing is."

**Entry Points:**
- Persistent search bar at bottom of every space view
- Swipe-up gesture (bottom 30% zone)

**Search engine:**
- Postgres `search_vector` (tsvector) on items, trigger-maintained from name + ai_suggested_name + user_category_name_cache + notes
- GIN indexed
- `pg_trgm` extension for typo tolerance
- `unaccent` for accent normalization
- Field weights: name > ai_suggested_name > user_category
- Bonus rank for items in shallower location paths

**Flow:**
1. User taps search bar (or swipes up)
2. Keyboard appears, cursor active
3. User types → results update live (debounced ~150ms)
4. Results in two sections:
   - **Items (primary):** photo, name with highlighted match, full location path (e.g., "Outside Closet → Black Toolbox")
   - **Locations (secondary):** location name with path; tapping shows items in that location immediately
5. **"+ Add new [query]" row always visible below results** — solves the "add another hammer" problem
6. Tap item → item detail; tap location → items in that location

**Default states:**
- Empty query → recently added items (last 10)
- No matching items → still show "+ Add new [query]" prominently
- Offline → search local cache, never blank

**Highlighting:** matched text rendered with emphasis so user trusts the match.

---

### 2.3 Add Space / Sub-Space Flow — LOCKED

**Entry Points (four):**
1. Spaces menu (modal sheet) → "+ Add new space" at bottom
2. Swipe sequence → "+ Add new space" card sits one swipe-left from Home (see swipe geography below)
3. Item edit screen → location picker has "+ New space" inline
4. Inside a space → "+ Add sub-space" card on canvas (for nested locations)

**Swipe sequence geography:**

```
[ Add Space ]  ←  [ Home ]  →  [ Space 1 ]  →  [ Space 2 ]  →  ... →  [ Space N ]
       ↑                                                                      ↓
       └──────────────────────  wraps around  ────────────────────────────────┘
```

- **Home view** is the anchor of the navigation
- **Swipe right from Home** → first space, then cycles through all spaces in order
- **Swipe left from Home** → "+ Add Space" card (visually distinct, e.g., dashed border)
- **Swipe left again from Add Space** → wraps to the last space (full circle)
- **Swipe right from Add Space** → returns to Home (always passes through Home)
- **Swipe right from last space** → wraps to Add Space, then Home on the next swipe

This creates a coherent mental geography: Home is the center, your existing spaces extend to the right (current physical world), the "create new" affordance lives one swipe-left of Home (the make-new direction). Either swipe direction eventually returns you to Home.

**Add Space modal flow:**
1. User triggers Add Space from any entry point (swipe to card + tap, menu, item edit screen, or sub-space canvas card)
2. Modal sheet appears with:
   - Name (required text field)
   - Icon (pick from a curated set; defaults to generic)
   - Background photo (optional: take photo, pick from library, or templated default based on icon)
   - Color tint (auto-assigned from palette; user can change)
   - Parent location (auto-set if creating from inside a space; null otherwise)
3. Save → space exists, joins swipe sequence (if top-level) or appears as sub-space card (if nested)

**Same modal for top-level and sub-space.** Only `parent_location_id` differs.

---

### 2.4 Edit Item Flow — LOCKED

**Item detail screen** opens on tap from any list. Two tabs (segmented control, iOS-native):

**Details tab:**
- Photo (large, top)
- Name (inline-editable)
- Location chip (tappable → picker)
- User category chip (tappable → picker)
- Quantity (steppable)
- Acquired date (optional, date picker)
- **Notes (multi-line text field, expandable, inline-editable)** — for receipts info, warranty details, model numbers, "borrowed from Dad," anything the user wants to remember. Indexed in search_vector.
- Use count + "Last used" subtitle
- "I'm using this" button (one-tap, increments use_count, sets last_used_at, logs event, haptic + "Marked used ✓" toast with Undo)

**History tab:**
- Timeline of `usage_events` for this item: created, moved, used, edited
- Useful for "where did I last see it" / replacement cycle context

Inline-editable fields auto-save on blur. No explicit save button.

---

### 2.5 Move Item Flow — LOCKED

1. Tap item → Details tab
2. Tap location chip → location picker (sheet) with hierarchical list of all spaces
3. Tap destination → `location_id` updated, toast "Moved to [X]"
4. `usage_events` row written: `event_type = 'item_moved'`, metadata = `{from, to}`

Optional fast path (future): swipe-action on item row in list view → "Move to..." chip.

---

### 2.6 Use Tracking — LOCKED

**Schema additions:**
- `items.use_count` (integer, default 0) — fast query for favorites
- `items.last_used_at` (nullable timestamp) — "last used 3 days ago" display
- `usage_events` (existing table) — full historical log of `item_used` events

**UI surfaces:**
- "I'm using this" button on item detail screen (one-tap, undoable)
- Subtle "Last used: X" subtitle on item rows
- Top-3 favorites per space, ranked by use_count (powers the favorites pills above search bar)

**Use-event debounce:**
- An item can log only one `item_used` event per 60 seconds
- Repeated taps within 60s → subtle toast "Already marked used" with option to undo last use
- Prevents accidental double-taps from polluting analytics

**Favorites ranking (deterministic):**
1. `use_count DESC`
2. `last_used_at DESC`
3. `created_at DESC`

This guarantees stable, predictable favorites ordering — never random on ties.

---

## 11. Step 4: Local State & Sync Architecture — LOCKED

### Core principle

The user's phone is the source of truth for *just-now* actions. Supabase is the source of truth for everything older. Sync reconciles them. The user never waits for the network.

### Three data layers

**Layer 1 — In-memory SwiftUI state.** Active view's data; renders the UI; instant updates.

**Layer 2 — Local persistence (SwiftData).** Items, locations, photo file URLs, pending sync operations. Survives app restarts. The "offline cache + outbox."

**Layer 3 — Supabase (Postgres + Storage).** Cloud truth. Synced from Layer 2 via background tasks.

Every user action mutates Layer 1 immediately, persists to Layer 2 within milliseconds, and queues a sync operation to Layer 3.

### Two queues (separate by design)

**Photo upload queue:** Photo file written to local app storage immediately. Row added to `pending_uploads` (SwiftData) with status "queued." `URLSession` background-configured task uploads to Supabase Storage. On success, row marked uploaded and item's `photo_url` updated. On failure, exponential backoff retry.

**Sync queue:** Every database mutation creates a row in `pending_sync_operations` (SwiftData) with operation type, payload, idempotency key. Background sync worker drains the queue when network is available. Successful operations are deleted; failed operations retry with backoff.

Photos are large/slow; mutations are small/fast. Mixing them means small edits wait behind large photo uploads.

### "Item created immediately" mechanism

1. User taps capture
2. Local UUID generated (not waiting for Supabase to assign one)
3. Item row written to SwiftData with that UUID
4. UI renders from SwiftData (item exists at this point)
5. Photo file saved locally with item UUID reference
6. Photo upload queued
7. Sync operation queued (insert item)
8. Background worker eventually pushes both to Supabase
9. On confirmation, local `synced_at` timestamp is set

User-visible item exists at step 4. Steps 5–9 happen in milliseconds to minutes, invisibly.

### Conflict rules

**User-edited fields** (name, location, user_category, notes, quantity, etc.): last-write-wins by `updated_at`.

**User counters** (use_count, last_used_at): **local-first, server reconciles.** User taps "I'm using this" → local increments immediately (UI updates instantly) → sync queues a use event with idempotency key → server applies the event once → server's count becomes authoritative for *future* reads. If server returns a different value (e.g., parallel device increment), local quietly adopts.

**System fields** (category_id from AI, search_vector maintained by Postgres trigger): server authoritative, local reflects.

### App close / kill scenarios

- **App closed mid-upload:** SwiftData persisted before upload started. URLSession background uploads continue after app close on iOS. Pauses and resumes when app reopens or on next background task wake.
- **App force-killed mid-capture:** If item row written to SwiftData (step 3), it persists. Window before that is <100ms; rare loss is acceptable.
- **Offline indefinitely:** All operations queue. App fully functional. Queue drains when connectivity returns. Quiet badge if queue grows unreasonably (>1000 ops).

### Build-ready decisions

| Concern | Decision |
|---|---|
| Local persistence | SwiftData |
| Background uploads | URLSession with `backgroundSessionConfigurationWithIdentifier` |
| Network detection | `NWPathMonitor` from Network framework |
| Sync triggers | App launch, app foreground, network reachability change, manual pull-to-refresh |
| Retry policy | Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 60s max), 5 attempts before flagging |
| Queue persistence | SwiftData (survives app restart) |
| Idempotency | Client-generated UUIDs for all primary keys; sync ops include UUIDs |

### Components Claude Code will need to build

- SwiftData models matching Supabase schema (with local-only fields: `synced_at`, `local_uuid`)
- Two queue tables (`pending_uploads`, `pending_sync_operations`) with status state machines
- A `SyncCoordinator` actor draining queues in background
- A `PhotoUploadCoordinator` using URLSession background tasks
- Network reachability detection wrapper around NWPathMonitor
- Optimistic UI patterns: every mutation goes through SwiftData first
- Idempotency keys on sync operations so retries don't duplicate

### Deliberately not in v1

- Real-time multi-device sync (Phase 2+ when households ship)
- CRDTs (overkill for single-user)
- Offline-first frameworks like Replicache or PowerSync (extra deps, overkill)
- Custom merge logic beyond last-write-wins

---

## 12. Step 3: AI Pipeline — LOCKED

### Core principle

Every item gets classified — with or without a photo. AI never blocks the user. Classification populates the data asset for analytics, replacement cycles, and future monetization.

### Three-name model (recap from Step 2)

- `name` — what the user typed (or empty). Always wins for display.
- `ai_suggested_name` — frozen snapshot of AI's identification at creation time.
- `category_id` — live FK to platform taxonomy, re-classifiable.

### Pipeline cases

**Persistent rule (do not regress):** Text-only classification runs in every case where it provides categorization signal — even when Vision succeeds in Case 1. Skipping it for cost optimization is a future decision based on real telemetry, not a default.

**Case 1 — Photo + high-confidence Vision (≥0.7)**
1. Apple Vision (`VNClassifyImageRequest`) classifies on-device
2. Set `ai_suggested_name` = Vision label, `ai_source` = `vision_local`, `ai_confidence`, `ai_last_classified_at`
3. Run **text-only** category classification on the Vision label (cheap cloud call, no image)
4. Embedding-dedup the returned 3-level category path
5. Set `category_id` to leaf, suggest `user_category_id`

**Case 2 — Photo + low-confidence Vision (<0.7) or denylisted label**
1. Run cloud vision classification (full image, expensive call)
2. Returns `ai_suggested_name` and `category_path` in one response
3. Set `ai_source` = `vision_cloud`, populate confidence and timestamp
4. Embedding-dedup, set `category_id`, suggest `user_category_id`

**Case 3 — No photo, user-typed name**
1. Apply vague-input guardrail (see below); skip if too generic
2. Run text-only classification on the typed name
3. Set `ai_suggested_name` (normalized, e.g., "key" from "spare house key"), `ai_source` = `text_only`
4. Embedding-dedup category path, set `category_id`, suggest `user_category_id`

**Case 4 — No photo, no name** (user exited Add Item before typing)
- Skip classification entirely; all AI fields null
- Eligible for re-classification when user later adds name or photo

### Vague-input guardrail

Skip classification when input matches:
- Denylist: `thing, stuff, item, object, X (something), my X (where X<3 chars)`
- Single proper noun (capitalization heuristic)
- String length < 3 characters
- Pure numerics or symbols

When skipped: leave all AI fields null. Eligible for retry on next user edit.

### Better-signal preference (Case 1 + Case 3 conflict)

When user typed AND Vision succeeded:
- Run text-only classification on *both* inputs
- Use whichever produces higher-confidence leaf category match for `category_id`
- User's typed text always wins for `name`
- Vision label always goes to `ai_suggested_name`

### Cloud vision prompt (Case 2)

```
You are identifying a household object from a photo for an inventory app.

Return JSON with exactly these fields:
{
  "name": "specific item type, lowercase, singular (e.g., 'hammer', 'toaster', 'cordless drill')",
  "confidence": 0.0 to 1.0,
  "category_path": ["broad", "mid", "specific"]
}

Rules:
- Use specific item types like 'hammer', 'toaster', 'shirt' — never generic classes like 'object', 'thing'
- category_path is exactly 3 levels, broadest to most specific
- Match these existing categories when they fit (sample of current taxonomy):
  [INJECTED: top 30 most-used categories by usage_count, with their full paths]
- Only propose a new category if no existing category fits
- Return ONLY the JSON object, no commentary
```

The `[INJECTED: ...]` is replaced at call-time with the current taxonomy snapshot from a Supabase endpoint that returns the top 30 categories by `usage_count`. Anchors AI to the existing taxonomy, prevents drift.

### Text-only classification prompt (Cases 1 & 3)

```
Classify this item name into a 3-level category path for a household inventory app.

Item name: "[INPUT]"

Return JSON:
{
  "category_path": ["broad", "mid", "specific"],
  "confidence": 0.0 to 1.0
}

Rules:
- Use existing categories when they fit:
  [INJECTED: top 30 categories]
- Only propose new if no existing fits
- Return ONLY the JSON
```

### Embedding dedup (Stage 3, all cases)

For each level of the returned `category_path`, in order (broad → mid → specific):
1. Generate embedding for the proposed name (`text-embedding-3-small` or equivalent)
2. Query existing categories at that level (filtered by parent_category_id)
3. Compute cosine similarity to existing category embeddings
4. If max similarity ≥ 0.85: use the existing category, increment `usage_count`
5. If max similarity < 0.85: insert as new category at that level, store embedding, set `usage_count = 1`

Item's `category_id` = leaf (level 3) category.

### User-category suggestion

After `category_id` is set:
1. Fetch household's existing user_categories
2. Embed each (cached after first calculation)
3. Embed the platform leaf category name
4. Find user_category with highest cosine similarity
5. If similarity ≥ 0.7: that user_category becomes the chip suggestion
6. If similarity < 0.7: suggest creating a new user_category named after the platform leaf

User accepts, changes, or dismisses. No auto-assignment.

### Re-classification

**No automatic cron jobs in v1.** Re-classification triggers:
- User opens an item where `category_id = null` → background classification job queued
- Admin-triggered batch when classifier improves
- User edits item name → trigger re-classification

This avoids surprise AI costs while still keeping data current as users engage.

### Cost model

| Path | Vision call | Text classification | Embeddings | Total |
|---|---|---|---|---|
| Case 1 (Vision succeeds) | $0 | ~$0.001 | ~$0.0001 | ~$0.0011 |
| Case 2 (cloud vision) | ~$0.01 | bundled | ~$0.0001 | ~$0.0101 |
| Case 3 (text-only) | $0 | ~$0.001 | ~$0.0001 | ~$0.0011 |
| Case 4 (skip) | $0 | $0 | $0 | $0 |

Realistic mix at scale: 60% Case 1 + 30% Case 2 + 10% Case 3 = **~$0.0042 average per item**.

For 500–5000 scans/user range: $2–$22 per heavy user. Validates the original monetization model (heavy users must be paying users for unit economics).

### Locked numbers

| Decision | Value |
|---|---|
| Vision confidence threshold | 0.7 |
| Embedding similarity for dedup | 0.85 |
| User-category suggestion threshold | 0.7 |
| Vague-input guardrail | denylist + heuristics |
| Re-classification | manual/lazy only, no automation |
| Embedding model | text-embedding-3-small or equivalent |
| Vision/text APIs | decided at build time on cost/latency |
| Vision-label denylist | rectangle, indoor, outdoor, scene, object, [scene types] |

### Components Claude Code will need

- `AIClassifier` actor with `classify(itemId:photoURL?:userText?:)` orchestrating cases 1–4
- `VisionClassifier` wrapper around `VNClassifyImageRequest`
- `CloudVisionClassifier` wrapper around chosen vision API (Case 2 prompt)
- `TextClassifier` wrapper around chosen text-only API (Cases 1 & 3 prompt)
- `EmbeddingService` for dedup (results cached locally and on server)
- `CategoryReconciler` Supabase Edge Function: takes a category_path, returns category_ids after dedup, increments usage_counts
- `taxonomy-top-30` Supabase endpoint returning the current top categories for prompt injection
- Vague-input guardrail function (pure Swift, no API)

### Deliberately not in v1

- Multi-photo classification (only first/primary photo)
- User feedback loop ("was this right?") — Phase 2 once we have data
- Custom fine-tuned models — Phase 4+
- Brand/model identification — useful for commerce, not v1
- OCR for serial numbers — Phase 2

---

## 13. Step 5: Telemetry / Usage Events Spec — LOCKED

### Core principle

Every meaningful user action and system action emits a row to `usage_events`. We capture from day one, even though we won't enforce limits or charge in v1. The data exists so v2 pricing decisions are made from real numbers, not guesses.

### Event types (final enumeration — 20 types)

**User actions (behavior stream):**
- `item_created` — new item added
- `item_viewed` — user opened item detail screen
- `item_used` — user marked item as used
- `item_moved` — item's location_id changed
- `item_edited` — name, notes, category, quantity, etc. changed
- `item_deleted` — item soft- or hard-deleted
- `space_created` — new location added
- `space_edited` — location renamed, photo changed, etc.
- `space_deleted` — location deleted
- `search_performed` — user submitted a search query
- `search_result_clicked` — user tapped a search result
- `photo_added` — additional photo added to existing item
- `photo_replaced` — primary photo replaced

**System actions (cost + performance stream):**
- `ai_scan_local` — Apple Vision call attempted
- `ai_scan_cloud` — cloud vision API call made
- `ai_text_classify` — text-only classification call made
- `embedding_generated` — embedding API call made
- `photo_uploaded` — photo successfully uploaded to Supabase Storage
- `sync_completed` — sync queue drained successfully
- `sync_failed` — sync error after retry exhaustion

### Common fields (all events)

Every event row includes:
- `id` (UUID, client-generated, idempotent)
- `household_id`
- `user_id`
- `event_type`
- `session_id` (UUID generated on app launch, attached to all events that session)
- `metadata` (JSONB, schema per event type)
- `created_at`

### Metadata schemas (per event type)

```
item_created:
  { item_id, location_id, has_photo, has_text, source: "camera"|"swipe"|"text"|"add_new_in_search" }

item_viewed:
  { item_id, source: "search"|"space"|"favorites"|"sub_space"|"deeplink", position: 0-N }

item_used:
  { item_id }

item_moved:
  { item_id, from_location_id, to_location_id }

item_edited:
  { item_id, fields_changed: ["name","notes","category_id",...] }

item_deleted:
  { item_id, location_id_at_deletion }

space_created:
  { location_id, parent_location_id, has_photo }

space_edited:
  { location_id, fields_changed: ["name","photo","color_tint",...] }

space_deleted:
  { location_id, items_count_at_deletion }

search_performed:
  { query, results_count }

search_result_clicked:
  { query, item_id_or_location_id, position, result_type: "item"|"location"|"add_new" }

photo_added:
  { item_id, photo_id, photo_type }

photo_replaced:
  { item_id, photo_id }

ai_scan_local:
  { item_id, confidence, label, latency_ms }

ai_scan_cloud:
  { item_id, provider: "claude"|"openai", input_tokens, output_tokens, latency_ms, success }

ai_text_classify:
  { item_id, source_text_length, provider, latency_ms, success }

embedding_generated:
  { purpose: "category_dedup"|"user_category", input_token_count, latency_ms }

photo_uploaded:
  { item_id, photo_id, file_size_bytes, latency_ms }

sync_completed:
  { ops_count, duration_ms }

sync_failed:
  { op_type, error_class, retry_count }
```

### Privacy considerations

- `search_performed.query` captures actual search text. **Stored locally and in user's own Supabase rows only — never synced to third-party analytics.**
- `ai_text_classify` logs `source_text_length`, not the source text itself, to avoid duplicating user content in telemetry.
- Metadata never contains PII like emails or full names. Item names/details are queryable from the items table when needed; the telemetry stream stays lean.

### Volume & retention

- Realistic load: ~10–50 events per active user per day = ~15M events/month at 10k users
- Postgres handles this trivially with the indexes below for years
- v1 retention: keep everything
- Revisit at ~100M rows with monthly partitioning by `created_at`

### Indexes (build from day one)

- B-tree on `(household_id, created_at DESC)` — primary access pattern
- B-tree on `(user_id, created_at DESC)` — user-level views
- B-tree on `(event_type, created_at DESC)` — cohort/cost analytics
- B-tree on `(session_id)` — session reconstruction
- GIN on `metadata` — JSONB queries

### Emit timing & ownership

- **User actions** emit from the SwiftUI view layer / mutation handler, persisted to SwiftData first, then synced to Supabase like any other write
- **System actions** emit from the relevant coordinator (PhotoUploadCoordinator, AIClassifier, SyncCoordinator)
- All events use client-generated UUIDs, idempotent on retry
- `session_id` generated on app launch, regenerated when app returns from background after >30 min idle

### Components Claude Code will need

- `TelemetryService` (Swift): single `track(eventType:metadata:)` method. Handles UUID, session_id, household/user injection, SwiftData persistence, sync queue insertion.
- `SessionManager` (Swift): generates and persists session_id; rotates on background-foreground if stale.
- Supabase RPC or Edge Function for batch event inserts (more efficient than row-at-a-time).

### What we'll use this data for

**v1 (pre-launch + early users):**
- Cost validation: AI burn per user vs. expected
- "<5 sec add" validation: `created_at` to first edit time
- Add Item flow funnel: how many users abandon mid-flow

**v2 (when shipping pricing):**
- Scan distribution cohorts → free-tier line
- Behaviors that precede paid conversion
- Cost-per-active-user reality check

**v3+:**
- Replacement cycle data (last_used_at + acquired_at)
- Retention metrics
- Feature usage prioritization

### Deliberately not in v1

- Separate analytics service (Mixpanel, Amplitude) — Postgres is enough until 100k+ users
- Real-time dashboards — query when needed
- Event versioning — premature; migrate metadata if needed
- A/B testing framework — not enough users to matter
- Crash reporting — TestFlight covers v1; add Sentry/Bugsnag in Phase 2
- Funnel definitions in schema — derive from raw events at query time
- Precomputed aggregates — premature

### Locked decisions

| Decision | Value |
|---|---|
| Storage | `usage_events` table in Supabase, mirrored to SwiftData as outbox |
| Event type list | 20 event types as enumerated above |
| Metadata format | JSONB with documented per-event-type schemas |
| Common fields | id, household_id, user_id, event_type, session_id, metadata, created_at |
| Search query storage | local + user's own Supabase only; never third-party |
| Retention | keep everything in v1; partition at 100M rows |
| Indexes | (household_id, created_at), (user_id, created_at), (event_type, created_at), (session_id), GIN(metadata) |
| Emit timing | every meaningful action, system or user, from day one |

---

## 14. Step 8: SwiftUI Architecture — LOCKED

### Architectural pattern

**Feature-based MVVM-lite with `@Observable` models** (iOS 17+ Observation framework).

- Not one ViewModel per screen — one model per feature area
- Views stay thin (rendering + gestures + calls into models)
- Feature models hold state and orchestrate; coordinators handle async cross-cutting work
- No legacy `ObservableObject` / `@Published` / `@StateObject` / `@ObservedObject`

Feature models in v1: `SpaceModel`, `ItemDetailModel`, `SearchModel`, `AddItemModel`, `SessionModel`.

### Data source of truth

**SwiftData is durable local truth; feature models expose view state.**

- Views never read or write SwiftData directly
- Feature models query SwiftData, cache curated state, expose it as `@Observable` properties
- All mutations go through feature models, which write to SwiftData and queue sync
- Preserves clean seams for sync, search, and testing

### Project folder structure

```
MyInventoryApp/
├── App/
│   ├── MyInventoryAppApp.swift
│   ├── AppRoot.swift
│   └── Environment+Keys.swift
├── Models/
│   ├── SwiftData/                      (local persistence entities)
│   │   ├── ItemEntity.swift
│   │   ├── LocationEntity.swift
│   │   ├── PhotoEntity.swift
│   │   ├── PendingSyncOperation.swift
│   │   └── PendingUpload.swift
│   ├── Domain/                         (@Observable feature models)
│   │   ├── SpaceModel.swift
│   │   ├── ItemDetailModel.swift
│   │   ├── SearchModel.swift
│   │   ├── AddItemModel.swift
│   │   └── SessionModel.swift
│   └── DTOs/                           (Supabase request/response shapes)
├── Coordinators/                       (actors for cross-cutting async)
│   ├── SyncCoordinator.swift
│   ├── PhotoUploadCoordinator.swift
│   ├── AIClassifier.swift
│   ├── TelemetryService.swift
│   └── NetworkMonitor.swift
├── Services/                           (external API wrappers)
│   ├── SupabaseService.swift
│   ├── VisionClassifier.swift
│   ├── CloudVisionClassifier.swift
│   ├── TextClassifier.swift
│   ├── EmbeddingService.swift
│   └── KeychainService.swift
├── Views/
│   ├── Home/
│   ├── Space/
│   ├── Item/
│   ├── AddItem/                        (includes UIKit/AVFoundation camera wrapper)
│   ├── AddSpace/
│   ├── Search/
│   ├── Auth/
│   └── Shared/
├── Gestures/
├── DesignSystem/
└── Resources/
```

### Navigation model

**State-driven, not stack-driven.**

- `TabView` with `.tabViewStyle(.page)` for the horizontal swipe between spaces
- Circular index logic for the Add Space ← Home → Spaces → Add Space wrap
- Sheets / full-screen covers bound to optional state on a top-level `Navigation` model
- No `NavigationStack` path manipulation; all presentation is bound to model state

Top-level structure:

```
AppRoot
├── (if not authed) SignInView
└── (if authed) MainPager
    ├── AddSpaceSlide   (index -1)
    ├── HomeSlide       (index 0, anchor)
    ├── SpaceSlides     (indices 1...N, dynamic)
    └── (wraps to AddSpaceSlide)
```

Modals (Add Space, Search, Item Detail, Camera) overlay any slide via state-bound sheets from `AppRoot`.

### Data flow (canonical mutation path)

1. View calls a method on its feature model (e.g., `spaceModel.addItem(photoURL:)`)
2. Model writes to SwiftData immediately and updates its own `@Observable` state
3. Model fires async work to relevant Coordinator
4. Coordinator calls Service layer (Supabase, Vision API, etc.)
5. On completion, Coordinator writes back to SwiftData
6. Feature model observes SwiftData change, updates view state, view re-renders

**Invariant:** views never bypass feature models to write data.

### State management rules

- `@Observable` for feature models
- `@Environment` for app-wide singletons (coordinators, session)
- `@State` for transient UI only (text field contents, sheet flags)
- `@Bindable` for two-way binding to a feature model field
- Banned: `@StateObject`, `@ObservedObject`, `@Published`

### Concurrency rules

- All async work goes through actors (Coordinators are actors)
- Views call coordinator methods with `Task { await ... }`
- SwiftData operations on main actor
- Network and AI calls off main actor
- `@MainActor` only where strictly required for UI

### Camera implementation

**UIKit/AVFoundation interop is acceptable and expected for camera capture.**

- `PhotosPicker` (SwiftUI native) for library selection
- Custom capture wraps `UIImagePickerController` or `AVCaptureSession` via `UIViewControllerRepresentable`
- This is the standard pattern, not a fallback — Claude Code should not contort to avoid UIKit here

### Authentication flow

- Sign-in with Apple via Supabase Auth
- Session token in Keychain
- `SessionModel` (`@Observable`) reflects auth state
- `AppRoot` switches between SignInView and MainPager on `SessionModel.isAuthenticated`
- No deep nav hierarchy for auth — binary switch

### Error handling philosophy

The user should rarely see error messages.

- **Sync errors:** silent retry with backoff; surface only if queue >1000 ops
- **AI errors:** silent failure; AI fields stay null
- **Network errors:** silent (offline-first); never show "no connection" warnings unless user is in a flow requiring network (manual sign-in)
- **Auth errors:** surface immediately
- **Photo upload errors:** silent retry; user sees the photo locally regardless

### Testing strategy

- Unit tests for: Coordinators, Services, AI guardrail logic, embedding dedup, sync conflict rules
- No UI tests in v1 (low ROI)
- Mock SupabaseService for tests, no integration tests against real Supabase
- TestFlight is the primary QA channel

### Build order (12 incremental steps)

Each step ships to TestFlight as a working (limited) app:

1. App entry, environment setup, design system constants
2. SwiftData entities matching Supabase schema
3. SupabaseService with auth
4. SignInView + auth flow
5. Skeleton MainPager with empty Home and one Space slide
6. SpaceModel + SpaceView reading from SwiftData
7. Add Item flow: Camera → SwiftData write → SyncCoordinator queue
8. Item detail
9. Search
10. AI pipeline integration
11. Telemetry instrumentation throughout
12. Polish (animations, haptics, glass overlay, gestures)

### Locked decisions

| Decision | Value |
|---|---|
| Pattern | Feature-based MVVM-lite with @Observable models |
| Navigation | State-driven; TabView page style for spaces; sheets for modals |
| Persistence | SwiftData (durable local truth); feature models expose view state |
| Concurrency | Actors for cross-cutting async; main actor for UI |
| Camera | UIKit/AVFoundation interop accepted as standard |
| Auth | Sign-in with Apple via Supabase Auth, Keychain for tokens |
| Min iOS | iOS 17+ |
| Tests | Unit only on Coordinators/Services; no UI tests in v1 |
| Folder structure | As specified above |
| Build order | 12-step incremental, each shippable |

### Deliberately not in v1

- TCA / Redux / heavyweight architectural patterns
- Coordinators in the routing sense (used only for async work here)
- Custom DI framework (environment + initializers are sufficient)
- Modular SwiftPM packages (single app target until proven necessary)

---

## 15. Step 6: Visual Design System — LOCKED (light pass)

### Color system

**Backgrounds:** space views use a photo (user or templated) + glass overlay (`.ultraThinMaterial`) tinted by the space's color. Home view uses a neutral dark background, no tint.

**Tint palette** — six soft, low-saturation colors. Auto-assigned to new spaces in rotation; user can change.

| Name | Hex | Suggested use |
|---|---|---|
| Sage | `#7BA886` | greens, gardens, outdoor |
| Slate | `#6B7B8C` | neutrals, garage, workshop |
| Clay | `#B8866D` | warm, kitchen, dining |
| Lilac | `#9A8AB8` | cool, bedroom, closet |
| Sand | `#C4A875` | warm-neutral, office, study |
| Mist | `#7B9AA8` | cool-neutral, bathroom, utility |

Tints applied at ~30% opacity over the photo, mixed with glass material.

**Neutral grays:**

| Token | Value | Use |
|---|---|---|
| Ink | `#1A1A1F` | primary text on light surfaces |
| Slate-Text | white @ 95% | text on glass/dark |
| Subtle | white @ 60% | secondary text on glass |
| Faint | white @ 30% | dividers, hairlines |

**Semantic:** one accent (`Color.accentColor`, system blue). One destructive (system red).

### Typography

System font (SF) only. Three roles:

- **Title** — `.system(.title2, design: .rounded, weight: .semibold)` — space names, item names in detail
- **Body** — `.system(.body)` — primary content, rows, search results
- **Caption** — `.system(.footnote)` — metadata, location paths, "last used X"

Rounded for titles only.

### Spacing

8pt grid. Padding values: 8 / 16 / 24 / 32. No other values. Card radius: 16pt. Pill radius: `.capsule`.

### Components (naming only — Claude Code implements)

- `GlassOverlay` — tinted material backdrop on every space view
- `LocationChip` — pill, breadcrumb or single location, tappable
- `CategoryChip` — pill, user_category name, tappable
- `FavoritePill` — thumbnail + name, used in top-3 favorites row
- `SubSpaceCard` — larger card with optional photo, label, item count
- `AddCard` — dashed border, icon-forward; used for "+ Add space/sub-space"
- `SearchBar` — bottom-anchored, system style with subtle custom background
- `ItemRow` — horizontal: photo, name, secondary line (last used / location path)
- `ToastBanner` — short-lived top notification with optional Undo

### Iconography

SF Symbols only. Anchors:

| Use | Symbol |
|---|---|
| Default space | `house.fill` |
| Unsorted location | `tray` |
| Camera | `camera.fill` |
| Search | `magnifyingglass` |
| Add | `plus` |
| Use marker | `hand.raised.fill` |
| Settings/profile | `person.crop.circle` |

### Animation

- Default: `.easeInOut(duration: 0.25)` for all transitions
- Pager: native `TabView(.page)`, no override
- Sheets: native iOS animation
- Haptics: `.light` on taps, `.success` on "Saved" / "Marked used"
- AI suggestion fade-in: 0.3s opacity
- No spring physics, no custom animations in v1

### Dark mode

Automatic via system colors. Tint palette works on both. Photos stay photos. Glass auto-adjusts. No separate design pass needed.

### Locked decisions

| Decision | Value |
|---|---|
| Tint palette | 6 colors as specified |
| Tint opacity | 30% over photo + `.ultraThinMaterial` |
| Font | System SF only |
| Type sizes | Title (rounded), Body, Caption |
| Spacing | 8pt grid: 8 / 16 / 24 / 32 |
| Card radius | 16pt |
| Pill radius | `.capsule` |
| Icons | SF Symbols only |
| Animation default | `.easeInOut(duration: 0.25)` |
| Dark mode | Automatic |

### Deliberately not in v1

- Custom font exploration
- Custom icon set
- Spring/elastic animations
- Theme switcher
- Pixel-perfect mockups
- Custom splash screen

---

## 16. Step 9: Account Creation, Tiers, and AI Scans — LOCKED

### Core principle

Every paid AI call (cloud vision, text classification, embeddings) deducts AI scans from the user's balance. Free tier ships with a fixed allotment. When scans run low, the app proactively prompts upgrade. When scans hit zero, AI features degrade gracefully — the app still works, just without AI suggestions.

### User-facing language

- **User-facing term:** "AI scans"
- **Internal code term:** `credits` (more abstract, easier to evolve)
- Every UI string says "AI scans"

### Tier structure (v1)

**Free tier (default at signup):**
- **500 AI scans, lifetime** (not monthly reset)
- All other features unlimited: spaces, items, photos, search
- Soft prompt at 400 scans used (80% threshold)
- Hard wall at 0 — AI paused, app fully functional

**Pro Monthly:** $7/month — 500 scans per billing cycle, refilled at renewal, unused do not roll over.

**Pro Annual:** $60/year (30% discount on monthly billing) — same 500 scans/month rule. Refilled monthly, not 6,000 upfront, unused do not roll over.

**Pack:** $9.99 one-time — 1,000 scans, **never expire**, accumulate on top of any subscription allotment.

### Cost per call (in scans)

| Call | Cost |
|---|---|
| Apple Vision (on-device, Case 1) | 0 |
| Cloud vision call (Case 2) | 5 |
| Text classification (Cases 1 & 3) | 1 |
| Embedding generation | 1 each (~3 per item) |

Average per item: ~6 scans. So 500 free scans ≈ 80 items added with full AI. Enough for a kitchen + closet — real value before the wall.

### Pricing math

- Real cost per scan: ~$0.001–0.002
- $9.99 pack / 1,000 scans = $0.01/scan charged. After Apple's cut: ~$7–8.49 net. Comfortable margin.
- Subscription: $7/mo / 500 scans = $0.014/scan charged. Profitable from day one even on heaviest users.

**Worst-case viral scenario:** 10,000 free signups all burning 500 cloud-heavy scans = ~$10k exposure. Bounded. Survivable. **This is what the scan limit buys: a hard ceiling on viral-day disaster.**

### Schema additions (v1)

**`user_subscriptions` (one row per user, auto-created on signup):**
- id (uuid)
- user_id (FK to auth.users)
- tier ('free' | 'pro_monthly' | 'pro_annual')
- status ('active' | 'expired' | 'cancelled' | 'in_grace_period')
- credits_balance (integer, default 500)
- credits_reserved (integer, default 0)
- credits_lifetime_used (integer, default 0)
- current_period_started_at (nullable timestamptz)
- current_period_ends_at (nullable timestamptz)
- apple_transaction_id (nullable)
- apple_original_transaction_id (nullable)
- created_at, updated_at

**`credit_reservations` (two-phase commit for AI calls):**
- id (uuid)
- user_id (FK)
- amount (integer)
- reason (text: 'cloud_vision', 'text_classify', 'embedding')
- status ('reserved' | 'committed' | 'released')
- expires_at (timestamptz, default now() + 60s)
- created_at

**`credit_transactions` (audit trail, append-only):**
- id (uuid)
- user_id (FK)
- amount (integer, positive = added, negative = spent)
- transaction_type ('signup_grant', 'subscription_refill', 'pack_purchase', 'ai_scan', 'release_reservation')
- reference_id (nullable, links to reservation or apple_transaction_id)
- balance_after (integer)
- created_at

### Reservation pattern (race-safe AI calls)

Every AI call follows this sequence:

1. **Reserve:** atomic UPDATE on user_subscriptions sets `credits_balance -= cost` AND `credits_reserved += cost` if balance >= cost. Insert a credit_reservations row.
2. **Run AI call:** make the actual API request.
3. **Success → Commit:** UPDATE reservation status='committed', UPDATE user_subscriptions sets `credits_reserved -= cost`, INSERT credit_transactions row.
4. **Failure → Release:** UPDATE reservation status='released', UPDATE user_subscriptions sets `credits_balance += cost` AND `credits_reserved -= cost`, no transaction recorded.
5. **Timeout (60s):** background job auto-releases unreleased reservations.

This eliminates double-deduction, charge-on-failure, and race conditions. All steps are atomic Postgres updates inside Edge Functions running with service_role.

### UI balance display

Show user a single number: `available + reserved`. Reservations resolve in seconds. Three-number reality stays internal.

### Telemetry events (additions to Step 5 spec)

- `credits_reserved` — { amount, reason }
- `credits_deducted` — { amount, reason, balance_after }
- `credits_released` — { amount, reason }
- `credits_purchased` — { amount, source: 'subscription_renewal' | 'pack_1000' | 'subscription_signup', apple_transaction_id }
- `subscription_started` / `subscription_renewed` / `subscription_cancelled` / `subscription_expired`
- `paywall_shown` — { trigger: 'scans_low' | 'scans_exhausted' | 'manual_upgrade' }
- `paywall_dismissed` / `paywall_converted` — funnel analysis

### Paywall UX

**Soft prompt at 400/500:** non-blocking banner — "You've used 80% of your free AI scans. Upgrade to keep adding items with AI." Shown once per session, max once per day.

**Hard wall at 0 scans:**
- Item still saves (capture is sacred)
- AI fields stay null
- Toast: "AI suggestions paused — upgrade for more"
- Persistent badge on item: "Tap to identify" → upgrade prompt
- App fully functional in all other ways

**Upgrade screen (single screen):**
- Header: "Upgrade MyInventoryApp"
- **Pro Monthly** — $7/month — 500 AI scans/month
- **Pro Annual** — $60/year — same 500/month, save 30%
- **Scan Pack** — $9.99 one-time — 1,000 AI scans, never expire
- Restore Purchases link
- Privacy / Terms links

### Onboarding flow (3-screen welcome)

**Screen 1 — Promise:**
- Background: subtle photo or animated illustration
- Headline: "Find anything you own in seconds"
- Subhead: "Take a photo. Let AI organize it. Never lose a hammer again."
- Button: "Get started"

**Screen 2 — Sign in:**
- Sign in with Apple button (large, primary)
- Privacy and Terms links (small, footer)
- After successful auth → Screen 3

**Screen 3 — First space:**
- Headline: "Where do you want to start?"
- Three cards: 🛠️ Garage / 🍳 Kitchen / 👕 Closet
- "Or name your own" tappable text
- Selecting → space created → drop into space view with camera prominent

### Auth (v1: Apple only)

- Sign in with Apple via AuthenticationServices framework + Supabase Auth
- Identity token → Supabase creates auth.users row
- `handle_new_user()` trigger creates households, household_members, locations (Unsorted), AND user_subscriptions (tier='free', balance=500)
- Session token → Keychain
- App proceeds to Screen 3

**Deferred to v2:** Google sign-in, email/password.

### Subscription lifecycle (Apple webhooks)

A Supabase Edge Function listens for App Store Server Notifications:
- New subscription → set tier, period dates, set credits_balance to 500 (don't add)
- Renewal → set credits_balance to 500 (replace, don't add)
- Cancellation → tier remains active until period_ends_at, then expires
- Expiration → revert tier to 'free', credits_balance unchanged (user keeps any remaining)
- Refund → revert tier and clawback if needed

Server-side receipt validation against Apple's verification endpoint. Never trust client claims.

### What's NOT in v1 monetization

- Multiple pack sizes (only $9.99 / 1,000)
- Family Sharing
- Promo codes / referral discounts
- Trial periods
- User-facing usage analytics dashboard ("scans used this month") — defer to v1.1
- Tier downgrade / mid-cycle changes
- Refund self-service

### Build cost

This adds **~5 weeks** to v1 timeline. Updated estimate: **5–7 months from start.**

### Components Claude Code will need

- `SubscriptionService` — wraps StoreKit 2 transactions and queries
- `CreditReservationService` — Edge Function client for reserve/commit/release
- `PaywallView` + `PaywallTrigger` logic
- `OnboardingFlow` (3 screens)
- Apple webhook Edge Function (server-side receipt validation)
- Background job for reservation timeout cleanup
- `subscription_state` model in SwiftData (mirrors user_subscriptions for offline read access)

### Locked decisions

| Decision | Value |
|---|---|
| Free tier | 500 AI scans, lifetime |
| Soft paywall trigger | 80% used (400 scans) |
| Hard wall behavior | AI paused, app fully functional |
| Pro Monthly | $7/month, 500 scans/month, no rollover |
| Pro Annual | $60/year, 500 scans/month, no rollover |
| Scan Pack | $9.99 one-time, 1,000 scans, never expire |
| Cost per call | Vision cloud: 5 / Text: 1 / Embedding: 1 |
| Pattern | Two-phase reservation (reserve → commit/release) |
| Reservation timeout | 60 seconds auto-release |
| Auth v1 | Sign-in with Apple only |
| Onboarding | 3 screens: promise, sign-in, first space |
| User-facing term | "AI scans" |
| Internal code term | `credits` |
| Receipt validation | Server-side via Supabase Edge Function |

---

## 17. Planning Discipline & Build Phase

### Status: ALL DESIGN STEPS LOCKED

1. ✅ Step 1 — Mental model & schema (sections 1–9)
2. ✅ Step 2 — UX flows & home screen (section 10)
3. ✅ Step 3 — AI pipeline (section 12)
4. ✅ Step 4 — Local state & sync architecture (section 11)
5. ✅ Step 5 — Telemetry events spec (section 13)
6. ✅ Step 6 — Visual design system (section 15)
7. ✅ Step 7 — Supabase SQL (separate artifact: `My_Inventory_App_v6_migration.sql`, includes Step 9 schema + hardening)
8. ✅ Step 8 — SwiftUI architecture (section 14)
9. ✅ Step 9 — Account creation, tiers, AI scans (section 16)

### Next: code

Updated build order with monetization:

1. App entry, environment, design system constants
2. SwiftData entities (including subscription_state)
3. SupabaseService + auth
4. **Onboarding flow + Sign-in with Apple (3 screens)**
5. MainPager skeleton (Home + one Space slide)
6. SpaceModel + SpaceView reading SwiftData
7. Add Item flow (Camera → SwiftData → SyncCoordinator)
8. Item detail
9. Search
10. AI pipeline integration **with credit reservation pattern**
11. **StoreKit 2 + paywall + upgrade screen**
12. **Apple webhook Edge Function for subscription lifecycle**
13. Telemetry instrumentation (including credit events)
14. Polish (animations, haptics, glass overlay, gestures)

### Rule

Discoveries during build are addressed in build, not in another planning round.

---

*Document version: v1.19 — WEB PIVOT. Native iOS deferred to v2. See Web_v1_Addendum.md for replacements of Sections 14, 15, 16. SQL migration to v7 with admin infrastructure.*

