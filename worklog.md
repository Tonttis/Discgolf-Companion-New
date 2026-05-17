---
Task ID: 1
Agent: Main
Task: Fix auth state not updating in UI after login + Fix game creation + Fix start game button + Mobile UI + Deployment guides

Work Log:
- Identified root cause of auth state bug: `signIn` function only called `setState` if `fetchProfile()` returned non-null profile
- Found that `profiles` table RLS was missing INSERT policy, preventing profile creation
- Found trigger `handle_new_user()` was broken for emails with special chars (e.g., dots in `john.doe@`)
- Fixed `auth-context.tsx`: Always update state after successful sign-in; use fallback profile from auth metadata when DB profile doesn't exist; auto-create profile via `/api/auth/register`
- Fixed `/api/auth/profile` GET: Auto-create profile using admin client when profile doesn't exist
- Fixed `/api/auth/register` POST: Use admin client (bypasses RLS) for profile creation
- Fixed `/api/games` POST: Added `ensureProfile()` helper to guarantee profile exists before creating game (FK constraint)
- Updated `supabase/migration.sql`: Added INSERT policy on profiles, fixed trigger to handle special chars in emails
- Updated `/api/setup/route.ts`: Updated migration SQL, added fix SQL for existing installations
- Fixed `HomeView.tsx`: Changed auth check from `isAuthenticated && user` to just `isAuthenticated`, so UI updates even with fallback profile
- Fixed `NewGameView.tsx`: Creator always auto-added as player; start button shows "Aloita yksinpeli" for solo play; button properly positioned above mobile bottom nav; better error handling with toast messages
- Added mobile-friendly CSS: safe-area-bottom, prevent iOS zoom on inputs (16px min font), tap highlight removal, user-select none on buttons
- Updated viewport meta for mobile: maximum-scale=1, viewport-fit=cover
- Fixed NewGameView sticky button positioning: `bottom-14 sm:bottom-0` to avoid overlap with mobile bottom nav
- Deployment guides already exist in `/api/hosting-guide`

Stage Summary:
- Auth state now properly reflects login status even when profile doesn't exist in DB
- Users can start games solo (creator is always added as a player)
- Start game button works and shows appropriate text for solo/multiplayer
- Profile auto-creation uses admin client to bypass RLS when available
- Mobile UI improvements for touch targets, iOS zoom prevention, bottom nav overlap
- User needs to run the fix SQL in Supabase SQL Editor to add the missing INSERT policy

---
Task ID: 2
Agent: Main
Task: Fix build error - metrix-api.ts has no exports + Fix "Supabase not configured" + Fix no courses shown

Work Log:
- Fixed missing `.env.local` with Supabase credentials (root cause of "Supabase not configured")
- Fixed `metrix-api.ts`: Was empty (just a comment). Reimplemented full DiscGolfMetrix API integration with `fetchCompetitionResult()` and `transformCompetition()` exports
- Added score utility exports: `getScoreLabel()`, `getScoreColor()`, `getHoleScoreBg()` needed by ScorecardTable
- Added type exports: `Track`, `Player`, `SubCompetition` (for ScorecardTable), plus competition types
- Fixed `ScorecardTable.tsx`: Changed import from `@/lib/types` to `@/lib/metrix-api` for Track/Player/SubCompetition types
- Added `useCompetition` hook in `use-disc-golf.ts`
- Added `selectedCompetitionId` and `navigateToCompetition` to Zustand store
- Added `'competition'` to `AppView` type union
- Added `CompetitionView` to `AppShell` view rendering and navigation
- Fixed `AppShell.tsx`: `s.navigateToHome` → `s.navigateHome` (store key mismatch)
- Fixed `ProfileView.tsx`: Removed broken `useAppStore as never` line
- Verified SQLite DB has 1080 courses and API returns them correctly

Stage Summary:
- Build error fixed: `metrix-api.ts` now has all required exports
- Competition feature fully wired up (API route, hooks, store, views)
- Supabase configured via `.env.local`
- Courses API verified working (1080 courses in DB)

---
Task ID: 3
Agent: Main
Task: Fix .z-ai-config error when running on user's PC + Fix no courses shown

Work Log:
- Identified root cause: `z-ai-web-dev-sdk` requires a `.z-ai-config` file that connects to Z.ai gateway — this gateway only exists in the sandbox, not on user's PC
- Rewrote `mini-services/scraper-service/index.ts`: Replaced `ZAI.create()` + `zai.functions.invoke('page_reader')` with direct `fetch()` HTTP requests to frisbeegolfradat.fi
- Rewrote `src/lib/scraper/frisbeegolfradat.ts`: Same replacement — direct `fetch()` instead of z-ai-web-dev-sdk
- Updated `src/app/api/sync/route.ts`: Added direct-fetch fallback using `syncCourseList()` from in-process scraper when microservice is unavailable
- Updated `src/app/api/courses/[slug]/route.ts`: Added direct-fetch fallback using `scrapeCourseDetail()` when microservice is unavailable
- Removed `z-ai-web-dev-sdk` from both package.json files (main project + scraper service)
- Recreated `.env.local` with Supabase credentials (was missing again)
- Renamed `src/middleware.ts` → `src/proxy.ts` with `export async function proxy()` to fix Next.js 16.1.3 deprecation warning
- Verified: Scraper service fetches 1080 courses in ~1.2 seconds using direct HTTP
- Verified: `/api/courses` returns courses correctly
- Verified: Lint passes clean

Stage Summary:
- App now works on any machine with internet access — no dependency on Z.ai gateway
- Both scraper implementations use direct `fetch()` to frisbeegolfradat.fi
- Sync and course detail routes have fallback chain: scraper service → direct fetch → cached data
- Middleware → proxy rename fixes Next.js 16 deprecation warning
- `.env.local` recreated with Supabase credentials

---
Task ID: 4
Agent: Main
Task: Fix infinite recursion in game_players RLS policy (error 42P17) + Fix only 28 of 1080 courses shown

Work Log:
- **Issue 1 - RLS Infinite Recursion**: Diagnosed the root cause — `game_players` SELECT policy self-references through `games`, and `games` SELECT policy also references `game_players`, creating mutual recursion
- Created `supabase/fix-rls-recursion.sql` — a standalone SQL script to fix existing installations by dropping old policies and recreating with SECURITY DEFINER helper functions
- Created 3 helper functions: `is_game_participant()`, `is_game_creator()`, `is_own_player_record()` — all SECURITY DEFINER to bypass RLS and break the recursion cycle
- Rewrote all RLS policies for `games`, `game_players`, and `scores` tables to use the helper functions instead of direct subqueries
- Updated `supabase/migration.sql` with the fixed policies (for fresh installations)
- Updated `/api/setup/route.ts` — both FIX_SQL and MIGRATION_SQL now use the non-recursive policies with helper functions
- **Issue 2 - Only 28 Courses**: Root cause was the sync route returning "cached" when any courses exist and are < 6 hours old, even if only 28 of 1080 were synced (partial sync from a timeout or error)
- Added `MIN_EXPECTED_COURSES = 100` threshold — if count < 100, always re-sync regardless of freshness
- Added `?force=true` query parameter to `/api/sync` to force re-sync
- Rewrote sync logic to use batch operations: `createMany()` for new courses (chunks of 100), parallel `update()` in chunks of 50 — instead of individual findUnique + create/update per course (2160 queries → ~22 queries)
- Same batch optimization applied to `src/lib/scraper/frisbeegolfradat.ts` `syncCourseList()`
- Added `useForceSync()` hook in `use-disc-golf.ts` for manual refresh
- Added auto-detect: `useSync()` hook automatically triggers force re-sync if cached count < 100
- Updated `CourseListView.tsx`: Added Finnish-language sync status, manual "Päivitä" (Refresh) button, and `useForceSync` integration
- Verified lint passes clean

Stage Summary:
- **RLS fix**: Game creation will now work after running `supabase/fix-rls-recursion.sql` in SQL Editor
- **Course sync fix**: All 1080 courses will now sync properly (batch operations + low-count re-sync + force option)
- New SQL fix file: `supabase/fix-rls-recursion.sql` (for existing installations)
- Updated `supabase/migration.sql` (for fresh installations)
- User needs to run the fix SQL in Supabase SQL Editor to resolve the game_players recursion error

---
Task ID: 5
Agent: Main
Task: Fix skipDuplicates Prisma error (SQLite unsupported) + Fix sync loading forever in dev mode

Work Log:
- **skipDuplicates error**: Prisma's `createMany({ skipDuplicates: true })` is only supported for PostgreSQL and CockroachDB, NOT SQLite. Removed `skipDuplicates` from all `createMany()` calls in both `sync/route.ts` and `frisbeegolfradat.ts`
- Instead of skipDuplicates, we now pre-filter: query all existing slugs first, then only insert courses that don't already exist
- Added fallback: if a batch insert chunk fails, retry each course individually to isolate bad records
- **Sync loading forever**: Root cause was that `useSync()` blocked the course list UI until the entire scrape + DB sync completed (could take 30-60+ seconds)
- Restructured sync flow:
  - `/api/sync` returns cached immediately if ≥100 courses exist (even if stale)
  - When courses < 100, returns `needsResync: true` flag instead of blocking
  - Only does the slow full scrape when DB is completely empty or `?force=true`
  - Scraper service timeout reduced from 30s to 10s
- Updated `useSync()` hook: removed the auto-force-sync that made two sequential requests; now returns whatever the API gives quickly
- Updated `CourseListView`: Shows courses from local DB immediately; sync status bar shows in background; "Osittainen — päivitä" badge for partial data; manual "Päivitä" button for force sync
- Added `needsResync` field to `SyncResponse` type
- Added `'empty'` status to `SyncResponse` type union
- Updated batch size from 100 to 50 for SQLite variable limit safety
- Skips batch updates during initial bulk sync (first time loading all 1080 courses) for much faster initial load
- Verified lint passes clean

Stage Summary:
- `skipDuplicates` error fixed — no longer used with SQLite
- Courses display immediately from local DB without waiting for sync
- Sync runs in background; manual refresh available via "Päivitä" button
- Partial data (28 courses) shown immediately with "Osittainen — päivitä" badge

---
Task ID: 6
Agent: Main
Task: Redesign ActiveGameView layout — desktop image left/scores right, mobile image 2/3 + swipe collapse, +/- scoring format

Work Log:
- Completely rewrote `src/components/disc-golf/ActiveGameView.tsx` with new layout architecture
- **Desktop layout (md+)**: Image on left (fills available space), score input panel on right (w-80/w-96 card)
  - Image section with par/length overlay at bottom, gradient overlay for readability
  - No-image fallback: card with Flag icon, hole name, par, length info
  - Right panel: par/length header, player score rows, action buttons
- **Mobile layout (<md)**: Image takes ~50-55vh (approximately 2/3 of screen)
  - Swipe up on image collapses it to a compact bar at top (small thumbnail + hole info + chevron down)
  - Tap collapsed bar to expand image again
  - Image collapse resets automatically when navigating to new hole
  - No-image fallback: compact card with flag icon, par, length
- **Player Score Row (PlayerName + (score) -)**: Replaced old big centered counter with compact row layout
  - Player avatar + name on left
  - Score name (Birdie/Par/Bogey) under player name
  - Relative par badge (E, +1, -2)
  - Minus button, score display, Plus button on right side
  - Saving/saved indicator icons
- Cleaned up unused imports: `useAuth`, `useMotionValue`, `useTransform`, `useAnimation`, `ImageIcon`
- Cleaned up unused variables: `user`, `selectedCourse`, `courseSlug`
- Lint passes clean, dev server compiles without errors

Stage Summary:
- Desktop: Split layout with large image on left, scoring panel on right
- Mobile: Full image with swipe-to-collapse, scoring below
- Both: Compact player rows with `Player - (score) +` format
- No-image case handled gracefully on both desktop and mobile
