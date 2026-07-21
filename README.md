# Native English Studio

Next.js + Supabase web app for the Native English Studio platform.

## ⚠️ Batch 1.1 — fixes to apply (read this first)

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

## What's next

Once this is running cleanly and pushed to GitHub, let me know and I'll send **Batch 2**: the Supabase
database schema (students, advisors, agencies, essays, drafts) and the login/auth pages.
