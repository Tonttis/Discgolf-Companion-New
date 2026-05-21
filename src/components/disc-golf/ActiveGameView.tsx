'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  ChevronUp,
  Minus,
  Plus,
  Flag,
  Ruler,
  Image as ImageIcon,
  Trophy,
  XCircle,
  Check,
  Loader2,
  Users,
  Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAppStore } from '@/store/app-store';
import { useSaveScores, useCompleteGame, useCourseDetail } from '@/hooks/use-disc-golf';
import {
  getScoreName,
  getScoreColor,
  getScoreBg,
} from '@/lib/types';
import type { Game, GamePlayer, Score, Hole } from '@/lib/types';

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

// ==========================================
// Swipe hook (left/right for hole navigation)
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
      // Only trigger if horizontal movement is dominant
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
// Swipe up hook (for image collapse on mobile)
// ==========================================
function useSwipeUp(onSwipeUp: () => void, threshold = 50) {
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    tracking.current = true;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const dy = startY.current - e.changedTouches[0].clientY;
      if (dy > threshold) {
        onSwipeUp();
      }
    },
    [onSwipeUp, threshold]
  );

  return { onTouchStart, onTouchEnd };
}

// ==========================================
// Player Score Row (inline format: Name + [score] -)
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
  throws: number;
  par: number | null;
  onIncrease: () => void;
  onDecrease: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  const scoreName = getScoreName(throws, par);
  const scoreColor = getScoreColor(throws, par);
  const scoreBg = getScoreBg(throws, par);
  const relativePar = par ? formatRelativeToPar(throws, par) : null;
  const diff = par ? throws - par : 0;

  return (
    <div className={`flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4 rounded-xl transition-colors duration-300 ${scoreBg || 'bg-card'}`}>
      {/* Player avatar + name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center justify-center size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
          {playerName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <span className="font-medium text-sm truncate block">{playerName}</span>
          {/* Score name label */}
          {scoreName && (
            <span className={`text-[10px] font-semibold ${scoreColor} leading-none`}>
              {scoreName}
            </span>
          )}
        </div>
      </div>

      {/* Score controls: + [score] - */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Minus button */}
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-xl text-lg font-bold shrink-0 active:scale-95 transition-transform"
          onClick={onDecrease}
          disabled={throws <= 1}
          aria-label="Vähennä heitto"
        >
          <Minus className="size-5" />
        </Button>

        {/* Score display */}
        <div className="flex flex-col items-center min-w-[3rem] sm:min-w-[4rem]">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={throws}
              initial={{ scale: 0.8, opacity: 0.5, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="text-2xl sm:text-3xl font-bold tabular-nums leading-none"
            >
              {throws}
            </motion.span>
          </AnimatePresence>
          <span className="text-[9px] text-muted-foreground leading-none mt-0.5">heittoa</span>
        </div>

        {/* Plus button */}
        <Button
          variant="outline"
          size="icon"
          className="size-11 rounded-xl text-lg font-bold shrink-0 active:scale-95 transition-transform"
          onClick={onIncrease}
          aria-label="Lisää heitto"
        >
          <Plus className="size-5" />
        </Button>

        {/* Relative to par badge + save indicators */}
        <div className="flex flex-col items-center gap-0.5 ml-1 min-w-[2rem]">
          {relativePar && (
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-5 font-bold ${
                diff < 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                  : diff === 0
                  ? 'bg-muted text-foreground'
                  : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
              }`}
            >
              {relativePar}
            </Badge>
          )}
          {isSaving && <Loader2 className="size-3 text-muted-foreground animate-spin" />}
          {isSaved && !isSaving && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Check className="size-3 text-emerald-500" />
            </motion.div>
          )}
        </div>
      </div>
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
    <div className="flex items-center justify-between py-1.5 px-1">
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
// Main ActiveGameView Component
// ==========================================
export function ActiveGameView() {
  const { user } = useAuth();
  const activeGame = useAppStore((s) => s.activeGame);
  const selectedCourse = useAppStore((s) => s.selectedCourse);
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

  // Local throw state: Map<`${playerId}-${holeNumber}`, throws>
  const [localThrows, setLocalThrows] = useState<Record<string, number>>({});

  // Track which scores are being saved / have been saved
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  // Image collapsed state for mobile
  const [imageCollapsed, setImageCollapsed] = useState(false);

  // Pending saves queue
  const pendingSavesRef = useRef<Map<string, { playerId: string; holeNumber: number; throws: number; par: number | null }>>(new Map());

  // Refs for auto-save effect (to avoid dependency loops)
  // Initialized with safe defaults; updated after derived variables are defined
  const localThrowsRef = useRef(localThrows);
  const gameScoresRef = useRef<Score[] | undefined>(undefined);
  const playersRef = useRef<GamePlayer[]>([]);
  const holeDetailsRef = useRef<Hole[]>([]);

  // Initialize local throws from game scores
  useEffect(() => {
    if (!activeGame) return;
    const throwsMap: Record<string, number> = {};
    for (const score of activeGame.scores) {
      throwsMap[`${score.playerId}-${score.holeNumber}`] = score.throws;
    }
    setLocalThrows(throwsMap);
  }, [activeGame?.scores?.length]);

  // Auto-save default scores when navigating to a new hole
  // Ensures the displayed default (par or 3) gets saved even if user doesn't touch +/-
  useEffect(() => {
    const scores = gameScoresRef.current;
    const currentPlayers = playersRef.current;
    const currentLocalThrows = localThrowsRef.current;
    const currentHoleDetails = holeDetailsRef.current;

    if (!scores) return;

    let hasNewDefaults = false;
    for (const player of currentPlayers) {
      const key = `${player.id}-${currentHole}`;
      if (currentLocalThrows[key] === undefined) {
        const score = scores.find(
          (s) => s.playerId === player.id && s.holeNumber === currentHole
        );
        if (!score) {
          const holeDetail = currentHoleDetails.find((h) => h.holeNumber === currentHole);
          const defaultThrows = holeDetail?.par ?? 3;
          const par = holeDetail?.par ?? null;
          setLocalThrows((prev) => ({ ...prev, [key]: defaultThrows }));
          pendingSavesRef.current.set(key, {
            playerId: player.id,
            holeNumber: currentHole,
            throws: defaultThrows,
            par,
          });
          hasNewDefaults = true;
        }
      }
    }

    if (hasNewDefaults) {
      debouncedSave();
    }
    // Only trigger on hole change — refs are used for other values to avoid loops
  }, [currentHole]);

  // Reset image collapse when hole changes
  useEffect(() => {
    setImageCollapsed(false);
  }, [currentHole]);

  const game = activeGame;
  const totalHoles = game?.totalHoles ?? 0;
  const players = game?.players ?? [];
  const courseSlug = game?.courseSlug ?? '';

  // Hole details from course
  const holeDetails: Hole[] = courseDetail?.holeDetails ?? [];
  const currentHoleDetail = holeDetails.find((h) => h.holeNumber === currentHole);
  const currentHolePar = currentHoleDetail?.par ?? null;
  const hasImage = !!(currentHoleDetail?.imageUrl || currentHoleDetail?.thumbUrl);

  // Update refs for auto-save effect (must be after variables are defined)
  localThrowsRef.current = localThrows;
  gameScoresRef.current = game?.scores;
  playersRef.current = players;
  holeDetailsRef.current = holeDetails;

  // Get throw count for a player on a hole
  const getThrows = useCallback((playerId: string, holeNumber: number): number => {
    const key = `${playerId}-${holeNumber}`;
    if (localThrows[key] !== undefined) return localThrows[key];
    // Check game scores
    const score = game?.scores.find(
      (s) => s.playerId === playerId && s.holeNumber === holeNumber
    );
    return score?.throws ?? (currentHolePar ?? 3); // Default to par or 3
  }, [localThrows, game?.scores, currentHolePar]);

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
        if (throws !== undefined) {
          totalThrows += throws;
          holesCompleted++;
          // Get par for this hole
          const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
          if (holeDetail?.par) totalPar += holeDetail.par;
        } else {
          // Check saved scores
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
        if (localThrows[key] === undefined) {
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
        // Clear saved indicator after 2 seconds
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

  // Update throw count for a player on a hole
  const updateThrow = useCallback(
    (playerId: string, holeNumber: number, throws: number) => {
      if (throws < 1) return;
      const key = `${playerId}-${holeNumber}`;
      setLocalThrows((prev) => ({ ...prev, [key]: throws }));

      // Get par for the hole
      const holeDetail = holeDetails.find((h) => h.holeNumber === holeNumber);
      const par = holeDetail?.par ?? null;

      // Queue for save
      pendingSavesRef.current.set(key, { playerId, holeNumber, throws, par });
      debouncedSave();
    },
    [holeDetails, debouncedSave]
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

  // Swipe handlers for hole navigation
  const swipeHandlers = useSwipe(goNextHole, goPrevHole);

  // Swipe up handler for image collapse on mobile
  const swipeUpHandlers = useSwipeUp(() => setImageCollapsed(true));

  // Complete game handler
  const handleCompleteGame = useCallback(async () => {
    if (!game) return;
    try {
      // Step 1: Flush any pending saves
      const pending = pendingSavesRef.current;
      if (pending.size > 0) {
        const scoresToSave = Array.from(pending.values());
        pending.clear();
        await saveScores(scoresToSave);
      }

      // Step 2: Save any unsaved default scores (safety net for holes not yet visited)
      const unsavedDefaults: { playerId: string; holeNumber: number; throws: number; par: number | null }[] = [];
      for (const player of players) {
        for (let h = 1; h <= totalHoles; h++) {
          const key = `${player.id}-${h}`;
          if (localThrows[key] === undefined) {
            const hasServer = game.scores.some(
              (s) => s.playerId === player.id && s.holeNumber === h
            );
            if (!hasServer) {
              const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
              const par = holeDetail?.par ?? null;
              const defaultThrows = par ?? 3;
              unsavedDefaults.push({ playerId: player.id, holeNumber: h, throws: defaultThrows, par });
            }
          }
        }
      }
      if (unsavedDefaults.length > 0) {
        await saveScores(unsavedDefaults);
      }

      // Step 3: Complete the game
      await completeGameMutation.mutateAsync({
        gameId: game.id,
        status: 'completed',
      });

      // Step 4: Build a complete game object with ALL scores for the summary view
      // This merges localThrows (most recent) with server scores and defaults
      const allScores: Score[] = [];
      for (const player of players) {
        for (let h = 1; h <= totalHoles; h++) {
          const key = `${player.id}-${h}`;
          const localThrow = localThrows[key];
          const serverScore = game.scores.find(
            (s) => s.playerId === player.id && s.holeNumber === h
          );
          const holeDetail = holeDetails.find((hd) => hd.holeNumber === h);
          const par = serverScore?.par ?? holeDetail?.par ?? null;
          const throws = localThrow ?? serverScore?.throws ?? (par ?? 3);

          allScores.push({
            id: serverScore?.id ?? '',
            gameId: game.id,
            playerId: player.id,
            holeNumber: h,
            throws,
            par,
          });
        }
      }

      const completedGame: Game = {
        ...game,
        scores: allScores,
        status: 'completed',
        completedAt: new Date().toISOString(),
      };

      // Navigate to game summary with complete scores
      setSelectedGame(completedGame);
      setActiveGame(null);
      setCurrentView('game-summary');
    } catch (err) {
      console.error('Failed to complete game:', err);
    }
  }, [game, players, totalHoles, localThrows, holeDetails, completeGameMutation, saveScores, setSelectedGame, setActiveGame, setCurrentView]);

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

  // No game state - rendered after all hooks
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

  // Hole image component (shared between desktop and mobile)
  const holeImageFull = currentHoleDetail?.imageUrl || currentHoleDetail?.thumbUrl;
  const holeImageThumb = currentHoleDetail?.thumbUrl || currentHoleDetail?.imageUrl;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] sm:min-h-0" {...swipeHandlers}>
      {/* Course name & hole navigation */}
      <div className="space-y-2 mb-3">
        {/* Course name */}
        <div className="text-center">
          <h2 className="font-semibold text-base sm:text-lg truncate">{game.courseName}</h2>
        </div>

        {/* Hole navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-xl shrink-0"
            onClick={goPrevHole}
            disabled={currentHole <= 1}
            aria-label="Edellinen väylä"
          >
            <ChevronLeft className="size-5" />
          </Button>

          <div className="flex-1 text-center">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentHole}
                initial={{ opacity: 0, x: currentHole > 1 ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: currentHole > 1 ? -30 : 30 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <div className="text-2xl sm:text-3xl font-bold">
                  Väylä {currentHole}
                  <span className="text-muted-foreground text-lg sm:text-xl font-normal">
                    /{totalHoles}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-xl shrink-0"
            onClick={goNextHole}
            disabled={currentHole >= totalHoles}
            aria-label="Seuraava väylä"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>

        {/* Hole number dots */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => {
            const isCurrent = hole === currentHole;
            // Check if this hole has any scores
            const hasScores = players.some((p) => {
              const key = `${p.id}-${hole}`;
              return localThrows[key] !== undefined || game.scores.some(
                (s) => s.playerId === p.id && s.holeNumber === hole
              );
            });

            return (
              <button
                key={hole}
                onClick={() => goToHole(hole)}
                className={`size-6 rounded-full text-[10px] font-bold transition-all duration-200 ${
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

      {/* ========== MAIN CONTENT AREA ========== */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0">
        
        {/* === HOLE IMAGE SECTION === */}
        {hasImage && (
          <>
            {/* Mobile: Image at top with collapse */}
            <div className="md:hidden">
              <AnimatePresence mode="wait">
                {!imageCollapsed ? (
                  <motion.div
                    key="full-image"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="overflow-hidden relative"
                    {...swipeUpHandlers}
                  >
                    {/* Compact hole info bar above image */}
                    <div className="flex items-center gap-3 mb-1.5 px-1">
                      {currentHolePar !== null ? (
                        <div className="flex items-center gap-1">
                          <Flag className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-semibold">Par {currentHolePar}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Flag className="size-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Par —</span>
                        </div>
                      )}
                      {currentHoleDetail?.length ? (
                        <div className="flex items-center gap-1">
                          <Ruler className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm">{currentHoleDetail.length} m</span>
                        </div>
                      ) : null}
                      <div className="ml-auto">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <ChevronUp className="size-3" /> Pyyhi ylös
                        </span>
                      </div>
                    </div>
                    {/* Image */}
                    {holeImageFull && (
                      <a
                        href={holeImageFull}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden border"
                      >
                        <img
                          src={holeImageFull}
                          alt={`Väylä ${currentHole}`}
                          className="w-full max-h-[50vh] object-contain bg-muted"
                          loading="lazy"
                        />
                      </a>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="collapsed-image"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setImageCollapsed(false)}
                  >
                    {/* Collapsed thumbnail */}
                    {holeImageThumb && (
                      <a
                        href={holeImageFull || holeImageThumb}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden border shrink-0 hover:opacity-90 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={holeImageThumb}
                          alt={`Väylä ${currentHole}`}
                          className="size-12 object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {/* Compact hole info */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {currentHolePar !== null ? (
                        <div className="flex items-center gap-1">
                          <Flag className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm font-semibold">Par {currentHolePar}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Flag className="size-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Par —</span>
                        </div>
                      )}
                      {currentHoleDetail?.length ? (
                        <div className="flex items-center gap-1">
                          <Ruler className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm">{currentHoleDetail.length} m</span>
                        </div>
                      ) : null}
                    </div>
                    <ChevronUp className="size-4 text-muted-foreground ml-auto rotate-180" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop: Large image on the left side */}
            <div className="hidden md:flex md:w-1/2 flex-col gap-2">
              {/* Hole info */}
              <div className="flex items-center gap-3 px-1">
                {currentHoleDetail?.name && currentHoleDetail.name !== `Väylä ${currentHole}` && (
                  <span className="text-sm font-medium truncate">{currentHoleDetail.name}</span>
                )}
                {currentHolePar !== null ? (
                  <div className="flex items-center gap-1.5">
                    <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-semibold">Par {currentHolePar}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Flag className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Par —</span>
                  </div>
                )}
                {currentHoleDetail?.length ? (
                  <div className="flex items-center gap-1.5">
                    <Ruler className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm">{currentHoleDetail.length} m</span>
                  </div>
                ) : null}
              </div>
              {/* Large image */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentHole}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-h-0"
                >
                  {holeImageFull && (
                    <a
                      href={holeImageFull}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border h-full hover:opacity-95 transition-opacity"
                    >
                      <img
                        src={holeImageFull}
                        alt={`Väylä ${currentHole}`}
                        className="w-full h-full max-h-[60vh] object-contain bg-muted"
                        loading="lazy"
                      />
                    </a>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

        {/* === SCORE INPUT SECTION === */}
        <div className={`flex-1 flex flex-col min-h-0 ${hasImage ? 'md:w-1/2' : ''}`}>
          {/* If no image, show compact hole info */}
          {!hasImage && (
            <div className="flex items-center gap-3 mb-2 px-1">
              {currentHoleDetail?.name && currentHoleDetail.name !== `Väylä ${currentHole}` && (
                <span className="text-sm font-medium truncate">{currentHoleDetail.name}</span>
              )}
              {currentHolePar !== null ? (
                <div className="flex items-center gap-1.5">
                  <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold">Par {currentHolePar}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Flag className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Par —</span>
                </div>
              )}
              {currentHoleDetail?.length ? (
                <div className="flex items-center gap-1.5">
                  <Ruler className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm">{currentHoleDetail.length} m</span>
                </div>
              ) : null}
              {!currentHoleDetail?.thumbUrl && currentHoleDetail?.imageUrl && (
                <a
                  href={currentHoleDetail.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
                >
                  <ImageIcon className="size-3" />
                  Kuva
                </a>
              )}
            </div>
          )}

          {/* Desktop: if image exists, also show hole info in the score section */}
          {hasImage && (
            <div className="hidden md:flex items-center gap-3 mb-2 px-1">
              {currentHoleDetail?.name && currentHoleDetail.name !== `Väylä ${currentHole}` && (
                <span className="text-sm font-medium truncate">{currentHoleDetail.name}</span>
              )}
              {currentHolePar !== null ? (
                <div className="flex items-center gap-1.5">
                  <Flag className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold">Par {currentHolePar}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Flag className="size-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Par —</span>
                </div>
              )}
              {currentHoleDetail?.length ? (
                <div className="flex items-center gap-1.5">
                  <Ruler className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm">{currentHoleDetail.length} m</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Player score rows */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {players.map((player) => {
              const throws = getThrows(player.id, currentHole);
              const displayName = player.displayName || player.username;

              return (
                <PlayerScoreRow
                  key={player.id}
                  playerName={displayName}
                  throws={throws}
                  par={currentHolePar}
                  onIncrease={() => updateThrow(player.id, currentHole, throws + 1)}
                  onDecrease={() => updateThrow(player.id, currentHole, throws - 1)}
                  isSaving={isKeySaving(player.id, currentHole)}
                  isSaved={isKeySaved(player.id, currentHole)}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky bottom: mini scoreboard + action buttons */}
      <div className="sticky bottom-16 sm:bottom-0 left-0 right-0 z-40 mt-4 -mx-4 px-4 pt-3 pb-3 sm:pb-0 bg-background/95 backdrop-blur-sm border-t">
        {/* Mini scoreboard */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Tulokset</span>
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
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold"
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
                className={`h-11 ${allHolesScored ? '' : 'flex-1'} text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30`}
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
    </div>
  );
}
