import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const classification = searchParams.get('classification') || '';
    const isTop = searchParams.get('isTop');
    const isNew = searchParams.get('isNew');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { city: { contains: search } },
      ];
    }

    if (city) {
      where.city = { contains: city };
    }

    if (classification) {
      where.classification = { startsWith: classification };
    }

    if (isTop === 'true') {
      where.isTop = true;
    }

    if (isNew === 'true') {
      where.isNew = true;
    }

    const [courses, total] = await Promise.all([
      db.course.findMany({
        where,
        orderBy: [
          { isTop: 'desc' },
          { rating: 'desc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.course.count({ where }),
    ]);

    // Get unique cities for filters
    const allCourses = await db.course.findMany({
      select: { city: true, classification: true },
      orderBy: { city: 'asc' },
    });
    const cities = [...new Set(allCourses.map((c) => c.city).filter(Boolean))].sort();
    const classifications = [...new Set(allCourses.map((c) => c.classification).filter(Boolean))].sort();

    return NextResponse.json({
      courses,
      filters: { cities, classifications },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
