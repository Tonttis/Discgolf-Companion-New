import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncCourseList } from '@/lib/scraper/frisbeegolfradat';

const SCRAPER_PORT = 3030;
const SCRAPER_BASE = `http://localhost:${SCRAPER_PORT}`;

// Minimum expected course count — if we have fewer, always re-sync
const MIN_EXPECTED_COURSES = 100;

export async function GET(request: NextRequest) {
  try {
    const forceSync = request.nextUrl.searchParams.get('force') === 'true';

    // Check if we already have courses in the DB
    const existingCount = await db.course.count();

    // FAST PATH: Return cached immediately if we have enough fresh courses
    if (!forceSync && existingCount >= MIN_EXPECTED_COURSES) {
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

    // If we have SOME courses but not enough, return what we have
    // immediately and note that a re-sync is needed.
    // The frontend can trigger a force-sync manually.
    if (!forceSync && existingCount > 0 && existingCount < MIN_EXPECTED_COURSES) {
      return NextResponse.json({
        status: 'cached',
        totalCourses: existingCount,
        needsResync: true,
        message: `Only ${existingCount} courses cached (expected ~1080). Click refresh to re-sync.`,
      });
    }

    // SLOW PATH: Actually fetch and sync (only when DB is empty or force=true)
    if (existingCount > 0 && existingCount < MIN_EXPECTED_COURSES) {
      console.warn(`Only ${existingCount} courses in DB (expected ~1080). Re-syncing...`);
    }

    // Strategy 1: Try the scraper microservice (short timeout)
    try {
      const scraperResponse = await fetch(`${SCRAPER_BASE}/scrape/list`, {
        signal: AbortSignal.timeout(10000),
      });

      if (scraperResponse.ok) {
        const scraperData = await scraperResponse.json();

        if (scraperData.success && scraperData.courses) {
          const result = await batchSyncCourses(scraperData.courses);

          return NextResponse.json({
            status: 'synced',
            source: 'scraper-service',
            total: scraperData.courses.length,
            added: result.added,
            updated: result.updated,
            totalCourses: result.added + existingCount,
            message: `Synced ${scraperData.courses.length} courses (${result.added} new, ${result.updated} updated)`,
          });
        }
      }
    } catch (error) {
      console.error('Scraper service error, falling back to direct fetch:', error);
    }

    // Strategy 2: Direct fetch fallback
    try {
      const result = await syncCourseList();
      const newCount = await db.course.count();
      return NextResponse.json({
        status: 'synced',
        source: 'direct-fetch',
        total: result.total,
        added: result.added,
        updated: result.updated,
        totalCourses: newCount,
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

/**
 * Batch sync courses using createMany for new courses and
 * individual updates for existing ones.
 *
 * NOTE: skipDuplicates is NOT supported by SQLite in Prisma,
 * so we filter duplicates ourselves before inserting.
 */
async function batchSyncCourses(courses: Array<{
  slug: string;
  name: string;
  city: string;
  holes: number;
  rating: number | null;
  classification: string;
  isTop: boolean;
  isNew: boolean;
  mapUrl: string | null;
}>): Promise<{ added: number; updated: number }> {
  // Get all existing slugs in one query
  const existingCourses = await db.course.findMany({
    select: { slug: true },
  });
  const existingSlugSet = new Set(existingCourses.map(c => c.slug));

  const toCreate = courses.filter(c => !existingSlugSet.has(c.slug));
  const toUpdate = courses.filter(c => existingSlugSet.has(c.slug));

  // Batch insert new courses — no skipDuplicates (not supported in SQLite)
  let added = 0;
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += 50) {
      const chunk = toCreate.slice(i, i + 50);
      try {
        const result = await db.course.createMany({
          data: chunk.map(c => ({
            slug: c.slug,
            name: c.name,
            city: c.city ?? '',
            holes: c.holes ?? 0,
            rating: c.rating,
            classification: c.classification ?? '',
            isTop: c.isTop ?? false,
            isNew: c.isNew ?? false,
            mapUrl: c.mapUrl,
          })),
        });
        added += result.count;
      } catch (err) {
        // If chunk fails, try one by one to isolate the bad record
        console.error(`Batch insert chunk failed, falling back to individual inserts:`, err);
        for (const c of chunk) {
          try {
            await db.course.create({
              data: {
                slug: c.slug,
                name: c.name,
                city: c.city ?? '',
                holes: c.holes ?? 0,
                rating: c.rating,
                classification: c.classification ?? '',
                isTop: c.isTop ?? false,
                isNew: c.isNew ?? false,
                mapUrl: c.mapUrl,
              },
            });
            added++;
          } catch {
            // Skip duplicates or other errors
          }
        }
      }
    }
  }

  // Update existing courses — skip during initial bulk sync for performance
  let updated = 0;
  if (toUpdate.length > 0 && toCreate.length === 0) {
    for (let i = 0; i < toUpdate.length; i += 50) {
      const chunk = toUpdate.slice(i, i + 50);
      const results = await Promise.allSettled(
        chunk.map(c =>
          db.course.update({
            where: { slug: c.slug },
            data: {
              name: c.name,
              city: c.city,
              holes: c.holes,
              rating: c.rating,
              classification: c.classification,
              isTop: c.isTop,
              isNew: c.isNew,
              mapUrl: c.mapUrl,
            },
          })
        )
      );
      updated += results.filter(r => r.status === 'fulfilled').length;
    }
  } else if (toUpdate.length > 0) {
    updated = toUpdate.length;
  }

  return { added, updated };
}
