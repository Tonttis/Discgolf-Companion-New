import { create } from 'zustand';
import type { AppView, Course } from '@/lib/types';

interface AppStore {
  // Navigation
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // Selected course
  selectedCourse: Course | null;
  setSelectedCourse: (course: Course | null) => void;

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
  goBack: () => void;

  // History
  viewHistory: AppView[];
}

export const useAppStore = create<AppStore>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  selectedCourse: null,
  setSelectedCourse: (course) => set({ selectedCourse: course }),

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

  goBack: () => {
    const { viewHistory } = get();
    if (viewHistory.length > 0) {
      const prevView = viewHistory[viewHistory.length - 1];
      const newHistory = viewHistory.slice(0, -1);
      set({
        currentView: prevView,
        viewHistory: newHistory,
        ...(prevView !== 'course-detail'
          ? { selectedCourse: null }
          : {}),
      });
    } else {
      set({ currentView: 'home' });
    }
  },
}));
