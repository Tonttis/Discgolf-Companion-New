'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Search, X, SlidersHorizontal, Building, Award, Sparkles, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCourses, useSync, useForceSync } from '@/hooks/use-disc-golf';
import { CourseCard, CourseCardSkeleton } from './CourseCard';
import { getClassificationLabel } from '@/lib/types';

export function CourseListView() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCity,
    setSelectedCity,
    selectedClassification,
    setSelectedClassification,
    showTopOnly,
    setShowTopOnly,
    showNewOnly,
    setShowNewOnly,
    navigateToCourse,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  // Trigger sync on first load
  const sync = useSync();
  const forceSync = useForceSync();

  // Reset page when filters change - use a key derived from filters
  const filterKey = `${selectedCity}-${selectedClassification}-${showTopOnly}-${showNewOnly}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isError, error } = useCourses(
    searchQuery || undefined,
    selectedCity || undefined,
    selectedClassification || undefined,
    showTopOnly || undefined,
    showNewOnly || undefined,
    page
  );

  const cities = useMemo(() => data?.filters.cities ?? [], [data]);
  const classifications = useMemo(() => data?.filters.classifications ?? [], [data]);

  const handleClearFilters = () => {
    setSelectedCity('');
    setSelectedClassification('');
    setShowTopOnly(false);
    setShowNewOnly(false);
    setLocalSearch('');
    setSearchQuery('');
    setPage(1);
  };

  const hasActiveFilters = selectedCity || selectedClassification || showTopOnly || showNewOnly || searchQuery;

  return (
    <div className="space-y-4">
      {/* Sync status */}
      {sync.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <RefreshCw className="size-3 animate-spin" />
          Ladataan ratoja Frisbeegolfradat.fi:stä...
        </div>
      )}
      {sync.data && !sync.isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sync.data.totalCourses ?? sync.data.total ?? 0} rataa Frisbeegolfradat.fi:stä</span>
          {sync.data.status === 'synced' && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Synkronoitu
            </Badge>
          )}
          {forceSync.isPending ? (
            <RefreshCw className="size-3 animate-spin ml-auto" />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 px-2 text-[10px]"
              onClick={() => forceSync.mutate()}
            >
              <RefreshCw className="size-3 mr-1" />
              Päivitä
            </Button>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search courses or cities..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 h-10"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            className="shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* Quick filter badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={showTopOnly ? 'default' : 'outline'}
            className={`cursor-pointer ${showTopOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            onClick={() => setShowTopOnly(!showTopOnly)}
          >
            <Award className="size-3 mr-1" />
            Top Courses
          </Badge>
          <Badge
            variant={showNewOnly ? 'default' : 'outline'}
            className={`cursor-pointer ${showNewOnly ? 'bg-sky-500 hover:bg-sky-600' : ''}`}
            onClick={() => setShowNewOnly(!showNewOnly)}
          >
            <Sparkles className="size-3 mr-1" />
            New
          </Badge>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 p-4 rounded-lg border bg-card">
            {/* City filter */}
            {cities.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building className="size-3" /> City
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  <Badge
                    variant={selectedCity === '' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedCity('')}
                  >
                    All
                  </Badge>
                  {cities.map((city) => (
                    <Badge
                      key={city}
                      variant={selectedCity === city ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCity(city)}
                    >
                      {city}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Classification filter */}
            {classifications.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Award className="size-3" /> Classification
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={selectedClassification === '' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedClassification('')}
                  >
                    All
                  </Badge>
                  {classifications.map((cls) => (
                    <Badge
                      key={cls}
                      variant={selectedClassification === cls ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedClassification(cls)}
                    >
                      {getClassificationLabel(cls)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <>
                <Separator />
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="w-full">
                  <X className="size-3 mr-1" />
                  Clear all filters
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {data && (
        <div className="text-sm text-muted-foreground">
          {data.pagination.total} course{data.pagination.total !== 1 ? 's' : ''} found
        </div>
      )}

      {/* Loading */}
      {(isLoading || sync.isLoading) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="text-4xl">😵</div>
          <p className="text-destructive font-medium">Failed to load courses</p>
          <p className="text-sm text-muted-foreground">
            {error?.message ?? 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !sync.isLoading && !isError && data?.courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="font-medium">No courses found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Course Grid */}
      {!isLoading && !sync.isLoading && !isError && data && data.courses.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onClick={() => navigateToCourse(course)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
