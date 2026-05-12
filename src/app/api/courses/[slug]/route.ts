import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const SCRAPER_PORT = 3030;
const SCRAPER_BASE = `http://localhost:${SCRAPER_PORT}`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let course = await db.course.findUnique({ where: { slug } });

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
            await db.course.update({
              where: { slug },
              data: {
                ...scraperData.detail,
                detailFetchedAt: new Date(),
              },
            });
            course = await db.course.findUnique({ where: { slug } });
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
                await db.course.update({
                  where: { slug },
                  data: {
                    ...data.detail,
                    detailFetchedAt: new Date(),
                  },
                });
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
