import { useQuery } from '@tanstack/react-query';
import type { Course, Competition } from '@/lib/types';

// ==========================================
// Courses
// ==========================================

interface CoursesResponse {
  courses: Course[];
  filters: {
    countries: string[];
    areas: string[];
    cities: string[];
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
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!countryCode,
  });
}

// ==========================================
// Competition Results
// ==========================================

export function useCompetition(competitionId: number | null, className?: string) {
  return useQuery<Competition>({
    queryKey: ['competition', competitionId, className],
    queryFn: async () => {
      const params = new URLSearchParams({ id: competitionId!.toString() });
      if (className) params.set('class', className);
      const response = await fetch(`/api/competitions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch competition');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: competitionId !== null,
  });
}
