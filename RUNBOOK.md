# BLOCK27 — Operations Runbook

This is for running BLOCK27 in the real world, not for changing the code. It is
written for a person who can follow steps and click around dashboards, not for a
programmer. When something is broken, start at the top and work down.

**The five places you will live:**

| Dashboard | What it is | Where |
|---|---|---|
| **Vercel** | Runs the website and the app's backend (the "API"). Deploys new versions. | vercel.com → your BLOCK27 project |
| **Supabase** | The database (all users, photos, outfits) and file storage. | supabase.com → your BLOCK27 project |
| **Anthropic** | The "brain" — the AI that analyzes clothes and writes outfits. You pay per use. | console.anthropic.com |
| **FASHN** | The "hand" — the AI that renders the outfit onto the user's photo. You pay per use. | fashn.ai dashboard |
| **App Store Connect** | The iPhone app: money, downloads, crashes, reviews. | appstoreconnect.apple.com |

A few words you'll see a lot, explained once:

- **Deploy / deployment** — a published version of the website. Every time the
  code changes, Vercel builds and publishes a new deployment.
- **Environment variable ("env var")** — a setting stored in Vercel (like a
  password or a switch), separate from the code. The app reads these to work.
  Full list at the bottom.
- **Migration** — a one-time change to the database's shape (a new table or
  column). These are **not** applied automatically. Someone pastes SQL into
  Supabase by hand. If a migration is missing, the matching feature breaks.
- **Job** — a slow task (generating outfits, rendering a try-on, shopping advice)
  that runs in the background instead of making the user wait. Jobs live in a
  database table called `jobs`.
- **Cron** — a task that runs automatically on a schedule (e.g. nightly cleanup).
- **SQL** — the language for asking the database questions. You don't need to
  understand it; there are ready-to-paste queries near the bottom.

> **Note on plans:** everything here assumes the site is hosted on **Vercel Pro**.
> Rendering (try-on) needs long-running tasks and the nightly cleanup crons need
> to run on schedule — the free Hobby plan cuts tasks off early and only runs
> crons once a day. If you are on Hobby, renders and cleanup will misbehave.

---

## 1. Something is broken — check these first, in order

Go down this list. Each step says what **healthy** looks like. Stop when you find
the thing that isn't healthy, then jump to the matching fix in Section 4.

### Step 1 — Is the website even up?

Open **https://block27.app** in a normal browser tab.

- **Healthy:** the landing page loads within a couple of seconds.
- **Broken:** an error page, a spinning loader forever, or "500". → The last
  deploy is probably bad. Go to **Section 2 (roll back)**.

### Step 2 — Vercel: did the last deploy succeed?

Vercel → your project → **Deployments** tab.

- **Healthy:** the top deployment (the one marked **Production / Current**) has a
  **green "Ready"** status.
- **Broken:** the top one is **red ("Error")** or stuck **yellow ("Building")**
  for more than ~5 minutes. → **Section 2 (roll back)** to the last green one.

### Step 3 — Supabase: is the database awake?

Supabase → your project. Look at the top of the dashboard.

- **Healthy:** the project shows **"Active / Healthy"** (green). The **Table
  Editor** opens and shows tables.
- **Broken:** the project is **"Paused"** (free projects pause after inactivity)
  or shows a red status. → If paused, click **Restore / Resume**. If red, check
  Supabase's own status page (status.supabase.com) — it may be their outage, not
  yours.

### Step 4 — Anthropic: is there credit left? (the "brain")

console.anthropic.com → **Billing / Plans & Billing**.

- **Healthy:** a positive credit balance, and auto-reload is on. Analyzing
  clothes and writing outfits works.
- **Broken:** balance at or near **$0**, or a "credit exhausted" warning. → When
  this runs dry, uploading clothes and generating outfits fail. **Add credit /
  turn on auto-reload.** (This is cheap — cents per action. See Section 4h.)

### Step 5 — FASHN: is there credit left? (the "hand")

fashn.ai dashboard → **Billing / Credits**.

- **Healthy:** a positive credit balance. Try-on renders complete.
- **Broken:** balance at or near **$0**. → Only the paid try-on breaks; the rest
  of the app keeps working. **Top up FASHN credits.** (Each rendered outfit is
  real money — roughly $0.90 for a 3-layer outfit. See Section 4h.)

### Step 6 — Is it just one feature?

If the site loads and money is fine but **one thing** is broken (outfits won't
generate, try-on won't render, shopping fails, someone paid but didn't get
upgraded), skip to **Section 4** and find that specific failure.

---

## 2. Roll back a bad deploy in Vercel (the one you'll use most)

**When:** you (or an automated change) published a new version and the site broke
— blank pages, errors, a feature that worked yesterday is dead. Rolling back
puts the previous working version live again. It's safe and fast and does **not**
touch the database.

**Exact clicks:**

1. Go to **vercel.com** and sign in.
2. Click the **BLOCK27** project.
3. Click the **Deployments** tab (top of the page).
4. You'll see a list, newest at the top. Find the most recent one with a
   **green "Ready"** dot that you know was working (usually the one *below* the
   broken one — check the date/time and the commit message).
5. Click the **"⋯"** (three dots) on the right of that row.
6. Click **"Promote to Production"** (older Vercel wording: **"Rollback"** or
   **"Redeploy"** — Promote to Production is the current one).
7. Confirm in the popup. Wait ~1 minute for it to go green/Current.
8. Reload **block27.app** in a fresh tab. The old, working version is back.

**After rolling back:** the bad version is still in the list, just not live.
Don't delete anything. Tell whoever pushed the change that it broke and was
rolled back, so they can fix it and redeploy properly.

**Important:** rolling back only reverts the *code*. If the broken deploy also
required a database migration, or someone changed an env var, rolling back the
code alone may not fully fix it — see Sections 4d and the env var list.

---

## 3. Where to look for what

| I want to check… | Go here |
|---|---|
| **Money from the iPhone app** (sales, subscriptions) | App Store Connect → **Trends / Sales and Trends**, and **Payments and Financial Reports** |
| **App crashes on iPhone** | App Store Connect → your app → **Crashes** (or Xcode Organizer if set up) |
| **Downloads & installs** | App Store Connect → **Trends** |
| **App reviews & ratings** | App Store Connect → your app → **Ratings and Reviews** |
| **Money from the web** (Whop subscriptions) | Whop dashboard → your app → **Sales / Members** |
| **Website errors & crashes** | Vercel → project → **Logs** (see Section 3a) |
| **Which version is live / deploy history** | Vercel → **Deployments** |
| **Env vars (settings/passwords)** | Vercel → project → **Settings → Environment Variables** |
| **Users, photos, outfits, jobs** (the data) | Supabase → **Table Editor**, or **SQL Editor** for the queries in Section 5 |
| **File storage use** (photos take space) | Supabase → **Storage**, and **Settings → Usage** |
| **AI spend — brain** | console.anthropic.com → **Usage** and **Billing** |
| **AI spend — hand (renders)** | fashn.ai dashboard → **Usage / Billing** |

### 3a. Reading Vercel logs (finding an error)

1. Vercel → BLOCK27 → **Logs** (top tab). (Newer Vercel: **Observability → Logs**.)
2. Set the time range to when the problem happened (top-right).
3. In the filter box you can type part of a web address to narrow it down.
   Useful ones for this app:
   - `api/outfits/generate` — outfit generation
   - `api/outfits` … `/render` — try-on rendering
   - `api/shopping` — shopping advice
   - `api/jobs/run` — the background worker (should not exist as its own route
     anymore; the work runs inside the routes above)
   - `api/jobs/drain` — the nightly job cleanup
   - `api/webhooks/whop` and `api/webhooks/apple` — payments
4. Red lines are errors. The app is written to **never show users a technical
   error** — it logs the real reason and shows the user a calm message. So the
   *real* cause is almost always in these logs, tagged like `[render]`,
   `[shopping]`, `[outfits]`, `[jobs]`, or `[retention]`.

---

## 4. Specific failures — how to spot each and fix it

### 4a. Outfit generation or shopping produces nothing / spins forever ("jobs stuck in queued")

**What's happening:** generating outfits and shopping run as background **jobs**.
A job normally goes `queued` → `processing` → `done` within a minute. If jobs
pile up at `queued` and never move, the background worker isn't running them.

> Version note: outfit generation and try-on render became background jobs first;
> **shopping** became a job slightly later (with migration `0023`). If your
> deployed version predates that, shopping still runs the old way (on the request,
> no job) and won't show up in the `jobs` table — in that case a shopping failure
> is usually AI credit (Section 1, Step 4) or a timeout, not a stuck job.

**How to spot it:** run **Query A** (Section 5). If you see rows stuck at
`queued` (or `processing` with an old `updated_at`), that's it.

**Most common cause & fix:**
1. **`CRON_SECRET` missing or the site is mid-broken-deploy.** The worker runs
   automatically right after a request; if the site itself is unhealthy, jobs
   stall. First make sure Section 1 is all green.
2. The nightly **drain** cron (`/api/jobs/drain`) is the safety net that clears
   stuck jobs and refunds the user — but it only runs once a day. To clear stuck
   jobs *now*, run **Query G** (Section 5): it marks old stuck jobs as failed and
   is safe. The user won't be charged for them (see 4b).
3. If jobs stall repeatedly, check Vercel logs (filter `[jobs]`) and check that
   **`SUPABASE_SERVICE_ROLE_KEY`** and **`CRON_SECRET`** are both set (env list
   at the bottom). Without the service-role key, the worker cannot run jobs.

### 4b. Try-on renders fail

**What's happening:** rendering sends the person's photo + a garment to FASHN,
one clothing layer at a time. It can fail for a few reasons.

**How to spot & fix, in order:**
1. **FASHN out of credit** — Section 1, Step 5. Top up. This is the #1 cause.
2. **The render job is stuck** — run **Query A**, look for `kind = 'render'` rows
   stuck at `processing`. Renders resume by themselves when the user reopens the
   screen (they're built to pick up where they left off). If truly stuck, Query G
   clears it.
3. **A specific photo keeps failing** — check Vercel logs, filter for `[render]`.
   A line like `couldn't place <the item>` means FASHN rejected that specific
   garment or the base photo. The user is **not charged** for a failed render
   (the try-on allowance is given back automatically). Ask them to re-shoot the
   base photo or that garment.
4. **Everyone's renders fail at once** — almost always FASHN credit or a FASHN
   outage. Check the FASHN dashboard.

### 4c. Someone paid but didn't get upgraded

**What's happening:** when a user pays (Whop on web, or Apple in the iPhone app),
the payment service sends BLOCK27 a message ("webhook") that flips their account
to paid. If that message fails, they paid but stayed on Free.

**How to spot:** the user complains they're still limited / can't do try-ons.
Run **Query E** with their email to see their plan.

**Fix, in order:**
1. **Confirm they actually paid** — Whop dashboard → Members (web), or App Store
   Connect (iPhone). If there's no payment on record, they didn't complete
   checkout; have them try again.
2. **Check the webhook arrived** — Vercel logs, filter `api/webhooks/whop` (or
   `api/webhooks/apple`). Look for an error around the time they paid.
   - If the webhook was **rejected as unverified**, the **`WHOP_WEBHOOK_SECRET`**
     env var is wrong or missing. Fix it (env list at bottom), then have them
     re-trigger (in Whop you can resend the webhook event).
3. **As a manual last resort** (only if you've confirmed real payment): you can
   set their plan by hand in Supabase — run **Query F**, replacing the email and
   the tier (`premium`, `pro`, or `boss`). This is editing live user data, so
   double-check the email first.
4. **Just to test on your own account** without paying: add your user id to the
   **`PAID_OVERRIDE_UIDS`** env var (comma-separated). That gives *only* those
   accounts full access. Remove yourself when done. Never put a real customer
   there — it's for testing.

### 4d. A feature broke right after a change ("migration not applied")

**What's happening:** some code changes need a matching **database migration**
(new table/column) applied by hand in Supabase. If the code shipped but the
migration wasn't pasted in, that feature errors.

**How to spot:** a feature that's brand-new or was just changed fails, and Vercel
logs show a database error mentioning a missing column or table (words like
`column ... does not exist` or `relation ... does not exist`).

**Fix:** migrations live in the code under `supabase/migrations/`, numbered
`0001`, `0002`, … The person who made the change will tell you which number to
apply (the recent ones and what they unlock):
- `0020`, `0021`, `0022`, `0023` — the background **jobs** system (outfits,
  renders, shopping). If jobs error, these are the ones.
- `0018` — biometric **consent** (needed before anyone can render).
- `0019` — garment **thumbnails**.
- `0017` — AI **language** setting.

To apply one: Supabase → **SQL Editor** → New query → paste the **entire
contents** of that migration file → **Run**. They are written to be safe to run
even if already applied. If you're unsure which is missing, ask the developer for
the exact file; don't guess.

### 4e. The nightly cron jobs aren't running

**What's happening:** three automatic nightly tasks keep the app clean and
honest. They run on Vercel on a schedule and each needs the **`CRON_SECRET`**
env var to be allowed to run.

| Cron | What it does | Runs at (UTC) |
|---|---|---|
| `/api/guest/purge` | Deletes data from visitors who never signed up | 03:00 |
| `/api/retention/biometric` | Deletes photos of users inactive 12+ months (privacy law) | 04:00 |
| `/api/jobs/drain` | Clears stuck background jobs and refunds them | 04:30 |

**How to spot trouble:** Vercel → project → **Settings → Cron Jobs**. You'll see
the three listed with their last run time and status.

- **Healthy:** each shows a recent successful run.
- **Broken:** last run shows an error, or "unauthorized". → **`CRON_SECRET`** is
  missing or was changed. Set it in env vars (env list at bottom) and redeploy.
- **Not listed at all / never run:** you're likely on the Vercel **Hobby** plan,
  which limits crons. Upgrade to **Pro**.

The retention one is a legal promise (we delete inactive users' body photos), so
if it's failing, treat it as important, not cosmetic.

### 4f. Running out of Supabase storage or bandwidth ("egress")

**What's happening:** every base photo, garment photo, and rendered outfit is a
file in Supabase Storage. Photos add up. **Egress** means data sent out (users
viewing their photos). Free/Pro plans have limits.

**How to spot:** Supabase → **Settings → Usage**. Look at **Storage** (space used)
and **Egress** (data transferred). Also Supabase emails you as you approach a
limit.

**Fix:**
- If **storage** is filling: run **Query D** to see how many photos exist. Real
  deletions already happen (when users delete pieces/accounts, and the nightly
  purges). If it's genuinely growing from real users, that's a good problem —
  upgrade the Supabase plan.
- If **egress** is high: usually normal use. The app already serves small
  **thumbnails** in the wardrobe grid to keep this down. If it spikes abnormally,
  check Vercel logs for anything looping.
- **Do not** mass-delete files in the Storage browser to save space. You will
  delete real users' photos. See Section 6.

### 4g. Hitting a Vercel limit

**What's happening:** Vercel caps how much the backend can run (compute hours,
function invocations, bandwidth). On a spike or a bug that loops, you can hit a
cap and the site slows or stops.

**How to spot:** Vercel → project → **Usage**. Vercel also emails warnings.
Symptoms: functions timing out, "429 / limit" errors in logs.

**Fix:**
- Short term: if a bug is looping (same error repeating fast in logs), roll back
  (Section 2) to stop the bleeding.
- If it's real growth: upgrade the Vercel plan.
- **Renders and outfit generation are the heavy tasks.** They're already capped
  per user per month (see plan limits in Section 5, Query E). A single user
  can't run away with your compute.

### 4h. AI spend looks too high

- **Brain (Anthropic):** analyzing a garment, composing outfits, and shopping are
  **cents**. If Anthropic spend is high, something is calling it in a loop —
  check Vercel logs for a repeating `[outfits]`/`[shopping]`/`[analyze]` line and
  roll back if a recent change caused it.
- **Hand (FASHN):** each rendered outfit is **real money** (~$0.30 per clothing
  layer, ~$0.90 for a full outfit). This is controlled by the per-user monthly
  try-on cap. If FASHN spend is high, that's paid users rendering — check it
  against your paid-user count (Query E-style). It should roughly track revenue.

---

## 5. Useful SQL queries (paste into Supabase → SQL Editor → Run)

You don't need to understand these. Open Supabase → **SQL Editor** → **New
query**, paste one in, click **Run**, read the result. None of these change
anything **except Query F and Query G**, which are clearly marked.

**Query A — background jobs by status (are jobs stuck?)**
```sql
select kind, status, count(*) as how_many, min(created_at) as oldest
from jobs
group by kind, status
order by kind, status;
```
Healthy: most rows are `done`. A few `queued`/`processing` from the last minute
is normal. Many `queued` with an `oldest` more than a few minutes ago = stuck
(Section 4a).

**Query B — jobs that failed recently, with the reason**
```sql
select kind, status, error, updated_at
from jobs
where status = 'failed'
order by updated_at desc
limit 30;
```
The `error` column is the real reason a job failed. This is the fastest way to
see *why* renders/outfits/shopping are failing.

**Query C — how many users, and how many are paying**
```sql
select
  count(*) as total_users,
  count(*) filter (where plan_tier is not null and plan_tier <> 'free') as paying_users,
  count(*) filter (where plan_tier = 'premium') as premium,
  count(*) filter (where plan_tier = 'pro') as pro,
  count(*) filter (where plan_tier = 'boss') as boss
from users;
```

**Query D — how much data each thing is using (row counts)**
```sql
select 'users' as thing, count(*) from users
union all select 'garments (clothes)', count(*) from garments
union all select 'outfits', count(*) from outfits
union all select 'renders (try-ons)', count(*) from renders
union all select 'guest garments', count(*) from guest_garments;
```
(This counts records, which tracks roughly with photo storage. For exact storage
space use Supabase → Settings → Usage.)

**Query E — look up one user's plan and usage this cycle** (replace the email).
Email lives in Supabase's own `auth.users` table, so these queries join to it.
```sql
select au.email, u.plan_tier, u.subscription_status, u.plan_anchor_at,
       c.kind, c.used, c.period_start
from auth.users au
join public.users u on u.id = au.id
left join public.usage_counters c on c.user_id = u.id
where au.email = 'someone@example.com'
order by c.period_start desc;
```
`plan_tier` is their plan. The `used` rows show how many outfit generations
(`composition`), try-ons (`render`), and shopping consults (`shopping`) they've
used this billing cycle.

**Query F — ⚠️ CHANGES DATA: manually set a user's plan** (only after confirming
real payment — Section 4c). Replace the email and the tier.
```sql
update public.users
set plan_tier = 'pro',            -- 'premium' | 'pro' | 'boss'
    subscription_status = 'active'
where id = (select id from auth.users where email = 'someone@example.com');
```

**Query G — ⚠️ CHANGES DATA: clear stuck jobs now** (Section 4a/4b). Marks jobs
that have been stuck more than 15 minutes as failed so the user isn't left
hanging. The nightly drain also refunds their allowance.
```sql
update jobs
set status = 'failed', error = 'manually cleared: stuck', updated_at = now()
where status in ('queued', 'processing')
  and created_at < now() - interval '15 minutes';
```

**Query H — recent signups (is anything happening?)**
```sql
select au.email, u.plan_tier, u.created_at
from public.users u
join auth.users au on au.id = u.id
order by u.created_at desc
limit 20;
```

---

## 6. What you must NEVER touch

- **Never delete files in Supabase → Storage by hand.** Those are real users'
  body photos and garment photos. Deleting them is permanent and cannot be
  undone. The app deletes them properly when a user asks; you doing it manually
  breaks accounts and violates our privacy promise.
- **Never delete or edit rows in the `users` table** beyond the exact, confirmed
  plan fix in Query F. Deleting a user row cascades — it wipes their photos,
  outfits, everything.
- **Never turn off Row Level Security (RLS)** in Supabase. It's the wall that
  stops one user from seeing another user's photos. If asked to disable it to
  "fix" something, the answer is no.
- **Never change `SUPABASE_SERVICE_ROLE_KEY`.** It's a master key that bypasses
  that wall. If it leaks, rotate it *with* the developer, don't edit it casually.
- **Never rename or delete anything in `supabase/migrations/`.** That's the
  database's history.
- **Never hard-delete a Vercel deployment** you rolled back from — leave it in
  the list.
- **Don't build or ask for an admin screen that shows user photos.** It's a
  deliberate rule: no tool should exist that makes a photo breach easy.
- **Never commit or paste real secret values** (the keys below) into chat, code,
  screenshots, or tickets. They live only in Vercel's env var settings.

When in doubt, **roll back** (safe) and call the developer. Rolling back never
loses data.

---

## 7. Environment variables — the settings the app needs

These live in **Vercel → project → Settings → Environment Variables**. After
changing any of them you must **redeploy** for it to take effect (Vercel →
Deployments → ⋯ on the current one → **Redeploy**). Anything marked **SECRET** is
a password — never share or paste it anywhere but this settings page.

### Must be set or core things break

| Variable | What it's for | What breaks without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Address of the database | **Nothing works** — no login, no data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key to reach the database | **Nothing works** — login/data fail |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET.** Master database key the background jobs use | Background jobs (outfits, renders, shopping) can't run; cleanup crons fail |
| `ANTHROPIC_API_KEY` | **SECRET.** Pays for the "brain" | Uploading clothes, generating outfits, shopping all fail |
| `CRON_SECRET` | **SECRET.** Password that lets the nightly crons run | The three nightly tasks (Section 4e) stop; stuck jobs never get cleaned/refunded |

### Needed for the paid try-on (the hand)

| Variable | What it's for | What breaks without it |
|---|---|---|
| `HAND_PROVIDER` | Which renderer to use. Should be `fashn` in production | If unset/`stub`, "try-on" produces nothing real |
| `FASHN_API_KEY` | **SECRET.** Pays for renders | Try-on renders fail |
| `FASHN_MODEL` | Which FASHN model (e.g. `tryon-max`) | Wrong/blank = renders fail or look wrong |
| `FASHN_RESOLUTION` | Render quality (e.g. `2k`) | Blank = uses a default; not critical |

### Needed for payments

| Variable | What it's for | What breaks without it |
|---|---|---|
| `PAYMENTS_OPEN` | Master on/off switch for checkout. `true` opens paid plans | If not exactly `true`, checkout is closed and nobody can upgrade (this is intentional and safe) |
| `WHOP_API_KEY` | **SECRET.** Web checkout (Whop) | Web users can't start checkout |
| `WHOP_WEBHOOK_SECRET` | **SECRET.** Verifies Whop's "they paid" message | Web payments don't upgrade the user (Section 4c) |
| `NEXT_PUBLIC_WHOP_APP_ID` | Public Whop app id for checkout | Web checkout won't build |
| `APPLE_ROOT_CA_G3` | Apple's certificate, to trust iPhone purchase receipts | iPhone purchases can't be verified → don't upgrade |
| `APPLE_BUNDLE_ID` | The app's id (e.g. `com.block27.app`) | iPhone purchase verification rejects everything |

### Tuning / optional (have sensible defaults)

| Variable | What it's for | If unset |
|---|---|---|
| `ANALYSIS_MODEL` | Which brain model analyzes a garment | Uses a sensible default |
| `OUTFIT_MODEL` | Which brain model composes outfits & shopping | Uses a sensible default |
| `MODERATION_PROVIDER` / `MODERATION_MODEL` | The check that blocks explicit photos before storage | Uses defaults; keep on |
| `PHONE_VERIFIER` | Phone verification. Must **not** be `stub` in production | `stub` accepts a fake code — never in production |
| `PAID_OVERRIDE_UIDS` | Test accounts that get full access free (Section 4c) | Nobody overridden (correct for production) |
| `GUEST_TTL_HOURS` | How long visitor data lives before purge (default 24) | Defaults to 24 |
| `JOBS_MAX_AGE_HOURS` | When the drain gives up on a stuck job (default 24) | Defaults to 24 |
| `BIOMETRIC_TTL_MONTHS` | Months of inactivity before photos are deleted (default 12) | Defaults to 12 |

**Rule of thumb:** if you change a **SECRET**, you almost always also need to
change it in the place that issued it (Supabase, Anthropic, FASHN, Whop, Apple)
— they must match. Don't invent values. Get them from that service's dashboard.

---

*Keep this file up to date. If a step here doesn't match what you see on screen,
the dashboard changed — note it and ask the developer to fix this runbook.*
