import { create } from 'zustand';
import type { AppView, Course } from '@/lib/types';

interface AppStore {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Selected items
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course | null) => void;
  selectedCompetitionId: number | null;
  setSelectedCompetitionId: (id: number | null) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;

  // Navigation helpers
  navigateToCourse: (course: Course) => void;
  navigateToCompetition: (id: number) => void;
  navigateHome: () => void;
  navigateToCourses: () => void;
  goBack: () => void;

  // History for back navigation
  viewHistory: AppView[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  selectedCourse: null,
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  selectedCompetitionId: null,
  setSelectedCompetitionId: (id) => set({ selectedCompetitionId: id }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedCountry: 'FI',
  setSelectedCountry: (country) => set({ selectedCountry: country, selectedArea: '', selectedCity: '' }),
  selectedArea: '',
  setSelectedArea: (area) => set({ selectedArea: area, selectedCity: '' }),
  selectedCity: '',
  setSelectedCity: (city) => set({ selectedCity: city }),

  viewHistory: [],

  navigateToCourse: (course) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'course-detail',
      selectedCourse: course,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateToCompetition: (id) => {
    const { currentView, viewHistory } = get();
    set({
      currentView: 'competition',
      selectedCompetitionId: id,
      viewHistory: [...viewHistory, currentView],
    });
  },

  navigateHome: () => {
    set({
      currentView: 'home',
      selectedCourse: null,
      selectedCompetitionId: null,
      searchQuery: '',
      selectedArea: '',
      selectedCity: '',
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

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const prevView = viewHistory[viewHistory.length - 1];
      const newHistory = viewHistory.slice(0, -1);
      set({
        currentView: prevView,
        viewHistory: newHistory,
        ...(prevView !== 'course-detail' && prevView !== 'competition'
          ? { selectedCourse: null, selectedCompetitionId: null }
          : {}),
      });
    } else {
      set({ currentView: 'home' });
    }
  },
}));
