'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Trophy,
  Backpack,
  Calendar,
  Flag,
  Users,
  Package,
  AtSign,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import {
  useOtherUserProfile,
  useOtherUserGames,
  useOtherUserBag,
} from '@/hooks/use-disc-golf';
import {
  getDiscCategoryLabel,
  getDiscStabilityLabel,
} from '@/lib/types';
import type { BagDisc } from '@/lib/types';

// Category color mappings (same as BagView)
const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  putter: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  midrange: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  fairway: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  distance: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

const STABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  overstable: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
  stable: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  understable: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
};

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDiffFromPar(diff: number): string {
  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function getDiffBg(diff: number): string {
  if (diff < 0) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400';
  if (diff === 0) return 'bg-muted text-muted-foreground';
  return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
}

// Mini disc card for player profile bag view
function MiniDiscCard({ disc }: { disc: BagDisc }) {
  const colors = CATEGORY_COLORS[disc.category || 'midrange'] || CATEGORY_COLORS.midrange;
  const stabilityColors = disc.stability ? STABILITY_COLORS[disc.stability] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <Card>
        <CardContent className="p-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
              {disc.pic ? (
                <img src={disc.pic} alt={disc.discName} className="size-6 rounded object-contain" />
              ) : (
                <Package className={`size-3.5 ${colors.text}`} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{disc.discName}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{disc.brand || '?'}</span>
                <span className="font-mono">
                  {disc.speed ?? '?'}/{disc.glide ?? '?'}/{disc.turn ?? '?'}/{disc.fade ?? '?'}
                </span>
              </div>
            </div>
            {disc.stability && stabilityColors && (
              <Badge variant="secondary" className={`${stabilityColors.bg} ${stabilityColors.text} text-[9px] px-1 py-0`}>
                {getDiscStabilityLabel(disc.stability)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PlayerProfileView() {
  const selectedUserId = useAppStore((s) => s.selectedUserId);
  const goBack = useAppStore((s) => s.goBack);

  const { data: profileData, isLoading: profileLoading } = useOtherUserProfile(selectedUserId);
  const { data: gamesData, isLoading: gamesLoading } = useOtherUserGames(selectedUserId);
  const { data: bagData, isLoading: bagLoading } = useOtherUserBag(selectedUserId);

  const profile = profileData?.profile;
  const games = gamesData?.games ?? [];
  const discs = bagData?.discs ?? [];

  // Group discs by category
  const discsByCategory = useMemo(() => {
    const groups: Record<string, BagDisc[]> = {};
    for (const d of discs) {
      const cat = d.category || 'midrange';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(d);
    }
    // Sort: putter, midrange, fairway, distance
    const order = ['putter', 'midrange', 'fairway', 'distance'];
    return order
      .filter((cat) => groups[cat])
      .map((cat) => ({ category: cat, discs: groups[cat] }));
  }, [discs]);

  const initials = profile
    ? (profile.displayName || profile.username)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Käyttäjää ei löytynyt</h2>
          <p className="text-sm text-muted-foreground">Profiilia ei ole olemassa tai se on yksityinen.</p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4 mr-2" />
          Takaisin
        </Button>
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
      {/* Header */}
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
          <h1 className="text-xl font-bold tracking-tight truncate">
            {profile.displayName || profile.username}
          </h1>
          <div className="flex items-center gap-1 mt-0.5">
            <AtSign className="size-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{profile.username}</span>
          </div>
        </div>
      </div>

      {/* Profile card */}
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700" />
        <CardContent className="p-4 -mt-8">
          <div className="flex items-end gap-3">
            <Avatar className="size-16 border-4 border-background shadow-lg">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName || profile.username} />
              ) : null}
              <AvatarFallback className="text-base font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="font-semibold text-lg truncate">
                {profile.displayName || profile.username}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                <span>Liittynyt {new Date(profile.createdAt).toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto">
              <Trophy className="size-3.5" />
            </div>
            <p className="text-xl font-bold">{profile.gameCount}</p>
            <p className="text-[10px] text-muted-foreground">Pelit</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto">
              <Flag className="size-3.5" />
            </div>
            <p className="text-xl font-bold">{profile.completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Valmiit</p>
          </CardContent>
        </Card>

        <Card className="py-3">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto">
              <Backpack className="size-3.5" />
            </div>
            <p className="text-xl font-bold">{profile.bagDiscCount}</p>
            <p className="text-[10px] text-muted-foreground">Kiekot</p>
          </CardContent>
        </Card>
      </div>

      {/* Bag Section */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Backpack className="size-3.5" />
            Kiekot ({discs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {bagLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-emerald-600" />
            </div>
          ) : discs.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">Ei kiekkoja laukussa</p>
            </div>
          ) : (
            <div className="space-y-3">
              {discsByCategory.map(({ category, discs: catDiscs }) => {
                const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.midrange;
                return (
                  <div key={category}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`inline-block size-2 rounded-full ${colors.dot}`} />
                      <span className="text-xs font-medium">{getDiscCategoryLabel(category)}</span>
                      <span className="text-[10px] text-muted-foreground">({catDiscs.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {catDiscs.map((disc) => (
                        <MiniDiscCard key={disc.id} disc={disc} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Games Section */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Trophy className="size-3.5" />
            Pelihistoria
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {gamesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-emerald-600" />
            </div>
          ) : games.length === 0 ? (
            <div className="py-8 text-center">
              <Trophy className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">Ei valmiita pelejä</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {games.map((game, index) => {
                  const playerScore = (() => {
                    const player = game.players.find((p) => p.userId === profile.id);
                    if (!player) return null;
                    const playerScores = game.scores.filter((s) => s.playerId === player.id);
                    if (playerScores.length === 0) return null;
                    const totalThrows = playerScores.reduce((sum, s) => sum + s.throws, 0);
                    const diff = game.totalPar > 0 ? totalThrows - game.totalPar : 0;
                    return { totalThrows, diff };
                  })();

                  return (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: index * 0.03 }}
                    >
                      <Card>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{game.courseName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Calendar className="size-3 shrink-0" />
                                <span>{formatDateShort(game.completedAt ?? game.startedAt)}</span>
                                <span>·</span>
                                <Users className="size-3 shrink-0" />
                                <span>{game.players.length} pelaaja{game.players.length !== 1 ? 'a' : ''}</span>
                              </div>
                            </div>
                            {playerScore && (
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold tabular-nums">{playerScore.totalThrows}</p>
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] font-bold px-1.5 py-0 ${getDiffBg(playerScore.diff)}`}
                                >
                                  {formatDiffFromPar(playerScore.diff)}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
