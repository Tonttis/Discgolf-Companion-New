'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, TreePine } from 'lucide-react';
import type { Course } from '@/lib/types';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

export function CourseCard({ course, onClick }: CourseCardProps) {
  const mapsUrl =
    course.latitude && course.longitude
      ? `https://www.google.com/maps?q=${course.latitude},${course.longitude}`
      : null;

  return (
    <Card
      className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 py-4 gap-3"
      onClick={onClick}
    >
      <CardContent className="px-4 space-y-3">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {course.name}
            </h3>
            <div className="flex gap-1 shrink-0">
              {course.type === 'parent' ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <TreePine className="size-3 mr-0.5" />
                  Parent
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Layout
                </Badge>
              )}
              {course.isActive && (
                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-emerald-600">
                  Active
                </Badge>
              )}
            </div>
          </div>
          {course.fullName && course.fullName !== course.name && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {course.fullName}
            </p>
          )}
        </div>

        {/* Location info */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {course.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {course.city}
            </span>
          )}
          {course.area && <span>{course.area}</span>}
          {course.location && <span>{course.location}</span>}
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
            {course.latitude.toFixed(4)}, {course.longitude.toFixed(4)}
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
