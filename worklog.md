---
Task ID: 1
Agent: Main
Task: Build My Bag system for disc golf companion app

Work Log:
- Researched DiscIt API at https://discit-api.fly.dev - live, public, 2000+ discs with flight numbers
- Added bag types to types.ts: Disc, BagDisc, DiscBag, GapReport, GapItem + helper functions
- Added 'bag' to AppView type, navigateToBag() to app-store.ts
- Created SQL migration for Supabase: disc_bags + bag_discs tables with RLS policies
- Created API routes:
  - GET /api/discs/search - Proxies to DiscIt API with caching
  - GET/POST/PATCH/DELETE /api/bag - Bag CRUD with auto-create primary bag
  - POST/DELETE /api/bag/discs - Add/remove discs from bag
- Created MyBagView.tsx with 4 tabs:
  - 🎒 Laukku (Bag) - Categorized disc list, editable bag name, flight number pills
  - 🔍 Hae (Search) - Debounced search with category/brand filters, DiscIt API integration
  - 📊 Lento (Flight) - Recharts ScatterChart (Turn vs Speed), color-coded by category
  - 📋 Aukot (Gaps) - Gap analysis algorithm checking stability coverage per category
- Added bag hooks to use-disc-golf.ts: useBag, useDiscSearch, useAddDiscToBag, useRemoveDiscFromBag
- Updated AppShell: Added Backpack icon to bottom nav (5 tabs: Etusivu/Radat/Laukku/Suosikit/Profiili)
- Updated ProfileView: Added "Kiekkolaukku" link with Backpack icon
- Updated setup route: Added BAG_MIGRATION_SQL, detects missing bag tables
- Fixed hook mismatches: useAddDiscToBag now sends bagId, useRemoveDiscFromBag sends bagId+discId
- Fixed MyBagView: handleAddDisc passes bag.id, handleRemoveDisc passes disc.bagId + disc.discId
- Added migration-needed state in MyBagView with SQL copy button

Stage Summary:
- Full My Bag system implemented with DiscIt API integration (2000+ discs)
- 4-tab view: Bag contents, Disc search, Flight chart, Gap analysis
- Bag visible in bottom nav and profile page
- SQL migration ready for Supabase (needs to be run manually in SQL Editor)
- Lint passes, dev server compiles cleanly

---
Task ID: 2
Agent: Main
Task: Fix bag "not found" error + Finnish translation fixes

Work Log:
- Fixed GET /api/bag returning 401 when unauthenticated — now returns `{ bags: [] }` with 200 (matching favorites pattern)
- This was the root cause: React Query threw error on 401, making bagData undefined, bag=null, "Laukkua ei löydy" toast
- Added useQueryClient import to MyBagView for invalidation on missing bag
- When bag is null during add, now invalidates query cache and prompts retry
- Removed needsMigration state (tables already exist in Supabase)
- Renamed "Aukot" tab → "Puutteet" per user request
- Fixed Finnish gap descriptions: "Ei X laukussasi" → "Laukustasi puuttuu X"
- Fixed severity labels: "Korkea" → "Korkea prioriteetti", etc.
- Fixed gap summary header: "X aukkoa havaittu" → "X puutetta havaittu"
- Fixed gap summary description to match user's exact translation
- Added SUPABASE_SERVICE_ROLE_KEY to .env.local

Stage Summary:
- Bag API now gracefully returns empty bags instead of 401
- Adding discs to bag should work when user is authenticated
- Tab renamed: Aukot → Puutteet
- All Finnish translations match user's provided translations
- Lint passes
