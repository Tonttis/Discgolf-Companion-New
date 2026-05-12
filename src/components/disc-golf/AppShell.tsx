'use client';

import { Button } from '@/components/ui/button';
import { Home, MapPin, ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { HomeView } from './HomeView';
import { CourseListView } from './CourseListView';
import { CourseDetailView } from './CourseDetailView';
import { ViewTransition } from './ViewTransition';

export function AppShell() {
  const currentView = useAppStore((s) => s.currentView);
  const goBack = useAppStore((s) => s.goBack);
  const navigateHome = useAppStore((s) => s.navigateHome);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const viewHistory = useAppStore((s) => s.viewHistory);

  const canGoBack = viewHistory.length > 0;

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'courses':
        return <CourseListView />;
      case 'course-detail':
        return <CourseDetailView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
                <ArrowLeft className="size-5" />
              </Button>
            )}
            <button
              onClick={navigateHome}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-center size-8 rounded-lg overflow-hidden">
                <img src="/disc-golf-logo.png" alt="" className="size-8 rounded-lg object-cover" />
              </div>
              <span className="font-semibold text-sm sm:text-base">
                DiscGolf Companion
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        <ViewTransition viewKey={currentView}>{renderView()}</ViewTransition>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          <button
            onClick={navigateHome}
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
              currentView === 'home'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="size-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button
            onClick={navigateToCourses}
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
              currentView === 'courses' || currentView === 'course-detail'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="size-5" />
            <span className="text-[10px] font-medium">Courses</span>
          </button>
        </div>
      </nav>

      {/* Desktop Footer */}
      <footer className="hidden sm:block mt-auto border-t">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-xs text-center text-muted-foreground">
            DiscGolf Companion · Powered by DiscGolfMetrix
          </p>
        </div>
      </footer>
    </div>
  );
}
