'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  MapPin,
  Award,
  Sparkles,
  Star,
  Play,
  Heart,
  Trophy,
  Clock,
  User,
  Gamepad2,
} from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useAuth } from '@/lib/auth/auth-context';

export function HomeView() {
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const navigateToProfile = useAppStore((s) => s.navigateToProfile);
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
    <div className="space-y-8">
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
