'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Flag,
  Ruler,
  Trophy,
  XCircle,
  Check,
  Loader2,
  Users,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useSaveScores, useCompleteGame, useCourseDetail } from '@/hooks/use-disc-golf';
import {
  getScoreName,
  getScoreColor,
  getScoreBg,
} from '@/lib/types';
import type { Hole } from '@/lib/types';

// ==========================================
// Debounce utility
// ==========================================
function useDebouncedCallback(
  callback: () => void,
  delay: number
): () => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(), delay);
  }, [delay]);
}

// ==========================================
// Format score relative to par
// ==========================================
function formatRelativeToPar(throws: number, par: number | null): string {
  if (!par) return `${throws}`;
  const diff = throws - par;
  if (diff === 0) return 'E';
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

// ==========================================
// Swipe hook (horizontal for hole navigation)
// ==========================================
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 50) {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        if (dx > 0) onSwipeRight();
        else onSwipeLeft();
      }
    },
    [onSwipeLeft, onSwipeRight, threshold]
  );

  return { onTouchStart, onTouchEnd };
}

// ==========================================
// Player Score Row — compact +/- design
// ==========================================
function PlayerScoreRow({
  playerName,
  throws,
  par,
  onIncrease,
  onDecrease,
  isSaving,
  isSaved,
}: {
  playerName: string;
  throws: number | null;
  par: number | null;
  onIncrease: () => void;
  onDecrease: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const isScored = throws !== null;
  const scoreName = isScored ? getScoreName(throws, par) : null;
  const scoreColor = isScored ? getScoreColor(throws, par) : '';
  const relativePar = isScored && par ? formatRelativeToPar(throws, par) : null;

  return (
    <div className={`flex items-center gap-2 sm:gap-3 py-2.5 px-3 rounded-xl transition-colors ${
      isScored
        ? getScoreBg(throws!, par) || 'bg-card'
        : 'bg-muted/30'
    }`}>
      {/* Player avatar + name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
          {playerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <span className="font-medium text-sm truncate block">{playerName}</span>
          {scoreName && (
            <span className={`text-[10px] font-semibold ${scoreColor} block leading-tight`}>
              {scoreName}
            </span>
          )}
        </div>
      </div>

      {/* Score badge */}
      {relativePar && (
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 h-5 font-bold shrink-0 ${
            relativePar.startsWith('-')
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
              : relativePar === 'E'
              ? 'bg-muted text-foreground'
              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
          }`}
        >
          {relativePar}
        </Badge>
      )}

      {/* Saving / saved indicator */}
      {isSaving && <Loader2 className="size-3.5 text-muted-foreground animate-spin shrink-0" />}
      {isSaved && !isSaving && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="shrink-0"
        >
          <Check className="size-3.5 text-emerald-500" />
        </motion.div>
      )}

      {/* - button */}
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-lg shrink-0 active:scale-95 transition-transform"
        onClick={onDecrease}
        disabled={!isScored || throws <= 1}
        aria-label="Vähennä heitto"
      >
        <Minus className="size-4" />
      </Button>

      {/* Score display */}
      <div className="w-10 text-center shrink-0">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={isScored ? throws : 'empty'}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`text-xl font-bold tabular-nums ${
              !isScored ? 'text-muted-foreground' : ''
            }`}
          >
            {isScored ? throws : '—'}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* + button */}
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-lg shrink-0 active:scale-95 transition-transform"
        onClick={onIncrease}
        aria-label="Lisää heitto"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
}

// ==========================================
// Mini Scoreboard Row
// ==========================================
function ScoreboardRow({
  playerName,
  totalThrows,
  totalPar,
  holesCompleted,
  totalHoles,
}: {
  playerName: string;
  totalThrows: number;
  totalPar: number;
  holesCompleted: number;
  totalHoles: number;
}) {
  const diff = totalPar > 0 ? totalThrows - totalPar : 0;
  const relativeStr = totalPar > 0 ? formatRelativeToPar(totalThrows, totalPar) : `${totalThrows}`;

  return (
    <div className="flex items-center justify-between py-1 px-1">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
          {playerName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium truncate">{playerName}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {holesCompleted}/{totalHoles}
        </span>
        <span className="text-xs font-bold tabular-nums">{totalThrows}</span>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 h-4 font-bold ${
            diff < 0
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
              : diff === 0
              ? 'bg-muted text-foreground'
              : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
          }`}
        >
          {relativeStr}
        </Badge>
      </div>
    </div>
  );
}

// ==========================================
// Mobile Image Section with swipe-to-collapse
// ==========================================
function MobileImageSection({
  imageUrl,
  thumbUrl,
  holeNumber,
  par,
  length,
  holeName,
  isCollapsed,
  onCollapse,
  onExpand,
}: {
  imageUrl: string | null;
  thumbUrl: string | null;
  holeNumber: number;
  par: number | null;
  length: number | null;
  holeName: string | null;
  isCollapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  const hasImage = !!(imageUrl || thumbUrl);
  const imgSrc = imageUrl || thumbUrl;

  // Swipe up detection for collapsing image
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isCollapsed) return;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (dy < -40) {
        onCollapse();
      }
    },
    [isCollapsed, onCollapse]
  );

  // Collapsed state: small image bar at top
  if (isCollapsed) {
    return (
      <button
        onClick={onExpand}
        className="flex items-center gap-2 w-full px-3 py-2 bg-muted/50 rounded-xl mb-3 active:bg-muted transition-colors"
        aria-label="Laajenna kuva"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`Väylä ${holeNumber}`}
            className="size-10 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Flag className="size-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <span className="text-xs font-medium block truncate">
            Väylä {holeNumber}
            {holeName && holeName !== `Väylä ${holeNumber}` ? ` — ${holeName}` : ''}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {par !== null ? `Par ${par}` : 'Par —'}
            {length ? ` · ${length}m` : ''}
          </span>
        </div>
        <ChevronUp className="size-4 text-muted-foreground rotate-180 shrink-0" />
      </button>
    );
  }

  // Expanded state: image takes ~2/3 of screen
  return (
    <div
      className="relative mb-3 rounded-xl overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasImage && imgSrc ? (
        <a
          href={imageUrl || thumbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={imgSrc}
            alt={`Väylä ${holeNumber}`}
            className="w-full h-[45vh] sm:h-[50vh] object-contain bg-gray-100 dark:bg-gray-900"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="w-full h-[45vh] sm:h-[50vh] bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 flex flex-col items-center justify-center">
          <Flag className="size-12 text-emerald-300 dark:text-emerald-700 mb-3" />
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            Väylä {holeNumber}
          </span>
        </div>
      )}

      {/* Hole info overlay at bottom of image */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 pt-8">
        <div className="flex items-center gap-3">
          {par !== null ? (
            <div className="flex items-center gap-1.5 text-white">
              <Flag className="size-4" />
              <span className="text-sm font-semibold">Par {par}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-white/70">
              <Flag className="size-4" />
              <span className="text-sm">Par —</span>
            </div>
          )}
          {length ? (
            <div className="flex items-center gap-1.5 text-white/80">
              <Ruler className="size-3.5" />
              <span className="text-sm">{length} m</span>
            </div>
          ) : null}
          {holeName && holeName !== `Väylä ${holeNumber}` && (
            <span className="text-sm text-white/70 truncate">{holeName}</span>
          )}
        </div>
      </div>

      {/* Swipe up indicator */}
      <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
        <ChevronUp className="size-3.5 text-white/80" />
        <span className="text-[10px] text-white/80">Pienennä</span>
      </div>
    </div>
  );
}

// ==========================================
// Desktop Image Section — left panel
// ==========================================
function DesktopImageSection({
  imageUrl,
  thumbUrl,
  holeNumber,
  par,
  length,
  holeName,
}: {
  imageUrl: string | null;
  thumbUrl: string | null;
  holeNumber: number;
  par: number | null;
  length: number | null;
  holeName: string | null;
}) {
  const hasImage = !!(imageUrl || thumbUrl);
  const imgSrc = imageUrl || thumbUrl;

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="relative rounded-xl overflow-hidden flex-1 min-h-[400px]">
        {hasImage && imgSrc ? (
          <a
            href={imageUrl || thumbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-full"
          >
            <img
              src={imgSrc}
              alt={`Väylä ${holeNumber}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </a>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 flex flex-col items-center justify-center min-h-[400px]">
            <Flag className="size-16 text-emerald-300 dark:text-emerald-700 mb-4" />
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Väylä {holeNumber}
            </span>
            {holeName && holeName !== `Väylä ${holeNumber}` && (
              <span className="text-sm text-emerald-500 dark:text-emerald-500 mt-1">{holeName}</span>
            )}
          </div>
        )}

        {/* Hole info overlay at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-4 pt-10">
          <div className="flex items-center gap-3 flex-wrap">
            {par !== null ? (
              <div className="flex items-center gap-1.5 text-white">
                <Flag className="size-4" />
                <span className="text-sm font-semibold">Par {par}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-white/70">
                <Flag className="size-4" />
                <span className="text-sm">Par —</span>
              </div>
            )}
            {length ? (
              <div className="flex items-center gap-1.5 text-white/80">
                <Ruler className="size-3.5" />
                <span className="text-sm">{length} m</span>
              </div>
            ) : null}
            {holeName && holeName !== `Väylä ${holeNumber}` && (
              <span className="text-sm text-white/70 truncate">{holeName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main ActiveGameView Component
// ==========================================
export function ActiveGameView() {
  const activeGame = useAppStore((s) => s.activeGame);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setSelectedGame = useAppStore((s) => s.setSelectedGame);
  const setActiveGame = useAppStore((s) => s.setActiveGame);
  const goBack = useAppStore((s) => s.goBack);

  const saveScoresMutation = useSaveScores();
  const completeGameMutation = useCompleteGame();

  // Fetch course details for hole info (par, length, images)
  const { data: courseDetail } = useCourseDetail(activeGame?.courseSlug ?? null);

  // Current hole number (1-based)
  const [currentHole, setCurrentHole] = useState(1);

  // Mobile image collapsed state
  const [imageCollapsed, setImageCollapsed] = useState(false);

  // Reset image collapse when hole changes
  useEffect(() => {
    setImageCollapsed(false);
  }, [currentHole]);

  // Local throw state: Map<`${playerId}-${holeNumber}`, throws>
  const [localThrows, setLocalThrows] = useState<Record<string, number | null>>({});

  // Track which scores are being saved / have been saved
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  // Pending saves queue
  const pendingSavesRef = useRef<Map<string, { playerId: string; holeNumber: number; throws: number; par: number | null }>>(new Map());

  // Initialize local throws from game scores
  useEffect(() => {
    if (!activeGame) return;
    const throwsMap: Record<string, number | null> = {};
    for (const score of activeGame.scores) {
      throwsMap[`${score.playerId}-${score.holeNumber}`] = score.throws;
    }
    setLocalThrows(throwsMap);
  }, [activeGame?.scores?.length]);

  const game = activeGame;
  const totalHoles = game?.totalHoles ?? 0;
  const players = game?.players ?? [];
  // Hole details from course
  const holeDetails: Hole[] = courseDetail?.holeDetails ?? [];
  const currentHoleDetail = holeDetails.find((h) => h.holeNumber === currentHole);
  const currentHolePar = currentHoleDetail?.par ?? null;
  const hasImage = !!(currentHoleDetail?.imageUrl || currentHoleDetail?.thumbUrl);

  // Get throw count for a player on a hole — returns null if unscored
  const getThrows = useCallback((playerId: string, holeNumber: number): number | null => {
    const key = `${playerId}-${holeNumber}`;
    if (key in localThrows) return localThrows[key];
    const score = game?.scores.find(
      (s) => s.playerId === playerId && s.holeNumber === holeNumber
    );
    if (score) return score.throws;
    return null;
  }, [localThrows, game?.scores]);

  // Compute total scores for each player
  const playerTotals = useMemo(() => {
    if (!game) return [];
    return players.map((player) => {
      let totalThrows = 0;
      let totalPar = 0;
      let holesCompleted = 0;
      for (let h = 1; h <= totalHoles; h++) {
        const key = `${player.id}-${h}`;
        const throws = localThrows[key];
        if (throws !== undefined && throws !== null) {
          totalThrows += throws;
          holesCompleted++;
          const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
          if (holeDetail?.par) totalPar += holeDetail.par;
        } else {
          const score = game.scores.find(
            (s) => s.playerId === player.id && s.holeNumber === h
          );
          if (score) {
            totalThrows += score.throws;
            holesCompleted++;
            if (score.par) totalPar += score.par;
          }
        }
      }
      return { player, totalThrows, totalPar, holesCompleted };
    });
  }, [game, players, totalHoles, localThrows, holeDetails]);

  // Check if all holes are scored
  const allHolesScored = useMemo(() => {
    if (!game) return false;
    for (const player of players) {
      for (let h = 1; h <= totalHoles; h++) {
        const key = `${player.id}-${h}`;
        const localVal = localThrows[key];
        if (localVal === undefined || localVal === null) {
          const score = game.scores.find(
            (s) => s.playerId === player.id && s.holeNumber === h
          );
          if (!score) return false;
        }
      }
    }
    return true;
  }, [game, players, totalHoles, localThrows]);

  // Save scores function
  const saveScores = useCallback(
    async (scoresToSave: { playerId: string; holeNumber: number; throws: number; par: number | null }[]) => {
      if (scoresToSave.length === 0 || !game) return;
      const keys = scoresToSave.map((s) => `${s.playerId}-${s.holeNumber}`);
      setSavingKeys((prev) => new Set([...prev, ...keys]));
      setSavedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
      try {
        await saveScoresMutation.mutateAsync({
          gameId: game.id,
          scores: scoresToSave,
        });
        setSavedKeys((prev) => new Set([...prev, ...keys]));
        setTimeout(() => {
          setSavedKeys((prev) => {
            const next = new Set(prev);
            keys.forEach((k) => next.delete(k));
            return next;
          });
        }, 2000);
      } catch (err) {
        console.error('Failed to save scores:', err);
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          keys.forEach((k) => next.delete(k));
          return next;
        });
      }
    },
    [game, saveScoresMutation]
  );

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    useCallback(() => {
      const pendingSaves = pendingSavesRef.current;
      if (pendingSaves.size === 0) return;
      const scoresToSave = Array.from(pendingSaves.values());
      pendingSaves.clear();
      saveScores(scoresToSave);
    }, [saveScores]),
    800
  );

  // Get par for a specific hole
  const getHolePar = useCallback((holeNumber: number): number | null => {
    const holeDetail = holeDetails.find((h) => h.holeNumber === holeNumber);
    return holeDetail?.par ?? null;
  }, [holeDetails]);

  // Update throw count for a player on a hole
  const updateThrow = useCallback(
    (playerId: string, holeNumber: number, throws: number | null) => {
      if (throws !== null && throws < 1) return;
      const key = `${playerId}-${holeNumber}`;
      setLocalThrows((prev) => ({ ...prev, [key]: throws }));

      if (throws !== null) {
        const par = getHolePar(holeNumber);
        pendingSavesRef.current.set(key, { playerId, holeNumber, throws, par });
        debouncedSave();
      }
    },
    [getHolePar, debouncedSave]
  );

  // Handle first input for a player on a hole — start from par
  const handleFirstInput = useCallback(
    (playerId: string, holeNumber: number, direction: 'up' | 'down') => {
      const par = getHolePar(holeNumber) ?? 3;
      const startValue = direction === 'up' ? par : Math.max(1, par - 1);
      updateThrow(playerId, holeNumber, startValue);
    },
    [getHolePar, updateThrow]
  );

  // Hole navigation
  const goToHole = useCallback(
    (hole: number) => {
      if (hole >= 1 && hole <= totalHoles) {
        setCurrentHole(hole);
      }
    },
    [totalHoles]
  );

  const goNextHole = useCallback(() => goToHole(currentHole + 1), [currentHole, goToHole]);
  const goPrevHole = useCallback(() => goToHole(currentHole - 1), [currentHole, goToHole]);

  // Swipe handlers (horizontal only for hole nav)
  const swipeHandlers = useSwipe(goNextHole, goPrevHole);

  // Complete game handler — re-fetch full game with all scores before navigating to summary
  const handleCompleteGame = useCallback(async () => {
    if (!game) return;
    try {
      await completeGameMutation.mutateAsync({
        gameId: game.id,
        status: 'completed',
      });
      // Re-fetch the full game with all scores from the API
      const res = await fetch(`/api/games/${game.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGame(data.game);
      } else {
        setSelectedGame(game);
      }
      setActiveGame(null);
      setCurrentView('game-summary');
    } catch (err) {
      console.error('Failed to complete game:', err);
    }
  }, [game, completeGameMutation, setSelectedGame, setActiveGame, setCurrentView]);

  // Abandon game handler
  const handleAbandonGame = useCallback(async () => {
    if (!game) return;
    try {
      await completeGameMutation.mutateAsync({
        gameId: game.id,
        status: 'abandoned',
      });
      setActiveGame(null);
      goBack();
    } catch (err) {
      console.error('Failed to abandon game:', err);
    }
  }, [game, completeGameMutation, setActiveGame, goBack]);

  // Check if a specific player-hole key is being saved or saved
  const isKeySaving = (playerId: string, holeNumber: number) =>
    savingKeys.has(`${playerId}-${holeNumber}`);
  const isKeySaved = (playerId: string, holeNumber: number) =>
    savedKeys.has(`${playerId}-${holeNumber}`);

  // No game state
  if (!activeGame) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="text-5xl">🏌️</div>
        <p className="font-semibold text-lg">Ei aktiivista peliä</p>
        <p className="text-sm text-muted-foreground">Aloita uusi peli nähdäksesi tulostenkirjausnäkymän</p>
        <Button variant="outline" onClick={goBack}>
          Takaisin
        </Button>
      </div>
    );
  }

  // Hole navigation bar (shared between desktop and mobile)
  const holeNavBar = (
    <div className="space-y-2">
      {/* Course name */}
      <div className="text-center">
        <h2 className="font-semibold text-sm sm:text-base truncate">{game.courseName}</h2>
      </div>

      {/* Hole navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg shrink-0"
          onClick={goPrevHole}
          disabled={currentHole <= 1}
          aria-label="Edellinen väylä"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex-1 text-center">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentHole}
              initial={{ opacity: 0, x: currentHole > 1 ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: currentHole > 1 ? -20 : 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="text-xl sm:text-2xl font-bold">
                Väylä {currentHole}
                <span className="text-muted-foreground text-sm sm:text-base font-normal">
                  /{totalHoles}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg shrink-0"
          onClick={goNextHole}
          disabled={currentHole >= totalHoles}
          aria-label="Seuraava väylä"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Hole number dots */}
      <div className="flex items-center justify-center gap-0.5 flex-wrap">
        {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => {
          const isCurrent = hole === currentHole;
          const hasScores = players.some((p) => {
            const key = `${p.id}-${hole}`;
            const localVal = localThrows[key];
            if (localVal !== undefined && localVal !== null) return true;
            return game.scores.some(
              (s) => s.playerId === p.id && s.holeNumber === hole
            );
          });

          return (
            <button
              key={hole}
              onClick={() => goToHole(hole)}
              className={`size-5 rounded-full text-[9px] font-bold transition-all duration-200 ${
                isCurrent
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white scale-110'
                  : hasScores
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              aria-label={`Väylä ${hole}`}
            >
              {hole}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Player score list (shared between desktop and mobile)
  const playerScoreList = (
    <div className="space-y-2">
      {players.map((player) => {
        const throws = getThrows(player.id, currentHole);
        const displayName = player.displayName || player.username;
        const isScored = throws !== null;

        return (
          <PlayerScoreRow
            key={player.id}
            playerName={displayName}
            throws={throws}
            par={currentHolePar}
            onIncrease={() => {
              if (isScored) {
                updateThrow(player.id, currentHole, throws + 1);
              } else {
                handleFirstInput(player.id, currentHole, 'up');
              }
            }}
            onDecrease={() => {
              if (isScored) {
                updateThrow(player.id, currentHole, throws - 1);
              } else {
                handleFirstInput(player.id, currentHole, 'down');
              }
            }}
            isSaving={isKeySaving(player.id, currentHole)}
            isSaved={isKeySaved(player.id, currentHole)}
          />
        );
      })}
    </div>
  );

  // Bottom action bar
  const actionBar = (
    <div className="mt-4 space-y-3">
      {/* Mini scoreboard */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="size-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Tulokset</span>
        </div>
        <div className="space-y-0">
          {playerTotals.map(({ player, totalThrows, totalPar, holesCompleted }) => (
            <ScoreboardRow
              key={player.id}
              playerName={player.displayName || player.username}
              totalThrows={totalThrows}
              totalPar={totalPar}
              holesCompleted={holesCompleted}
              totalHoles={totalHoles}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {allHolesScored && (
          <Button
            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold"
            onClick={handleCompleteGame}
            disabled={completeGameMutation.isPending}
          >
            {completeGameMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Trophy className="size-4 mr-2" />
            )}
            Valmis
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 ${allHolesScored ? '' : 'flex-1'} text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30`}
            >
              <XCircle className="size-4 mr-2" />
              Keskeytä
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Keskeytä peli?</AlertDialogTitle>
              <AlertDialogDescription>
                Oletko varma, että haluat keskeyttää pelin? Tuloskirjaukset tallennetaan, mutta peli merkitään keskeytetyksi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Peruuta</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAbandonGame}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={completeGameMutation.isPending}
              >
                {completeGameMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                Keskeytä peli
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] sm:min-h-0" {...swipeHandlers}>
      {/* Hole navigation */}
      {holeNavBar}

      {/* ====================== */}
      {/* DESKTOP LAYOUT (md+) */}
      {/* ====================== */}
      <div className="hidden md:flex md:flex-1 md:gap-4 md:mt-3">
        {/* Left: Image (or par/length card if no image) */}
        {hasImage ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentHole}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <DesktopImageSection
                imageUrl={currentHoleDetail?.imageUrl ?? null}
                thumbUrl={currentHoleDetail?.thumbUrl ?? null}
                holeNumber={currentHole}
                par={currentHolePar}
                length={currentHoleDetail?.length ?? null}
                holeName={currentHoleDetail?.name ?? null}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <Card className="flex-1 min-w-0 min-h-[400px] flex items-center justify-center">
            <CardContent className="text-center space-y-3">
              <Flag className="size-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-bold">Väylä {currentHole}</p>
                {currentHoleDetail?.name && currentHoleDetail.name !== `Väylä ${currentHole}` && (
                  <p className="text-sm text-muted-foreground">{currentHoleDetail.name}</p>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                {currentHolePar !== null ? (
                  <div className="flex items-center gap-1.5">
                    <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold">Par {currentHolePar}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Par —</span>
                )}
                {currentHoleDetail?.length ? (
                  <div className="flex items-center gap-1.5">
                    <Ruler className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm">{currentHoleDetail.length} m</span>
                  </div>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Ei kuvaa saatavilla</p>
            </CardContent>
          </Card>
        )}

        {/* Right: Score input panel */}
        <div className="w-80 lg:w-96 shrink-0 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 flex flex-col flex-1">
              {/* Hole par info */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">
                    Par {currentHolePar ?? '—'}
                  </span>
                </div>
                {currentHoleDetail?.length ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ruler className="size-3.5" />
                    <span>{currentHoleDetail.length} m</span>
                  </div>
                ) : null}
              </div>

              {/* Player scores */}
              <div className="flex-1">
                {playerScoreList}
              </div>

              {/* Action bar */}
              {actionBar}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ====================== */}
      {/* MOBILE LAYOUT (< md) */}
      {/* ====================== */}
      <div className="flex flex-col flex-1 mt-3 md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHole}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {/* Image section (with swipe to collapse) */}
            {hasImage ? (
              <MobileImageSection
                imageUrl={currentHoleDetail?.imageUrl ?? null}
                thumbUrl={currentHoleDetail?.thumbUrl ?? null}
                holeNumber={currentHole}
                par={currentHolePar}
                length={currentHoleDetail?.length ?? null}
                holeName={currentHoleDetail?.name ?? null}
                isCollapsed={imageCollapsed}
                onCollapse={() => setImageCollapsed(true)}
                onExpand={() => setImageCollapsed(false)}
              />
            ) : (
              /* No image: compact par/length info */
              <Card className="mb-3">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 shrink-0">
                      <Flag className="size-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        Väylä {currentHole}
                        {currentHoleDetail?.name && currentHoleDetail.name !== `Väylä ${currentHole}` && (
                          <span className="text-muted-foreground font-normal"> — {currentHoleDetail.name}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {currentHolePar !== null ? (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Par {currentHolePar}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Par —</span>
                        )}
                        {currentHoleDetail?.length ? (
                          <span className="text-xs text-muted-foreground">
                            {currentHoleDetail.length} m
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Player scores */}
        <div className="flex-1">
          {playerScoreList}
        </div>

        {/* Action bar */}
        <div className="sticky bottom-16 left-0 right-0 z-40 -mx-4 px-4 pt-3 pb-3 bg-background/95 backdrop-blur-sm border-t">
          {actionBar}
        </div>
      </div>
    </div>
  );
}
