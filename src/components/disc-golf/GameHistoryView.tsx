'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Trophy,
  Clock,
  XCircle,
  Play,
  Users,
  Calendar,
  ChevronRight,
  Gamepad2,
  Filter,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useGames, useLeaveGame } from '@/hooks/use-disc-golf';
import type { Game, GameStatus } from '@/lib/types';

// ==========================================
// Helpers
// ==========================================

function formatDateFinnish(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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

/** Calculate the creator's total throws and diff from par for a completed game */
function getCreatorScore(game: Game): { totalThrows: number; diffFromPar: number } | null {
  if (game.status !== 'completed') return null;

  const creatorPlayer = game.players.find((p) => p.userId === game.createdBy);
  if (!creatorPlayer) return null;

  const playerScores = game.scores.filter((s) => s.playerId === creatorPlayer.id);
  if (playerScores.length === 0) return null;

  const totalThrows = playerScores.reduce((sum, s) => sum + s.throws, 0);
  const diffFromPar = game.totalPar > 0 ? totalThrows - game.totalPar : 0;

  return { totalThrows, diffFromPar };
}

function getPlayerDisplayName(player: { displayName: string | null; username: string }): string {
  return player.displayName || player.username;
}

function getPlayerInitial(player: { displayName: string | null; username: string }): string {
  const name = getPlayerDisplayName(player);
  return name.charAt(0).toUpperCase();
}

// ==========================================
// Status Badge
// ==========================================

function StatusBadge({ status }: { status: GameStatus }) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-emerald-600 text-white border-emerald-600 gap-1">
          <Trophy className="size-3" />
          Valmis
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1">
          <Play className="size-3" />
          Kesken
        </Badge>
      );
    case 'abandoned':
      return (
        <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 gap-1">
          <XCircle className="size-3" />
          Keskeytetty
        </Badge>
      );
  }
}

// ==========================================
// Status Icon for empty states
// ==========================================

function StatusIcon({ status }: { status: GameStatus | 'all' }) {
  switch (status) {
    case 'completed':
      return <Trophy className="size-10 text-emerald-400" />;
    case 'in_progress':
      return <Clock className="size-10 text-amber-400" />;
    case 'abandoned':
      return <XCircle className="size-10 text-red-400" />;
    default:
      return <Gamepad2 className="size-10 text-emerald-400" />;
  }
}

function getStatusLabel(status: GameStatus | 'all'): string {
  switch (status) {
    case 'completed':
      return 'valmiita';
    case 'in_progress':
      return 'kesken olevia';
    case 'abandoned':
      return 'keskeytettyjä';
    default:
      return '';
  }
}

// ==========================================
// Game Card Skeleton
// ==========================================

function GameCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="size-7 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/3" />
      </CardContent>
    </Card>
  );
}

// ==========================================
// Game Card
// ==========================================

function GameCard({
  game,
  onClick,
  onContinue,
  onRemove,
  index,
}: {
  game: Game;
  onClick: () => void;
  onContinue: () => void;
  onRemove: () => void;
  index: number;
}) {
  const creatorScore = getCreatorScore(game);
  const displayDate = game.completedAt ?? game.startedAt;

  const visiblePlayers = game.players.slice(0, 3);
  const extraPlayersCount = game.players.length - 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      layout
    >
      <Card
        className="overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200 group"
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          {/* Top row: Course name + Status badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5 min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base leading-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {game.courseName}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="size-3 shrink-0" />
                <span className="truncate">{formatDateShort(displayDate)}</span>
              </div>
            </div>
            <StatusBadge status={game.status} />
          </div>

          {/* Player avatars row */}
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center -space-x-2">
              {visiblePlayers.map((player) => (
                <Avatar key={player.id} className="size-7 border-2 border-background">
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                    {getPlayerInitial(player)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {extraPlayersCount > 0 && (
              <span className="text-xs text-muted-foreground ml-1.5">
                +{extraPlayersCount} lisää
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {game.players.length} pelaaja{game.players.length !== 1 ? 'a' : ''}
            </span>
          </div>

          {/* Score summary for completed games */}
          {creatorScore && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <Trophy className="size-3.5 text-emerald-500 shrink-0" />
              <span className="text-sm font-semibold tabular-nums">
                {creatorScore.totalThrows} heittoa
              </span>
              <Badge
                variant="secondary"
                className={`text-xs font-bold px-1.5 py-0 ${getDiffBg(creatorScore.diffFromPar)}`}
              >
                {formatDiffFromPar(creatorScore.diffFromPar)}
              </Badge>
            </div>
          )}

          {/* In-progress indicator + Continue button */}
          {game.status === 'in_progress' && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <Play className="size-3.5 text-amber-500 shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                {
                  game.scores.length > 0
                    ? `${Math.round((game.scores.filter((s) => s.playerId === game.players.find((p) => p.userId === game.createdBy)?.id).length / game.totalHoles) * 100)}% pelattu`
                    : 'Ei vielä heittoja'
                }
              </span>
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white gap-1 px-2"
                onClick={(e) => { e.stopPropagation(); onContinue(); }}
              >
                <Play className="size-3" />
                Jatka
              </Button>
            </div>
          )}

          {/* Abandoned indicator + Continue button */}
          {game.status === 'abandoned' && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <XCircle className="size-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">
                Keskeytetty {formatDateFinnish(game.completedAt ?? game.startedAt)}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                onClick={(e) => { e.stopPropagation(); onContinue(); }}
              >
                <Play className="size-3" />
                Jatka
              </Button>
            </div>
          )}

          {/* Remove button + Chevron */}
          <div className="flex items-center justify-between -mt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1 px-2"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <Trash2 className="size-3" />
              Poista
            </Button>
            <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Empty State
// ==========================================

function EmptyState({
  status,
  isFiltered,
}: {
  status: GameStatus | 'all';
  isFiltered: boolean;
}) {
  if (!isFiltered) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 text-center space-y-4"
      >
        <div className="size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Gamepad2 className="size-10 text-emerald-500 dark:text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Ei pelejä vielä</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Aloita uusi peli nähdäksesi tuloksesi täällä.
          </p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
          onClick={() => useAppStore.getState().navigateToCourses()}
        >
          Selaa ratoja
        </Button>
      </motion.div>
    );
  }

  const label = getStatusLabel(status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-12 text-center space-y-3"
    >
      <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
        <StatusIcon status={status} />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">Ei {label} pelejä</h3>
        <p className="text-sm text-muted-foreground">
          {status === 'completed' && 'Viimeistele peli nähdäksesi sen täällä.'}
          {status === 'in_progress' && 'Kesken olevat pelit näkyvät täällä.'}
          {status === 'abandoned' && 'Keskeytetyt pelit näkyvät täällä.'}
        </p>
      </div>
    </motion.div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function GameHistoryView() {
  const goBack = useAppStore((s) => s.goBack);
  const navigateToGameDetail = useAppStore((s) => s.navigateToGameDetail);
  const navigateToActiveGame = useAppStore((s) => s.navigateToActiveGame);
  const setActiveGame = useAppStore((s) => s.setActiveGame);
  const navigateHome = useAppStore((s) => s.navigateHome);

  const { data, isLoading, isError, error } = useGames();
  const leaveGameMutation = useLeaveGame();

  const games = useMemo(() => data?.games ?? [], [data]);

  const completedGames = useMemo(
    () => games.filter((g) => g.status === 'completed'),
    [games]
  );

  const inProgressGames = useMemo(
    () => games.filter((g) => g.status === 'in_progress'),
    [games]
  );

  const abandonedGames = useMemo(
    () => games.filter((g) => g.status === 'abandoned'),
    [games]
  );

  const handleGameClick = (game: Game) => {
    navigateToGameDetail(game);
  };

  const handleContinueGame = (game: Game) => {
    setActiveGame(game);
    navigateToActiveGame(game);
  };

  const handleRemoveGame = async (game: Game) => {
    try {
      await leaveGameMutation.mutateAsync({ gameId: game.id });
    } catch (err) {
      console.error('Failed to remove game:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ==========================================
          1. Header
          ========================================== */}
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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Pelihistoria
          </h1>
          <p className="text-sm text-muted-foreground">
            Kaikki pelisi yhdessä näkymässä
          </p>
        </div>
        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
          <Filter className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* ==========================================
          2. Stats Summary Bar
          ========================================== */}
      {!isLoading && games.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30">
            <Trophy className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {completedGames.length}
            </span>
            <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wide">
              Valmis
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30">
            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              {inProgressGames.length}
            </span>
            <span className="text-[10px] font-medium text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">
              Kesken
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30">
            <XCircle className="size-4 text-red-500 dark:text-red-400" />
            <span className="text-lg font-bold text-red-600 dark:text-red-300 tabular-nums">
              {abandonedGames.length}
            </span>
            <span className="text-[10px] font-medium text-red-500/70 dark:text-red-400/70 uppercase tracking-wide">
              Keskeytetty
            </span>
          </div>
        </motion.div>
      )}

      {/* ==========================================
          3. Filter Tabs + Game List
          ========================================== */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all" className="gap-1.5 flex-1 sm:flex-initial">
            <Gamepad2 className="size-3.5" />
            <span>Kaikki</span>
            {games.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {games.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 flex-1 sm:flex-initial">
            <Trophy className="size-3.5" />
            <span>Valmis</span>
            {completedGames.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {completedGames.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-1.5 flex-1 sm:flex-initial">
            <Clock className="size-3.5" />
            <span>Kesken</span>
            {inProgressGames.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {inProgressGames.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="gap-1.5 flex-1 sm:flex-initial">
            <XCircle className="size-3.5" />
            <span>Keskeytetty</span>
            {abandonedGames.length > 0 && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {abandonedGames.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Games */}
        <TabsContent value="all">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="size-8 text-red-500" />
              </div>
              <p className="font-medium text-destructive">Pelien lataaminen epäonnistui</p>
              <p className="text-sm text-muted-foreground">
                {error?.message ?? 'Jokin meni pieleen. Yritä uudelleen.'}
              </p>
            </div>
          ) : games.length === 0 ? (
            <EmptyState status="all" isFiltered={false} />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {games.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleGameClick(game)}
                    onContinue={() => handleContinueGame(game)}
                    onRemove={() => handleRemoveGame(game)}
                    index={index}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Completed Games */}
        <TabsContent value="completed">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : completedGames.length === 0 ? (
            <EmptyState status="completed" isFiltered />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {completedGames.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleGameClick(game)}
                    onContinue={() => handleContinueGame(game)}
                    onRemove={() => handleRemoveGame(game)}
                    index={index}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>

        {/* In Progress Games */}
        <TabsContent value="in_progress">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : inProgressGames.length === 0 ? (
            <EmptyState status="in_progress" isFiltered />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {inProgressGames.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleGameClick(game)}
                    onContinue={() => handleContinueGame(game)}
                    onRemove={() => handleRemoveGame(game)}
                    index={index}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Abandoned Games */}
        <TabsContent value="abandoned">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : abandonedGames.length === 0 ? (
            <EmptyState status="abandoned" isFiltered />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {abandonedGames.map((game, index) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClick={() => handleGameClick(game)}
                    onContinue={() => handleContinueGame(game)}
                    onRemove={() => handleRemoveGame(game)}
                    index={index}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
