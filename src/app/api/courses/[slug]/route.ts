import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchAndCacheCourseDetail } from '@/lib/scraper/frisbeegolfradat';

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

    // If detail hasn't been fetched yet, fetch it now
    if (!course.detailFetchedAt) {
      try {
        course = await fetchAndCacheCourseDetail(slug);
      } catch (error) {
        console.error(`Failed to fetch detail for ${slug}:`, error);
        // Return basic data even if detail fetch fails
      }
    }

    // Check if detail is stale (older than 24 hours) and refresh in background
    if (course.detailFetchedAt) {
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (course.detailFetchedAt < staleThreshold) {
        // Fire and forget refresh
        fetchAndCacheCourseDetail(slug).catch(() => {});
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
