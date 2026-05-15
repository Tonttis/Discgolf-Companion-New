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
