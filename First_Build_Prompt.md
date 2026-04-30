# First Build Prompt for Claude Desktop + Desktop Commander

## How to use this

1. Open **Claude Desktop**
2. Make sure **Desktop Commander** MCP is enabled (check Settings → Connectors)
3. Optionally enable **Filesystem** and **Control Chrome** MCPs as well
4. Start a new chat
5. Attach these three files (drag them in or use the attach button):
   - `My_Inventory_App_Foundation_v1.md`
   - `Web_v1_Addendum.md`
   - `My_Inventory_App_v7_migration.sql`
6. Paste the prompt below as your first message

---

## THE PROMPT

```
You are going to build MyInventoryApp v1, a Next.js Progressive Web App. I am the architect/PM. I want you to do as much of the work as possible using Desktop Commander. I will review and approve at key checkpoints.

CONTEXT:
- I'm working on a 2012 Intel MacBook Pro running patched macOS Sequoia.
- This hardware CANNOT run Xcode or iOS Simulator — that's why we pivoted from native iOS to web. Do not suggest iOS-specific tools.
- I already completed Phase 0 setup: Supabase project deployed with v7 migration, Stripe test account, Vercel + GitHub accounts, all CLI tools installed (node, npm, gh, vercel, supabase).

REQUIRED READING (in this order):
1. The attached My_Inventory_App_Foundation_v1.md — read the WEB PIVOT NOTICE at top, then read the whole doc
2. The attached Web_v1_Addendum.md — this OVERRIDES Sections 14, 15, 16 of the foundation doc
3. The attached My_Inventory_App_v7_migration.sql — schema is already deployed; read for understanding

After reading, also use Desktop Commander to:
- Check that ~/Projects/MyInventoryApp exists
- Read ~/Projects/MyInventoryApp/CLAUDE.md
- List files in ~/Projects/MyInventoryApp/docs/

Then summarize back to me:
1. What we're building (one paragraph)
2. The platform decision (web v1, iOS deferred to v2)
3. The stack (Next.js, Tailwind, Supabase, Stripe)
4. The 12-step build order from Web v1 Addendum Section 9
5. What state the project is in right now (what's done, what's not)

DO NOT WRITE ANY CODE YET. After your summary, I will confirm or correct, and only then will we start build step 1.
```

---

## What to expect

Claude Desktop will read the docs, list your project structure, and respond with a summary. This usually takes a few minutes because the foundation doc is large.

**Read the summary carefully.** If anything is wrong:
- Wrong stack (mentions Swift/SwiftUI)
- Wrong platform (mentions native iOS as v1)
- Wrong free-tier number (says 500 instead of 20)
- Misses the global cost cap or the credit reservation pattern
- Misses that the foundation doc has been overridden by the addendum for Sections 14/15/16

→ Stop and correct it before proceeding. Don't let it move to code with a confused mental model.

If the summary is correct:

---

## Next prompt — start build step 1

After Claude Desktop's summary is correct, paste this:

```
Good summary. Let's start build step 1: Project bootstrap.

Per Web v1 Addendum Section 9, step 1 is:
"Project bootstrap — Next.js + Tailwind + TypeScript + Vercel deploy"

Use Desktop Commander to:

1. cd to ~/Projects/MyInventoryApp/
2. Create the Next.js app in the web/ subfolder:
   npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   (Accept defaults for any other prompts)
3. Verify it builds: cd web && npm run build
4. Initialize the .env.local file from the dot_env_template.txt I have saved
5. Commit and push to GitHub
6. Run `vercel` from the web/ folder to deploy (use the existing Vercel project or create a new one called my-inventory-app)

Tell me what you did, what's deployed, and what URL the app is live at. Then we'll move to step 2.

IMPORTANT: 
- If npx asks any interactive questions you can't answer, stop and ask me
- If any command fails, do NOT continue — show me the error
- Do not skip the `npm run build` verification step
- After Vercel deploy, give me the URL so I can verify it loads in my browser
```

---

## When something goes wrong

If Desktop Commander hits an error:
- Show the exact error message
- Don't try multiple workarounds blindly
- Ask me before making decisions about how to fix it

If you're unsure about a product/design decision:
- The foundation doc + Web v1 Addendum is the source of truth
- If the doc has a real gap, surface it explicitly — don't guess

If a command needs my hands (anything requiring 2FA, OAuth in browser, payment info):
- Stop and tell me what to do
- Don't try to automate clicks through Control Chrome unless I explicitly ask

---

## Pacing rule

After every build-order step (1 of 12, 2 of 12, etc.):
1. Make sure the build passes
2. Commit and push to GitHub
3. Verify the deployed URL still works
4. Wait for me to confirm before starting the next step

Each step is genuinely shippable. Don't bundle multiple steps into one prompt. Slow is smooth, smooth is fast.

---

*This prompt corresponds to: Foundation doc v1.19, Web v1 Addendum v1.0, SQL migration v7, Phase 0 Setup Checklist v2.0*
