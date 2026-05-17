'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  AtSign,
  Edit3,
  Check,
  X,
  LogOut,
  Trophy,
  Heart,
  Clock,
  Loader2,
  Pencil,
  AlertCircle,
  ChevronRight,
  Settings,
  Backpack,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useGames, useFavorites } from '@/hooks/use-disc-golf';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';

function SupabaseNotConfiguredMessage() {
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto text-white">
          <User className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Profiili</h1>
      </div>

      <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-6 text-center space-y-3">
          <div className="flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <div>
            <p className="font-medium">Supabase ei ole määritetty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Kirjaudu sisään nähdäksesi profiilisi. Supabase tulee määrittää ensin.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileView() {
  const { user, isLoading, supabaseConfigured, signOut, updateProfile } = useAuth();
  const { data: gamesData } = useGames();
  const { data: favoritesData } = useAppStore as never; // will use useFavorites below
  const navigateToGameHistory = useAppStore((s) => s.navigateToGameHistory);
  const navigateToFavorites = useAppStore((s) => s.navigateToFavorites);
  const navigateToSettings = useAppStore((s) => s.navigateToSettings);
  const navigateToBag = useAppStore((s) => s.navigateToBag);
  const navigateHome = useAppStore((s) => s.navigateHome);

  const [editingName, setEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Fetch games and favorites
  const gamesResult = useGames();
  const favoritesResult = useFavorites();

  const gamesCount = gamesResult.data?.games?.length ?? 0;
  const favoritesCount = favoritesResult.data?.favorites?.length ?? 0;
  const completedGames = gamesResult.data?.games?.filter((g) => g.status === 'completed') ?? [];
  const inProgressGames = gamesResult.data?.games?.filter((g) => g.status === 'in_progress') ?? [];

  const handleEditName = () => {
    setDisplayNameInput(user?.displayName || '');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      toast.error('Näyttönimi ei voi olla tyhjä');
      return;
    }

    setSavingName(true);
    try {
      const { error } = await updateProfile({ displayName: trimmed });
      if (error) {
        toast.error('Nimen päivitys epäonnistui', { description: error });
      } else {
        toast.success('Näyttönimi päivitetty!');
        setEditingName(false);
      }
    } catch {
      toast.error('Jotain meni pieleen');
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setDisplayNameInput('');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success('Kirjauduit ulos');
      navigateHome();
    } catch {
      toast.error('Uloskirjautuminen epäonnistui');
    } finally {
      setSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!supabaseConfigured) {
    return <SupabaseNotConfiguredMessage />;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-12">
        <div className="flex items-center justify-center size-14 rounded-2xl bg-muted mx-auto">
          <User className="size-7 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold">Ei kirjautunut</p>
          <p className="text-sm text-muted-foreground mt-1">
            Kirjaudu sisään nähdäksesi profiilisi
          </p>
        </div>
      </div>
    );
  }

  const initials = (user.displayName || user.username)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700" />
        <CardContent className="p-6 -mt-10 space-y-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-20 border-4 border-background shadow-lg">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
              ) : null}
              <AvatarFallback className="text-lg font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              {editingName ? (
                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-xs text-muted-foreground">
                    Näyttönimi
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="display-name"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="h-9 text-sm"
                      placeholder="Näyttönimi"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                      onClick={handleSaveName}
                      disabled={savingName}
                    >
                      {savingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={handleCancelEdit}
                      disabled={savingName}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg leading-tight truncate">
                      {user.displayName || user.username}
                    </h2>
                    <div className="flex items-center gap-1 mt-0.5">
                      <AtSign className="size-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user.username}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    onClick={handleEditName}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-4">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto">
              <Trophy className="size-4" />
            </div>
            <p className="text-2xl font-bold">{gamesCount}</p>
            <p className="text-xs text-muted-foreground">Pelit</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 mx-auto">
              <Check className="size-4" />
            </div>
            <p className="text-2xl font-bold">{completedGames.length}</p>
            <p className="text-xs text-muted-foreground">Valmiit</p>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardContent className="px-3 text-center space-y-1">
            <div className="flex items-center justify-center size-9 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto">
              <Heart className="size-4" />
            </div>
            <p className="text-2xl font-bold">{favoritesCount}</p>
            <p className="text-xs text-muted-foreground">Suosikit</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardContent className="p-2">
          {/* Game History */}
          <button
            onClick={navigateToGameHistory}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Pelihistoria</p>
              <p className="text-xs text-muted-foreground">
                {gamesCount > 0
                  ? `${completedGames.length} valmista, ${inProgressGames.length} käynnissä`
                  : 'Ei pelejä vielä'}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>

          <Separator className="my-1" />

          {/* My Bag */}
          <button
            onClick={navigateToBag}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Backpack className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Kiekkolaukku</p>
              <p className="text-xs text-muted-foreground">
                Hallitse kiekkojasi ja analysoi laukkua
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>

          <Separator className="my-1" />

          {/* Favorites */}
          <button
            onClick={navigateToFavorites}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center justify-center size-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
              <Heart className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Suosikkiradat</p>
              <p className="text-xs text-muted-foreground">
                {favoritesCount > 0
                  ? `${favoritesCount} suosikkia`
                  : 'Ei suosikkeja vielä'}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>

          <Separator className="my-1" />

          {/* Settings */}
          <button
            onClick={navigateToSettings}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center justify-center size-10 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 shrink-0">
              <Settings className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Asetukset</p>
              <p className="text-xs text-muted-foreground">
                Ulkonäkö ja teema
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          </button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tili</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Käyttäjänimi</span>
            <div className="flex items-center gap-1">
              <AtSign className="size-3 text-muted-foreground" />
              <span className="font-medium">{user.username}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Liittynyt</span>
            <span className="font-medium">
              {new Date(user.createdAt).toLocaleDateString('fi-FI', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full h-11 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        {signingOut ? 'Kirjaudutaan ulos…' : 'Kirjaudu ulos'}
      </Button>
    </div>
  );
}
