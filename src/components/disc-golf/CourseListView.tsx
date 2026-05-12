'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, X, SlidersHorizontal, MapPin, Building, List, LayoutGrid } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCourses } from '@/hooks/use-disc-golf';
import { CourseCard, CourseCardSkeleton } from './CourseCard';

const COUNTRY_OPTIONS = [
  { value: 'FI', label: 'Finland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'EE', label: 'Estonia' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'DE', label: 'Germany' },
  { value: 'US', label: 'United States' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
];

type ViewMode = 'grouped' | 'flat';

export function CourseListView() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCountry,
    setSelectedCountry,
    selectedArea,
    setSelectedArea,
    selectedCity,
    setSelectedCity,
    navigateToCourse,
  } = useAppStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  const { data, isLoading, isError, error } = useCourses(selectedCountry, searchQuery || undefined);

  // Derived filter values from API response
  const areas = useMemo(() => data?.filters.areas ?? [], [data]);
  const cities = useMemo(() => data?.filters.cities ?? [], [data]);

  // Filter course groups locally by area and city
  const filteredGroups = useMemo(() => {
    if (!data?.courseGroups) return [];
    let groups = data.courseGroups;

    if (selectedArea) {
      groups = groups.filter((g) => g.parent.area === selectedArea);
    }
    if (selectedCity) {
      groups = groups.filter((g) => g.parent.city === selectedCity);
    }
    return groups;
  }, [data, selectedArea, selectedCity]);

  // Flat list of all courses (for flat view mode)
  const filteredCourses = useMemo(() => {
    if (!data?.courses) return [];
    let courses = data.courses;
    if (selectedArea) {
      courses = courses.filter((c) => c.area === selectedArea);
    }
    if (selectedCity) {
      courses = courses.filter((c) => c.city === selectedCity);
    }
    // Only show parent courses and standalone layouts
    return courses.filter((c) => c.type === 'parent' || !data.courseGroups.some((g) => g.layouts.some((l) => l.id === c.id)));
  }, [data, selectedArea, selectedCity]);

  const handleClearFilters = () => {
    setSelectedArea('');
    setSelectedCity('');
    setLocalSearch('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedArea || selectedCity || searchQuery;

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search courses..."
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
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
          >
            {viewMode === 'grouped' ? (
              <List className="size-4" />
            ) : (
              <LayoutGrid className="size-4" />
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 p-4 rounded-lg border bg-card">
            {/* Country selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3" /> Country
              </label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area filter */}
            {areas.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building className="size-3" /> Area
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                  <Badge
                    variant={selectedArea === '' ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedArea('')}
                  >
                    All
                  </Badge>
                  {areas.map((area) => (
                    <Badge
                      key={area}
                      variant={selectedArea === area ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedArea(area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
          {viewMode === 'grouped'
            ? `${filteredGroups.length} course${filteredGroups.length !== 1 ? 's' : ''}`
            : `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''}`
          }
          {' '}found
          {selectedCountry && ` in ${COUNTRY_OPTIONS.find((c) => c.value === selectedCountry)?.label ?? selectedCountry}`}
          {data.stats && (
            <span className="ml-2 text-xs">
              ({data.stats.parentCourses} courses, {data.stats.activeCourses} active)
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
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
      {!isLoading && !isError && ((viewMode === 'grouped' && filteredGroups.length === 0) || (viewMode === 'flat' && filteredCourses.length === 0)) && (
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

      {/* Course Grid - Grouped view */}
      {!isLoading && !isError && viewMode === 'grouped' && filteredGroups.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <CourseCard
              key={group.parent.id}
              group={group}
              onClick={() => navigateToCourse(group.parent, group)}
            />
          ))}
        </div>
      )}

      {/* Course Grid - Flat view */}
      {!isLoading && !isError && viewMode === 'flat' && filteredCourses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const group = data?.courseGroups.find((g) => g.parent.id === course.id);
            return (
              <CourseCard
                key={course.id}
                group={group ?? { parent: course, layouts: [], activeLayoutCount: course.isActive ? 1 : 0, totalLayoutCount: 1 }}
                onClick={() => navigateToCourse(course, group ?? undefined)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
