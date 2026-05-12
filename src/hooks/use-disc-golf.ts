import { useQuery } from '@tanstack/react-query';
import type { CoursesListResponse, Course, SyncResponse } from '@/lib/types';

export function useCourses(
  search?: string,
  city?: string,
  classification?: string,
  isTop?: boolean,
  isNew?: boolean,
  page: number = 1
) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (city) params.set('city', city);
  if (classification) params.set('classification', classification);
  if (isTop) params.set('isTop', 'true');
  if (isNew) params.set('isNew', 'true');
  params.set('page', page.toString());
  params.set('limit', '60');

  return useQuery<CoursesListResponse>({
    queryKey: ['courses', search, city, classification, isTop, isNew, page],
    queryFn: async () => {
      const response = await fetch(`/api/courses?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCourseDetail(slug: string | null) {
  return useQuery<Course>({
    queryKey: ['course-detail', slug],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch course detail');
      return response.json();
    },
    enabled: slug !== null,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSync() {
  return useQuery<SyncResponse>({
    queryKey: ['sync'],
    queryFn: async () => {
      const response = await fetch('/api/sync');
      if (!response.ok) throw new Error('Failed to sync');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
