'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Home, MapPin, ArrowLeft, User, Heart } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth/auth-context';
import { HomeView } from './HomeView';
import { CourseListView } from './CourseListView';
import { CourseDetailView } from './CourseDetailView';
import { NewGameView } from './NewGameView';
import { ActiveGameView } from './ActiveGameView';
import { GameSummaryView } from './GameSummaryView';
import { GameHistoryView } from './GameHistoryView';
import { GameDetailView } from './GameDetailView';
import { FavoritesView } from './FavoritesView';
import { ProfileView } from './ProfileView';
import { AuthView } from './AuthView';
import { CompetitionView } from './CompetitionView';
import { ViewTransition } from './ViewTransition';

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const goBack = useAppStore((s) => s.goBack);
  const navigateHome = useAppStore((s) => s.navigateToHome);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const navigateToProfile = useAppStore((s) => s.navigateToProfile);
  const navigateToAuth = useAppStore((s) => s.navigateToAuth);
  const navigateToFavorites = useAppStore((s) => s.navigateToFavorites);
  const viewHistory = useAppStore((s) => s.viewHistory);
  const { isAuthenticated, supabaseConfigured } = useAuth();

  const canGoBack = viewHistory.length > 0;

  // Intercept browser back button to use in-app navigation instead
  useEffect(() => {
    const handlePopState = () => {
      const currentViewHistory = useAppStore.getState().viewHistory;
      if (currentViewHistory.length > 0) {
        // Use in-app goBack instead of browser navigation
        useAppStore.getState().goBack();
      }
    };

    // Push initial state so we can intercept back button
    window.history.pushState(null, '');

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Push state whenever view changes, so back button can be intercepted
  useEffect(() => {
    window.history.pushState(null, '');
  }, [currentView]);

  // Hide bottom nav during active game for more screen space
  const hideBottomNav = currentView === 'active-game';

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'courses':
        return <CourseListView />;
      case 'course-detail':
        return <CourseDetailView />;
      case 'new-game':
        return <NewGameView />;
      case 'active-game':
        return <ActiveGameView />;
      case 'game-summary':
        return <GameSummaryView />;
      case 'game-history':
        return <GameHistoryView />;
      case 'game-detail':
        return <GameDetailView />;
      case 'favorites':
        return <FavoritesView />;
      case 'profile':
        return <ProfileView />;
      case 'auth':
        return <AuthView />;
      case 'competition':
        return <CompetitionView />;
      default:
        return <HomeView />;
    }
  };

  // Determine which bottom nav tab is active
  const getActiveTab = (): string => {
    if (currentView === 'home') return 'home';
    if (['courses', 'course-detail'].includes(currentView)) return 'courses';
    if (['favorites'].includes(currentView)) return 'favorites';
    if (['profile', 'auth', 'game-history', 'game-detail'].includes(currentView)) return 'profile';
    if (['new-game', 'active-game', 'game-summary', 'competition'].includes(currentView)) return 'home';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0 size-9">
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <button
              onClick={navigateHome}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center size-7 sm:size-8 rounded-lg overflow-hidden">
                <img src="/disc-golf-logo.png" alt="" className="size-7 sm:size-8 rounded-lg object-cover" />
              </div>
              <span className="font-semibold text-sm sm:text-base">
                DiscGolf Companion
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-6">
        <ViewTransition viewKey={currentView}>{renderView()}</ViewTransition>
      </main>

      {/* Bottom Navigation (Mobile) */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t sm:hidden safe-area-bottom">
          <div className="flex items-center justify-around h-14">
            <button
              onClick={navigateHome}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                activeTab === 'home'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home className="size-5" />
              <span className="text-[10px] font-medium">Etusivu</span>
            </button>
            <button
              onClick={navigateToCourses}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                activeTab === 'courses'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="size-5" />
              <span className="text-[10px] font-medium">Radat</span>
            </button>
            <button
              onClick={navigateToFavorites}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                activeTab === 'favorites'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className="size-5" />
              <span className="text-[10px] font-medium">Suosikit</span>
            </button>
            <button
              onClick={isAuthenticated ? navigateToProfile : navigateToAuth}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                activeTab === 'profile'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="size-5" />
              <span className="text-[10px] font-medium">Profiili</span>
            </button>
          </div>
        </nav>
      )}

      {/* Desktop Footer */}
      <footer className="hidden sm:block mt-auto border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-xs text-center text-muted-foreground">
            DiscGolf Companion · Tiedot: Frisbeegolfradat.fi
          </p>
        </div>
      </footer>
    </div>
  );
}
