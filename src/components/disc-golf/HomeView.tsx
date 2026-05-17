'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  MapPin,
  Award,
  Sparkles,
  Star,
  Heart,
  Trophy,
  Gamepad2,
  Database,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  User,
  LogIn,
  UserPlus,
  Mail,
  Lock,
  AtSign,
  ChevronRight,
  Clock,
  Server,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth/auth-context';
import { useGames, useFavorites } from '@/hooks/use-disc-golf';
import { toast } from 'sonner';

interface SetupStatus {
  configured: boolean;
  status: 'not_configured' | 'needs_migration' | 'ready' | 'error';
  message: string;
  dashboardUrl?: string;
  migrationSql?: string;
  fixSql?: string;
}

function DatabaseSetupBanner() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showFix, setShowFix] = useState(false);

  const checkSetup = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/setup');
      const data = await res.json();
      setSetupStatus(data);
    } catch {
      setSetupStatus({ configured: false, status: 'error', message: 'Failed to check database status' });
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  if (loading) return null;

  // Database is ready - no banner needed
  if (setupStatus?.status === 'ready') return null;

  // Not configured at all
  if (setupStatus?.status === 'not_configured' || setupStatus?.status === 'error') return null;

  // Needs migration
  const handleCopySql = async (sql?: string) => {
    const text = sql || setupStatus?.migrationSql;
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('SQL kopioitu leikepöydälle!', {
        description: 'Liitä se Supabasen SQL Editoriin',
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenDashboard = () => {
    if (setupStatus?.dashboardUrl) {
      window.open(setupStatus.dashboardUrl, '_blank');
    }
  };

  return (
    <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 shrink-0">
            <Database className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Tietokanta ei ole vielä valmis</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supabase on yhdistetty, mutta tietokantataulut puuttuvat. Suorita migraatio SQL Editorissa.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-9 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={() => handleCopySql()}
          >
            {copied ? (
              <>
                <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-500" />
                Kopioitu!
              </>
            ) : (
              <>
                <Copy className="size-3.5 mr-1.5" />
                Kopioi SQL
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleOpenDashboard}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            Avaa SQL Editor
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-9"
            onClick={checkSetup}
            disabled={checking}
          >
            {checking ? <Loader2 className="size-3.5 animate-spin" /> : 'Tarkista uudelleen'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Username validation
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const USERNAME_CHAR_REGEX = /^[a-z0-9_]*$/;

export function HomeView() {
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const navigateToFavorites = useAppStore((s) => s.navigateToFavorites);
  const navigateToGameHistory = useAppStore((s) => s.navigateToGameHistory);
  const navigateToProfile = useAppStore((s) => s.navigateToProfile);
  const { user, isAuthenticated, isLoading: authLoading, signIn, signUp } = useAuth();
  const [searchInput, setSearchInput] = useState('');

  // Inline auth state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);

  // Stats for authenticated users (only fetch when authenticated)
  const gamesResult = useGames();
  const favoritesResult = useFavorites();
  const gamesCount = isAuthenticated ? (gamesResult.data?.games?.length ?? 0) : 0;
  const completedGames = isAuthenticated ? (gamesResult.data?.games?.filter((g) => g.status === 'completed') ?? []) : [];
  const inProgressGames = isAuthenticated ? (gamesResult.data?.games?.filter((g) => g.status === 'in_progress') ?? []) : [];
  const favoritesCount = isAuthenticated ? (favoritesResult.data?.favorites?.length ?? 0) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    navigateToCourses();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast.error('Täytä kaikki kentät');
      return;
    }
    setAuthLoading2(true);
    try {
      const { error } = await signIn(loginEmail.trim(), loginPassword);
      if (error) {
        toast.error('Kirjautuminen epäonnistui', { description: error });
      } else {
        toast.success('Kirjautuminen onnistui!', { description: 'Tervetuloa takaisin!' });
        setShowAuth(false);
        // Clear form
        setLoginEmail('');
        setLoginPassword('');
      }
    } catch {
      toast.error('Jotain meni pieleen');
    } finally {
      setAuthLoading2(false);
    }
  };

  const [emailConfirmationNeeded, setEmailConfirmationNeeded] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail.trim() || !registerPassword || !username.trim()) {
      toast.error('Täytä pakolliset kentät');
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      toast.error('Käyttäjänimi ei kelpaa', { description: '3–20 merkkiä, vain a-z, 0-9 ja _' });
      return;
    }
    if (registerPassword.length < 6) {
      toast.error('Salasana liian lyhyt');
      return;
    }
    setAuthLoading2(true);
    setEmailConfirmationNeeded(false);
    try {
      const { error, needsEmailConfirmation } = await signUp(registerEmail.trim(), registerPassword, username.trim(), displayName.trim() || undefined);
      if (error) {
        toast.error('Rekisteröinti epäonnistui', { description: error });
      } else if (needsEmailConfirmation) {
        setEmailConfirmationNeeded(true);
        toast.success('Tili luotu!', { description: 'Vahvista sähköpostiosoitteesi kirjautuaksesi sisään. Tarkista sähköpostisi.' });
      } else {
        toast.success('Rekisteröinti onnistui!', { description: 'Tervetuloa DiscGolf Companion -käyttäjäksi!' });
        setShowAuth(false);
        // Clear form
        setRegisterEmail('');
        setRegisterPassword('');
        setUsername('');
        setDisplayName('');
      }
    } catch {
      toast.error('Jotain meni pieleen');
    } finally {
      setAuthLoading2(false);
    }
  };

  const userInitials = user
    ? (user.displayName || user.username)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 p-4 sm:p-10 text-white">
        <div className="relative z-10 space-y-4 sm:space-y-5">
          <div className="flex items-center gap-3">
            <img
              src="/disc-golf-logo.png"
              alt="DiscGolf Companion"
              className="size-10 sm:size-14 rounded-lg sm:rounded-xl"
            />
            <div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
                DiscGolf Companion
              </h1>
              <p className="text-emerald-100 text-xs sm:text-base">
                Suomalaiset frisbeegolfradat, tulospalvelu ja paljon muuta
              </p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <Input
                type="text"
                placeholder="Etsi ratoja tai kaupunkeja..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-10 sm:h-11 bg-white/15 border-white/20 text-white placeholder:text-white/60 focus-visible:border-white/50 focus-visible:ring-white/20 backdrop-blur-sm text-sm sm:text-base"
              />
            </div>
            <Button
              type="submit"
              className="h-10 sm:h-11 bg-white text-emerald-700 hover:bg-white/90 font-semibold text-sm"
            >
              Hae
            </Button>
          </form>
        </div>
      </section>

      {/* Database Setup Banner */}
      <DatabaseSetupBanner />

      {/* Profile Section */}
      <section>
        {authLoading ? (
          <Card className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          </Card>
        ) : isAuthenticated ? (
          /* Authenticated Profile Card - shows whenever isAuthenticated is true */
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-12 border-2 border-emerald-200 dark:border-emerald-800">
                  {user?.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user?.displayName || user?.username || ''} />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {userInitials || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {user?.displayName || user?.username || 'Käyttäjä'}
                  </h3>
                  {user?.username && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <AtSign className="size-3" />
                      <span>{user.username}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={navigateToProfile}
                >
                  <ChevronRight className="size-5" />
                </Button>
              </div>

              {/* Mini stats row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Trophy className="size-3.5" />
                  </div>
                  <p className="text-lg font-bold mt-0.5">{gamesCount}</p>
                  <p className="text-[10px] text-muted-foreground">Pelit</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <p className="text-lg font-bold mt-0.5">{completedGames.length}</p>
                  <p className="text-[10px] text-muted-foreground">Valmiit</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                  <div className="flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400">
                    <Heart className="size-3.5" />
                  </div>
                  <p className="text-lg font-bold mt-0.5">{favoritesCount}</p>
                  <p className="text-[10px] text-muted-foreground">Suosikit</p>
                </div>
              </div>

              {/* Quick links */}
              <div className="mt-3 space-y-1">
                <button
                  onClick={navigateToGameHistory}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Clock className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Pelihistoria</p>
                    <p className="text-xs text-muted-foreground">
                      {inProgressGames.length > 0
                        ? `${inProgressGames.length} käynnissä, ${completedGames.length} valmista`
                        : gamesCount > 0
                          ? `${completedGames.length} valmista peliä`
                          : 'Ei pelejä vielä'}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
                <button
                  onClick={navigateToFavorites}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
                    <Heart className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Suosikkiradat</p>
                    <p className="text-xs text-muted-foreground">
                      {favoritesCount > 0 ? `${favoritesCount} suosikkia` : 'Ei suosikkeja vielä'}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Not Authenticated - Sign in / Register Card */
          <Card className="overflow-hidden">
            {!showAuth ? (
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mx-auto text-white">
                  <User className="size-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Kirjaudu sisään</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Luo tili tai kirjaudu sisään tallentaaksesi pelit ja suosikit
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => {
                      setAuthMode('login');
                      setShowAuth(true);
                    }}
                  >
                    <LogIn className="size-4 mr-2" />
                    Kirjaudu sisään
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 font-semibold"
                    onClick={() => {
                      setAuthMode('register');
                      setShowAuth(true);
                    }}
                  >
                    <UserPlus className="size-4 mr-2" />
                    Luo tili
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {authMode === 'login' ? 'Kirjaudu sisään' : 'Luo tili'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setShowAuth(false)}
                  >
                    Peruuta
                  </Button>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Sähköposti"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-9 h-10"
                          autoComplete="email"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="Salasana"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-9 h-10"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      disabled={authLoading2}
                    >
                      {authLoading2 ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="size-4 mr-2" />
                          Kirjaudu
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Ei tiliä?{' '}
                      <button
                        type="button"
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                        onClick={() => setAuthMode('register')}
                      >
                        Luo tili
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Sähköposti"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-9 h-10"
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="Salasana (väh. 6 merkkiä)"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-9 h-10"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <Separator />
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Käyttäjänimi (esim. discgolfer42)"
                        value={username}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase();
                          if (USERNAME_CHAR_REGEX.test(val) && val.length <= 20) {
                            setUsername(val);
                          }
                        }}
                        className="pl-9 h-10"
                        autoComplete="username"
                        maxLength={20}
                        required
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Näyttönimi (valinnainen)"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-9 h-10"
                        autoComplete="name"
                      />
                    </div>
                    {emailConfirmationNeeded && (
                      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 text-center space-y-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Vahvista sähköpostiosoite</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Olemme lähettäneet vahvistuslinkin osoitteeseen <strong>{registerEmail.trim()}</strong>. 
                          Tarkista sähköpostisi ja vahvista tili kirjautuaksesi sisään.
                        </p>
                        <button
                          type="button"
                          className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-1"
                          onClick={() => setAuthMode('login')}
                        >
                          Kirjaudu sisään vahvistuksen jälkeen →
                        </button>
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      disabled={authLoading2 || !USERNAME_REGEX.test(username)}
                    >
                      {authLoading2 ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="size-4 mr-2" />
                          Luo tili
                        </>
                      )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Onko jo tili?{' '}
                      <button
                        type="button"
                        className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                        onClick={() => setAuthMode('login')}
                      >
                        Kirjaudu sisään
                      </button>
                    </p>
                  </form>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </section>

      {/* Quick Actions */}
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200"
          onClick={() => {
            setSearchQuery('');
            navigateToCourses();
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <MapPin className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Kaikki radat</CardTitle>
                <CardDescription>1080+ suomalaista rataa</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all duration-200"
          onClick={() => {
            useAppStore.getState().setShowTopOnly(true);
            navigateToCourses();
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <Award className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Huippuradat</CardTitle>
                <CardDescription>Parhaat arvosanat</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-sky-500/50 hover:shadow-md transition-all duration-200"
          onClick={() => {
            useAppStore.getState().setShowNewOnly(true);
            navigateToCourses();
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Uudet radat</CardTitle>
                <CardDescription>Äskettäin lisätyt</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* How It Works */}
      <section className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-base sm:text-lg">Tietoa palvelusta</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Selaa yli 1000 suomalaista frisbeegolfrataa yhteisön arvosanoilla, luokituksilla
          ja yksityiskohtaisilla tiedoilla. Kirjaa pelit ja seuraa edistymistäsi.
        </p>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Star className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Arvosanat</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yhteisön arvosanat ja AAA1–C1 luokitukset
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <MapPin className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Ratatiedot</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pinnanmuodot, korit, ylläpito ja lisää
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Gamepad2 className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Tulospalvelu</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kirjaa heitot väylittäin ja pelaa kaverien kanssa
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Search className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Haku & Suodatus</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Etsi nimen, kaupungin tai luokituksen perusteella
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
