import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scrapeCourseList } from '@/lib/scraper/frisbeegolfradat';

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

    // Try scraper service first
    let courses: any[] | null = null;

    try {
      const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/list`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (scraperResponse.ok) {
        const scraperData = await scraperResponse.json();
        if (scraperData.success && scraperData.courses) {
          courses = scraperData.courses;
        }
      }
    } catch {
      // Scraper service unavailable — try direct scraping
    }

    // Fallback: direct scraping (works locally without external service)
    if (!courses) {
      try {
        courses = await scrapeCourseList();
      } catch (error) {
        console.error('Direct scraping also failed:', error);
      }
    }

    if (courses && courses.length > 0) {
      let added = 0;
      let updated = 0;

      for (const course of courses) {
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
        total: courses.length,
        added,
        updated,
        message: `Synced ${courses.length} courses (${added} new, ${updated} updated)`,
      });
    }

    // Fallback: return existing data
    return NextResponse.json({
      status: existingCount > 0 ? 'cached' : 'empty',
      totalCourses: existingCount,
      message: existingCount > 0
        ? 'Course data available (sync service unavailable, using cached data)'
        : 'No course data available',
    });
  } catch (error) {
    console.error('Error checking course sync:', error);
    return NextResponse.json(
      { error: 'Failed to check course sync', details: String(error) },
      { status: 500 }
    );
  }
}
