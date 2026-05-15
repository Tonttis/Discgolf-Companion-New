---
Task ID: 1
Agent: Main
Task: Fix login state not updating on home screen + registration issues + solo play + mobile UI + hosting guides

Work Log:
- Fixed AuthProvider: Changed `createSupabaseBrowserClient()` from being called on every render to using `useMemo` for a stable reference
- Added `initializedRef` to prevent double initialization in React strict mode
- Fixed auth state change listener to properly detect SIGNED_IN/SIGNED_OUT events
- Added manual profile refresh after `signIn` to ensure UI updates immediately
- Added `TOKEN_REFRESHED` handler for session refresh
- Fixed email confirmation handling: When Supabase requires email confirmation, `signUp` now returns `needsEmailConfirmation: true` instead of appearing to "do nothing"
- Added email confirmation banners in both HomeView and AuthView registration forms
- Updated NewGameView: Changed title from "Lisää pelaajia" to "Pelaajat", added description that you can play alone or add others, search input now labeled as optional, added "Yksinpeli" / "X pelaajaa" indicator
- Mobile-friendly UI improvements: Reduced hero padding, smaller text on mobile, responsive search bar, single-column quick actions on mobile, min-h-dvh for proper viewport height, smaller header on mobile, tighter spacing throughout
- Created hosting guides API endpoint `/api/hosting-guide?platform=windows|linux`
- Added hosting guide section to HomeView with links to Windows and Linux guides

Stage Summary:
- Auth state now properly updates on the home screen after login/register
- Email confirmation flow is handled gracefully with clear user messaging
- Solo play is clearly supported with helpful UI labels
- UI is more mobile-friendly with responsive breakpoints
- Hosting guides available at `/api/hosting-guide?platform=windows` and `/api/hosting-guide?platform=linux`
