---
Task ID: 1
Agent: Main Agent
Task: Fix preview not loading - server crashes when scraping course details

Work Log:
- Diagnosed: Next.js dev server was crashing when z-ai-web-dev-sdk page_reader was called from API routes
- The SDK loading large HTML pages (1.2MB for course list, 185KB for detail) caused the Next.js process to die
- Created a separate scraper mini-service at mini-services/scraper-service/ on port 3030
- Moved all z-ai-web-dev-sdk usage to the isolated scraper service
- Updated src/app/api/courses/[slug]/route.ts to call scraper service via http://localhost:3030
- Updated src/app/api/sync/route.ts to call scraper service via http://localhost:3030
- Added filters caching in courses API route to avoid querying all 1080 courses on every request
- Both services tested and working: Next.js (port 3000) + Scraper Service (port 3030)
- Course detail scraping now works without crashing Next.js

Stage Summary:
- Root cause: z-ai-web-dev-sdk crashes Next.js process when fetching large pages
- Solution: Isolated SDK in separate Bun mini-service on port 3030
- Next.js API routes call scraper service via localhost:3030 instead of using SDK directly
- Course details (description, courseType, terrain, etc.) now properly fetched and cached
- Services need to be started: `bun run dev` for Next.js + `bun index.ts` for scraper

---
Task ID: 3
Agent: Main Agent
Task: Fix preview not loading (continued) + deployment guide

Work Log:
- Verified lint passes cleanly with `bun run lint`
- Verified Prisma client is generated and DB schema is in sync
- Both services (Next.js:3000, Scraper:3030) confirmed working
- Tested all API endpoints: /api/courses returns 1080 courses, /api/courses/[slug] returns detail
- Tested HTML rendering: 33KB page returned with HTTP 200
- Course detail data confirmed working with Finnish labels and rich detail
- Verified no TypeScript or runtime errors

Stage Summary:
- App is fully functional: 1080 Finnish disc golf courses with ratings, classifications, and details
- Two services required: Next.js (port 3000) + Scraper microservice (port 3030)
- Caddy gateway on port 81 proxies to Next.js by default, with XTransformPort for scraper
- All data sourced from frisbeegolfradat.fi via z-ai-web-dev-sdk page_reader

---
Task ID: 4
Agent: Main Agent
Task: Add hole-by-hole descriptions (Väyläkuvaukset) with images to course detail scraping and display

Work Log:
- Examined HTML structure of frisbeegolfradat.fi course pages using z-ai page_reader CLI
- Discovered hole data is in `<span class="fairway">` elements with `fairway_image` and `fairway_desc` divs
- Added `Hole` model to Prisma schema with fields: holeNumber, name, length, par, note, imageUrl, thumbUrl
- Added `holeDetails` relation on Course model
- Updated scraper service to parse hole data from first layout tab only (to avoid duplicate hole numbers from multiple layouts)
- Scraper extracts: hole number, name, length (meters), par, notes (e.g. "HUOM! 3-väylä ei ole toistaiseksi pelattavissa."), full-size image URL, thumbnail URL
- Updated API route to save hole data separately in Hole table with deduplication by holeNumber
- Updated TypeScript types to include Hole interface and holeDetails on Course
- Updated CourseDetailView with new Väyläkuvaukset section featuring:
  - Summary row showing total Par and total length
  - Expandable hole cards with hole number badge, length, par
  - Amber warning styling for unavailable holes (no length/par)
  - Expandable detail view with hole image, full stats, and warning notes
  - Image thumbnails that link to full-size images
- Fixed bug: scraper was returning holes from ALL layout tabs (causing duplicate holeNumber constraint violations)
- Fixed bug: `skipDuplicates` not supported by Prisma SQLite, removed and used manual deduplication instead
- Tested end-to-end: KIPPIS Inter returns 18 holes (13 with images, 5 with "not playable" notes), KIPPIS Am returns 18 holes with images

Stage Summary:
- Hole-by-hole descriptions with images now scraped and displayed
- Data includes: length (meters), par, notes, full-size image, thumbnail
- First layout tab only (avoids duplicates from multi-layout courses)
- Courses with unavailable holes show amber warning styling
- Lint clean, all tests passing
