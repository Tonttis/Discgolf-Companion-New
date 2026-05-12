import { useQuery } from '@tanstack/react-query';
import type { Course, CourseGroup } from '@/lib/types';
import { groupCourses, extractUniqueValues, getCourseStats } from '@/lib/metrix-api';

// ==========================================
// Courses
// ==========================================

interface CoursesResponse {
  courses: Course[];
  courseGroups: CourseGroup[];
  filters: {
    countries: string[];
    areas: string[];
    cities: string[];
  };
  stats: {
    totalCourses: number;
    parentCourses: number;
    activeCourses: number;
    cities: number;
    areas: number;
  };
  total: number;
}

export function useCourses(countryCode: string, nameSearch?: string) {
  return useQuery<CoursesResponse>({
    queryKey: ['courses', countryCode, nameSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ country_code: countryCode });
      if (nameSearch && nameSearch.trim()) {
        params.set('name', nameSearch.trim());
      }
      const response = await fetch(`/api/courses?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();

      const courses: Course[] = data.courses;
      const courseGroups = groupCourses(courses);
      const filters = extractUniqueValues(courses);
      const stats = getCourseStats(courses);

      return {
        courses,
        courseGroups,
        filters,
        stats,
        total: courses.length,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!countryCode,
  });
}
