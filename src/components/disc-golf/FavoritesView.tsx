'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Heart,
  MapPin,
  Target,
  Play,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useFavorites, useToggleFavorite, useCourseDetail } from '@/hooks/use-disc-golf';
import type { Favorite, Course } from '@/lib/types';
import {
  getClassificationLabel,
  getClassificationColor,
  getClassificationBg,
} from '@/lib/types';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';

// ==========================================
// Favorite Course Card Skeleton
// ==========================================

function FavoriteCourseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <Skeleton className="hidden sm:block w-28 h-full min-h-[120px] rounded-none" />
        <CardContent className="p-4 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="size-8 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </CardContent>
      </div>
    </Card>
  );
}

// ==========================================
// Favorite Course Card
// ==========================================

function FavoriteCourseCard({
  slug,
  index,
}: {
  slug: string;
  index: number;
}) {
  const { data: course, isLoading, isError } = useCourseDetail(slug);
  const toggleFavorite = useToggleFavorite();
  const navigateToCourse = useAppStore((s) => s.navigateToCourse);
  const navigateToNewGame = useAppStore((s) => s.navigateToNewGame);

  const handleRemoveFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate(
      { courseSlug: slug, isFavorited: true },
      {
        onSuccess: () => {
          toast.success('Suosikki poistettu');
        },
        onError: () => {
          toast.error('Suosikin poisto epäonnistui');
        },
      }
    );
  };

  const handleStartGame = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (course) {
      navigateToNewGame(course);
    }
  };

  const handleCardClick = () => {
    if (course) {
      navigateToCourse(course);
    }
  };

  if (isLoading) {
    return <FavoriteCourseCardSkeleton />;
  }

  if (isError || !course) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
        <Card className="overflow-hidden opacity-60">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center justify-center size-10 rounded-lg bg-muted shrink-0">
                <AlertCircle className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{slug}</p>
                <p className="text-xs text-muted-foreground">Radan tiedot ei saatavilla</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 size-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
              onClick={handleRemoveFavorite}
              disabled={toggleFavorite.isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      layout
    >
      <Card
        className="overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 group"
        onClick={handleCardClick}
      >
        <div className="flex">
          {/* Banner image — visible on sm+ */}
          {course.bannerImageUrl && (
            <div className="hidden sm:block w-28 shrink-0 relative overflow-hidden">
              <img
                src={course.bannerImageUrl}
                alt={course.name}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          )}

          <CardContent className="p-4 flex-1 space-y-3">
            {/* Top row: Name + Remove button */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {course.name}
                </h3>
                {course.city && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{course.city}</span>
                  </div>
                )}
              </div>

              {/* Heart / Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 size-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                onClick={handleRemoveFavorite}
                disabled={toggleFavorite.isPending}
                aria-label="Poista suosikeista"
              >
                {toggleFavorite.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Heart className="size-4 fill-rose-500" />
                )}
              </Button>
            </div>

            {/* Details row: Holes + Classification */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[11px] px-1.5 py-0 gap-1">
                <Target className="size-3" />
                {course.holes} väylää
              </Badge>
              {course.classification && (
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${getClassificationBg(course.classification)} ${getClassificationColor(course.classification)}`}
                >
                  {getClassificationLabel(course.classification)}
                </span>
              )}
              {course.rating !== null && course.rating !== undefined && (
                <div className="flex items-center gap-0.5">
                  <Star className="size-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-medium">{course.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Action row: Start game button + Chevron */}
            <div className="flex items-center gap-2 pt-0.5">
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs gap-1.5"
                onClick={handleStartGame}
              >
                <Play className="size-3" />
                Pelaa
              </Button>
              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors ml-auto" />
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Supabase Not Configured Message
// ==========================================

function SupabaseNotConfiguredMessage() {
  const navigateToAuth = useAppStore((s) => s.navigateToAuth);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="size-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <AlertCircle className="size-10 text-amber-500 dark:text-amber-400" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-lg font-semibold">Supabase ei ole määritetty</h2>
        <p className="text-sm text-muted-foreground">
          Suosikkien käyttö vaatii Supabase-yhteyden. Määritä Supabase ensin, jotta voit kirjautua sisään ja tallentaa suosikkejasi.
        </p>
      </div>
      <Button
        variant="outline"
        className="gap-2"
        onClick={navigateToAuth}
      >
        <LogIn className="size-4" />
        Kirjaudu sisään
      </Button>
    </div>
  );
}

// ==========================================
// Not Authenticated Message
// ==========================================

function NotAuthenticatedMessage() {
  const navigateToAuth = useAppStore((s) => s.navigateToAuth);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="size-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
        <Heart className="size-10 text-rose-500 dark:text-rose-400" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-lg font-semibold">Kirjaudu sisään nähdäksesi suosikkisi</h2>
        <p className="text-sm text-muted-foreground">
          Suosikkiratojen tallentaminen vaatii sisäänkirjautumisen. Kirjaudu sisään hallitaksesi suosikkejasi.
        </p>
      </div>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white gap-2"
        onClick={navigateToAuth}
      >
        <LogIn className="size-4" />
        Kirjaudu sisään
      </Button>
    </div>
  );
}

// ==========================================
// Empty State
// ==========================================

function EmptyState() {
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center space-y-4"
    >
      <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <Heart className="size-10 text-emerald-500 dark:text-emerald-400" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-lg font-semibold">Ei suosikkeja vielä</h2>
        <p className="text-sm text-muted-foreground">
          Selaa ratoja ja lisää suosikki painamalla sydän-kuvaketta. Suosikkiradat näkyvät täällä.
        </p>
      </div>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white gap-2"
        onClick={navigateToCourses}
      >
        <Target className="size-4" />
        Selaa ratoja
      </Button>
    </motion.div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function FavoritesView() {
  const goBack = useAppStore((s) => s.goBack);
  const { isAuthenticated, isLoading: authLoading, supabaseConfigured } = useAuth();
  const { data, isLoading: favoritesLoading, isError, error } = useFavorites();

  const favorites = data?.favorites ?? [];

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Supabase not configured
  if (!supabaseConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suosikkiradat</h1>
          </div>
          <div className="flex items-center justify-center size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30">
            <Heart className="size-5 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        <SupabaseNotConfiguredMessage />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Suosikkiradat</h1>
          </div>
          <div className="flex items-center justify-center size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30">
            <Heart className="size-5 text-rose-600 dark:text-rose-400" />
          </div>
        </div>
        <NotAuthenticatedMessage />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ==========================================
          1. Header
          ========================================== */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="shrink-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Suosikkiradat
          </h1>
          <p className="text-sm text-muted-foreground">
            {favorites.length > 0
              ? `${favorites.length} suosikki${favorites.length !== 1 ? 'a' : ''}`
              : 'Omat suosikkiradat'}
          </p>
        </div>
        <div className="flex items-center justify-center size-10 rounded-xl bg-rose-100 dark:bg-rose-900/30">
          <Heart className="size-5 text-rose-600 dark:text-rose-400" />
        </div>
      </div>

      {/* ==========================================
          2. Favorites List
          ========================================== */}

      {/* Loading */}
      {favoritesLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <FavoriteCourseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-12 text-center space-y-3"
        >
          <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="size-8 text-red-500" />
          </div>
          <p className="font-medium text-destructive">Suosikkien lataaminen epäonnistui</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? 'Jokin meni pieleen. Yritä uudelleen.'}
          </p>
        </motion.div>
      )}

      {/* Empty */}
      {!favoritesLoading && !isError && favorites.length === 0 && <EmptyState />}

      {/* Favorites list */}
      {!favoritesLoading && !isError && favorites.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {favorites.map((favorite, index) => (
              <FavoriteCourseCard
                key={favorite.id}
                slug={favorite.courseSlug}
                index={index}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
