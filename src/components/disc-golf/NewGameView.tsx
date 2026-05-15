'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  Target,
  Users,
  Search,
  X,
  Plus,
  Play,
  LogIn,
  ArrowLeft,
  Loader2,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useAppStore } from '@/store/app-store';
import { useCreateGame, useUserSearch, useCourseDetail } from '@/hooks/use-disc-golf';
import { getClassificationLabel, getClassificationColor, getClassificationBg } from '@/lib/types';

// ==========================================
// Types
// ==========================================

interface AddedPlayer {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// ==========================================
// Main Component
// ==========================================

export function NewGameView() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedCourse, navigateToActiveGame, goBack } = useAppStore();
  const createGame = useCreateGame();

  const [addedPlayers, setAddedPlayers] = useState<AddedPlayer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: courseDetail } = useCourseDetail(selectedCourse?.slug ?? null);
  const { data: searchResults, isLoading: isSearching } = useUserSearch(searchQuery);

  const displayCourse = courseDetail ?? selectedCourse;

  // Creator is always included as a player
  const creatorPlayer: AddedPlayer | null = user
    ? {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }
    : null;

  const allPlayers = creatorPlayer
    ? [creatorPlayer, ...addedPlayers.filter((p) => p.id !== creatorPlayer.id)]
    : addedPlayers;

  // Calculate total par from hole details
  const totalPar =
    courseDetail?.holeDetails?.reduce((sum, h) => sum + (h.par ?? 0), 0) ?? 0;
  const totalHoles = displayCourse?.holes ?? 0;

  // Debounced search input
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value.trim());
      }, 300);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const addPlayer = useCallback(
    (player: { id: string; username: string; displayName: string | null; avatarUrl?: string | null }) => {
      // Don't add if already in the list (including creator)
      if (player.id === creatorPlayer?.id) return;
      if (addedPlayers.some((p) => p.id === player.id)) return;

      setAddedPlayers((prev) => [
        ...prev,
        {
          id: player.id,
          username: player.username,
          displayName: player.displayName,
          avatarUrl: player.avatarUrl ?? null,
        },
      ]);
      setInputValue('');
      setSearchQuery('');
    },
    [addedPlayers, creatorPlayer]
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      // Can't remove the creator
      if (playerId === creatorPlayer?.id) return;
      setAddedPlayers((prev) => prev.filter((p) => p.id !== playerId));
    },
    [creatorPlayer]
  );

  const handleStartGame = useCallback(async () => {
    if (!displayCourse || !user) return;

    setIsCreating(true);
    try {
      const playerUsernames = allPlayers.map((p) => p.username);
      const result = await createGame.mutateAsync({
        courseSlug: displayCourse.slug,
        courseName: displayCourse.name,
        totalHoles,
        totalPar,
        playerUsernames,
      });
      navigateToActiveGame(result.game);
    } catch {
      // Error is handled by the mutation
    } finally {
      setIsCreating(false);
    }
  }, [displayCourse, user, allPlayers, createGame, totalHoles, totalPar, navigateToActiveGame]);

  // Not authenticated state
  if (!authLoading && !isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4"
      >
        <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <LogIn className="size-7 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Kirjaudu sisään</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Pelaaminen vaatii kirjautumisen. Kirjaudu sisään aloittaaksesi uuden pelin.
          </p>
        </div>
        <Button
          onClick={() => useAppStore.getState().navigateToAuth()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <LogIn className="size-4 mr-2" />
          Kirjaudu sisään
        </Button>
      </motion.div>
    );
  }

  // No course selected
  if (!displayCourse) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4"
      >
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <Target className="size-7 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Ei valittua rataa</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Valitse rata aloittaaksesi uuden pelin.
          </p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4 mr-2" />
          Takaisin
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 pb-24"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={goBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Uusi peli</h1>
          <p className="text-sm text-muted-foreground">
            Valitse radan tiedot ja lisää pelaajat
          </p>
        </div>
      </div>

      {/* Course Info Card */}
      <Card className="overflow-hidden">
        <div className="relative">
          {displayCourse.bannerImageUrl ? (
            <>
              <img
                src={displayCourse.bannerImageUrl}
                alt={`${displayCourse.name} banner`}
                className="w-full h-36 sm:h-44 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    {displayCourse.logoUrl && (
                      <img
                        src={displayCourse.logoUrl}
                        alt={`${displayCourse.name} logo`}
                        className="h-8 sm:h-10 w-auto mb-1.5 drop-shadow-lg"
                      />
                    )}
                    <h2 className="text-lg sm:text-xl font-bold text-white drop-shadow-md leading-tight">
                      {displayCourse.name}
                    </h2>
                    {displayCourse.city && (
                      <div className="flex items-center gap-1.5 text-white/80 text-sm">
                        <MapPin className="size-3.5" />
                        <span>{displayCourse.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-4 sm:p-5 text-white">
              <div className="space-y-1.5 min-w-0">
                {displayCourse.logoUrl && (
                  <img
                    src={displayCourse.logoUrl}
                    alt={`${displayCourse.name} logo`}
                    className="h-8 sm:h-10 w-auto mb-1 brightness-110"
                  />
                )}
                <h2 className="text-lg sm:text-xl font-bold leading-tight">
                  {displayCourse.name}
                </h2>
                {displayCourse.city && (
                  <div className="flex items-center gap-1.5 text-emerald-100 text-sm">
                    <MapPin className="size-3.5" />
                    <span>{displayCourse.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>{displayCourse.holes} väylää</span>
            </div>
            {totalPar > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>
                  Par <strong className="text-foreground">{totalPar}</strong>
                </span>
              </div>
            )}
            {displayCourse.classification && (
              <span
                className={`font-semibold px-2 py-0.5 rounded text-xs ${getClassificationBg(
                  displayCourse.classification
                )} ${getClassificationColor(displayCourse.classification)}`}
              >
                {getClassificationLabel(displayCourse.classification)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Players Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
            Pelaajat
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Voit pelata yksin tai lisätä muita pelaajia käyttäjänimellä
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input - for adding other players */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Lisää muita pelaajia (valinnainen)</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Hae @käyttäjänimellä..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pl-9 pr-9"
              />
            {inputValue && (
              <button
                onClick={() => {
                  setInputValue('');
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchQuery.length >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="border rounded-lg overflow-hidden"
              >
                {isSearching ? (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : searchResults?.users && searchResults.users.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto divide-y">
                    {searchResults.users.map((u) => {
                      const isAlreadyAdded =
                        u.id === creatorPlayer?.id ||
                        addedPlayers.some((p) => p.id === u.id);

                      return (
                        <button
                          key={u.id}
                          onClick={() =>
                            !isAlreadyAdded
                              ? addPlayer({
                                  id: u.id,
                                  username: u.username,
                                  displayName: u.displayName,
                                  avatarUrl: u.avatarUrl ?? null,
                                })
                              : undefined
                          }
                          disabled={isAlreadyAdded}
                          className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                            isAlreadyAdded
                              ? 'opacity-50 cursor-not-allowed bg-muted/50'
                              : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer'
                          }`}
                        >
                          <Avatar className="size-8">
                            {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.username} />}
                            <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                              {u.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              @{u.username}
                            </p>
                            {u.displayName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {u.displayName}
                              </p>
                            )}
                          </div>
                          {isAlreadyAdded ? (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              Lisätty
                            </Badge>
                          ) : (
                            <Plus className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ei tuloksia
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <Separator />

          {/* Players List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Pelaajat ({allPlayers.length})
              </p>
              {allPlayers.length === 1 && (
                <span className="text-xs text-muted-foreground italic">Yksinpeli</span>
              )}
              {allPlayers.length > 1 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{allPlayers.length} pelaajaa</span>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {allPlayers.map((player) => {
                const isCreator = player.id === creatorPlayer?.id;

                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="size-9">
                      {player.avatarUrl && (
                        <AvatarImage src={player.avatarUrl} alt={player.username} />
                      )}
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                        {player.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          @{player.username}
                        </p>
                        {isCreator && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-emerald-600 shrink-0">
                            Luoja
                          </Badge>
                        )}
                      </div>
                      {player.displayName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {player.displayName}
                        </p>
                      )}
                    </div>
                    {!isCreator && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => removePlayer(player.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {allPlayers.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <UserCircle className="size-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Ei pelaajia vielä
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sticky Start Game Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <Button
            onClick={handleStartGame}
            disabled={isCreating || !displayCourse || allPlayers.length === 0}
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:shadow-none"
          >
            {isCreating ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" />
                Luodaan peliä...
              </>
            ) : (
              <>
                <Play className="size-5 mr-2" />
                Aloita peli
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
