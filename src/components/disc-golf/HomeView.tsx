'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, TreePine, Layers, Globe } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

export function HomeView() {
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const navigateToCourses = useAppStore((s) => s.navigateToCourses);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    } else {
      setSearchQuery('');
    }
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
                Explore courses, discover layouts, find your next round
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
                <CardDescription>Explore disc golf courses & layouts</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200"
          onClick={navigateToCourses}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400">
                <Layers className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Course Layouts</CardTitle>
                <CardDescription>Find courses with multiple layouts</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Info Section */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-lg">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Search className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Search</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Find courses by name, filter by country, region, or city
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <TreePine className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Explore</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                View course details with all layout variants and locations
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Globe className="size-4" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Navigate</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get directions to any course with integrated maps links
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Source */}
      <section className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground text-center">
          Course data powered by{' '}
          <a
            href="https://discgolfmetrix.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            DiscGolfMetrix
          </a>
          . Data includes course locations, layout variants, and active status.
        </p>
      </section>
    </div>
  );
}
