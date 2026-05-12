---
Task ID: 2
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
