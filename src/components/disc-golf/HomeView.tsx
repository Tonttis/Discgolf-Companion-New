'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Trophy, TreePine } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { CompetitionLookup } from './CompetitionLookup';

export function HomeView() {
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      navigateToCourses();
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800 p-6 sm:p-10 text-white">
        <div className="absolute inset-0 opacity-30" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/disc-golf-logo.png"
              alt="DiscGolf Companion"
              className="size-12 rounded-xl"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                DiscGolf Companion
              </h1>
              <p className="text-emerald-100 text-sm sm:text-base">
                Find courses, track scores, explore competitions
              </p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/60" />
              <Input
                type="text"
                placeholder="Search for courses..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-11 bg-white/15 border-white/20 text-white placeholder:text-white/60 focus-visible:border-white/50 focus-visible:ring-white/20 backdrop-blur-sm"
              />
            </div>
            <Button
              type="submit"
              className="h-11 bg-white text-emerald-700 hover:bg-white/90 font-semibold"
            >
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200"
          onClick={navigateToCourses}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <MapPin className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Browse Courses</CardTitle>
                <CardDescription>Explore disc golf courses worldwide</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                <Trophy className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Competition Lookup</CardTitle>
                <CardDescription>View results by competition ID</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <CompetitionLookup />
          </CardContent>
        </Card>
      </section>

      {/* Info Section */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-semibold text-lg">Welcome to DiscGolf Companion</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your go-to app for exploring disc golf courses and competition results powered by
          DiscGolfMetrix. Search for courses by name, filter by country and region, or look up
          competition scorecards to see detailed hole-by-hole results.
        </p>
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">1000+</div>
            <div className="text-xs text-muted-foreground">Courses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Live</div>
            <div className="text-xs text-muted-foreground">Scores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Free</div>
            <div className="text-xs text-muted-foreground">To Use</div>
          </div>
        </div>
      </section>
    </div>
  );
}
