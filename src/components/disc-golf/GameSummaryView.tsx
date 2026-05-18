'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Trophy,
  ArrowLeft,
  Home,
  RotateCcw,
  Flag,
  Users,
  Target,
  Medal,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useCourseDetail } from '@/hooks/use-disc-golf';
import { getScoreName, getScoreColor, getScoreBg } from '@/lib/types';
import type { Game, Hole } from '@/lib/types';

// ==========================================
// Helpers
// ==========================================

function formatRelativeToPar(diff: number): string {
  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function getRelativeParColor(diff: number): string {
  if (diff < 0) return 'text-emerald-600 dark:text-emerald-400';
  if (diff === 0) return 'text-foreground';
  return 'text-red-500 dark:text-red-400';
}

function getRelativeParBg(diff: number): string {
  if (diff < 0) return 'bg-emerald-500/15';
  if (diff === 0) return 'bg-muted';
  return 'bg-red-500/15';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'short',
  });
}

// ==========================================
// Sub-components
// ==========================================

/** Status badge for completed / abandoned */
function StatusBadge({ status }: { status: 'completed' | 'abandoned' | 'in_progress' }) {
  if (status === 'completed') {
    return (
      <Badge className="bg-emerald-600 text-white border-emerald-600 gap-1">
        <Trophy className="size-3" />
        Päätetty
      </Badge>
    );
  }
  if (status === 'abandoned') {
    return (
      <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
        Keskeytetty
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
      Kesken
    </Badge>
  );
}

/** Ranking row for a player */
function RankingRow({
  rank,
  playerName,
  totalThrows,
  diffFromPar,
  isWinner,
  index,
}: {
  rank: number;
  playerName: string;
  totalThrows: number;
  diffFromPar: number;
  isWinner: boolean;
  index: number;
}) {
  const relativeStr = formatRelativeToPar(diffFromPar);

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isWinner
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
          : 'bg-card hover:bg-accent/50 border-border'
      }`}
    >
      {/* Rank / Trophy */}
      <div className="shrink-0 flex items-center justify-center">
        {isWinner ? (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
            className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center"
          >
            <Trophy className="size-5 text-amber-600 dark:text-amber-400" />
          </motion.div>
        ) : (
          <div className="size-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-sm font-bold text-muted-foreground">{rank}</span>
          </div>
        )}
      </div>

      {/* Player name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
            {playerName.charAt(0).toUpperCase()}
          </div>
          <span className={`font-medium text-sm truncate ${isWinner ? 'text-amber-700 dark:text-amber-300' : ''}`}>
            {playerName}
          </span>
          {isWinner && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Voittaja!
            </span>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold tabular-nums">{totalThrows}</span>
        <Badge
          variant="secondary"
          className={`text-xs font-bold ${
            diffFromPar < 0
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
              : diffFromPar === 0
              ? 'bg-muted text-foreground'
              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
          }`}
        >
          {relativeStr}
        </Badge>
      </div>
    </motion.div>
  );
}

/** Stats card for a single player */
function PlayerStatsCard({
  playerName,
  totalThrows,
  totalPar,
  diffFromPar,
  index,
}: {
  playerName: string;
  totalThrows: number;
  totalPar: number;
  diffFromPar: number;
  index: number;
}) {
  const relativeStr = formatRelativeToPar(diffFromPar);
  const diffColor = getRelativeParColor(diffFromPar);
  const diffBg = getRelativeParBg(diffFromPar);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 + index * 0.08 }}
    >
      <Card className="overflow-hidden h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="flex items-center justify-center size-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
              {playerName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{playerName}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Total throws */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="size-3.5" />
              <span className="text-xs">Heitot</span>
            </div>
            <span className="text-lg font-bold tabular-nums">{totalThrows}</span>
          </div>

          {/* Total par */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Flag className="size-3.5" />
              <span className="text-xs">Par</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{totalPar}</span>
          </div>

          <Separator />

          {/* Diff from par */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Medal className="size-3.5" />
              <span className="text-xs">Suhteessa pariin</span>
            </div>
            <Badge
              className={`text-sm font-bold ${diffBg} ${diffColor} border-0`}
            >
              {relativeStr}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function GameSummaryView() {
  const game = useAppStore((s) => s.selectedGame);
  const navigateHome = useAppStore((s) => s.navigateHome);
  const navigateToNewGame = useAppStore((s) => s.navigateToNewGame);
  const setSelectedCourse = useAppStore((s) => s.setSelectedCourse);

  const { data: courseDetail } = useCourseDetail(game?.courseSlug ?? null);

  // Hole details from course
  const holeDetails: Hole[] = courseDetail?.holeDetails ?? [];

  // Compute per-player summaries sorted by total throws ascending
  const playerSummaries = useMemo(() => {
    if (!game) return [];

    const summaries = game.players.map((player) => {
      let totalThrows = 0;
      let totalPar = 0;

      const holeScores: {
        holeNumber: number;
        throws: number;
        par: number | null;
        diff: number;
      }[] = [];

      for (let h = 1; h <= game.totalHoles; h++) {
        const score = game.scores.find(
          (s) => s.playerId === player.id && s.holeNumber === h
        );

        const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
        const par = score?.par ?? holeDetail?.par ?? null;
        const throws = score?.throws ?? 0;

        const diff = par !== null ? throws - par : 0;
        totalThrows += throws;
        if (par !== null) totalPar += par;

        holeScores.push({ holeNumber: h, throws, par, diff });
      }

      return {
        player,
        playerName: player.displayName || player.username,
        totalThrows,
        totalPar,
        diffFromPar: totalPar > 0 ? totalThrows - totalPar : 0,
        holeScores,
      };
    });

    // Sort by total throws ascending (winner first)
    summaries.sort((a, b) => a.totalThrows - b.totalThrows);

    return summaries;
  }, [game, holeDetails]);

  // Build hole par list for the header row
  const holePars = useMemo(() => {
    if (!game) return [];
    const pars: { holeNumber: number; par: number | null; name: string | null; thumbUrl: string | null }[] = [];
    for (let h = 1; h <= game.totalHoles; h++) {
      const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
      // Also check if any score has a par value for this hole
      const scorePar = game.scores.find((s) => s.holeNumber === h)?.par ?? null;
      pars.push({
        holeNumber: h,
        par: holeDetail?.par ?? scorePar,
        name: holeDetail?.name ?? null,
        thumbUrl: holeDetail?.thumbUrl ?? null,
      });
    }
    return pars;
  }, [game, holeDetails]);

  // Course total par
  const courseTotalPar = useMemo(() => {
    return holePars.reduce((sum, h) => sum + (h.par ?? 0), 0);
  }, [holePars]);

  // No game state
  if (!game) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 text-center space-y-4"
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <Trophy className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Ei peliä valittuna</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Valitse peli nähdäksesi tulosten yhteenveton.
          </p>
        </div>
        <Button variant="outline" onClick={navigateHome}>
          <Home className="size-4 mr-2" />
          Etusivulle
        </Button>
      </motion.div>
    );
  }

  const isCompleted = game.status === 'completed';
  const isAbandoned = game.status === 'abandoned';
  const completedDate = game.completedAt ?? game.startedAt;

  // Handle "play again" - navigate to new game with same course
  const handlePlayAgain = () => {
    if (courseDetail) {
      setSelectedCourse(courseDetail);
    }
    navigateToNewGame(courseDetail ?? undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-24"
    >
      {/* ==========================================
          1. Header
          ========================================== */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {game.courseName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              <span className="truncate">{formatDate(completedDate)}</span>
            </div>
          </div>
          <StatusBadge status={game.status} />
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{game.totalHoles} väylää</span>
          </div>
          {courseTotalPar > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                Par <strong className="text-foreground">{courseTotalPar}</strong>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{game.players.length} pelaaja{game.players.length !== 1 ? 'a' : ''}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* ==========================================
          2. Player Rankings
          ========================================== */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Medal className="size-4 text-emerald-600 dark:text-emerald-400" />
          Sijoitus
        </h2>
        <div className="space-y-2">
          {playerSummaries.map((summary, index) => (
            <RankingRow
              key={summary.player.id}
              rank={index + 1}
              playerName={summary.playerName}
              totalThrows={summary.totalThrows}
              diffFromPar={summary.diffFromPar}
              isWinner={index === 0 && isCompleted}
              index={index}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* ==========================================
          3. Detailed Scorecard
          ========================================== */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
          Tuloskortti
        </h2>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max text-sm">
                {/* Hole number header */}
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 backdrop-blur-sm text-left px-3 py-2 font-semibold text-xs text-muted-foreground min-w-[5rem]">
                      Pelaaja
                    </th>
                    {holePars.map((hole) => (
                      <th
                        key={hole.holeNumber}
                        className="px-2 py-2 text-center font-semibold text-xs min-w-[3rem]"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          {/* Hole thumbnail */}
                          {hole.thumbUrl ? (
                            <img
                              src={hole.thumbUrl}
                              alt={`Väylä ${hole.holeNumber}`}
                              className="size-6 rounded object-cover mb-0.5"
                              loading="lazy"
                            />
                          ) : null}
                          <span className="text-foreground">{hole.holeNumber}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {hole.par !== null ? `(${hole.par})` : '—'}
                          </span>
                        </div>
                      </th>
                    ))}
                    {/* Total column */}
                    <th className="px-3 py-2 text-center font-bold text-xs border-l min-w-[3.5rem]">
                      Yht
                    </th>
                    <th className="px-3 py-2 text-center font-bold text-xs min-w-[3rem]">
                      +/-
                    </th>
                  </tr>

                  {/* Par row */}
                  <tr className="border-b">
                    <td className="sticky left-0 z-10 bg-card backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      Par
                    </td>
                    {holePars.map((hole) => (
                      <td
                        key={hole.holeNumber}
                        className="px-2 py-1.5 text-center text-xs font-semibold text-muted-foreground"
                      >
                        {hole.par ?? '—'}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center text-xs font-bold text-muted-foreground border-l">
                      {courseTotalPar || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs font-bold text-muted-foreground">
                      —
                    </td>
                  </tr>
                </thead>

                {/* Player rows */}
                <tbody>
                  {playerSummaries.map((summary, playerIndex) => (
                    <motion.tr
                      key={summary.player.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: playerIndex * 0.05 }}
                      className={`border-b last:border-b-0 ${
                        playerIndex === 0 && isCompleted
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      {/* Player name (sticky) */}
                      <td className="sticky left-0 z-10 bg-card backdrop-blur-sm px-3 py-2 text-left">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {playerIndex === 0 && isCompleted && (
                            <Trophy className="size-3 text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-medium truncate max-w-[4.5rem]">
                            {summary.playerName}
                          </span>
                        </div>
                      </td>

                      {/* Per-hole scores */}
                      {summary.holeScores.map((holeScore) => {
                        const scoreColor = holeScore.par !== null
                          ? getScoreColor(holeScore.throws, holeScore.par)
                          : '';
                        const scoreBg = holeScore.par !== null
                          ? getScoreBg(holeScore.throws, holeScore.par)
                          : '';
                        const scoreName = holeScore.par !== null
                          ? getScoreName(holeScore.throws, holeScore.par)
                          : '';

                        return (
                          <td
                            key={holeScore.holeNumber}
                            className={`px-2 py-2 text-center ${scoreBg}`}
                          >
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-semibold tabular-nums ${scoreColor}`}>
                                {holeScore.throws || '—'}
                              </span>
                              {scoreName && holeScore.par !== null && holeScore.throws !== holeScore.par && (
                                <span className={`text-[9px] leading-tight font-medium ${scoreColor}`}>
                                  {scoreName}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total throws */}
                      <td className="px-3 py-2 text-center border-l">
                        <span className="text-sm font-bold tabular-nums">
                          {summary.totalThrows}
                        </span>
                      </td>

                      {/* Diff from par */}
                      <td className="px-3 py-2 text-center">
                        <span className={`text-sm font-bold tabular-nums ${getRelativeParColor(summary.diffFromPar)}`}>
                          {formatRelativeToPar(summary.diffFromPar)}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Score legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-purple-500/30" />
            <span className="text-purple-600 dark:text-purple-400">Ace</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-emerald-500/15" />
            <span className="text-emerald-600 dark:text-emerald-400">Eagle / Albatross</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-green-500/15" />
            <span className="text-green-600 dark:text-green-400">Birdie</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-muted" />
            <span>Par</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-orange-500/15" />
            <span className="text-orange-600 dark:text-orange-400">Bogey</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-red-500/15" />
            <span className="text-red-600 dark:text-red-400">Double Bogey+</span>
          </span>
        </div>
      </section>

      <Separator />

      {/* ==========================================
          4. Stats Cards
          ========================================== */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
          Tilastot
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {playerSummaries.map((summary, index) => (
            <PlayerStatsCard
              key={summary.player.id}
              playerName={summary.playerName}
              totalThrows={summary.totalThrows}
              totalPar={summary.totalPar}
              diffFromPar={summary.diffFromPar}
              index={index}
            />
          ))}
        </div>
      </section>

      <Separator />

      {/* ==========================================
          5. Action Buttons
          ========================================== */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 font-semibold"
            onClick={navigateHome}
          >
            <Home className="size-4 mr-2" />
            Palaa etusivulle
          </Button>

          <Button
            className="flex-1 h-11 font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
            onClick={handlePlayAgain}
          >
            <RotateCcw className="size-4 mr-2" />
            Pelaa uudelleen
          </Button>
        </div>
      </section>

      {/* Game metadata footer */}
      <div className="text-center text-xs text-muted-foreground pt-2 pb-4 space-y-1">
        <p>
          Peli ID: {game.id.slice(0, 8)}… · Aloittu: {formatDateShort(game.startedAt)}
          {game.completedAt && (
            <> · Päätetty: {formatDateShort(game.completedAt)}</>
          )}
        </p>
      </div>
    </motion.div>
  );
}
