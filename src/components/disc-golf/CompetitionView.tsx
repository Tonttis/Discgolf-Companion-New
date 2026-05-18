'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Trophy, MessageSquare, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCompetition } from '@/hooks/use-disc-golf';
import { ScorecardTable, SubCompetitionScorecard } from './ScorecardTable';

export function CompetitionView() {
  const competitionId = useAppStore((s) => s.selectedCompetitionId);
  const { data: competition, isLoading, isError, error } = useCompetition(competitionId);

  if (isLoading) {
    return <CompetitionViewSkeleton />;
  }

  if (isError || !competition) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-destructive font-medium">Failed to load competition</p>
        <p className="text-sm text-muted-foreground">
          {error?.message ?? 'Something went wrong. Please try again.'}
        </p>
      </div>
    );
  }

  const hasSubCompetitions = competition.subCompetitions.length > 0;

  return (
    <div className="space-y-6">
      {/* Competition Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-6 text-white">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
              <Trophy className="size-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold line-clamp-2">{competition.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-amber-100 text-xs">
                {competition.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {competition.date}
                  </span>
                )}
                {competition.courseName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {competition.courseName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {(competition.comment || competition.type) && (
          <CardContent className="pt-4 space-y-3">
            {competition.type && (
              <Badge variant="secondary" className="text-xs">
                {competition.type}
              </Badge>
            )}
            {competition.comment && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="size-4 mt-0.5 shrink-0" />
                <p>{competition.comment}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Course Layout - Par values */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Course Layout</CardTitle>
          <CardDescription>
            {competition.tracks.length} holes · Par {competition.totalPar}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
            {competition.tracks.map((track) => (
              <div
                key={track.number}
                className="flex flex-col items-center min-w-[36px] p-1.5 rounded-md bg-muted"
              >
                <span className="text-[10px] text-muted-foreground">H{track.number}</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {track.par}
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center min-w-[36px] p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Total</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {competition.totalPar}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scoreboard */}
      {hasSubCompetitions ? (
        <Tabs defaultValue="main" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="main" className="shrink-0">
              Main ({competition.players.length})
            </TabsTrigger>
            {competition.subCompetitions.map((sub) => (
              <TabsTrigger key={sub.id} value={`sub-${sub.id}`} className="shrink-0">
                {sub.name} ({sub.players.length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="main" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Scoreboard</CardTitle>
                <CardDescription>
                  {competition.players.length} players · Par {competition.totalPar}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <ScorecardTable
                  tracks={competition.tracks}
                  players={competition.players}
                  totalPar={competition.totalPar}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {competition.subCompetitions.map((sub) => (
            <TabsContent key={sub.id} value={`sub-${sub.id}`} className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{sub.name}</CardTitle>
                  <CardDescription>
                    {sub.players.length} players · Par {sub.totalPar}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <ScorecardTable
                    tracks={sub.tracks}
                    players={sub.players}
                    totalPar={sub.totalPar}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
              Scoreboard
            </CardTitle>
            <CardDescription>
              {competition.players.length} players · Par {competition.totalPar}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <ScorecardTable
              tracks={competition.tracks}
              players={competition.players}
              totalPar={competition.totalPar}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompetitionViewSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-muted p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <Skeleton key={i} className="size-9 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
