## Fitness App — Code Map & File Guide

This README documents the codebase layout and explains the purpose of the main files, where to find each feature, and how the parts interact. Use this as a developer reference when navigating and modifying the project.

Quick start

```bash
npm install
npm run dev
```

The app runs in Expo; open the web URL shown by the dev server or scan the QR code with Expo Go.

Project root overview
- `app/` — All route and screen code (Expo Router). Each top-level file maps to a route in the app.
- `lib/` — App utilities and services (Supabase client and fitness engine).
- `contexts/` — React Context providers (authentication state).
- `assets/` — Images and static assets.
- `supabase/migrations/` — SQL migrations that define the database schema and Row-Level Security (RLS) policies.
- `scripts/` — Helpful local scripts (e.g. `scripts/test-supabase.js`).

File-by-file guide

- `app/index.tsx`
   - Purpose: Authentication screen (sign in / sign up). Handles user sign-up and sign-in flows and decides navigation (onboarding vs tabs) after auth.
   - Where to find: [app/index.tsx](app/index.tsx)
   - Key functions: `handleAuth()` — calls `signUp`/`signIn` from the `AuthContext` and reads `supabase.auth.getUser()` to route the user.

- `app/onboarding.tsx`
   - Purpose: User onboarding / complete profile flow. Collects personal info, goals, conditions, locations and writes multiple records into the DB.
   - Where to find: [app/onboarding.tsx](app/onboarding.tsx)
   - DB interactions: upserts `user_profiles`, inserts into `user_goals`, `user_medical_conditions`, `user_exercise_locations`, `workout_plans`, `diet_plans`, `sleep_schedules`, `daily_tasks`, and `weight_logs`.
   - Important: Detailed logging was added here to capture Supabase responses for debugging.

- `app/profile.tsx`
   - Purpose: Edit user profile after onboarding. Loads profile and related rows (`user_goals`, `user_medical_conditions`, `user_exercise_locations`) and saves changes.
   - Where to find: [app/profile.tsx](app/profile.tsx)
   - DB interactions: `supabase.from('user_profiles').upsert(...)`, and inserts/deletes for related tables.

- `app/(tabs)/index.tsx` (Dashboard)
   - Purpose: Shows today’s tasks and high-level progress.
   - Where to find: [app/(tabs)/index.tsx](app/(tabs)/index.tsx)

- `app/(tabs)/recommendations.tsx`
   - Purpose: Shows generated workout and diet plans and explanations.

- `app/(tabs)/progress.tsx`
   - Purpose: Weight logs, graph rendering, and stats.
   - DB interactions: reads from `weight_logs`, `daily_tasks`, `user_profiles`.

- `app/_layout.tsx` and `app/(tabs)/_layout.tsx`
   - Purpose: App layout and top-level providers (wrapping with `AuthProvider` and global styles). These files define tab navigation and shared UI chrome.

- `contexts/AuthContext.tsx`
   - Purpose: Central authentication state. Exposes `signUp`, `signIn`, `signOut`, `user`, and `session` via `useAuth()`.
   - Where to find: [contexts/AuthContext.tsx](contexts/AuthContext.tsx)
   - Notes: Manages `supabase.auth.onAuthStateChange` subscription and creates/updates `user_profiles` after signup using `upsert`.

- `lib/supabase.ts`
   - Purpose: Primary Supabase client for native platforms. Initializes the `createClient(...)` with environment keys.
   - Where to find: [lib/supabase.ts](lib/supabase.ts)

- `lib/supabase.web.ts`
   - Purpose: Web-specific Supabase client. Initializes `createClient(...)` for web bundling.
   - Where to find: [lib/supabase.web.ts](lib/supabase.web.ts)

- `lib/fitnessEngine.ts`
   - Purpose: Core algorithm that generates workouts, meal plans, sleep schedules, and daily tasks from a `profile` and selected goals/conditions.
   - Where to find: [lib/fitnessEngine.ts](lib/fitnessEngine.ts)
   - Key concepts: BMR/TDEE estimation, macro calculations, workout scheduling logic.

- `metro.config.js`
   - Purpose: Metro bundler configuration for Expo; excludes problematic custom resolution and sets resolver fields for web compatibility.

- `package.json`
   - Purpose: Contains `scripts` to run the app (`dev`, `build:web`, `lint`, `typecheck`) and lists dependencies.

- `supabase/migrations/*.sql`
   - Purpose: Database schema and RLS policies. Look in `supabase/migrations/20260110023246_create_fitness_app_schema.sql` for full table definitions and policies.
   - Important: RLS policies require `auth.uid() = id` or `user_id` — this is why inserts must be made by an authenticated user whose `auth.uid()` matches the row fields.

- `scripts/test-supabase.js`
   - Purpose: Local script for quick Supabase connectivity checks (select/insert/delete tests). Useful to validate anon key and insert permissions.

Troubleshooting tips (common issues)

- Auth & RLS failures
   - Symptom: Inserts return 400 or are ignored even though other rows exist.
   - Cause: RLS policies require authenticated requests where `auth.uid()` equals the row `id` or `user_id`. Rows added via Supabase Studio or with the service role key bypass RLS and therefore may exist while client requests fail.
   - Fix: Ensure `supabase.auth.getSession()` returns a valid session on the client and `supabase.auth.getUser()` matches the `user_id` used in inserts. Re-login if session is missing.

- Non-UUID IDs
   - Symptom: error 22P02 invalid input syntax for type uuid
   - Cause: Tables use `uuid` primary keys. Using a non-UUID id (like `test_...`) will fail.
   - Fix: Use `auth` user's uuid or let Postgres generate uuid using `gen_random_uuid()` when client-side id not required. The app uses `upsert` with `id: user.id` (uuid from Supabase) — keep that behavior.

Where to edit features

- Business logic (plans): edit `lib/fitnessEngine.ts`.
- API/DB behavior: edit `lib/supabase.ts` or `supabase/migrations/*.sql` if schema/policies need changes.
- Auth flows: edit `contexts/AuthContext.tsx` and `app/index.tsx`.
- UI/screens: edit files in `app/` and `app/(tabs)/`.

Developer commands

```bash
npm install
npm run dev        # start Expo dev server
npm run typecheck  # run TS typecheck
npm run lint       # lint code
```

If you want to run targeted Supabase tests from the project root:

```bash
node scripts/test-supabase.js
```

Notes about pushing changes

- A Git remote was added and the workspace was pushed to `https://github.com/Nerov-Arch/lastapp.git` on branch `main`.

If you want, I can:
- Add inline comments to specific files explaining key functions.
- Produce a shorter "developer quick reference" with only the most critical files and commands.

---

If you'd like me to expand any file's explanation with code snippets or walk through a specific flow (for example, the onboarding DB calls), tell me which file and I'll add a focused section.
1. Install dependencies:
