import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // If detail hasn't been fetched yet, fetch it from the scraper service
    if (!course.detailFetchedAt) {
      try {
        const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/detail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        });

        if (scraperResponse.ok) {
          const scraperData = await scraperResponse.json();
          if (scraperData.success && scraperData.detail) {
            await saveDetailData(slug, scraperData.detail);
            course = await db.course.findUnique({
              where: { slug },
              include: { holeDetails: { orderBy: { holeNumber: 'asc' } } },
            });
          }
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
        fetch(`${SCRAPER_BASE}/scrape/detail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.detail) {
                await saveDetailData(slug, data.detail);
              }
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
