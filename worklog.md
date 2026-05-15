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
