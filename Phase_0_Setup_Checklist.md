# MyInventoryApp — Phase 0 Setup Checklist (Web v1)
## Step-by-step instructions to get everything ready before the first line of code

> **Estimated total time:** 3–5 hours over 2 evenings
> **Money spent:** $0 (everything fits free tiers; Stripe needs no upfront fee)
> **Result:** A fully configured environment where Claude Code / Desktop Commander can build, deploy, and iterate

This replaces the original iOS-focused Phase 0. We've pivoted to a Next.js Progressive Web App, so no Xcode, no Apple Developer enrollment, no $99 annual fee.

---

## How to use this document

Work through it top to bottom. Check off boxes as you go. Each step has explicit clicks/commands. If you get stuck on any step, ask Claude (in chat) about that specific step before proceeding.

---

## NIGHT 1 — Accounts and CLI tools (~2 hours)

### ☐ 1.1 — Create your Supabase project

Free tier handles everything in v1. Takes 5 minutes.

1. Go to **https://supabase.com**
2. Click **Sign Up** (use GitHub if you have it; otherwise email)
3. Once signed in, click **New Project**
4. Fill in:
   - **Organization:** create one called "Personal" (or your name)
   - **Name:** `MyInventoryApp`
   - **Database Password:** **GENERATE A STRONG ONE** and save in your password manager
   - **Region:** pick the one closest to where you live
   - **Pricing Plan:** Free
5. Click **Create new project**
6. **Wait ~2 minutes** for provisioning
7. Bookmark the dashboard URL
8. Go to **Settings (gear icon, lower left) → API**
9. Save these values somewhere safe:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon / public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) — **THIS IS SENSITIVE**
   - **Project Reference** (the ID portion of your project URL)

✅ **Done when:** project shows "Active" status and you have all credentials saved

---

### ☐ 1.2 — Get your Anthropic API key

For cloud vision and text classification.

1. Go to **https://console.anthropic.com/**
2. Sign in (use the same account as your Claude subscription)
3. Left nav: **Settings → API Keys**
4. Click **Create Key**, name it `MyInventoryApp`
5. **Copy the key immediately** — it's only shown once
6. Set up billing under **Settings → Plans & Billing**, add a payment method
7. Set a monthly spend limit at **Settings → Limits** (start with $20/mo, raise later)

✅ **Done when:** key is saved and a hard spend limit is configured

---

### ☐ 1.3 — Get your OpenAI API key (for embeddings + text classification)

1. Go to **https://platform.openai.com/api-keys**
2. Sign up if you don't have an account
3. Click **Create new secret key**, name it `MyInventoryApp`
4. **Copy immediately** — only shown once
5. Add a payment method and set a hard usage limit (start at $20/month)

✅ **Done when:** key is saved and a hard usage limit is configured

---

### ☐ 1.4 — Sign up for Stripe (test mode is free)

1. Go to **https://stripe.com**
2. Click **Start now**, fill in basics
3. **You don't need to activate your account yet** — test mode works without any real banking info
4. Once in the dashboard, make sure the toggle in the top-left says **"Test mode"** (not "Live")
5. Go to **Developers → API keys**:
   - **Publishable key** (`pk_test_...`)
   - **Secret key** (`sk_test_...`)
6. Save both somewhere safe

You'll set up a Product (the $9.99 scan pack) at build step 11, not now.

✅ **Done when:** test-mode API keys are saved

---

### ☐ 1.5 — Sign up for Vercel (free tier)

For deploying the Next.js app.

1. Go to **https://vercel.com/signup**
2. Sign up with GitHub (cleanest integration)
3. Authorize Vercel to access your GitHub
4. You don't need to deploy anything yet

✅ **Done when:** you're signed into Vercel dashboard

---

### ☐ 1.6 — Create a GitHub repo for the project

1. Go to **https://github.com/new**
2. Repository name: `my-inventory-app-web`
3. **Private** (you can flip to public later)
4. **Don't** initialize with README (we'll push from local)
5. Click **Create repository**

Copy the SSH or HTTPS clone URL.

✅ **Done when:** an empty private repo exists on GitHub

---

### ☐ 1.7 — Set up phone push alerts via ntfy.sh

For cost alerts at 50/75/90% of monthly budget cap.

1. On your phone, install the **ntfy** app (iOS App Store or Google Play)
2. Open the app, tap the **+** to subscribe to a topic
3. Choose a hard-to-guess topic name like `myapp-cost-alerts-x7k2p9` (random suffix matters; the topic is the only "auth")
4. Save the topic name — Edge Functions will POST to `https://ntfy.sh/YOUR_TOPIC`
5. Test it from your laptop: `curl -d "test from laptop" https://ntfy.sh/YOUR_TOPIC`

You should get a push notification on your phone. If you do, alerts work.

✅ **Done when:** test push from `curl` reaches your phone

---

### ☐ 1.8 — Install Homebrew (if you don't have it)

Open Terminal and paste:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow prompts. After install, follow the "Next steps" Homebrew prints (two `echo` commands to add to your PATH).

Verify:
```
brew --version
```

✅ **Done when:** `brew --version` returns a version

---

### ☐ 1.9 — Install Node.js + supporting tools

```
brew install node
brew install gh
brew install supabase/tap/supabase
brew install jq
brew install vercel-cli
```

Verify each:
```
node --version
npm --version
gh --version
supabase --version
jq --version
vercel --version
```

✅ **Done when:** all six commands return versions

---

### ☐ 1.10 — Authenticate GitHub CLI

```
gh auth login
```

Pick: GitHub.com → HTTPS → Yes credential helper → Login with web browser.

Verify:
```
gh auth status
```

✅ **Done when:** logged in to github.com as your username

---

### ☐ 1.11 — Authenticate Vercel CLI

```
vercel login
```

It'll open a browser. Sign in via the email or GitHub option you used at vercel.com.

✅ **Done when:** Vercel says "Success! GitHub authentication complete"

---

**End of Night 1.** All accounts created, all CLIs ready. Tomorrow: project structure, database, first build.

---

## NIGHT 2 — Project structure, database, first run (~2 hours)

### ☐ 2.1 — Create the project folder structure

```
mkdir -p ~/Projects/MyInventoryApp/docs
mkdir -p ~/Projects/MyInventoryApp/web
cd ~/Projects/MyInventoryApp
```

✅ **Done when:** both folders exist

---

### ☐ 2.2 — Save your foundation documents into docs/

Move the artifacts I produced. Adjust the source paths to wherever you saved them:

```
mv ~/Downloads/My_Inventory_App_Foundation_v1.md ~/Projects/MyInventoryApp/docs/
mv ~/Downloads/My_Inventory_App_v7_migration.sql ~/Projects/MyInventoryApp/docs/
mv ~/Downloads/Web_v1_Addendum.md ~/Projects/MyInventoryApp/docs/
```

Verify:
```
ls ~/Projects/MyInventoryApp/docs/
```

You should see all three files.

✅ **Done when:** all three docs are in place

---

### ☐ 2.3 — Save CLAUDE.md at the project root

```
mv ~/Downloads/CLAUDE.md ~/Projects/MyInventoryApp/CLAUDE.md
```

This is the file Claude Code / Desktop Commander reads automatically every session.

Verify:
```
head -10 ~/Projects/MyInventoryApp/CLAUDE.md
```

✅ **Done when:** `CLAUDE.md` is at `~/Projects/MyInventoryApp/CLAUDE.md`

---

### ☐ 2.4 — Run the SQL migration on Supabase

This deploys your full database schema with the admin layer.

1. Open the Supabase dashboard
2. Left nav: **SQL Editor**
3. Click **New query**
4. Open the migration file:
   ```
   open ~/Projects/MyInventoryApp/docs/My_Inventory_App_v7_migration.sql
   ```
5. Select all (Cmd+A), copy (Cmd+C)
6. Back in Supabase SQL Editor, paste (Cmd+V)
7. Click **Run** (lower right)
8. Wait ~10–20 seconds

**Expected result:** "Success. No rows returned." If you see errors, **STOP** and ask Claude in chat about the specific error.

✅ **Done when:** migration runs without errors

---

### ☐ 2.5 — Run the verification checks

In the Supabase SQL Editor, run these one at a time. The full list of 27 is at the bottom of the migration file. The most critical:

**Check 1 — extensions installed:**
```sql
select extname from pg_extension order by extname;
```
Should include `uuid-ossp`, `pg_trgm`, `unaccent`, `vector`.

**Check 2 — tables exist:**
```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
```
Should include: admin_users, categories, credit_reservations, credit_transactions, household_members, households, item_photos, items, locations, system_config, usage_events, user_categories, user_subscriptions.

**Check 3 — system_config seeded (v7):**
```sql
select * from public.system_config order by key;
```
Should show: ai_globally_enabled=true, monthly_budget_cap_usd=1200, current_month_spend_usd=0, etc.

**Check 4 — credit functions are locked down:**
```sql
select has_function_privilege('authenticated', 'public.reserve_credits(uuid,integer,text)', 'execute');
```
Should return **`false`**. If true, REVOKE didn't work — investigate before continuing.

**Check 5 — auto-create on signup gives 20 free scans (v7):**
- Go to Supabase → Authentication → Users
- Click **Add user** → **Create new user**, email `test@test.com`
- Then in SQL Editor:
  ```sql
  select credits_balance, tier
  from public.user_subscriptions
  where user_id = (select id from auth.users where email = 'test@test.com');
  ```
- Should show `credits_balance = 20`, `tier = 'free'`
- Clean up: delete the test user from Authentication → Users

✅ **Done when:** all five checks pass

---

### ☐ 2.6 — Add yourself as admin

You'll need this to call admin_grant_credits, admin_set_credits, etc.

First, sign yourself up via the Supabase Auth page (you'll need a real auth provider — set this up in the next step). For now, create a placeholder admin user:

```sql
-- Skip this step until you've completed auth setup at build step 3.
-- Then run:
-- insert into public.admin_users (user_id, notes)
-- values ((select id from auth.users where email = 'YOUR_REAL_EMAIL'), 'founder');
```

Add this to your post-step-3 todo list.

✅ **Done when:** noted for later (after auth is built)

---

### ☐ 2.7 — Create the Storage bucket

1. In Supabase dashboard → **Storage**
2. Click **New bucket**
3. Name: `item-photos`
4. **Public bucket: OFF** (must be private)
5. Click **Create bucket**
6. Click the bucket → **Policies** → **New Policy** → **For full customization**
7. **Read policy:**
   - Name: `household_can_read_own_photos`
   - Operation: SELECT
   - Roles: authenticated
   - USING:
     ```
     bucket_id = 'item-photos' AND public.is_household_member((storage.foldername(name))[1]::uuid)
     ```
8. **Write policy:**
   - Name: `household_can_write_own_photos`
   - Operation: INSERT
   - Roles: authenticated
   - WITH CHECK: same as above

✅ **Done when:** bucket exists with both policies

---

### ☐ 2.8 — Initialize git in the project root

```
cd ~/Projects/MyInventoryApp
git init
```

Create `.gitignore`:
```
cat > .gitignore <<'EOF'
# Secrets
*.env
.env.local
.env.*.local
*.p8

# Node
node_modules/
.next/
out/
dist/
build/

# Vercel
.vercel/

# macOS
.DS_Store

# IDE
.vscode/
.idea/
EOF
```

✅ **Done when:** `.gitignore` is in place

---

### ☐ 2.9 — Push initial state to GitHub

```
cd ~/Projects/MyInventoryApp
git add .
git status
```

**Verify:** no `.env*` files appear. If they do, fix `.gitignore` before continuing.

If clean:
```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git commit -m "chore: initial project structure with foundation docs"
git remote add origin https://github.com/YOUR_USERNAME/my-inventory-app-web.git
git branch -M main
git push -u origin main
```

✅ **Done when:** the docs and CLAUDE.md are visible on GitHub (no secrets committed)

---

### ☐ 2.10 — Get the first build prompt ready

You're done with Phase 0. Tomorrow night you bootstrap the Next.js app using the build prompt I'll give you below. The setup is complete; the build is ready to start.

✅ **Done when:** you're ready to paste the first build prompt into Claude Desktop with Desktop Commander

---

## You're now ready to build

What you have:
- ✅ Live Supabase database with the full schema deployed and verified
- ✅ Storage bucket configured with private RLS
- ✅ All API keys (Anthropic, OpenAI, Stripe test) saved
- ✅ Vercel and GitHub authenticated
- ✅ ntfy.sh phone alerts working
- ✅ Foundation docs and CLAUDE.md in version control
- ✅ All CLI tools installed and verified

You did NOT need:
- ❌ Apple Developer Program ($99/year) — saved
- ❌ Xcode (15GB download you can't run anyway) — saved
- ❌ A new Mac ($500+) — saved

This is the win of the web pivot.

---

## Quick reference — your files

| File | What it is | Where it lives |
|---|---|---|
| `My_Inventory_App_Foundation_v1.md` | Complete design spec (v1.19) | `~/Projects/MyInventoryApp/docs/` |
| `Web_v1_Addendum.md` | Web-specific overrides | `~/Projects/MyInventoryApp/docs/` |
| `My_Inventory_App_v7_migration.sql` | Database schema | `~/Projects/MyInventoryApp/docs/` |
| `CLAUDE.md` | Project context for AI agents | `~/Projects/MyInventoryApp/` (root) |
| `.env.local` (later) | Secrets — populated at build step 1 | `~/Projects/MyInventoryApp/web/` |
| `.gitignore` | Excludes secrets and build files | `~/Projects/MyInventoryApp/` (root) |

---

*Document version: Phase 0 v2.0 (web pivot) — corresponds to foundation doc v1.19, addendum v1.0, SQL migration v7*
