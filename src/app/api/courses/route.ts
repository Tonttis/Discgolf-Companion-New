import { NextRequest, NextResponse } from 'next/server';
import { fetchCoursesList, transformCourse, extractUniqueValues } from '@/lib/metrix-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('country_code') || 'FI';
    const nameSearch = searchParams.get('name') || undefined;

    const rawCourses = await fetchCoursesList(countryCode, nameSearch);
    const courses = rawCourses.map(transformCourse);

    // Extract unique filter values
    const filterValues = extractUniqueValues(courses);

    return NextResponse.json({
      courses,
      filters: filterValues,
      total: courses.length,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
