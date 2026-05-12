'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Navigation, TreePine, Activity, Trophy, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { CompetitionLookup } from './CompetitionLookup';

export function CourseDetailView() {
  const selectedCourse = useAppStore((s) => s.selectedCourse);

  if (!selectedCourse) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="text-4xl">🗺️</div>
        <p className="font-medium">No course selected</p>
        <p className="text-sm text-muted-foreground">Go back and select a course to view details</p>
      </div>
    );
  }

  const course = selectedCourse;
  const mapsUrl =
    course.latitude && course.longitude
      ? `https://www.google.com/maps?q=${course.latitude},${course.longitude}`
      : null;

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold">{course.name}</h2>
              {course.fullName && course.fullName !== course.name && (
                <p className="text-emerald-100 text-sm">{course.fullName}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {course.type === 'parent' ? (
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <TreePine className="size-3 mr-1" />
                  Parent
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  Layout
                </Badge>
              )}
              <Badge
                className={`${
                  course.isActive
                    ? 'bg-emerald-500/80 text-white border-emerald-400'
                    : 'bg-white/10 text-white/70 border-white/20'
                }`}
              >
                <Activity className="size-3 mr-1" />
                {course.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Location Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {course.city && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">City</p>
                <p className="text-sm font-medium">{course.city}</p>
              </div>
            )}
            {course.area && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Area</p>
                <p className="text-sm font-medium">{course.area}</p>
              </div>
            )}
            {course.location && (
              <div className="space-y-1 col-span-2">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{course.location}</p>
              </div>
            )}
            {course.countryCode && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium">{course.countryCode}</p>
              </div>
            )}
          </div>

          {mapsUrl && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Coordinates</p>
                  <p className="text-sm font-mono">
                    {course.latitude.toFixed(4)}, {course.longitude.toFixed(4)}
                  </p>
                </div>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/70 transition-colors"
                >
                  <Navigation className="size-3.5" />
                  Open in Maps
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Competition Lookup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
            Competition Results
          </CardTitle>
          <CardDescription>
            Enter a competition ID to view scorecard results for this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompetitionLookup />
        </CardContent>
      </Card>

      {/* Course ID reference */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Course ID</span>
            <span className="font-mono font-medium">{course.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
