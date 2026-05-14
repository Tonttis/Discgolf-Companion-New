'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Award, Sparkles } from 'lucide-react';
import type { Course } from '@/lib/types';
import { getClassificationLabel, getClassificationBg, getClassificationColor } from '@/lib/types';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
}

export function CourseCard({ course, onClick }: CourseCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 py-4 gap-2"
      onClick={onClick}
    >
      <CardContent className="px-4 space-y-2.5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {course.name}
            </h3>
            <div className="flex gap-1 shrink-0">
              {course.isNew && (
                <Badge className="text-[10px] px-1.5 py-0 bg-sky-600 text-white border-sky-600">
                  <Sparkles className="size-3 mr-0.5" />
                  UUSI
                </Badge>
              )}
              {course.isTop && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white border-amber-500">
                  <Award className="size-3 mr-0.5" />
                  Top
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Rating + Holes + Classification */}
        <div className="flex items-center gap-2 flex-wrap">
          {course.rating !== null && (
            <div className="flex items-center gap-1">
              <Star className="size-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
            </div>
          )}
          <Badge variant="outline" className="text-[11px] px-1.5 py-0">
            {course.holes} väylää
          </Badge>
          {course.classification && (
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${getClassificationBg(course.classification)} ${getClassificationColor(course.classification)}`}>
              {course.classification.toUpperCase()}
            </span>
          )}
        </div>

        {/* City */}
        {course.city && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            <span>{course.city}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="py-4 gap-2">
      <CardContent className="px-4 space-y-2.5">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="flex gap-2">
          <div className="h-5 bg-muted rounded animate-pulse w-12" />
          <div className="h-5 bg-muted rounded animate-pulse w-16" />
        </div>
        <div className="h-3 bg-muted rounded animate-pulse w-24" />
      </CardContent>
    </Card>
  );
}
