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
