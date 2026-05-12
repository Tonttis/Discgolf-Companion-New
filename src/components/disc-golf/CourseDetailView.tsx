'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Navigation,
  Award,
  Sparkles,
  Star,
  ExternalLink,
  TreePine,
  Flag,
  Calendar,
  ShoppingBasket,
  Target,
  Mountain,
  Signpost,
  Wrench,
  Users,
  Ruler,
  CircleDollarSign,
  Link2,
  Snowflake,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCourseDetail } from '@/hooks/use-disc-golf';
import { getClassificationLabel, getClassificationColor, getClassificationBg } from '@/lib/types';

export function CourseDetailView() {
  const selectedCourse = useAppStore((s) => s.selectedCourse);

  const { data: course, isLoading } = useCourseDetail(
    selectedCourse?.slug ?? null
  );

  if (!selectedCourse && !course) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="text-4xl">🗺️</div>
        <p className="font-medium">No course selected</p>
        <p className="text-sm text-muted-foreground">Go back and select a course to view details</p>
      </div>
    );
  }

  // Use the fresh course data from API if available, fall back to selectedCourse
  const displayCourse = course ?? selectedCourse!;

  if (isLoading) {
    return <CourseDetailSkeleton />;
  }

  const mapsUrl =
    displayCourse.latitude && displayCourse.longitude
      ? `https://www.google.com/maps?q=${displayCourse.latitude},${displayCourse.longitude}`
      : displayCourse.city
      ? `https://www.google.com/maps?q=${encodeURIComponent(displayCourse.name + ' ' + displayCourse.city)}`
      : null;

  const fgfUrl = `https://frisbeegolfradat.fi/rata/${displayCourse.slug}`;

  const hasDetail = !!displayCourse.detailFetchedAt;

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                {displayCourse.name}
              </h2>
              {displayCourse.city && (
                <div className="flex items-center gap-1.5 text-emerald-100 text-sm">
                  <MapPin className="size-3.5" />
                  <span>{displayCourse.city}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {displayCourse.isNew && (
                <Badge className="bg-sky-500/80 text-white border-sky-400">
                  <Sparkles className="size-3 mr-1" />
                  UUSI
                </Badge>
              )}
              {displayCourse.isTop && (
                <Badge className="bg-amber-500/80 text-white border-amber-400">
                  <Award className="size-3 mr-1" />
                  Huippurata
                </Badge>
              )}
            </div>
          </div>
        </div>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {displayCourse.rating !== null && (
              <div className="flex items-center gap-1.5">
                <Star className="size-4 text-amber-500 fill-amber-500" />
                <span className="font-semibold">{displayCourse.rating.toFixed(1)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="size-4" />
              <span>{displayCourse.holes} holes</span>
            </div>
            {displayCourse.classification && (
              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${getClassificationBg(displayCourse.classification)} ${getClassificationColor(displayCourse.classification)}`}>
                {getClassificationLabel(displayCourse.classification)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {displayCourse.holes}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Holes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-2xl font-bold text-amber-500">
              {displayCourse.rating?.toFixed(1) ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Rating</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-sm font-bold text-foreground">
              {displayCourse.isFree === 'ilmainen' ? 'Free' : displayCourse.isFree ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Cost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <div className="text-sm font-bold text-foreground">
              {displayCourse.winterPlay ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Winter</div>
          </CardContent>
        </Card>
      </div>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-emerald-600 dark:text-emerald-400" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayCourse.address && (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm font-medium">
                {displayCourse.address}
                {displayCourse.zipCode && `, ${displayCourse.zipCode}`}
                {displayCourse.city && ` ${displayCourse.city}`}
              </p>
            </div>
          )}
          {mapsUrl && (
            <>
              {displayCourse.address && <Separator />}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {displayCourse.latitude && displayCourse.longitude
                      ? `Coordinates`
                      : 'Find on map'}
                  </p>
                  {displayCourse.latitude && displayCourse.longitude && (
                    <p className="text-sm font-mono">
                      {displayCourse.latitude.toFixed(6)}, {displayCourse.longitude.toFixed(6)}
                    </p>
                  )}
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

      {/* Course Details */}
      {hasDetail && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="size-4 text-emerald-600 dark:text-emerald-400" />
              Course Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailRow icon={<Calendar className="size-4" />} label="Founded" value={displayCourse.founded} />
              <DetailRow icon={<ShoppingBasket className="size-4" />} label="Baskets" value={displayCourse.basketType} />
              <DetailRow icon={<TreePine className="size-4" />} label="Tee Pads" value={displayCourse.teeType} />
              <DetailRow icon={<Mountain className="size-4" />} label="Terrain" value={displayCourse.terrain} />
              <DetailRow icon={<Signpost className="size-4" />} label="Signage" value={displayCourse.signage} />
              <DetailRow icon={<Flag className="size-4" />} label="Course Type" value={displayCourse.courseType} />
              <DetailRow icon={<Wrench className="size-4" />} label="Maintenance" value={displayCourse.maintenance} />
              <DetailRow icon={<Users className="size-4" />} label="Course Master" value={displayCourse.courseMaster} />
              <DetailRow icon={<Ruler className="size-4" />} label="Designer" value={displayCourse.designer} />
              <DetailRow icon={<CircleDollarSign className="size-4" />} label="Cost" value={displayCourse.isFree} />
              <DetailRow icon={<Snowflake className="size-4" />} label="Winter Play" value={displayCourse.winterPlay} />
              <DetailRow icon={<Link2 className="size-4" />} label="More Info" value={displayCourse.moreInfo} isLink />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Map Image */}
      {displayCourse.mapUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course Map</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={displayCourse.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border hover:opacity-90 transition-opacity"
            >
              <img
                src={displayCourse.mapUrl}
                alt={`${displayCourse.name} course map`}
                className="w-full h-auto max-h-96 object-contain"
              />
            </a>
          </CardContent>
        </Card>
      )}

      {/* External Links */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <a
            href={fgfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            View on Frisbeegolfradat.fi
            <ExternalLink className="size-3.5" />
          </a>
          {displayCourse.moreInfo && displayCourse.moreInfo.includes('http') && (
            <a
              href={displayCourse.moreInfo.match(/https?:\/\/[^\s]+/)?.[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              Course Website
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  isLink,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}) {
  if (!value) return null;

  const displayValue = isLink && value.includes('http')
    ? value.replace(/^Radan kotisivuilta:\s*/i, '').replace(/^https?:\/\//, '').replace(/\/$/, '')
    : value;

  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{displayValue}</p>
      </div>
    </div>
  );
}

function CourseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-muted p-6">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
      </Card>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4 text-center">
              <Skeleton className="h-7 w-12 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    </div>
  );
}
