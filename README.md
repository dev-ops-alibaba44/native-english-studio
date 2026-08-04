# Native English Studio

Next.js + Supabase web app for the Native English Studio platform.

## 🩹 Batch 9.7 — AI feedback in Traditional Chinese, save-timestamp fix, updated financial model

### (5) AI feedback now written in Traditional Chinese
Added an explicit instruction to the system prompt: the feedback itself must be written in
Traditional Chinese throughout, even though the essay being reviewed stays in English. Short English
phrases quoted from the essay inline are fine; the surrounding commentary is always Chinese now.

### (3) "最後儲存於" timestamp now updates immediately, no reload needed
Two changes: the save button's click handler is now wrapped in try/catch so a failed save shows a
visible error instead of silently doing nothing (which would have looked exactly like "the timestamp
just didn't update"); and a `useEffect` now also re-syncs the displayed timestamp whenever the
server-provided `initialLastSavedAt` prop changes, as a second, independent path to the same result.
Between the two, this shouldn't be able to require a manual reload anymore — but flagging it as worth
a specific retest, since I couldn't fully reproduce the original symptom without a live browser to
watch the actual click-to-render timing.

### (1) Deprecation warning — still safe to ignore
Same one covered in the 9.4 changelog below: `[DEP0169] url.parse()` comes from a transitive
dependency, not code we wrote, and isn't causing any of the actual bugs. No action taken.

### (2) Multiple advisors on one student — not yet possible, here's why and what it'd take
Checked the schema: access to a student's applications (and therefore their live essay document,
since Liveblocks room access reuses the same check) is currently gated entirely by a single
`primary_advisor_id` column on each student's profile — one advisor, full stop. Agency admins already
get broader access (any admin at the agency can see any student at that agency), but a *second*
advisor who isn't the primary one currently gets a flat 403 if they try to open a student's document.

To support several staff on one student, the real fix is a many-to-many join table (e.g.
`application_collaborators` or `student_advisors`) instead of the single `primary_advisor_id` column,
with matching RLS policy updates across `profiles`, `applications`, `drafts`, and the Liveblocks auth
route (which would keep reusing those same policies, so it wouldn't need its own separate logic).
This is a real, if moderate, schema change — not something to fold in silently alongside everything
else this batch. Two questions worth answering before I build it:
- Does *every* advisor at an agency need access to *every* student (simplest: same rule agency admins
  already get), or do you want per-student assignment of specific advisors (more like a sharing/invite
  model)?
- Should the *original* primary advisor stay specially marked (e.g. "shown as the lead" in the UI), or
  do all assigned advisors count equally once added?

Let me know which shape you want and I'll build it as its own batch.

### (6) Financial model rebuilt with three tiers — see `Native_English_Financial_Model_v2.xlsx`
Your test request (599 input / 388 output tokens) cost about **$0.0026** — a quarter of a cent — using
Claude Haiku 4.5's real pricing ($1/M input tokens, $5/M output tokens). That's not a lot at all: the
model's old placeholder AI-cost assumption ($2.50/seat/month) was roughly 500–800x higher than what a
realistic month of actual usage would cost. That gap is now corrected in the new model (down to
$0.30/$0.60/$0.90 per seat/month across the three tiers, still with large built-in headroom — see the
Assumptions tab notes for the exact math).

New in the v2 workbook:
- **Three tiers**: Basic (essay editing + advisor feedback + the new brainstorming tool), Premium (AI
  essay feedback + the new Application Dashboard/AI holistic assessment), Super Premium (adds
  multi-year roadmap modeling for Gr.6–10 students).
- **One-time build costs** for the two new features (~$10K brainstorming, ~$30K Dashboard, ~$18K
  roadmap modeling), landing in Year 2.
- **After-tax profit target**: added an estimated ~11% BC small-business corporate tax rate (a
  planning estimate — confirm the real rate with your accountant) and re-based the $100K target to be
  measured after tax, per your request.
- **Result**: even after the new build costs and the tax haircut, the breakeven point *drops* — the
  Breakeven Sensitivity tab now shows roughly **38 active agencies** needed to clear $100K after tax in
  Year 3 (crossing between 35 and 40 in the table), down from 50 in the old two-tier model. The new
  tiers add real revenue upside with almost no added AI cost, which more than offsets the extra build
  and tax costs.
- Flagged explicitly in the workbook itself: the Super Premium price ($450–550/seat/year) is a new
  pricing decision above your originally-stated $150–300 range, not a continuation of it — worth a gut
  check against what agencies would actually pay before treating it as real.

**On your billing-cadence question** (agency yearly + per-seat, but maybe monthly for individual
parents): that's consistent with how most B2C SaaS prices vs. B2B — parents churn more easily and
expect monthly flexibility, agencies want annual predictability and are used to buying that way. Since
individual/parent pricing is still on hold per the roadmap, I haven't built that into this model yet;
happy to add a parallel "direct-to-parent" revenue block (monthly, no agency layer) if/when that's
ready to be modeled seriously.

## 🩹 Batch 9.6 — comment font-size, layout alignment, click-to-jump highlighting

### (6) Comments column now aligned with the essay column
Restructured the editor into a two-row CSS Grid instead of two independent columns. "評論" now sits in
the same grid row as "選取文字後按下「💬」即可留言", and the comments box starts in the same row as the
essay box — both pairs share a row, so Grid aligns their top edges automatically from real content
height, not a guessed spacer or pixel offset. This is a different mechanism from the `AnchoredThreads`
approach we moved away from — that tracked *each individual comment* against its own highlighted
sentence continuously; this just aligns two column headers/boxes once, which doesn't have the same
fragility.

### (4) Comment sidebar font-size now matches the essay
Liveblocks' `<Thread>` component ships noticeably larger internal text than our `text-sm` essay body.
Rather than guess Liveblocks' specific internal class names (got that wrong once already, in 9.5), the
fix targets every element inside `.lb-root` with a tag-based wildcard, forcing 14px / 1.625 line-height /
inherited font-family regardless of Liveblocks' actual DOM structure. Applies to the "評論" list and the
"🤖 AI 回饋" section.

### (5) Click a highlighted word → jump to its comment in the sidebar
Added a click handler on the essay editor: clicking a comment-highlighted word now scrolls the matching
thread card into view in the sidebar and briefly rings it in brand navy, so it's clear which comment
belongs to which highlight. This is **not** Liveblocks' `AnchoredThreads`/`FloatingThreads` — those
continuously pixel-position every thread against the editor's layout (the fragile approach in the 9.5
changelog below); this is a one-off DOM lookup that only runs on click, so it can't drift out of sync the
way pixel-tracking could.

**Two things in this one are worth double-checking on your end**, since neither could be verified without
a live browser: the mark's thread-ID attribute name (checked as either `threadId` or `id` — if clicking a
highlight doesn't jump to its comment, this is the first thing to look at), and the orange highlight color
on commented text (same open question carried over from 9.5 below — the CSS variable is now applied one
level higher in the DOM tree, which may or may not resolve it).

### Also answered (not a code change): Anthropic Console usage not showing
Usage/cost data can take a few minutes to appear after a request completes (usually well under 5, but
sometimes a bit longer), and the Console's Usage/Cost pages default to filtering by Workspace, model, and
month — if the key was generated under a specific Workspace and the page is showing a different one (or
last month instead of this one), it'll look empty even though requests are going through. Worth checking:
you're on `platform.claude.com` (not `claude.ai/settings/billing`, which is the separate subscription
billing page and won't show API usage at all), the Workspace selector matches where the key lives, and
the date range includes today.

## 🩹 Batch 9.5 — comment system overhaul, AI comments now visible, save button, arrow, prompt caching

### The big one: why comments were unreliable, overlapping, clipped, and why AI feedback never showed
All of these — not showing up on first load, overlapping each other, getting cut off at the bottom,
one comment's content bleeding into another — trace back to one design choice: I was using Liveblocks'
`AnchoredThreads` component, which tries to pixel-position each comment card to line up vertically with
its highlighted text in the editor. That's a fragile thing to get right (it depends on exact container
geometry, timing of when the editor's DOM has finished laying out, etc.), and I got the container setup
wrong in a way that let those computed positions collide, clip, and occasionally miss entirely on first
render.

The AI feedback bug turned out to be a special case of the same root issue, but total rather than
occasional: `AnchoredThreads` only renders threads anchored to a specific text selection. The AI's
feedback isn't about one sentence — it's a comment on the whole essay — so it had no anchor point and
`AnchoredThreads` silently skipped it every time, even though (per your terminal log) it was very
likely being created successfully in the background.

**The fix:** dropped `AnchoredThreads` entirely in favor of Liveblocks' plain `Thread` component,
rendered as normal stacked cards in two clearly separated sections — "評論" for student/advisor/agency
comments, and a visually distinct "🤖 AI 回饋" box below it, exactly as you asked. No position math, so
nothing to overlap, clip, or mistime. The highlighted text in the essay still shows you *where* a
comment applies (that's a mark Liveblocks applies automatically, now recolored — see below); the
comment text itself just lives in a normal list instead of trying to float at an exact pixel position.

### (A2) Comment highlight recolored — best effort, please confirm
Changed the in-text highlight for commented passages to an orange tone, distinct from the yellow
highlighter tool. I'm less certain about this one than most of this batch: Liveblocks' exact CSS class
name for this specific highlight isn't something I could verify without a live browser, so I've applied
three overlapping override attempts (a CSS variable plus two class-name guesses). If the highlight still
looks yellow after this, that's the one piece of this batch worth a quick look at
[the Liveblocks Tiptap docs](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap) — I left
detailed comments in the code pointing at exactly what to check.

### (A1) Explicit save button + "last saved at"
Relabeled to **💾 儲存版本** and moved to a clearer position in the toolbar. "最後儲存於 HH:MM" now
shows next to the 💬 comment button, both after a fresh save in your current session and immediately on
page load (pulled from the actual last snapshot's timestamp, not just session state).

### (9.4-2) Dropdown arrow, recentered
Replaced the browser's native arrow (which sits flush at the far edge, not adjustable) with a custom
one positioned the same distance from the right edge as your text is from the left — matches
`Version_94_Arrow.png`.

### (9.4-3/5) Why AI comments didn't show up, and the Supabase warning
Covered above — the display bug is fixed. Separately, your terminal log showed
`SUPABASE_SERVICE_ROLE_KEY is not set` — that one's not a code bug, it's a real env var that's been a
placeholder in `.env.local.example` since Batch 6 (for the Stripe webhook) that looks like it never got
a real value. It only affects the AI usage log (silently failing before, harmless to the feedback
feature itself) — but worth filling in: Supabase Dashboard → Settings → API → `service_role` secret key.

### (9.4-1) Deprecation warnings — safe to ignore
Both `node-domexception` and Node's `[DEP0169] url.parse()` warning come from transitive dependencies
(other packages' dependencies, not code we wrote), and neither is an error — just noise in the terminal.
Not acting on these now; they're not causing any of the actual problems above.

### (9.4-6) Prompt caching — implemented correctly (the reference snippet had the wrong shape)
One thing worth flagging: the snippet you found uses `cache_control` as a top-level parameter on
`messages.create()` — that's not how the current Anthropic API actually works (possibly an older
beta syntax, or illustrative pseudocode). The real mechanism marks a specific *content block* as
cacheable, which is what's implemented now, on the system prompt specifically (identical on every
request, so this is exactly what should be cached). Also worth knowing honestly: caching only pays off
above roughly 1,000 tokens for Haiku-class models — a one-line system prompt wouldn't hit that
threshold and caching it would save close to nothing. So I expanded the feedback rubric into a fuller,
more specific prompt (genuinely better feedback quality as a side effect, tailored to your Taiwan-based,
non-native-English-speaker context) partly to make the caching actually worth doing. Cache hit/miss
token counts are now logged in `ai_feedback_log` so you can confirm it's working from real data rather
than trusting the mechanism blindly.

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch9_5_cache_log_and_fixes.sql`.

### Step 2 — Fill in the missing env var
Add a real value for `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` if you haven't already (see above).

### Step 3 — Install dependencies
```
npm install
```
Adds `@liveblocks/react-ui` as an explicit dependency (was previously only pulled in transitively).

### Step 4 — Add/replace files
Replace: `package.json`, `components/editor/LiveDocument.tsx`, `components/SnapshotPicker.tsx`,
`app/actions/ai-feedback.ts`, `app/student/applications/[id]/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/agency/applications/[id]/page.tsx`.

### Step 5 — Test it
1. Leave a comment on a sentence — confirm it appears reliably on the *first* try, doesn't overlap
   with anything, and isn't cut off.
2. Leave several comments in a row — confirm they stack normally underneath each other.
3. Check the highlighted text color for a commented passage — should read as orange-ish, distinct
   from the yellow highlighter. If it still looks yellow, see the note above.
4. Click **🤖 AI 回饋** — confirm it now shows up, in its own labeled box below your comments.
5. Confirm **💾 儲存版本** and "最後儲存於" are both visible and working near the toolbar.
6. Open the version-history dropdown and check the arrow position against `Version_94_Arrow.png`.
7. Check Supabase's `ai_feedback_log` table for `cache_read_tokens` showing up on your *second* AI
   feedback request onward (the first request creates the cache; it won't show a read hit yet).

---

## 🆕 Batch 9.4 — AI essay feedback (Claude Haiku 4.5)

Scoped to just essays, as discussed — no credit limits or tier gating yet, just the feedback itself
plus a usage log so we have real numbers before designing billing around it.

### How it works
A **🤖 AI 回饋** button sits in the toolbar, visible to student/advisor/agency admin alike. Click it,
and the current essay text is sent to Claude (`claude-haiku-4-5-20251001` — the cheapest current
model, per your instruction) with a prompt tuned for college-essay feedback: structure, voice,
specificity, clichés, grammar, always naming a genuine strength before suggestions, and explicitly
told not to rewrite the essay for the student. The response comes back as a real comment thread,
authored as "AI 顧問" with its own color — using the exact same comment system we just fixed, so
there's no new UI to build for displaying it: it replies, resolves, and anchors the same way a human
comment does (though the AI's comment isn't anchored to specific text — it's a general/overall comment
on the whole essay, added at the top).

### What's logged, and what isn't (yet)
Every request logs which application, who asked, and token counts (`ai_feedback_log`) — this is
purely observability, not a limit. Nothing currently stops someone from clicking it repeatedly. That's
deliberate: let's see real usage patterns for a bit before sizing a credit system around guesses.

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch9_4_ai_feedback_log.sql`.

### Step 2 — Fill in `.env.local`
Add `ANTHROPIC_API_KEY=...` — you already have this key (`Claude_API_key.txt` in the project files).

### Step 3 — Install dependencies
```
npm install
```
Adds `@anthropic-ai/sdk`.

### Step 4 — Add/replace files
Add: `lib/anthropic.ts`, `lib/liveblocks-server.ts`, `app/actions/ai-feedback.ts`.
Replace: `package.json`, `.env.local.example`, `components/editor/LiveDocument.tsx`,
`app/student/applications/[id]/page.tsx`, `app/advisor/applications/[id]/page.tsx`,
`app/agency/applications/[id]/page.tsx`.

### Step 5 — Test it
1. Write at least a few sentences in an essay (there's a 30-word minimum — below that, you'll get a
   friendly message asking for more content rather than wasting a request).
2. Click **🤖 AI 回饋** — button shows "AI 分析中…" while it works.
3. Confirm a new comment thread appears, authored "AI 顧問", with actual feedback on your essay.
4. Try replying to it and resolving it, same as any other comment.
5. Check `ai_feedback_log` in Supabase — confirm a row appeared with token counts.

### A note on risk, same as with Liveblocks
This is a new integration (Anthropic SDK + posting comments server-side via Liveblocks' REST API,
which I'm slightly less certain about the exact method signature for than the client-side pieces
we've already tested). If the comment fails to post specifically (as opposed to the AI call itself
failing), check the terminal for the exact error — the Liveblocks Node SDK reference is at
https://liveblocks.io/docs/api-reference/liveblocks-node if anything needs adjusting.

---

## 🎨 Batch 9.3 — layout fix (width + overlap) and redesigned version history

### (1)+(2) Why the editor was narrower than the history list, and why comments covered it
Real root cause, not just a symptom patch: the comments sidebar sat in its own column with no
height/overflow containment, and Liveblocks' `AnchoredThreads` positions each comment card with an
absolute vertical offset computed from the editor's content — so a comment anchored near the end of a
long essay could compute an offset taller than the sidebar's own natural height, and render past it,
overlapping whatever came next on the page (the version history). Meanwhile the history section lived
outside the editor/sidebar grid entirely, spanning the *full* page width — wider than the editor
column specifically, which is what looked like a mismatch.

Fixed by restructuring, not just patching: the comments column is now `position: relative` with a
bounded, scrollable height (`max-h-[70vh] overflow-y-auto`, and it sticks in place while you scroll on
desktop) — so a comment card can never render past its own box anymore, contained or scrollable
instead. And version history now lives *inside the same column as the editor* rather than spanning the
whole page, which is what makes it exactly as wide as the editor above it, not wider.

### (3) Version history — redesigned as requested
- A single dropdown, starting on the placeholder "查看版本歷史" — not an ever-growing list.
- Picking a version shows its content in a read-only box directly below the dropdown.
- No restore/delete anywhere — genuinely can't lose or overwrite anything from here. Editing only
  ever happens in the live document above.
- A small note under the viewer, exactly as you described: "這些舊版本會保留下來，以防不小心遺失內容 —
  請在上方的主要編輯區塊進行實際編輯。"

### Step 1 — no database changes this time
Nothing to run in Supabase for this batch — purely a layout/UI change.

### Step 2 — Add/replace files
Add: `components/SnapshotPicker.tsx`. Replace: `components/editor/LiveDocument.tsx`,
`components/SnapshotHistory.tsx`, `app/student/applications/[id]/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/agency/applications/[id]/page.tsx`.

### Step 3 — Test it
1. Confirm the editor and the version history dropdown/viewer below it are now the same width.
2. Add a few comments (including some near the end of a long essay) — confirm they no longer spill
   onto the version history section below, and the comments panel scrolls internally instead.
3. Open the version dropdown — confirm it starts on "查看版本歷史" and lists your saved snapshots.
4. Pick one — confirm its content shows in the box below, and that there's no way to restore/delete
   it from here (only the note explaining to edit above).

---

## 🩹 Batch 9.2 — comments actually working, add-school for advisor/agency, sections removed, snapshot viewer, cleanup

### (1) Comments — the actual root cause this time
Confirmed: the comment *button* never existed. I'd imported `FloatingComposer` (the box that lets you
type a comment) but never wired up anything to tell it "start a comment here" — so it had no reason to
ever appear, and the text I'd left ("select text to comment") was pointing at a trigger that didn't
exist. Fixed with an actual 💬 button in the toolbar that calls Liveblocks' `addPendingComment()`
command on the current selection — press it, the composer opens right there, exactly like Google
Docs' comment button.

**(1A) Replies + resolve + students commenting on their own work** — these come free once the button
above actually works: Liveblocks' default thread UI already includes a reply composer and a resolve
button on every thread, and there's no role restriction anywhere in the code, so students, advisors,
and agency admins all get the same comment button. I did add one thing: resolved threads are now
filtered out of the list, so — like you asked — a resolved comment disappears from view instead of
lingering.

### (2) Advisor + agency admin can now add applications (schools) too
Previously only the student's own "新增申請" form existed. Generalized into a shared action
(`app/actions/applications.ts`) and added a "+ 新增學校" control on each student's card in both
`/advisor/students` and `/agency/students` — so an advisor or agency admin who realizes a student
needs another school added can do it directly, without waiting on the student.

### (3) Removed the leftover "Batch 1 setup check" banner from the homepage
Exactly what it looked like — a dev debug check that should've been cleaned up a long time ago.
Gone now.

### (4) Removed the "add a section" feature
Pulled the section tabs/switcher back out of all three application pages per your feedback — back to
one document per application, no extra UI. I left the underlying database table in place (unused,
harmless) rather than dropping it, in case this is worth revisiting later in a simpler form.

### (5) Historical snapshots are now actually viewable
Each row under "查看歷史快照" is now its own expandable item — click one and its saved text appears
right there, instead of the row just sitting inert. (New shared `components/SnapshotHistory.tsx`.)

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch9_2_agency_create_applications.sql`. Adds the missing
policy letting agency admins create applications (advisors already had this).

### Step 2 — Add/replace files
Add: `app/actions/applications.ts`, `components/SnapshotHistory.tsx`.
Replace: `components/editor/LiveDocument.tsx`, `app/page.tsx`, `app/student/applications/page.tsx`,
`app/student/applications/[id]/page.tsx`, `app/advisor/students/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/agency/students/page.tsx`,
`app/agency/applications/[id]/page.tsx`.
Delete: `app/student/applications/actions.ts` (superseded by the shared action),
`components/SectionTabs.tsx`, `app/actions/sections.ts` (the removed sections feature).

### Step 3 — Test it
1. Select text in the document, press **💬** — confirm a comment box actually opens now.
2. Submit a comment, then try replying to it and resolving it — confirm resolving makes it disappear.
3. As the student, try leaving a comment on your own document — should work with no restriction.
4. As the advisor and again as the agency admin, use "+ 新增學校" on a student's card — confirm a new
   application appears and opens correctly.
5. Confirm the homepage no longer shows the "Batch 1 setup check" box.
6. Confirm there's no more section tabs/"+新增段落" button on any application page.
7. Click into an older snapshot under "查看歷史快照" — confirm its text actually shows now.

---

## 🩹 Batch 9.1 — comments fix, agency stage updates, application sections

### Fix — comments not appearing at all
Found it: `<AnchoredThreads editor={editor} />` was rendered with no actual data source. That
component needs the thread list handed to it explicitly via Liveblocks' `useThreads()` hook — without
it, there's nothing to render, which is exactly the "comments don't work at all, in any portal"
symptom. Fixed in `components/editor/LiveDocument.tsx`.

### Fix — agency admin can now update stage too
Added the same stage-update control to the agency admin's application page that the advisor already
had, plus the missing RLS policy (previously only the student and their advisor could update an
application's stage).

### New — sections (multiple documents per application)
For schools like NYU (an extra "Why NYU?" supplement) or the Common App (up to six prompts): any of
the three roles can now click **+ 新增段落** above the live document to add a named section with its
own optional prompt/word limit. Each section is its own fully live, collaborative document (its own
Liveblocks room) — completely independent of the main essay and of every other section. Applications
with no added sections work exactly as before; sections are additive, never required.

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch9_1_sections_and_agency_stage.sql`. Adds the agency-admin
stage-update policy and the new `application_sections` table + RLS.

### Step 2 — Add/replace files
Add: `components/SectionTabs.tsx`, `app/actions/sections.ts`, `app/agency/applications/[id]/actions.ts`
(new — agency admin now has its own `updateStage`). Replace: `components/editor/LiveDocument.tsx`,
`app/api/liveblocks-auth/route.ts`, `app/student/applications/[id]/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/agency/applications/[id]/page.tsx`.

No new npm packages this time — just re-run `npm install` if you want to be safe, but nothing should
have changed there.

### Step 3 — Test it
1. Open any application as any of the three roles — confirm comments now load and appear when you
   select text and leave one (this was completely broken before).
2. As the agency admin, confirm you can now change the stage dropdown, same as the advisor.
3. Click **+ 新增段落**, give it a title like "Why NYU?", submit — confirm it appears as a new tab
   and opens a separate, empty live document. Confirm the main essay's content is untouched.
4. Open that new section as a different role (e.g. student adds it, advisor opens the same tab) —
   confirm it's the same live document for both, same as the main essay.

### One known simplification worth flagging
"封存目前快照" always saves into the same `drafts`/history table regardless of which section is
open — so the history list mixes snapshots from the main essay and from any sections together for
now. Fine for a first pass; let me know if you want per-section history separated out.

---

## 🆕 Batch 9 — live collaborative editing (Liveblocks rebuild)

**Read this before testing.** This is a genuinely new piece of infrastructure — the first
non-Supabase, non-Stripe external service in this project — and I can't run or test it myself in
this environment (no network access on my end). Expect this to need at least one debugging round,
same as every other new integration has (Stripe, the annotation system). If something doesn't import
or doesn't match what's described below, the Liveblocks + Tiptap integration docs are at
https://liveblocks.io/docs/get-started/tiptap — that's the first place to check package/API names
against if anything's off.

### What changed, conceptually
- **One live document per application**, not versioned drafts. Student, advisor, and agency admin
  now all edit the *same* document, at the *same* time, seeing each other's cursors and changes as
  they happen — genuinely simultaneous, not "save and refresh."
- **Comments are now Liveblocks Comments**, anchored to text, shown in a sidebar next to the doc,
  live for everyone. This replaces the whole custom comment/highlight system from Batch 8.
- **A manual "封存目前快照" button** takes the place of auto-versioning-on-save — click it to save a
  read-only snapshot into the same `drafts` table as before (for word-count history and the "查看歷史
  快照" list). Nothing forces a snapshot; it's there for whoever wants a checkpoint.
- **Files = applications.** Per your clarification, "NYU / McGill / CommonApp essay" are exactly the
  existing applications, so no new file-picker data model was needed — just a small visual refresh
  (a document icon on each card) on the student's application grid, making the "pick a file" feel a
  bit more literal. The advisor/agency list views are unchanged in this pass — happy to extend the
  same card treatment there next if useful.

### What was removed
`components/editor/DraftEditor.tsx`, `AnnotatedDraft.tsx`, `comment-decorations.ts`,
`read-only-guard.ts`, `components/realtime/LiveRefresh.tsx`, and the old per-role `addComment`/
`addDraft` server actions — all superseded by Liveblocks, which handles sync and comments itself.
The old `comments` table (with its `kind`/`range_from`/`range_to` columns from Batch 8) is left in
place but unused — nothing reads or writes it anymore. Harmless to leave; fine to drop later if you
want a cleanup pass.

### Step 1 — Sign up for Liveblocks
Go to https://liveblocks.io, create a free account and a project. Free tier: 5,000 monthly active
users, unlimited rooms — plenty of headroom for a while. Copy the **secret key** (starts with
`sk_...`) from your project's API keys page.

### Step 2 — Run the database patch
Supabase → SQL Editor → run `supabase/batch9_liveblocks.sql`. This lets advisors and agency admins
also save a snapshot (previously only the student could).

### Step 3 — Fill in `.env.local`
Add `LIVEBLOCKS_SECRET_KEY=sk_...` (see the updated `.env.local.example`). Nothing else needed —
there's deliberately no public key used client-side; the app authenticates through
`/api/liveblocks-auth`, which checks the same Supabase role/RLS rules as everywhere else before
letting someone into a document.

### Step 4 — Install dependencies
```
npm install
```
Adds `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/react-tiptap`, `@liveblocks/node`.

### Step 5 — Add/replace files
Add: `app/api/liveblocks-auth/route.ts`, `components/editor/LiveDocument.tsx`,
`app/actions/documents.ts`. Replace: `package.json`, `.env.local.example`,
`app/student/applications/[id]/page.tsx`, `app/student/applications/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/advisor/applications/[id]/actions.ts`,
`app/agency/applications/[id]/page.tsx`. Delete (if not already gone from applying the above):
`app/student/applications/[id]/actions.ts`, `app/agency/applications/[id]/actions.ts`,
`components/editor/DraftEditor.tsx`, `components/editor/AnnotatedDraft.tsx`,
`components/editor/DraftComposer.tsx`, `components/editor/comment-decorations.ts`,
`components/editor/read-only-guard.ts`, `components/realtime/` (whole folder).

### Step 6 — Test it (this is the important one)
1. Open the same application as the student in one browser and as the advisor in another
   (e.g. a regular window + an incognito window, logged in as each).
2. Confirm you see a colored avatar for the other person appear in "目前在線" within a couple
   seconds of both being on the page.
3. Type in one window — confirm the text appears in the other window in real time, not on refresh.
4. Try Bold/Italic/Underline/Highlight from either side — confirm it shows up live for the other.
5. Select some text and leave a comment — confirm the comment thread appears anchored to that text,
   live, on the other screen.
6. Click "封存目前快照" — confirm it appears in "查看歷史快照" below.
7. Repeat with the agency admin account on `/agency/applications/[id]` to confirm three-way access.

If step 2 or 3 don't work, the most likely culprits are: `LIVEBLOCKS_SECRET_KEY` not set/not picked
up (restart `npm run dev` after editing `.env.local`), or a mismatch between the package version
installed and the API surface this code assumes — check the Liveblocks docs link above.

---

## 🩹 Batch 8.1 — fixes + live sync + standalone highlighter (advisor UX redesign)

### On "live collaborative editing" — what this batch actually does
You asked for live collaborative editing **and** to keep drafts immutable / advisors not editing the
essay text directly — those pull in different directions if "editing together" means literally typing
in the same text at the same time. What's built here: **comments and highlights now appear live** for
anyone viewing the draft (no refresh needed), and if the student saves a new version while the advisor
has the page open, the advisor's view updates automatically too. What's *not* built: the advisor typing
directly into the student's essay — that would mean drafts are no longer immutable snapshots, which
conflicts with the versioning the rest of the app depends on (and with what you asked to keep). If you
did mean literal simultaneous text editing of the same document, let's talk through what that would
take (it's a materially bigger project — real-time document sync, e.g. via Yjs — not a small addition)
before committing to it.

### Fix 1 — student page crash
Root cause: I passed a plain inline function from the (server-rendered) student page into the
`AnnotatedDraft` client component — Next.js doesn't allow that ("Event handlers cannot be passed to
Client Component props"). Fixed by making that prop optional and simply not passing it when there's
nothing to submit.

### Fix 2 — npm audit (3 high severity)
All three traced back to one thing: `next` needed bumping from `16.2.10` to `16.2.12` (fixes Next.js
itself and the vendored `postcss`/`sharp` versions it pulls in). Updated in `package.json` — run
`npm install` and `npm audit` should come back clean.

### Fix 3 — single-word/single-letter selection bug (the "e" bug)
Root cause: the read-only draft view was set to `editable: false`, which makes the DOM genuinely
non-editable — and browsers handle native selection (especially double-click-to-select-a-word)
unreliably on non-editable regions. That's why selecting a word sometimes only captured one character.
Fixed properly: the editor is now always genuinely `contentEditable` (so the browser's own selection
behavior works correctly), and a new extension (`components/editor/read-only-guard.ts`) blocks any
transaction that would actually change the document, while still allowing selection. This also happens
to be the correct foundation for point 3 below (advisors can interact naturally without ever being able
to edit the text).

### Redesign — advisor/agency review view
Decluttered based on your feedback:
- **One clear pane by default.** The version-history list and side-by-side compare are now tucked
  behind a collapsed "查看所有版本" disclosure — the page opens straight to the latest draft +
  comments, not a wall of version rows.
- **One selection, two clear actions.** Selecting text now shows two buttons right there: **醒目提示**
  (just highlight, one click, no text required — this is the new standalone highlighter) and **留言**
  (write an anchored comment). Previously the only option was writing a full comment, and the general
  "anchored vs overall" comment split wasn't well distinguished — this should read much more like
  circling something on a page and optionally jotting a note next to it.
- **New standalone highlighter** (your point 2): `comments.kind` is now `'comment'` or `'highlight'` —
  a highlight needs no body text and shows as a yellow mark in both the draft and the sidebar list,
  completely independent of leaving a comment.
- **Drafts stay immutable** (your point 3): highlights and comments are stored as position references
  into a specific draft version, same as before — nothing about a saved draft is ever edited afterward.

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch8_1_live_and_highlight.sql`. Adds `comments.kind` and
enables Realtime replication on `drafts`/`comments`. If the two `alter publication` lines error, open
Database → Replication in the Supabase dashboard instead and toggle "Realtime" on for both tables.

### Step 2 — Install dependencies
```
npm install
```
Picks up the Next.js security bump — no new packages this time.

### Step 3 — Replace/add files
Replace: `package.json`, `components/editor/DraftEditor.tsx`, `components/editor/AnnotatedDraft.tsx`,
`components/editor/comment-decorations.ts`, `app/student/applications/[id]/page.tsx`,
`app/advisor/applications/[id]/page.tsx`, `app/advisor/applications/[id]/actions.ts`,
`app/agency/applications/[id]/page.tsx`, `app/agency/applications/[id]/actions.ts`.
Add: `components/editor/read-only-guard.ts`, `components/realtime/LiveRefresh.tsx`.

### Step 4 — Test it
1. Run `npm audit` — should show 0 vulnerabilities now.
2. As the student, open an application — it should load fine this time (no more crash).
3. As the advisor, open the same application in a second browser/incognito window (or just a second
   tab logged in as advisor) side by side with the student's tab.
4. As the advisor: select a full word or sentence. Confirm the selected text shows correctly (not a
   single letter). Try **醒目提示** — it should appear instantly, no typing needed. Try **留言** — write
   something, submit, and confirm it appears as a red-anchored comment.
5. Without refreshing the student's tab, confirm the new highlight/comment appears there live within a
   second or two.
6. As the student, save a new draft version. Without refreshing the advisor's tab, confirm it updates
   automatically to reflect the new version is available.
7. Click "查看所有版本" to confirm the version history and compare view still work, just tucked away.

---

## 🆕 Batch 8 — Google-Docs-style annotation system (advisor + agency admin)

This is the feature scoped back in Batch 5.1 and put on hold. Built now: rich text formatting
(bold/italic/underline/highlight) for students writing, and text-anchored comments for
advisors/agency admins reviewing — plus a way to view multiple draft versions side by side.

### What's new
- **Rich text editor** (`components/editor/DraftEditor.tsx`, built on Tiptap): students get a small
  toolbar (B / I / U / highlight) while writing. Old plain-text drafts still open fine — they're
  automatically shown as plain paragraphs.
- **Text-anchored comments** (`components/editor/AnnotatedDraft.tsx`): advisors/agency admins select
  any phrase or sentence in the student's draft, a compose box appears right there, and the resulting
  comment is now tied to that *exact* range of text — not just a loosely-matched quoted string like
  before. Clicking a comment in the sidebar highlights its text in the draft, and vice versa. General,
  not-tied-to-one-line feedback is still supported too, via a separate "+ 新增整體評論" button.
- **Multiple drafts, side by side**: on the advisor/agency application page, click any past version in
  "草稿歷程" to view + comment on it (not just the latest), and click "比較" next to any other version to
  open a second read-only pane alongside it.
- Drafts remain fully immutable once saved — comments store the highlighted range as a position
  reference into that specific version's content, so nothing about a past draft ever needs to be
  edited after the fact.

### What this does NOT include (deliberately, to keep this batch shippable)
- Real-time collaborative editing (e.g. Google Docs' live cursors) — comments/drafts still save on
  explicit submit, same as the rest of the app.
- A free-standing "highlighter with no comment attached" tool for advisors — highlighting is tied to
  leaving a comment (like circling something on a printed page and writing a note in the margin),
  rather than a separate always-on highlighter pen. Let me know if you specifically want that as a
  standalone tool later.
- Formatting (bold/italic/underline/highlight) is per-draft-version, set by whoever is editing that
  version (i.e. the student, while writing). Advisors/agency admins don't reformat the student's text
  directly — their input is comments, which is the safer default (keeps drafts immutable once saved).

### Step 1 — Run the database patch
Supabase → SQL Editor → run `supabase/batch8_annotations.sql`. Adds `drafts.content_json` (the
formatted document; existing `content` plain text is untouched) and `comments.range_from` /
`comments.range_to` (the anchored text range).

### Step 2 — Install the new dependencies
```
npm install
```
Pulls in Tiptap (`@tiptap/react`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`,
`@tiptap/extension-underline`, `@tiptap/extension-highlight`).

### Step 3 — Add/replace files
Add the whole new `components/editor/` folder (`DraftEditor.tsx`, `DraftComposer.tsx`,
`AnnotatedDraft.tsx`, `comment-decorations.ts`). Replace `app/student/applications/[id]/page.tsx`,
`app/student/applications/[id]/actions.ts`, `app/advisor/applications/[id]/page.tsx`,
`app/advisor/applications/[id]/actions.ts`, `app/agency/applications/[id]/page.tsx`,
`app/agency/applications/[id]/actions.ts`, `package.json`, `tailwind.config.ts`.

### Step 4 — Test it
1. As `dan2@nativeenglish.ca` (student), open an application and write a draft — try bolding a
   sentence and highlighting a phrase, then save.
2. As `dan@nativeenglish.ca` (advisor), open that same application. Select a sentence in the draft —
   a compose box should appear right below it. Submit a comment; the sentence should now show a
   reddish underline/highlight, and the comment should appear in the sidebar on the right.
3. Click "+ 新增整體評論" to confirm you can still leave feedback with no specific text selected.
4. Have the student save a second draft version. As the advisor, go to "草稿歷程" and click the first
   version — you should see that version's content and comments, not the newest one. Click "比較" next
   to the other version to see both side by side.
5. As `info@nativeenglish.ca` (agency admin), repeat step 2–4 on `/agency/applications/[id]` to confirm
   the same annotation system works there too.

---

## What's next

Agreed order: (9) sign-up / invite flow, (10) deploy to Vercel, (11) finish Stripe (webhook + env vars,
picking back up from Batch 6/7), (12) a product tour / "how to use" guide for agencies and students.
Parent portal + individual/parent sign-up are on hold per your note in Batch 7.

---

## 🩹 Batch 7 — capacity editing, navigation links, Stripe crash fix (Stripe setup itself deferred)

### Fix 1 — capacity page note + adjustable capacity (agency admin)
Removed the note pointing admins at a SQL file they don't have access to. In its place, each advisor row
on **顧問產能** now has an inline "承接上限" field the agency admin can edit directly — no Supabase access
needed. New RLS policy scopes this narrowly: agency_admin can only update the `capacity` field on advisor
rows within their own agency (can't touch role, agency, or student rows through this).

**What to do:** Supabase → SQL Editor → run `supabase/batch7_agency_admin_capacity.sql`. Replace
`app/agency/capacity/page.tsx`. Add `app/agency/capacity/actions.ts`.

### Fix 2 — "return to Agency Overview" links
Added a small "← 回到機構總覽" link at the top of both `/agency/students` and `/agency/capacity`, linking
back to `/agency`. Replace `app/agency/students/page.tsx` (already replaced in Batch 6 for a different fix
— this is an additional change on top) and `app/agency/capacity/page.tsx` (same file as Fix 1 above, one
replacement covers both).

### Fix 3 — billing page crash when Stripe isn't configured yet
Root cause: the Stripe SDK throws immediately if constructed with an empty API key, and `lib/stripe.ts` was
constructing it at import time — so simply visiting **帳單與繳費** with no `STRIPE_SECRET_KEY` set crashed
the page, even though you weren't trying to use billing yet. Fixed by making the Stripe client lazy — it's
only constructed the moment something actually calls the Stripe API (checkout, portal, or the webhook),
and each of those already redirects to a friendly error banner first if the key is missing. The rest of the
app (agency/advisor/student portals) never touches Stripe at all, so this should not have been blocking
you — sorry about that.

**What to do:** Replace `lib/stripe.ts`, `app/agency/billing/actions.ts`, `app/api/stripe/webhook/route.ts`.
No SQL to run for this one.

### About finishing Stripe setup
Confirmed — let's hold off on webhook/env var setup until the site is deployed and live, then come back to
it together. Nothing above requires Stripe to be configured; the billing page will just show "尚未連接真實
付款系統" until then, same as before Batch 6.

One small note for when you do look for `.env.local.example`: on macOS, Finder hides files starting with a
dot by default. Press **Cmd+Shift+.** (period) in Finder to reveal it, or just use `ls -la` in Terminal
inside the project folder.

### On individual/parent sign-up and pricing (not built yet — a few thoughts)
This is worth designing deliberately rather than bolting on, so here's the shape I'd suggest rather than
code to review yet:

- **Positioning:** frame it as a *lightweight, single-family* version of the same tool the consultancies
  use — not a competing consultancy. The consultancy's value is the human advisor relationship (feedback,
  strategy, accountability); a solo parent sign-up would get the writing workspace and stage-tracking, but
  explicitly **not** advisor feedback (since there's no consultancy behind it to provide one), and the
  marketing copy can say so plainly: "already working with a consultant? Ask them about Native English
  Studio" rather than positioning this as an alternative.
- **Feature cut:** student portal minus the advisor-feedback loop, i.e. 發想 → 大綱 → 初稿 → 修訂 → 定稿
  (skip 顧問回饋 or replace it with an AI-only feedback pass once the Claude API integration lands — that
  actually becomes the core value prop for this tier, not a lesser version of the agency product).
- **Price point:** given the seat pricing in your financial model ($150–$275/year through an agency,
  bundled with the agency's own fee), a direct-to-parent single-seat annual price somewhere in the
  **$200–$350/year** range (or a monthly option around $25–$35/month for anyone hesitant to commit annually)
  would sit above the wholesale seat price (since there's no agency absorbing part of the cost/effort) but
  well below what a consultancy charges for actual human advising — keeping it clearly a different product,
  not a discount alternative to hiring a consultant.
- **How this fits the roadmap:** this needs the self-serve sign-up flow that's already on the "not yet
  built" list (HANDOFF.md), just extended to support an agency-less "solo parent" account type alongside
  the agency-invited one. Good candidate for a batch once deployment + Stripe are both live, since it'll
  want its own Stripe price and its own Checkout flow parallel to the agency one already built in Batch 6.

Happy to turn any of the above into an actual spec/batch whenever you're ready — flagging it now so it
doesn't get lost.

---

## 🆕 Batch 6 — Stripe billing

Real billing, replacing the UI-only 帳單與繳費 page. Pricing is pulled from
`Native_English_Financial_Model.xlsx`: $2,000/year agency license (negotiable $1,500–$2,500),
$150/year per standard seat, $275/year per premium seat.

### Step 1 — Set up Stripe (one-time, in the Stripe Dashboard)
1. Create a Stripe account if you don't have one yet (test mode is fine to start).
2. Go to **Products** → **Add product**. Create three products, each with a **recurring, yearly**
   price:
   - "Agency Annual License" — $2,000/year (you can adjust per-agency later; this is just the default)
   - "Standard Seat" — $150/year
   - "Premium Seat" — $275/year
3. Copy each price's ID (starts with `price_...`) — you'll need these in Step 3.
4. Go to **Developers** → **API keys** and copy your **Secret key** (starts with `sk_test_...` in test
   mode).
5. Go to **Developers** → **Webhooks** → **Add endpoint**. Once you've deployed (see the "No deployment
   yet" note in this README), set the endpoint URL to `https://yourdomain.com/api/stripe/webhook`. Select
   these events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.paid`. After creating it, copy the **Signing secret** (starts
   with `whsec_...`).
   - For local testing before you deploy, install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and
     run `stripe listen --forward-to localhost:3000/api/stripe/webhook` — it will print a temporary
     `whsec_...` secret to use locally.

### Step 2 — Run the database patch
Supabase → SQL Editor → New query → paste all of `supabase/batch6_stripe_billing.sql` → **Run**. This adds
billing columns to `agencies` and a new `billing_events` table (used for the invoice history list).

### Step 3 — Fill in your `.env.local`
Add the six new variables from the updated `.env.local.example` (also copy the file itself if you don't
have a `.env.local` yet): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_LICENSE`,
`STRIPE_PRICE_SEAT_STANDARD`, `STRIPE_PRICE_SEAT_PREMIUM`, `NEXT_PUBLIC_SITE_URL`.

### Step 4 — Install the new dependency
```
npm install
```
(This pulls in the `stripe` package added to `package.json`.)

### Step 5 — Replace/add files
Add `lib/stripe.ts`, `lib/supabase/admin.ts`, `app/api/stripe/webhook/route.ts`,
`app/agency/billing/actions.ts`. Replace `app/agency/billing/page.tsx`, `package.json`,
`.env.local.example`.

### Step 6 — Test it
1. As `info@nativeenglish.ca` (agency admin), go to **帳單與繳費**.
2. Enter a seat count and click **開始訂閱** — you'll land on a real Stripe Checkout page. Use Stripe's
   test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. After paying, you're redirected back to the billing page, which should now show **使用中**, your seat
   counts, and a renewal date. If it still shows the old numbers, wait a few seconds and refresh — the
   webhook updates the database asynchronously.
4. Click **管理付款方式、發票與訂閱設定** to confirm the Stripe-hosted billing portal opens correctly.
5. Check **帳單紀錄** — a paid invoice should appear with a link to the hosted invoice.

### What's NOT included in this batch
- No per-student premium/standard assignment yet — seat *counts* are billed, but which individual
  students count as "premium" isn't tracked anywhere in the app yet (ties into the not-yet-built premium
  feature gating). For now the counts are just numbers the agency admin enters.
- No proration UI beyond what Stripe Checkout/Portal already handle automatically.
- No email receipts beyond Stripe's own default ones (Stripe sends these automatically; no extra work
  needed unless you want custom branding on them later, which is a Stripe Dashboard setting, not code).

---

## 🩹 Batch 5.1 — fixes from testing feedback (student, advisor, agency panels)

### Fix 1 — stage-line rendering gap (student + everywhere `<StageThread>` is used)
The connecting line between 發想 and 大綱 (and technically every stage) was rendering *before* each dot
instead of after it, which left a visible gap on the very first segment. Reordered so each segment draws
dot → line → next dot. Purely visual, no data changes.

### Fix 2 — "last saved" timestamp (student)
Added a small "上次儲存：[date/time]" line under the save button on the application detail page, using the
draft's existing `created_at` field — no schema change needed.

### Fix 3 — agency admin routing bug + admin commenting
Root cause: `/agency/students` was linking into the **advisor's** application detail route
(`/advisor/applications/[id]`), whose "回到學生總覽" link is hardcoded to `/advisor/students` — a page
that only shows students where `primary_advisor_id` matches the logged-in user, which is never true for an
agency_admin. Fixed by adding a proper `/agency/applications/[id]` route with its own correct back-link,
and repointing `/agency/students` to it. This route also lets the agency admin post feedback comments,
which needed a new RLS policy (agency_admin previously had **no** read policy on `drafts` or `comments` at
all, let alone insert — worth knowing if you were relying on the earlier claim that "read access works via
RLS" for admins; it didn't, for these two tables).

**What to do:** Supabase → SQL Editor → run `supabase/batch6_agency_admin_comments.sql`. Add the new
`app/agency/applications/[id]/` folder. Replace `app/agency/students/page.tsx`.

### Fix 4 — capacity page → consultant's student list
The advisor's name in **顧問產能** is now a link to their filtered student list
(`/agency/students?advisor=<id>`). Added the same link treatment to the advisor rows in **機構總覽**'s
status snapshot. Replace `app/agency/capacity/page.tsx`.

### Fix 5 — org overview drill-down
The 顧問人數 and 學生人數 cards on **機構總覽** are now links into **顧問產能** and **學生總覽**
respectively. Replace `app/agency/page.tsx`.

### Not fixed yet — the Google-Docs-style annotation request (advisor panel)
Bold/italic/underline/highlight plus inline comments anchored to specific text, with multi-draft
side-by-side viewing, is a real feature addition — it needs a rich-text editor library (e.g. Tiptap), a
schema change to anchor comments to text ranges/offsets instead of a loose `anchor_text` string, and some
thought about how multiple simultaneous draft views should lay out. Worth scoping as its own batch with a
quick mockup before building, rather than folding it into a fixes batch. Flagging so it doesn't get lost —
happy to start on it whenever you're ready.

### Step — Add/replace files for this batch
Add: `app/agency/applications/[id]/page.tsx`, `app/agency/applications/[id]/actions.ts`.
Replace: `components/StageThread.tsx`, `app/student/applications/[id]/page.tsx`,
`app/agency/students/page.tsx`, `app/agency/capacity/page.tsx`, `app/agency/page.tsx`.
Run: `supabase/batch6_agency_admin_comments.sql`.

---

## 🩹 Batch 5 — critical fix + 2 aesthetic fixes + agency admin portal

### Fix 1 — the real reason "新增" failed (critical)

Root cause found: Batch 2's schema gave students permission to **view** and **update** their own
applications, but I never actually wrote a rule granting permission to **create** one. Postgres denies by
default when no rule allows an action — that's exactly the "new row violates row-level security policy"
error you saw. This also explains the empty advisor portal: the application was never actually saved, so
there was nothing for the advisor to see.

**What to do:** Supabase → SQL Editor → New query → paste all of
`supabase/batch5_fix_applications_insert.sql` → **Run**. Then try **新增** again as `dan2@nativeenglish.ca`
— it should work now, and the application should immediately show up in the advisor portal too.

### Fix 2 — favicon transparent background

Reworked so only the outer background is transparent — the flag's own white stripes (part of the design,
not background) stay solid, the same way your Gmail icon example works. Replace `app/icon.png` with the
new one in this drop.

### Fix 3 — logo showing beige-on-white

You were right — the beige-background logo looked wrong sitting inside a white header bar. Fixed by adding
a **second logo file**, `public/logo-white.png` (the original white-background version), and pointing every
white-header page (student portal, advisor portal, and the new agency portal) at that one instead. The
beige-background `public/logo.png` stays exactly as-is for the homepage and login page, where it sits
directly on the beige page background.

**What to do:** add `public/logo-white.png` (new file) and replace `app/icon.png`, `app/student/layout.tsx`,
and `app/advisor/layout.tsx` with the versions in this drop.

---

### What's new: the agency admin portal

- `app/agency/` (new folder) — **機構總覽** (org-wide KPIs: advisor count, student count, overdue count,
  plus a callout naming which advisor(s) have room for more students), **顧問產能** (the full capacity
  table — this is the one built specifically to answer "which advisor can take more work," sorted by
  available room, with a status bar per advisor and a plain-language recommendation), **學生總覽**
  (every student in the agency, filterable by advisor, click into any application to see the same detail
  view advisors use), and **帳單與繳費** (a UI preview — real numbers and invoices activate once Stripe is
  connected in a later batch; it currently only shows your real seat count).
- `supabase/batch5_agency_patch.sql` — adds one column (`capacity` on `profiles`) so each advisor's
  recommended student limit can eventually be tuned per-person. Defaults to 25 if not set.
- `app/dashboard/page.tsx` — updated again, now sends agency-admin accounts straight into `/agency`.

### Step 1 — Run both database patches (in this order)
1. `supabase/batch5_fix_applications_insert.sql` (the critical fix above)
2. `supabase/batch5_agency_patch.sql` (adds the capacity column)

### Step 2 — Add/replace files
Add the whole new `app/agency/` folder, `lib/capacity.ts`, `lib/agency-data.ts`, `public/logo-white.png`.
Replace `app/icon.png`, `app/student/layout.tsx`, `app/advisor/layout.tsx`, `app/dashboard/page.tsx`, and
`supabase/schema.sql`.

### Step 3 — Test it

```bash
npm run dev
```

1. As `dan2@nativeenglish.ca` (student), go to 我的申請 and add a new application — confirm it now actually
   appears as a card.
2. Log in as `測試顧問` (advisor) → 本週關注 and 學生總覽 should now show dan2's application.
3. Log in as `測試管理者` (agency admin) → you should land on `/agency` automatically. Check 機構總覽 shows
   real counts, 顧問產能 shows your one test advisor with a status pill, and 學生總覽 shows dan2 linked to
   the right advisor.
4. Check the favicon in your browser tab (should have no visible white box around it now) and the logo on
   any white-header page (student/advisor/agency portals) — should look like a normal logo on white, not a
   beige box.

### Step 4 — Commit and push

```bash
git add .
git commit -m "Batch 5: fix applications insert bug, agency admin portal, favicon/logo fixes"
git push
```

## What's next
Batch 6 will connect Stripe for real billing. See the handoff note at the end of this chat for the full
plan going into a new conversation.

---

## Batch 4 — bug fix + advisor portal (for historical reference — already applied)

### The "新增" (Add) button doing nothing — fixed

Here's what was actually happening: your `dan2@nativeenglish.ca` student account most likely wasn't linked
to an agency (`agency_id` was empty). My code silently gave up in that situation instead of telling you why
— that was a real bug in how I handled errors, not something you did wrong.

**Two things fixed:**
1. The form now always redirects back with a clear red error banner instead of silently doing nothing —
   whatever goes wrong from now on, you'll see a message explaining it.
2. A diagnostic script to check and fix `dan2@nativeenglish.ca` specifically.

**What to do:**
1. Supabase → SQL Editor → New query → open `supabase/diagnose_dan2.sql` from this drop → paste → **Run**.
2. The first query shows you `dan2@nativeenglish.ca`'s current role/agency. If `agency_name` is blank, the
   second statement in the same file fixes it automatically (already included, runs right after).
3. The last query in the file re-confirms it's fixed — you should now see an agency name next to the account.
4. Replace `app/student/applications/actions.ts` and `app/student/applications/page.tsx` with the versions
   in this drop (these now show real error messages instead of failing silently).
5. Try **新增** again in the browser — it should either work, or show you a red banner explaining exactly
   what's wrong (which you can send me if it's something new).

---

### What's new: the advisor portal

- `app/advisor/` (new folder) — **本週關注** (This Week — a triage list of every assigned student's
  applications, sorted by urgency: overdue first, then approaching deadlines, then everything else), and
  **學生總覽** (student roster, showing every assigned student and all their applications' progress at a
  glance).
- Clicking into any application (from either page) shows the full draft history with word-count trends
  (e.g. "+42 words since last version"), the latest draft's full text, a place to leave feedback, and a
  dropdown to move the application to the next stage.
- `app/dashboard/page.tsx` — updated again, now also sends advisor accounts straight into `/advisor`.

No new database patch needed for this batch — the permissions advisors need were already written into the
original `schema.sql` back in Batch 2.

### Step 1 — Add the new files
Add the whole new `app/advisor/` folder. Replace `app/dashboard/page.tsx`,
`app/student/applications/actions.ts`, and `app/student/applications/page.tsx` with the versions in this drop.

### Step 2 — Test it

```bash
npm run dev
```

1. Log out, log back in as your **advisor** test account (`測試顧問`).
2. You should land on `/advisor` automatically, on the **本週關注** page.
3. If `dan2@nativeenglish.ca` (now fixed and linked to the same agency) has added any applications, and if
   that student's `primary_advisor_id` points to this advisor, you should see them listed here, sorted by
   urgency.
4. Click into one → try leaving feedback and changing its stage. Then log back in as the student and
   confirm the feedback shows up under 顧問回饋 on their side, and the stage-thread has moved.

*(Note: your test student and advisor need to actually be linked — `diagnose_dan2.sql` in this drop sets
`primary_advisor_id` to your `測試顧問` account as part of the fix, so this should already be true after
Step 1 above.)*

### Step 3 — Commit and push

```bash
git add .
git commit -m "Batch 4: advisor portal, fix silent form failure"
git push
```

## What's next

Batch 5 will build the **agency admin portal**: the org-wide overview, the advisor capacity view (answering
"which advisor can take more work"), the agency-wide student list, and the billing/plan page. Let me know
once Batch 4 is confirmed working.

---

## Batch 3 — student portal + two fixes (for historical reference — already applied)

### Fix 1 — middleware → proxy rename
Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (same job, different name — see the
terminal warning you saw). Fixed by renaming the file and the function inside it.

**What to do:** delete your old `middleware.ts`, add the new `proxy.ts` from this drop (goes in the project
root, same place `middleware.ts` was).

### Fix 2 — schema.sql re-run error
Explained in chat — nothing was missing, your database is complete. I've made `schema.sql` safe to re-run
in the future (added a guard around the 3 enum types), and added `supabase/verify_setup.sql`, a **read-only**
script you can run any time to double-check every table exists and see every account's role — completely
safe, it cannot change or delete anything.

**What to do (optional but recommended):** run `supabase/verify_setup.sql` once just to see the confirmation
for yourself. Then replace `supabase/schema.sql` in your project with the new version from this drop (for
future reference only — you do not need to run it again).

---

### What's new: the real student portal

This replaces the placeholder dashboard with actual working pages: 今日待辦 (Today), 我的申請 (My
Applications — with a working "new application" form), 截止日曆 (deadline calendar), and 發想與大綱
(brainstorming prompts). Clicking into any application shows its progress thread, lets you write and save
draft versions, and shows a (currently empty) space for advisor feedback — that fills in once advisors get
their own portal in Batch 4.

**Files in this drop:**
- `proxy.ts` (new, root) — replaces `middleware.ts`
- `supabase/schema.sql` (updated — safe to re-run now, but you don't need to)
- `supabase/verify_setup.sql` (new — read-only sanity check)
- `supabase/batch3_patch.sql` (new — one small permission addition, see Step 1 below)
- `supabase/assign_student_example.sql` (new — sets up a student test account)
- `lib/stages.ts`, `components/StageThread.tsx` (new — shared progress-visual logic)
- `app/student/` (new folder — the whole student portal: layout, today, applications, calendar, prompts)
- `app/dashboard/page.tsx` (updated — now automatically sends student accounts into `/student`)

### Step 1 — Run the one new database patch

Supabase → **SQL Editor** → **New query** → open `supabase/batch3_patch.sql` from this drop → copy → paste
→ **Run**. This adds one permission: students can now add a school when creating a new application (Batch 2
only allowed advisors/admins to do that).

### Step 2 — Create a third test account, for a student

1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Use a new email, e.g. `student@nativeenglish.ca`, with "Auto Confirm User" turned on.
3. Open `supabase/assign_student_example.sql` from this drop. If you used a different email than
   `student@nativeenglish.ca`, edit that one line to match what you used.
4. Paste the whole file into SQL Editor and click **Run**. A small results table appears at the bottom
   confirming the student now has a role, an agency, and an assigned advisor.

### Step 3 — Replace/add files in your project
Delete `middleware.ts`. Add `proxy.ts` in the same location (project root). Add the new `app/student/` folder
and its contents. Add `components/StageThread.tsx` and `lib/stages.ts`. Replace `app/dashboard/page.tsx` and
`supabase/schema.sql`. Add the three new `supabase/*.sql` files.

### Step 4 — Test it

```bash
npm run dev
```

1. Log out of any existing session, then log in as your **student** test account.
2. You should land automatically on `/student` (今日待辦), not the old placeholder dashboard.
3. Click **我的申請** → fill in the "新增申請" form (try "Duke University", a word limit like 650, any
   future date) → click **新增**. A new card should appear above the form.
4. Click into that card → you should see the progress thread, an empty draft box, and a "尚無顧問回饋"
   message. Type something and click **儲存新版本** — reload the page and confirm your text is still there.
5. Check **截止日曆** — your new application should appear there too, sorted by date.

If anything errors, copy the exact message and send it to me before moving on.

### Step 5 — Commit and push

```bash
git add .
git commit -m "Batch 3: student portal (applications, calendar, prompts), proxy.ts, schema fixes"
git push
```

## What's next

Batch 4 will build the **advisor portal**: the "本週關注" triage view, the student roster, draft
history/diffing, and the ability to actually leave comments on a student's draft (which will then appear in
the "顧問回饋" section you just saw as empty). Let me know once Batch 3 is confirmed working.

---

## Batch 2.1 — fix for the "infinite recursion" login error (for historical reference — already applied)

If you saw this error on `/dashboard`:
> 無法讀取個人資料：infinite recursion detected in policy for relation "profiles"

This was a bug in one of the security rules from Batch 2 — it's a data-only fix, no app code changed.
**Follow these two steps in order, exactly as written.**

### Step A — Run the bug fix

1. Open your Supabase project in your browser.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query** (top right).
4. Open the file `supabase/fix_infinite_recursion.sql` from this drop in a text editor, select all the
   text, and copy it.
5. Paste it into the empty query box in Supabase.
6. Click the **Run** button (or press Ctrl/Cmd+Enter).
7. You should see a green "Success" message. If you see a red error instead, stop and send me the exact
   text of that error.

### Step B — Turn your test accounts into an agency admin and an advisor

You mentioned you already created two test logins: `info@nativeenglish.ca` and `dan@nativeenglish.ca`. The
file `supabase/assign_test_roles_example.sql` (in this drop) is pre-written for exactly those two emails —
you don't need to edit anything unless you want different emails or a different agency name.

1. Still in Supabase → **SQL Editor** → **New query**.
2. Open `supabase/assign_test_roles_example.sql`, copy the whole file.
3. Paste it into the query box.
4. Click **Run**. This does three things in one go: creates a test agency called "Sunrise 教育顧問中心",
   makes `info@nativeenglish.ca` its agency admin, and makes `dan@nativeenglish.ca` an advisor in that same
   agency.
5. At the bottom, the same script runs a little report showing every account's current role — you should
   see both emails listed with their new roles. That's your confirmation it worked.

### Step C — Confirm it in the browser

1. Go back to your app in the browser (`localhost:3000/dashboard`, or refresh if it's already open).
2. If you were logged in as `dan@nativeenglish.ca`, log out (there's a 登出 button on the dashboard) and log
   back in with the same account.
3. You should now see a green "登入、資料庫、權限規則（RLS）皆正常運作 ✓" instead of the red error.

### Step D — Commit and push

```bash
git add .
git commit -m "Batch 2.1: fix infinite recursion RLS bug"
git push
```

---

## Batch 2 — database schema + authentication

**What's new in this drop:**
- `supabase/schema.sql` — all core tables (agencies, profiles, schools, applications, drafts, comments,
  Q&A messages, achievements, parent links) with Row Level Security policies already written, so students
  only ever see their own data, advisors only see their assigned students, and agency admins see their whole
  agency.
- `middleware.ts` — keeps people logged in properly across page loads (easy to forget, causes random
  logout bugs later if skipped).
- `app/login/page.tsx` — a real login page (email + password).
- `app/auth/callback/route.ts` — handles email confirmation / password-reset links from Supabase.
- `app/dashboard/page.tsx` — a protected placeholder page. If you're not logged in, it bounces you to
  `/login`. If you are, it proves the whole chain works: auth → database → permissions.
- `tsconfig.json` — updated with the settings Next.js auto-applied last time, so it won't nag again.

### Step 1 — Run the database schema

1. Go to your Supabase project → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this drop, copy the whole file, paste it in, and click **Run**.
3. You should see "Success. No rows returned." If you see a red error instead, stop and paste it to me
   before continuing.

*(If you already ran the original Batch 2 schema before this hotfix existed, don't re-run the whole file —
just follow the Batch 2.1 steps above instead. This step is only for a brand new Supabase project.)*

### Step 2 — Replace/add these files in your project
`middleware.ts` (new, goes in the project root, next to `package.json`), `tsconfig.json`, `app/page.tsx`,
`app/login/page.tsx` (new folder), `app/auth/callback/route.ts` (new folders), `app/dashboard/page.tsx` (new
folder), and the new `supabase/` folder itself.

### Step 3 — Create yourself a test login

There's no sign-up page yet (accounts will eventually be created by an agency admin — that's a later
batch). For now, create one manually:

1. Supabase dashboard → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter your email and a password. Leave "Auto Confirm User" turned **on** (so you don't need to click an
   email link).
3. Click **Create user**. This automatically creates a matching row in `profiles` too (that's what the
   trigger in `schema.sql` does) — with `role = student` and no agency, by default.
4. To try the advisor/agency-admin views, see **Batch 2.1 → Step B** above — it's a ready-to-run script for
   exactly this.

### Step 4 — Test it

```bash
npm run dev
```

Go to `http://localhost:3000` → click **前往登入** → log in with the test account from Step 3 → you should
land on `/dashboard` and see "登入、資料庫、權限規則（RLS）皆正常運作 ✓" in green.

If instead you see a red error message, copy the exact text and send it to me before moving on.

### Commit and push

```bash
git add .
git commit -m "Batch 2: database schema, auth, protected dashboard"
git push
```

## What's next

Batch 3 will build out the real **student portal** pages (essay organizer, deadline calendar, brainstorming
prompts) wired to this schema — replacing the placeholder dashboard with the real thing. Let me know once
Batch 2.1 is confirmed working (green checkmark for both test accounts).

---

## Batch 1.1 — fixes (for historical reference only — already applied)

You reported 3 errors and 2 asset changes. Here's what changed and what you need to do.

### Fix 1 — Hydration error
Caused by an inline `<style>` block in `app/layout.tsx` that React renders slightly differently on the
server vs. the client (a known React quirk with template-literal styles). Fixed by moving those CSS
variables into `app/globals.css` as plain CSS instead. No action needed from you beyond replacing the files.

### Fix 2 — NPM vulnerabilities / deprecated packages
The root cause: **Next.js 14 reached end-of-life in October 2025 and no longer receives security patches
at all** — that's why npm flagged `next@14.2.5` specifically. The deprecated `inflight`/`rimraf`/`glob`
warnings all came from ESLint 8's dependency tree, which is also unsupported now.

Since we're still early, this is the right moment to move to a supported version rather than patch a dead
one. This batch upgrades the scaffold to **Next.js 16** (current stable release) and **React 19**, and
removes the ESLint devDependency chain entirely for now (linting isn't required for the app to run — we can
set it up properly later with a current config, once there's more code to lint).

**Action needed:** since this is a major version bump, don't just `npm install` on top of your existing
`node_modules` — do a clean reinstall (steps below).

### Fix 3 — Git push / password authentication
GitHub disabled password authentication for Git operations a while ago — you now need either an SSH key
(which you've already set up ✅) or a Personal Access Token. Since you're on SSH now, you just need to point
your repo's remote at the SSH URL instead of the HTTPS one (steps below).

### Asset changes (a) and (b)
- New logo (`Batch 1 new logo with beige.png`): I trimmed a stray pure-white margin around it (left over
  from the export) so it sits flush against the page background with no white halo, and swapped it into
  `public/logo.png`.
- New favicon (`Batch 1 new favicon.png`): the source file was a non-square rectangle (1316×924), which
  would have squished when Next.js generates the square favicon sizes. I composed it centered on a square
  beige canvas instead, and swapped it into `app/icon.png`.

Both are already done in this drop — you don't need to touch the image files yourself.

## How to apply this update

1. **Replace these files** in your project with the versions in this zip:
   - `package.json`
   - `app/layout.tsx`
   - `app/globals.css`
   - `app/page.tsx`
   - `app/icon.png`
   - `public/logo.png`
   - `lib/supabase/server.ts`

2. **Clean reinstall** (important, since Next/React major versions changed):
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   ```

3. **Run it:**
   ```bash
   npm run dev
   ```
   Confirm: no hydration error in the console, and the new logo/favicon show up correctly.

4. **Fix your Git remote to use SSH**, then push:
   ```bash
   git remote set-url origin git@github.com:<your-username>/native-english-studio.git
   git add .
   git commit -m "Batch 1.1: fix hydration error, upgrade to Next 16, update brand assets"
   git push -u origin main
   ```
   (If you haven't pushed successfully at all yet, use `git remote add origin ...` instead of `set-url`.)
