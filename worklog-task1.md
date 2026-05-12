---
Task ID: 1
Agent: Main Agent
Task: Add banner image scraping from frisbeegolfradat.fi course detail pages

Work Log:
- Investigated HTML structure of frisbeegolfradat.fi course pages for banner images
- Found banner images in `<div class="top-course-cover-photo" style="background-image: url('...')">` with overlay logo in `<div class="overlay-logo"><img src="...">`
- Not all courses have banner images (only premium/top courses)
- Added `bannerImageUrl` and `logoUrl` fields to Prisma schema (Course model)
- Updated scraper service to extract banner and logo URLs using regex
- Updated lib scraper with same extraction logic
- Updated TypeScript types with new fields
- Updated CourseDetailView to display banner image as hero header with dark gradient overlay
- Verified API returns bannerImageUrl and logoUrl correctly for KIPPIS course
- Ran lint check - clean

Stage Summary:
- Banner image scraping is fully implemented and working
- Frontend renders banner image with overlay text when available, falls back to gradient when not
- Both services (Next.js port 3000, scraper port 3030) are running
