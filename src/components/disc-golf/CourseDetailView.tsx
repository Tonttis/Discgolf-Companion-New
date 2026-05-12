'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Navigation,
  TreePine,
  Activity,
  ExternalLink,
  Layers,
  Flag,
  Clock,
  Globe,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export function CourseDetailView() {
  const selectedCourse = useAppStore((s) => s.selectedCourse);
  const selectedCourseGroup = useAppStore((s) => s.selectedCourseGroup);
  const navigateToCourse = useAppStore((s) => s.navigateToCourse);

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
  const group = selectedCourseGroup;
  const layouts = group?.layouts ?? [];
  const activeLayouts = layouts.filter((l) => l.isActive);
  const inactiveLayouts = layouts.filter((l) => !l.isActive);

  const mapsUrl =
    course.latitude && course.longitude
      ? `https://www.google.com/maps?q=${course.latitude},${course.longitude}`
      : null;

  const metrixUrl = `https://discgolfmetrix.com/${course.type === 'parent' ? course.id : course.parentId}`;

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                {course.fullName ? course.fullName.replace(' → ', ' · ') : course.name}
              </h2>
              {course.name !== course.fullName && course.fullName && (
                <p className="text-emerald-100 text-sm">{course.name}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {course.type === 'parent' ? (
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                  <TreePine className="size-3 mr-1" />
                  Course
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  <Layers className="size-3 mr-1" />
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
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {course.city && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>{course.city}</span>
              </div>
            )}
            {course.area && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>{course.area}</span>
              </div>
            )}
            {course.countryCode && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>{course.countryCode}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {group ? group.totalLayoutCount : (course.type === 'layout' ? 1 : 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Layouts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeLayouts.length || (course.isActive ? 1 : 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {course.city || '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">City</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {course.area || '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Region</div>
          </CardContent>
        </Card>
      </div>

      {/* Location & Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.location && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm font-medium">{course.location}</p>
            </div>
          )}

          {mapsUrl && (
            <>
              {course.location && <Separator />}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Coordinates</p>
                  <p className="text-sm font-mono">
                    {course.latitude.toFixed(6)}, {course.longitude.toFixed(6)}
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

          {!course.latitude && !course.longitude && (
            <p className="text-sm text-muted-foreground italic">No coordinates available</p>
          )}
        </CardContent>
      </Card>

      {/* Layout Variants */}
      {layouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
              Layout Variants
            </CardTitle>
            <CardDescription>
              {layouts.length} layout{layouts.length !== 1 ? 's' : ''} registered for this course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Active layouts */}
            {activeLayouts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Active Layouts
                </p>
                {activeLayouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => navigateToCourse(layout, group ?? undefined)}
                    className="w-full text-left p-3 rounded-lg border hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{layout.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {layout.fullName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {layout.city && (
                          <span className="text-xs text-muted-foreground">{layout.city}</span>
                        )}
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-emerald-600">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Inactive layouts */}
            {inactiveLayouts.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Inactive Layouts ({inactiveLayouts.length})
                </p>
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1.5">
                  {inactiveLayouts.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => navigateToCourse(layout, group ?? undefined)}
                      className="w-full text-left p-2.5 rounded-lg border hover:border-muted-foreground/30 hover:bg-muted/50 transition-all duration-200 opacity-75"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{layout.name}</p>
                          {layout.endDate && (
                            <p className="text-[11px] text-muted-foreground">
                              Ended: {layout.endDate}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Inactive
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details & External Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Course ID</p>
              <p className="font-mono font-medium">{course.id}</p>
            </div>
            {course.parentId && course.parentId !== '0' && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Parent ID</p>
                <p className="font-mono font-medium">{course.parentId}</p>
              </div>
            )}
            {course.endDate && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" /> End Date
                </p>
                <p className="font-medium text-destructive">{course.endDate}</p>
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize">{course.type}</p>
            </div>
          </div>

          <Separator />

          <a
            href={metrixUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            View on DiscGolfMetrix
            <ExternalLink className="size-3.5" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
