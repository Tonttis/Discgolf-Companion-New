import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncCourseList } from '@/lib/scraper/frisbeegolfradat';

const SCRAPER_PORT = 3030;
const SCRAPER_BASE = `http://localhost:${SCRAPER_PORT}`;

export async function GET() {
  try {
    // Check if we already have courses in the DB
    const existingCount = await db.course.count();

    if (existingCount > 0) {
      // If data is less than 6 hours old, return cached
      const newest = await db.course.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      });

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (newest && newest.updatedAt > sixHoursAgo) {
        return NextResponse.json({
          status: 'cached',
          totalCourses: existingCount,
          lastUpdated: newest.updatedAt,
          message: 'Course data is up to date',
        });
      }
    }

    // Strategy 1: Try the scraper microservice
    try {
      const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/list`, {
        signal: AbortSignal.timeout(30000),
      });

      if (scraperResponse.ok) {
        const scraperData = await scraperResponse.json();

        if (scraperData.success && scraperData.courses) {
          let added = 0;
          let updated = 0;

          for (const course of scraperData.courses) {
            const existing = await db.course.findUnique({ where: { slug: course.slug } });

            if (existing) {
              await db.course.update({
                where: { slug: course.slug },
                data: {
                  name: course.name,
                  city: course.city,
                  holes: course.holes,
                  rating: course.rating,
                  classification: course.classification,
                  isTop: course.isTop,
                  isNew: course.isNew,
                  mapUrl: course.mapUrl,
                },
              });
              updated++;
            } else {
              await db.course.create({
                data: {
                  slug: course.slug,
                  name: course.name,
                  city: course.city,
                  holes: course.holes,
                  rating: course.rating,
                  classification: course.classification,
                  isTop: course.isTop,
                  isNew: course.isNew,
                  mapUrl: course.mapUrl,
                },
              });
              added++;
            }
          }

          return NextResponse.json({
            status: 'synced',
            source: 'scraper-service',
            total: scraperData.courses.length,
            added,
            updated,
            message: `Synced ${scraperData.courses.length} courses (${added} new, ${updated} updated)`,
          });
        }
      }
    } catch (error) {
      console.error('Scraper service error, falling back to direct fetch:', error);
    }

    // Strategy 2: Direct fetch fallback (no z-ai-web-dev-sdk needed)
    try {
      const result = await syncCourseList();
      return NextResponse.json({
        status: 'synced',
        source: 'direct-fetch',
        total: result.total,
        added: result.added,
        updated: result.updated,
        message: `Synced ${result.total} courses directly (${result.added} new, ${result.updated} updated)`,
      });
    } catch (error) {
      console.error('Direct fetch sync error:', error);
    }

    // Fallback: return existing data
    return NextResponse.json({
      status: existingCount > 0 ? 'cached' : 'empty',
      totalCourses: existingCount,
      message: existingCount > 0
        ? 'Course data available (sync service unavailable, using cached data)'
        : 'No course data available — check internet connection',
    });
  } catch (error) {
    console.error('Error checking course sync:', error);
    return NextResponse.json(
      { error: 'Failed to check course sync', details: String(error) },
      { status: 500 }
    );
  }
}
