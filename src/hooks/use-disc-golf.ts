import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CoursesListResponse, Course, SyncResponse, Game, Favorite, DiscBag, BagDisc, DiscSearchResult, OtherUserProfile } from '@/lib/types';

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
      const response = await fetch(`/api/games/${gameId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
// Bag Hooks
// ==========================================

export function useBags() {
  return useQuery<{ bags: DiscBag[] }>({
    queryKey: ['bags'],
    queryFn: async () => {
      const response = await fetch('/api/bags');
      if (!response.ok) throw new Error('Failed to fetch bags');
      return response.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useBagDiscs(bagId: string | null) {
  return useQuery<{ bag: DiscBag; discs: BagDisc[] }>({
    queryKey: ['bag-discs', bagId],
    queryFn: async () => {
      const response = await fetch(`/api/bags/${bagId}`);
      if (!response.ok) throw new Error('Failed to fetch bag discs');
      return response.json();
    },
    enabled: bagId !== null,
    staleTime: 30 * 1000,
  });
}

export function useCreateBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create bag');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bags'] });
    },
  });
}

export function useAddDiscToBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bagId, disc }: { bagId: string; disc: Omit<BagDisc, 'id' | 'bagId' | 'addedAt'> }) => {
      const response = await fetch(`/api/bags/${bagId}/discs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discs: [disc] }),
      });
      if (!response.ok) throw new Error('Failed to add disc');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bag-discs', variables.bagId] });
    },
  });
}

export function useRemoveDiscFromBag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bagId, discId }: { bagId: string; discId: string }) => {
      const response = await fetch(`/api/bags/${bagId}/discs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discId }),
      });
      if (!response.ok) throw new Error('Failed to remove disc');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bag-discs', variables.bagId] });
    },
  });
}

export function useDiscSearch(query: string) {
  return useQuery<{ discs: DiscSearchResult[] }>({
    queryKey: ['disc-search', query],
    queryFn: async () => {
      const response = await fetch(`/api/discs/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search discs');
      return response.json();
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// Other User Profile Hooks
// ==========================================

export function useOtherUserProfile(userId: string | null) {
  return useQuery<{ profile: OtherUserProfile }>({
    queryKey: ['other-user-profile', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user profile');
      return response.json();
    },
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}

export function useOtherUserGames(userId: string | null) {
  return useQuery<{ games: Game[] }>({
    queryKey: ['other-user-games', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/games`);
      if (!response.ok) throw new Error('Failed to fetch user games');
      return response.json();
    },
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}

export function useOtherUserBag(userId: string | null) {
  return useQuery<{ bag: DiscBag | null; discs: BagDisc[] }>({
    queryKey: ['other-user-bag', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}/bag`);
      if (!response.ok) throw new Error('Failed to fetch user bag');
      return response.json();
    },
    enabled: userId !== null,
    staleTime: 30 * 1000,
  });
}
