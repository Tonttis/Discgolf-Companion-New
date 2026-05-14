'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';

interface SetupStatus {
  configured: boolean;
  status: 'not_configured' | 'needs_migration' | 'ready' | 'error';
  message: string;
  dashboardUrl?: string;
  migrationSql?: string;
}

function DatabaseSetupBanner() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

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
  const handleCopySql = async () => {
    if (setupStatus?.migrationSql) {
      await navigator.clipboard.writeText(setupStatus.migrationSql);
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
            onClick={handleCopySql}
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

export function HomeView() {
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const navigateToAuth = useAppStore((s) => s.navigateToAuth);
  const navigateToFavorites = useAppStore((s) => s.navigateToFavorites);
  const navigateToGameHistory = useAppStore((s) => s.navigateToGameHistory);
  const { isAuthenticated } = useAuth();
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    navigateToCourses();
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 p-6 sm:p-10 text-white">
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <img
              src="/disc-golf-logo.png"
              alt="DiscGolf Companion"
              className="size-14 rounded-xl"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                DiscGolf Companion
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base">
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
                className="pl-9 h-11 bg-white/15 border-white/20 text-white placeholder:text-white/60 focus-visible:border-white/50 focus-visible:ring-white/20 backdrop-blur-sm"
              />
            </div>
            <Button
              type="submit"
              className="h-11 bg-white text-emerald-700 hover:bg-white/90 font-semibold"
            >
              Hae
            </Button>
          </form>
        </div>
      </section>

      {/* Database Setup Banner */}
      <DatabaseSetupBanner />

      {/* Quick Actions */}
      <section className="grid gap-4 sm:grid-cols-3">
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

      {/* User Actions (if authenticated) */}
      {isAuthenticated && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer hover:border-rose-500/50 hover:shadow-md transition-all duration-200"
            onClick={navigateToFavorites}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                  <Heart className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Suosikkiradat</CardTitle>
                  <CardDescription>Omat lempiradat</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all duration-200"
            onClick={navigateToGameHistory}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Pelihistoria</CardTitle>
                  <CardDescription>Aiemmat pelit ja tulokset</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </section>
      )}

      {/* How It Works */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-lg">Tietoa palvelusta</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Selaa yli 1000 suomalaista frisbeegolfrataa yhteisön arvosanoilla, luokituksilla
          ja yksityiskohtaisilla tiedoilla. Kirjaa pelit ja seuraa edistymistäsi.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
