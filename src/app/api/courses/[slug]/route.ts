import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeCourseDetail } from '@/lib/scraper/frisbeegolfradat';

const SCRAPER_PORT = 3030;
const SCRAPER_BASE = `http://localhost:${SCRAPER_PORT}`;

interface ScraperHole {
  holeNumber: number;
  name: string;
  length: number | null;
  par: number | null;
  note: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
}

async function saveDetailData(slug: string, detail: Record<string, any>) {
  // Separate holes from course fields
  const { holes, ...courseFields } = detail;
  delete courseFields.holes;

  // Update course fields
  await db.course.update({
    where: { slug },
    data: {
      ...courseFields,
      detailFetchedAt: new Date(),
    },
  });

  // Save hole data if present
  if (Array.isArray(holes) && holes.length > 0) {
    const courseId = (await db.course.findUnique({ where: { slug }, select: { id: true } }))?.id;
    if (courseId) {
      // Delete existing holes and recreate
      await db.hole.deleteMany({ where: { courseId } });

      // Deduplicate holes by holeNumber (keep first occurrence)
      const seen = new Set<number>();
      const uniqueHoles = holes.filter((h: ScraperHole) => {
        if (seen.has(h.holeNumber)) return false;
        seen.add(h.holeNumber);
        return true;
      });

      await db.hole.createMany({
        data: uniqueHoles.map((h: ScraperHole) => ({
          courseId,
          holeNumber: h.holeNumber,
          name: h.name,
          length: h.length,
          par: h.par,
          note: h.note,
          imageUrl: h.imageUrl,
          thumbUrl: h.thumbUrl,
        })),
      });
    }
  }
}

/**
 * Try to fetch course detail from:
 * 1. Scraper service (port 3030) — if running
 * 2. Direct fetch via frisbeegolfradat.ts scraper — works locally
 */
async function fetchCourseDetail(slug: string): Promise<Record<string, any> | null> {
  // Try scraper service first
  try {
    const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(10_000), // 10s timeout for scraper service
    });

    if (scraperResponse.ok) {
      const scraperData = await scraperResponse.json();
      if (scraperData.success && scraperData.detail) {
        return scraperData.detail;
      }
    }
  } catch {
    // Scraper service unavailable — fall through to direct scraping
  }

  // Direct scraping fallback — works locally without any external service
  try {
    const detail = await scrapeCourseDetail(slug);
    // Convert CourseDetail to the format expected by saveDetailData
    const result: Record<string, any> = { ...detail };
    // The scraper service includes holes; the direct scraper doesn't
    // so we add an empty array to avoid issues
    if (!result.holes) result.holes = [];
    return result;
  } catch (error) {
    console.error(`Direct scrape failed for ${slug}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let course = await db.course.findUnique({
      where: { slug },
      include: { holeDetails: { orderBy: { holeNumber: 'asc' } } },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // If detail hasn't been fetched yet, fetch it
    if (!course.detailFetchedAt) {
      const detail = await fetchCourseDetail(slug);
      if (detail) {
        await saveDetailData(slug, detail);
        course = await db.course.findUnique({
          where: { slug },
          include: { holeDetails: { orderBy: { holeNumber: 'asc' } } },
        });
      }
    }

    // Check if detail is stale (older than 24 hours) and refresh in background
    if (course?.detailFetchedAt) {
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (course.detailFetchedAt < staleThreshold) {
        // Fire and forget refresh
        fetchCourseDetail(slug)
          .then(async (detail) => {
            if (detail) await saveDetailData(slug, detail);
          })
          .catch(() => {});
      }
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course detail' },
      { status: 500 }
    );
  }
}
