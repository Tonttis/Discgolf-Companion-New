---
Task ID: 1
Agent: Main Agent
Task: Fix Supabase not configured error and add profile section to home page

Work Log:
- Identified root cause: `.env.local` file was missing, causing `createSupabaseBrowserClient()` to return `null` and `supabaseConfigured` to be `false`
- Created `.env.local` with Supabase credentials: `NEXT_PUBLIC_SUPABASE_URL=https://hzfizsucmelyxrnmpxib.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Verified `/api/setup` returns `{"configured":true,"status":"ready","message":"Database is set up and ready"}`
- Verified `/api/auth/profile`, `/api/games`, `/api/favorites` all work correctly
- Updated HomeView.tsx to include a profile section:
  - When authenticated: shows user avatar, name, @username, mini stats (games/completed/favorites), and quick links to game history and favorites
  - When not authenticated: shows a sign in/register card with inline forms for both login and registration
  - Added inline auth functionality (signIn, signUp) directly on the home page
  - Removed the separate "User Actions" section that only appeared when authenticated
  - Added useGames and useFavorites hooks for stats display
- Restarted dev server to pick up .env.local changes
- Ran lint check - all clean

Stage Summary:
- Supabase is now properly configured and working
- The "Supabase ei ole määritetty" error is resolved
- Home page now has an integrated profile section with sign in/register functionality
- Users can sign in or create accounts directly from the home page

---
Task ID: 2
Agent: Main Agent
Task: Fix account registration not creating entries in Supabase

Work Log:
- Investigated the registration flow end-to-end
- Tested Supabase auth.signUp directly - it works, creates users and profiles
- Found critical bug #1: Layout used Radix Toaster (`@/components/ui/toaster`) but all code used `toast` from `sonner` - error messages were invisible, user saw "does nothing"
- Found bug #2: The `handle_new_user` trigger creates profiles with username derived from email, not the user's chosen username
- Found bug #3: The signUp flow relied on server-side `/api/auth/register` which could fail due to cookie timing after client-side signUp
- Fixed bug #1: Changed layout.tsx to import `Toaster` from `@/components/ui/sonner` instead of `@/components/ui/toaster`
- Fixed bug #2: Updated the trigger SQL in setup route to use `COALESCE(NEW.raw_user_meta_data->>'username', ...)` for the username field
- Fixed bug #3: Rewrote the signUp callback in auth-context.tsx to update the profile directly from the client side after signUp, with fallback to server endpoint
- Added profile refresh after signUp to ensure the UI shows the correct username
- Verified the full flow works: signUp creates user, trigger creates profile, client updates username, state refreshes
- User needs to run updated trigger SQL in Supabase SQL Editor for the trigger fix to take effect
- Ran lint check - all clean

Stage Summary:
- Account registration now works: signUp creates user + profile, client-side update fixes username
- Sonner toasts now visible - error/success messages will show to users
- Trigger SQL updated in setup route (user should re-run in Supabase SQL Editor for the fix)
