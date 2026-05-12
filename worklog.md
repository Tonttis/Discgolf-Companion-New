---
Task ID: 1
Agent: Main Agent
Task: Improve frisbeegolfradat.fi course detail scraper and update frontend

Work Log:
- Analyzed HTML structure of frisbeegolfradat.fi course detail pages
- Found the structured HTML with `<li class="course_info">` elements containing key-value pairs
- Identified issues with old scraper: text-based regex after stripping HTML was fragile and captured garbage data (navigation, dropdowns, etc.)
- Updated Prisma schema with 4 new fields: `description`, `descriptionFull`, `scorecardUrl`, `ratingCount`
- Ran `db:push` to sync schema
- Rewrote scraper with HTML-aware parsing:
  - `parseCourseInfoHtml()` function extracts key-value pairs from `<li>` elements using proper HTML regex
  - Short description from `<span class="caption">` 
  - Full description from `<span class="description">`
  - Rating count from star image `alt` attributes
  - Scorecard URL from sidebar link
  - Better address parsing that handles multi-line addresses with zip codes
- Updated TypeScript types in `src/lib/types.ts` with new fields
- Updated CourseDetailView with:
  - Description section with "Lue lisää" expandable button
  - Finnish labels (Radan kuvaus, Sijainti, Radan tiedot, etc.)
  - Rating count display next to rating
  - Scorecard link
  - Course map section with Finnish label "Ratakartta"
- Updated CourseCard with Finnish "väylää" instead of "holes"
- Updated AppShell footer to "Tiedot: Frisbeegolfradat.fi"
- Cleared all old detail data from database and tested fresh scraping
- Verified API returns clean data with all new fields
- Lint passes clean

Stage Summary:
- Scraper now produces clean, well-structured data from frisbeegolfradat.fi detail pages
- New fields: description (short), descriptionFull (extended), scorecardUrl, ratingCount
- Frontend updated with Finnish labels and better data presentation
- All 1080 courses' detail cache cleared for fresh re-scraping on next visit
