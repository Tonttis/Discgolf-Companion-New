import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoursesListResponse, Course, SyncResponse, Game, Favorite, DiscBag, Disc } from '@/lib/types';
import type { Competition } from '@/lib/metrix-api';

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

/**
 * useSync — checks sync status quickly. Does NOT block the UI.
 * Returns cached status immediately. Use useForceSync for manual refresh.
 */
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
    // Don't retry aggressively — if sync fails, show what we have
    retry: 1,
    retryDelay: 5000,
  });
}

/**
 * useForceSync — forces a full re-sync from frisbeegolfradat.fi.
 * Use for the manual "Refresh" button. Invalidates courses list on success.
 */
export function useForceSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync?force=true');
      if (!response.ok) throw new Error('Failed to sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

// ==========================================
// Game Hooks
// ==========================================

export function useGames(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);

  return useQuery<{ games: Game[] }>({
    queryKey: ['games', status],
    queryFn: async () => {
      const response = await fetch(`/api/games?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch games');
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useGame(id: string | null) {
  return useQuery<{ game: Game }>({
    queryKey: ['game', id],
    queryFn: async () => {
      const response = await fetch(`/api/games/${id}`);
      if (!response.ok) throw new Error('Failed to fetch game');
      return response.json();
    },
    enabled: id !== null,
    staleTime: 10 * 1000,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      courseSlug: string;
      courseName: string;
      totalHoles: number;
      totalPar: number;
      playerUsernames: string[];
    }) => {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create game');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useSaveScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, scores }: { gameId: string; scores: { playerId: string; holeNumber: number; throws: number; par: number | null }[] }) => {
      const response = await fetch(`/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save scores');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['game', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useCompleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, status }: { gameId: string; status: 'completed' | 'abandoned' }) => {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update game');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useLeaveGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId }: { gameId: string }) => {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to leave game');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

// ==========================================
// Favorites Hooks
// ==========================================

export function useFavorites() {
  return useQuery<{ favorites: Favorite[] }>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await fetch('/api/favorites');
      if (!response.ok) throw new Error('Failed to fetch favorites');
      return response.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseSlug, isFavorited }: { courseSlug: string; isFavorited: boolean }) => {
      if (isFavorited) {
        const response = await fetch(`/api/favorites/${courseSlug}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to remove favorite');
        return response.json();
      } else {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseSlug }),
        });
        if (!response.ok) throw new Error('Failed to add favorite');
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

// ==========================================
// User Search Hook
// ==========================================

export function useUserSearch(username: string) {
  return useQuery<{ users: { id: string; username: string; displayName: string | null; avatarUrl: string | null }[] }>({
    queryKey: ['user-search', username],
    queryFn: async () => {
      const response = await fetch(`/api/users/search?username=${encodeURIComponent(username)}`);
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: username.length >= 1,
    staleTime: 10 * 1000,
  });
}

// ==========================================
// Competition Hooks
// ==========================================

export function useCompetition(id: number | null) {
  return useQuery<Competition>({
    queryKey: ['competition', id],
    queryFn: async () => {
      const response = await fetch(`/api/competitions?id=${id}`);
      if (!response.ok) throw new Error('Failed to fetch competition');
      return response.json();
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// Disc Bag Hooks
// ==========================================

export function useBag() {
  return useQuery<{ bags: DiscBag[] }>({
    queryKey: ['bag'],
    queryFn: async () => {
      const response = await fetch('/api/bag');
      if (!response.ok) throw new Error('Failed to fetch bag');
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useDiscSearch(query: string, filters?: { category?: string; brand?: string }) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.brand) params.set('brand', filters.brand);

  return useQuery<{ discs: Disc[] }>({
    queryKey: ['disc-search', query, filters?.category, filters?.brand],
    queryFn: async () => {
      const response = await fetch(`/api/discs/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search discs');
      return response.json();
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddDiscToBag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { bagId: string; discId: string; name: string; brand: string; category: string; speed: number; glide: number; turn: number; fade: number; stability: string; pic?: string; link?: string }) => {
      const response = await fetch('/api/bag/discs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add disc to bag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bag'] });
    },
  });
}

export function useRemoveDiscFromBag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bagId, discId }: { bagId: string; discId: string }) => {
      const response = await fetch('/api/bag/discs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagId, discId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to remove disc from bag');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bag'] });
    },
  });
}
