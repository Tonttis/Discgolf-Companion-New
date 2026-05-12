import { NextResponse } from 'next/server';
import { syncCourseList } from '@/lib/scraper/frisbeegolfradat';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check if we already have courses in the DB
    const existingCount = await db.course.count();

    if (existingCount > 0) {
      // If data is older than 6 hours, re-sync
      const oldest = await db.course.findFirst({
        orderBy: { updatedAt: 'asc' },
        select: { updatedAt: true },
      });

      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (oldest && oldest.updatedAt > sixHoursAgo) {
        return NextResponse.json({
          status: 'cached',
          totalCourses: existingCount,
          lastUpdated: oldest.updatedAt,
          message: 'Course data is up to date',
        });
      }
    }

    // Sync from frisbeegolfradat.fi
    const result = await syncCourseList();

    return NextResponse.json({
      status: 'synced',
      ...result,
      message: `Synced ${result.total} courses (${result.added} new, ${result.updated} updated)`,
    });
  } catch (error) {
    console.error('Error syncing courses:', error);
    return NextResponse.json(
      { error: 'Failed to sync courses', details: String(error) },
      { status: 500 }
    );
  }
}
