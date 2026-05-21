import { create } from 'zustand';
import type { AppView, Course, Game } from '@/lib/types';

interface AppStore {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Selected course
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course | null) => void;

  // Active game
  activeGame: Game | null;
  setActiveGame: (game: Game | null) => void;

  // Selected game (for viewing past game details)
  selectedGame: Game | null;
  setSelectedGame: (game: Game | null) => void;

  // Selected user (for viewing other player profiles)
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedClassification: string;
  setSelectedClassification: (cls: string) => void;
  showTopOnly: boolean;
  setShowTopOnly: (show: boolean) => void;
  showNewOnly: boolean;
  setShowNewOnly: (show: boolean) => void;

  // Navigation helpers
  navigateToCourse: (course: Course) => void;
  navigateHome: () => void;
  navigateToCourses: () => void;
  navigateToAuth: () => void;
  navigateToProfile: () => void;
  navigateToNewGame: (course?: Course) => void;
  navigateToActiveGame: (game: Game) => void;
  navigateToGameHistory: () => void;
  navigateToGameDetail: (game: Game) => void;
  navigateToFavorites: () => void;
  navigateToBag: () => void;
  navigateToPlayerSearch: () => void;
  navigateToPlayerProfile: (userId: string) => void;
  navigateToSettings: () => void;
  goBack: () => void;

  // History
  viewHistory: AppView[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  selectedCourse: null,
  setSelectedCourse: (course) => set({ selectedCourse: course }),

  activeGame: null,
  setActiveGame: (game) => set({ activeGame: game }),

  selectedGame: null,
  setSelectedGame: (game) => set({ selectedGame: game }),

  selectedUserId: null,
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCity: '',
  setSelectedCity: (city) => set({ selectedCity: city }),
  selectedClassification: '',
  setSelectedClassification: (cls) => set({ selectedClassification: cls }),
  showTopOnly: false,
  setShowTopOnly: (show) => set({ showTopOnly: show }),
  showNewOnly: false,
  setShowNewOnly: (show) => set({ showNewOnly: show }),

  viewHistory: [],

  navigateToCourse: (course) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'course-detail',
      selectedCourse: course,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateHome: () => {
    set({
      currentView: 'home',
      selectedCourse: null,
      activeGame: null,
      searchQuery: '',
      selectedCity: '',
      selectedClassification: '',
      showTopOnly: false,
      showNewOnly: false,
      viewHistory: [],
    });
  },

  navigateToCourses: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'courses',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToAuth: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'auth',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToProfile: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'profile',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToNewGame: (course) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'new-game',
      selectedCourse: course ?? get().selectedCourse,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToActiveGame: (game) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'active-game',
      activeGame: game,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToGameHistory: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'game-history',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToGameDetail: (game) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'game-detail',
      selectedGame: game,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToFavorites: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'favorites',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToBag: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'bag',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToPlayerSearch: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'player-search',
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToPlayerProfile: (userId) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'player-profile',
      selectedUserId: userId,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToSettings: () => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'settings',
      viewHistory: [...viewHistory, currentView],
    });
  },

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const prevView = viewHistory[viewHistory.length - 1];
      const newHistory = viewHistory.slice(0, -1);
      set({
        currentView: prevView,
        viewHistory: newHistory,
        ...(prevView !== 'course-detail' ? { selectedCourse: get().selectedCourse } : {}),
        ...(prevView !== 'active-game' ? {} : {}),
        ...(prevView !== 'game-detail' ? {} : {}),
      });
    } else {
      set({ currentView: 'home' });
    }
  },
}));
