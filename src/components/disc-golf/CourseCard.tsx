'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, TreePine, Layers } from 'lucide-react';
import type { Course, CourseGroup } from '@/lib/types';

interface CourseCardProps {
  group: CourseGroup;
  onClick: () => void;
}

export function CourseCard({ group, onClick }: CourseCardProps) {
  const { parent, layouts, activeLayoutCount, totalLayoutCount } = group;
  const mapsUrl =
    parent.latitude && parent.longitude
      ? `https://www.google.com/maps?q=${parent.latitude},${parent.longitude}`
      : null;

  const displayName = parent.fullName
    ? parent.fullName.replace(' → ', ' · ')
    : parent.name;

  return (
    <Card
      className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 py-4 gap-3"
      onClick={onClick}
    >
      <CardContent className="px-4 space-y-3">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {displayName}
            </h3>
            <div className="flex gap-1 shrink-0">
              {parent.type === 'parent' ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <TreePine className="size-3 mr-0.5" />
                  Course
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Layout
                </Badge>
              )}
              {parent.isActive && (
                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-emerald-600">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Layout count */}
        {totalLayoutCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Layers className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {totalLayoutCount} layout{totalLayoutCount !== 1 ? 's' : ''}
            </span>
            {activeLayoutCount < totalLayoutCount && (
              <span className="text-muted-foreground">
                ({activeLayoutCount} active)
              </span>
            )}
          </div>
        )}

        {/* Location info */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {parent.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {parent.city}
            </span>
          )}
          {parent.area && <span>{parent.area}</span>}
          {parent.location && <span className="line-clamp-1">{parent.location}</span>}
        </div>

        {/* Coordinates link */}
        {mapsUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(mapsUrl, '_blank', 'noopener,noreferrer');
            }}
            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Navigation className="size-3" />
            {parent.latitude.toFixed(4)}, {parent.longitude.toFixed(4)}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="py-4 gap-3">
      <CardContent className="px-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
          <div className="h-3 bg-muted rounded animate-pulse w-20" />
        </div>
        <div className="h-3 bg-muted rounded animate-pulse w-32" />
      </CardContent>
    </Card>
  );
}
