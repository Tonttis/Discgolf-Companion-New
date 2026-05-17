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
 * Try to fetch course detail, using scraper service first,
 * then falling back to direct fetch.
 */
async function fetchCourseDetail(slug: string): Promise<Record<string, any> | null> {
  // Strategy 1: Try scraper microservice
  try {
    const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(30000),
    });

    if (scraperResponse.ok) {
      const scraperData = await scraperResponse.json();
      if (scraperData.success && scraperData.detail) {
        return scraperData.detail;
      }
    }
  } catch {
    // Scraper service unavailable, try direct fetch
  }

  // Strategy 2: Direct fetch fallback
  try {
    const detail = await scrapeCourseDetail(slug);
    // Convert CourseDetail to Record<string, any> format expected by saveDetailData
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(detail)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    // scrapeCourseDetail doesn't return holes, but the scraper service does
    // We need to also fetch holes - but for now, detail without holes is still useful
    return result;
  } catch (error) {
    console.error(`Direct fetch detail failed for ${slug}:`, error);
  }

  return null;
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
      try {
        const detail = await fetchCourseDetail(slug);
        if (detail) {
          await saveDetailData(slug, detail);
          course = await db.course.findUnique({
            where: { slug },
            include: { holeDetails: { orderBy: { holeNumber: 'asc' } } },
          });
        }
      } catch (error) {
        console.error(`Failed to fetch detail for ${slug}:`, error);
        // Return basic data even if detail fetch fails
      }
    }

    // Check if detail is stale (older than 24 hours) and refresh in background
    if (course?.detailFetchedAt) {
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (course.detailFetchedAt < staleThreshold) {
        // Fire and forget refresh
        fetchCourseDetail(slug)
          .then(async (detail) => {
            if (detail) {
              await saveDetailData(slug, detail);
            }
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
