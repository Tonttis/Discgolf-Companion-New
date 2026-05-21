'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Plane,
  Target,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  useBags,
  useBagDiscs,
  useCreateBag,
  useAddDiscToBag,
  useRemoveDiscFromBag,
  useDiscSearch,
} from '@/hooks/use-disc-golf';
import {
  getDiscCategoryLabel,
  getDiscCategoryPartitive,
  getDiscStabilityLabel,
  getDiscStabilityFromFlight,
  getDiscCategoryFromSpeed,
  type BagDisc,
  type DiscCategory,
  type DiscStability,
  type DiscSearchResult,
} from '@/lib/types';
import { useAuth } from '@/lib/auth/auth-context';

// ==========================================
// Category color mappings
// ==========================================

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  putter: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  midrange: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  fairway: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  distance: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

const STABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  overstable: { bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
  stable: { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
  understable: { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400' },
};

type CategoryFilter = 'all' | 'putter' | 'midrange' | 'fairway' | 'distance';

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Kaikki' },
  { key: 'putter', label: 'Putterit' },
  { key: 'midrange', label: 'Midarit' },
  { key: 'fairway', label: 'Ohjaus' },
  { key: 'distance', label: 'Kauko' },
];

// ==========================================
// Flight Path Image Component
// ==========================================

function FlightPathImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
        <Plane className="size-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="relative">
      {!loaded && (
        <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
          <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full rounded-lg object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        style={{ maxHeight: '140px' }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

// ==========================================
// Gap Analysis Logic
// ==========================================

interface GapAnalysis {
  category: DiscCategory;
  label: string;
  count: number;
  hasOverstable: boolean;
  hasStable: boolean;
  hasUnderstable: boolean;
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

function analyzeGaps(discs: BagDisc[]): GapAnalysis[] {
  const categories: DiscCategory[] = ['putter', 'midrange', 'fairway', 'distance'];
  const labels: Record<DiscCategory, string> = {
    putter: 'Putterit',
    midrange: 'Midarit',
    fairway: 'Ohjauskiekot',
    distance: 'Kaukokiekot',
  };

  return categories.map((cat) => {
    const catDiscs = discs.filter((d) => d.category === cat);
    const count = catDiscs.length;

    // Determine stability coverage using the stability field
    const stabilities = catDiscs.map((d) => d.stability).filter(Boolean) as DiscStability[];
    const hasOverstable = stabilities.includes('overstable');
    const hasStable = stabilities.includes('stable');
    const hasUnderstable = stabilities.includes('understable');

    const stabilityCount = [hasOverstable, hasStable, hasUnderstable].filter(Boolean).length;

    let priority: 'high' | 'medium' | 'low';
    const recommendations: string[] = [];

    if (count === 0) {
      priority = 'high';
      recommendations.push(`Laukustasi puuttuu ${labels[cat].toLowerCase()}`);
    } else if (stabilityCount < 2) {
      priority = 'medium';
      if (!hasOverstable) recommendations.push('Tarvitset ylivakaan kiekon tuulen vastaisiin heittoihin');
      if (!hasStable) recommendations.push('Tarvitset vakaan kiekon suoriin heittoihin');
      if (!hasUnderstable) recommendations.push('Tarvitset alivakaan kiekon anhyzer-heittoihin');
    } else if (stabilityCount < 3) {
      priority = 'low';
      if (!hasOverstable) recommendations.push('Ylivakaa kiekko lisäisi monipuolisuutta');
      if (!hasStable) recommendations.push('Vakaa kiekko lisäisi monipuolisuutta');
      if (!hasUnderstable) recommendations.push('Alivakaa kiekko lisäisi monipuolisuutta');
    } else {
      priority = 'low';
    }

    return {
      category: cat,
      label: labels[cat],
      count,
      hasOverstable,
      hasStable,
      hasUnderstable,
      priority,
      recommendations,
    };
  });
}

// ==========================================
// Priority Badge
// ==========================================

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'Korkea', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25' },
    medium: { label: 'Keskitaso', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25' },
    low: { label: 'Matala', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' },
  };
  const c = config[priority];
  return (
    <Badge variant="outline" className={c.className}>
      {priority === 'high' && <AlertTriangle className="mr-1 size-3" />}
      {c.label}
    </Badge>
  );
}

// ==========================================
// Stability Indicator
// ==========================================

function StabilityBadge({ stability }: { stability: DiscStability | null }) {
  if (!stability) return null;
  const label = getDiscStabilityLabel(stability);
  const colors = STABILITY_COLORS[stability] || STABILITY_COLORS.stable;
  return (
    <Badge variant="secondary" className={`${colors.bg} ${colors.text} text-[10px] px-1.5 py-0`}>
      {label}
    </Badge>
  );
}

// ==========================================
// Disc Card (Kiekot tab)
// ==========================================

function DiscCard({
  disc,
  onRemove,
  isRemoving,
}: {
  disc: BagDisc;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const colors = CATEGORY_COLORS[disc.category || 'midrange'] || CATEGORY_COLORS.midrange;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {/* Disc image or category icon */}
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
              {disc.pic ? (
                <img src={disc.pic} alt={disc.discName} className="size-10 rounded object-contain" />
              ) : (
                <Package className={`size-5 ${colors.text}`} />
              )}
            </div>

            {/* Disc info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{disc.discName}</p>
                  <p className="text-xs text-muted-foreground">{disc.brand || 'Tuntematon'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <StabilityBadge stability={disc.stability} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={onRemove}
                    disabled={isRemoving}
                    aria-label="Poista laukusta"
                  >
                    {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Flight numbers */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`inline-block size-1.5 rounded-full ${colors.dot}`} />
                  <span className="text-muted-foreground">{getDiscCategoryLabel(disc.category)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono">
                  <span className="text-muted-foreground">N</span>
                  <span>{disc.speed ?? '?'}</span>
                  <span className="text-muted-foreground ml-1">L</span>
                  <span>{disc.glide ?? '?'}</span>
                  <span className="text-muted-foreground ml-1">K</span>
                  <span>{disc.turn ?? '?'}</span>
                  <span className="text-muted-foreground ml-1">Lv</span>
                  <span>{disc.fade ?? '?'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Disc Search Dialog
// ==========================================

function DiscSearchDialog({
  open,
  onOpenChange,
  bagId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bagId: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { data, isLoading } = useDiscSearch(debouncedQuery);
  const addDisc = useAddDiscToBag();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDebouncedQuery(value), 300);
    },
    []
  );

  const handleAddDisc = useCallback(
    (disc: DiscSearchResult) => {
      // Use API-provided category/stability if available, otherwise compute from flight numbers
      const category = (disc.category as DiscCategory) || getDiscCategoryFromSpeed(disc.speed);
      const stability = (disc.stability as DiscStability) || getDiscStabilityFromFlight(disc.turn, disc.fade);

      addDisc.mutate(
        {
          bagId,
          disc: {
            discId: disc.id,
            discName: disc.name,
            brand: disc.brand,
            category,
            speed: disc.speed,
            glide: disc.glide,
            turn: disc.turn,
            fade: disc.fade,
            stability,
            pic: disc.pic,
            link: disc.link,
            notes: null,
          },
        },
        {
          onSuccess: () => {
            toast.success(`${disc.name} lisätty laukkuun`);
          },
          onError: () => {
            toast.error('Kiekon lisääminen epäonnistui');
          },
        }
      );
    },
    [addDisc, bagId]
  );

  const discs = data?.discs ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lisää kiekko</DialogTitle>
          <DialogDescription>Hae kiekkoa nimen tai merkin perusteella</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hae kiekkoa..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && discs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Ei tuloksia
            </div>
          )}

          {!isLoading && debouncedQuery.length < 2 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Kirjoita vähintään 2 merkkiä hakeaksesi
            </div>
          )}

          {discs.map((disc) => {
            const colors = CATEGORY_COLORS[disc.category] || CATEGORY_COLORS.midrange;
            const stability = getDiscStabilityFromFlight(disc.turn, disc.fade);
            return (
              <motion.div
                key={disc.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-9 shrink-0 items-center justify-center rounded-md ${colors.bg}`}>
                        {disc.pic ? (
                          <img src={disc.pic} alt={disc.name} className="size-7 rounded object-contain" />
                        ) : (
                          <Package className={`size-4 ${colors.text}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{disc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{disc.brand}</span>
                          <span className="font-mono">
                            {disc.speed}/{disc.glide}/{disc.turn}/{disc.fade}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => handleAddDisc(disc)}
                        disabled={addDisc.isPending}
                      >
                        {addDisc.isPending ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Plus className="size-3" />
                        )}
                        <span className="ml-1 hidden sm:inline">Lisää laukkuun</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Kiekot Tab (Discs List)
// ==========================================

function KiekotTab({
  discs,
  bagId,
}: {
  discs: BagDisc[];
  bagId: string;
}) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const removeDisc = useRemoveDiscFromBag();

  const filteredDiscs = useMemo(() => {
    if (categoryFilter === 'all') return discs;
    return discs.filter((d) => d.category === categoryFilter);
  }, [discs, categoryFilter]);

  const handleRemove = useCallback(
    (disc: BagDisc) => {
      removeDisc.mutate(
        { bagId, discId: disc.id },
        {
          onSuccess: () => {
            toast.success(`${disc.discName} poistettu laukusta`);
          },
          onError: () => {
            toast.error('Poistaminen epäonnistui');
          },
        }
      );
    },
    [removeDisc, bagId]
  );

  // Count per category for the filter chips
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: discs.length };
    for (const d of discs) {
      if (d.category) c[d.category] = (c[d.category] || 0) + 1;
    }
    return c;
  }, [discs]);

  return (
    <div className="space-y-4">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => {
          const isActive = categoryFilter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <Button
              key={f.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs ${isActive ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={() => setCategoryFilter(f.key)}
            >
              {f.label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] ${isActive ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Disc list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredDiscs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <Package className="mx-auto size-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                {categoryFilter === 'all'
                  ? 'Laukussasi ei ole kiekkoja'
                  : `Ei ${getDiscCategoryPartitive(categoryFilter)}`}
              </p>
            </motion.div>
          ) : (
            filteredDiscs.map((disc) => (
              <DiscCard
                key={disc.id}
                disc={disc}
                onRemove={() => handleRemove(disc)}
                isRemoving={removeDisc.isPending}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add disc button */}
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        onClick={() => setSearchOpen(true)}
      >
        <Plus className="mr-2 size-4" />
        Lisää kiekko
      </Button>

      <DiscSearchDialog open={searchOpen} onOpenChange={setSearchOpen} bagId={bagId} />
    </div>
  );
}

// ==========================================
// Lento Tab (Flight Paths)
// ==========================================

function LentoTab({ discs }: { discs: BagDisc[] }) {
  // Group discs by category for organized display
  const groupedDiscs = useMemo(() => {
    const groups: { key: string; label: string; discs: BagDisc[] }[] = [];
    const categoryOrder: { key: string; label: string }[] = [
      { key: 'putter', label: 'Putterit' },
      { key: 'midrange', label: 'Midarit' },
      { key: 'fairway', label: 'Ohjauskiekot' },
      { key: 'distance', label: 'Kaukokiekot' },
    ];

    for (const cat of categoryOrder) {
      const catDiscs = discs.filter((d) => d.category === cat.key);
      if (catDiscs.length > 0) {
        groups.push({ key: cat.key, label: cat.label, discs: catDiscs });
      }
    }

    // Also include discs with no/unknown category
    const uncategorized = discs.filter((d) => !d.category || !['putter', 'midrange', 'fairway', 'distance'].includes(d.category));
    if (uncategorized.length > 0) {
      groups.push({ key: 'other', label: 'Muut', discs: uncategorized });
    }

    return groups;
  }, [discs]);

  if (discs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Plane className="mx-auto size-10 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          Lisää kiekkoja laukkuun nähdäksesi lentopolut
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {groupedDiscs.map((group, groupIndex) => {
        const colors = CATEGORY_COLORS[group.key] || CATEGORY_COLORS.midrange;
        return (
          <div key={group.key} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center gap-2 px-1">
              <span className={`inline-block size-2.5 rounded-full ${colors.dot}`} />
              <h3 className="text-sm font-semibold">{group.label}</h3>
              <span className="text-xs text-muted-foreground">({group.discs.length})</span>
            </div>

            {/* Flight path cards */}
            <div className="space-y-2">
              {group.discs.map((disc, i) => (
                <motion.div
                  key={disc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: groupIndex * 0.05 + i * 0.03 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {/* Flight path image */}
                        <div className="shrink-0 w-28 sm:w-36">
                          {disc.pic ? (
                            <FlightPathImage src={disc.pic} alt={`${disc.discName} lentopolku`} />
                          ) : (
                            <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
                              <div className="text-center">
                                <Plane className="size-6 text-muted-foreground/30 mx-auto" />
                                <p className="text-[10px] text-muted-foreground/50 mt-1">Ei kuvaa</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Disc info */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <p className="font-medium text-sm truncate">{disc.discName}</p>
                          <p className="text-xs text-muted-foreground">{disc.brand || 'Tuntematon'}</p>

                          {/* Flight numbers */}
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
                            <span className="inline-flex items-center justify-center size-5 rounded bg-muted/50 text-[10px] font-semibold">
                              {disc.speed ?? '?'}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="inline-flex items-center justify-center size-5 rounded bg-muted/50 text-[10px] font-semibold">
                              {disc.glide ?? '?'}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="inline-flex items-center justify-center size-5 rounded bg-muted/50 text-[10px] font-semibold">
                              {disc.turn ?? '?'}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="inline-flex items-center justify-center size-5 rounded bg-muted/50 text-[10px] font-semibold">
                              {disc.fade ?? '?'}
                            </span>
                          </div>

                          {/* Stability badge */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <StabilityBadge stability={disc.stability} />
                          </div>

                          {/* Link to product page */}
                          {disc.link && (
                            <a
                              href={disc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="size-2.5" />
                              Katso tuotesivu
                            </a>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ==========================================
// Puutteet Tab (Gap Analysis)
// ==========================================

function PuutteetTab({ discs }: { discs: BagDisc[] }) {
  const gaps = useMemo(() => analyzeGaps(discs), [discs]);

  const highPriority = gaps.filter((g) => g.priority === 'high');
  const mediumPriority = gaps.filter((g) => g.priority === 'medium');
  const lowPriority = gaps.filter((g) => g.priority === 'low');

  const totalDiscs = discs.length;
  const totalGaps = highPriority.length + mediumPriority.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{totalDiscs}</p>
              <p className="text-xs text-muted-foreground">Kiekkoa yhteensä</p>
            </div>
            <div className="text-right">
              {totalGaps > 0 ? (
                <>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalGaps}</p>
                  <p className="text-xs text-muted-foreground">Puutteita löydetty</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="ml-auto size-7 text-emerald-500" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Hyvin tasapainoinen</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category gap cards */}
      <div className="space-y-3">
        {gaps.map((gap, i) => {
          const colors = CATEGORY_COLORS[gap.category] || CATEGORY_COLORS.midrange;
          return (
            <motion.div
              key={gap.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block size-3 rounded-full ${colors.dot}`} />
                      <CardTitle className="text-sm">{gap.label}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">
                        {gap.count} kpl
                      </Badge>
                    </div>
                    <PriorityBadge priority={gap.priority} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-1 space-y-2">
                  {/* Stability coverage */}
                  <div className="flex flex-wrap gap-2">
                    <StabilityCoverageBadge
                      label="Ylivakaa"
                      covered={gap.hasOverstable}
                    />
                    <StabilityCoverageBadge
                      label="Vakaa"
                      covered={gap.hasStable}
                    />
                    <StabilityCoverageBadge
                      label="Alivakaa"
                      covered={gap.hasUnderstable}
                    />
                  </div>

                  {/* Recommendations */}
                  {gap.recommendations.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {gap.recommendations.map((rec, j) => (
                        <p key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <Target className="size-3 mt-0.5 shrink-0 text-muted-foreground/60" />
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}

                  {gap.priority === 'low' && gap.recommendations.length === 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      <span>Hyvä kattavuus</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StabilityCoverageBadge({ label, covered }: { label: string; covered: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
        covered
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {covered ? <CheckCircle2 className="size-2.5" /> : <X className="size-2.5" />}
      {label}
    </div>
  );
}

// ==========================================
// Main BagView Component
// ==========================================

export function BagView() {
  const { user, isAuthenticated } = useAuth();
  const { data: bagsData, isLoading: bagsLoading } = useBags();
  const createBag = useCreateBag();

  // Get primary bag or first bag
  const primaryBag = useMemo(() => {
    if (!bagsData?.bags) return null;
    return bagsData.bags.find((b) => b.isPrimary) || bagsData.bags[0] || null;
  }, [bagsData]);

  const { data: bagDiscsData, isLoading: discsLoading } = useBagDiscs(primaryBag?.id ?? null);
  const discs = bagDiscsData?.discs ?? [];

  const handleCreateBag = useCallback(async () => {
    createBag.mutate(
      { name: 'Laukkuni' },
      {
        onSuccess: () => {
          toast.success('Laukku luotu');
        },
        onError: () => {
          toast.error('Laukun luominen epäonnistui');
        },
      }
    );
  }, [createBag]);

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <Package className="size-14 text-muted-foreground/40" />
        <h2 className="mt-4 text-lg font-semibold">Kirjaudu sisään</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kirjaudu sisään hallitaksesi kiekkolaukkuasi
        </p>
      </div>
    );
  }

  // Loading state
  if (bagsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // No bag — create one
  if (!primaryBag) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
        <Package className="size-14 text-muted-foreground/40" />
        <h2 className="mt-4 text-lg font-semibold">Ei laukkua</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Luo ensimmäinen kiekkolaukkusi
        </p>
        <Button
          className="mt-4 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleCreateBag}
          disabled={createBag.isPending}
        >
          {createBag.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Luo laukku
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15">
          <Package className="size-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold">{primaryBag.name}</h1>
          <p className="text-xs text-muted-foreground">{discs.length} kiekkoa</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="kiekot" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="kiekot" className="flex-1">
            <Package className="mr-1.5 size-3.5" />
            Kiekot
          </TabsTrigger>
          <TabsTrigger value="lento" className="flex-1">
            <Plane className="mr-1.5 size-3.5" />
            Lento
          </TabsTrigger>
          <TabsTrigger value="puutteet" className="flex-1">
            <Target className="mr-1.5 size-3.5" />
            Puutteet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kiekot">
          {discsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <KiekotTab discs={discs} bagId={primaryBag.id} />
          )}
        </TabsContent>

        <TabsContent value="lento">
          {discsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <LentoTab discs={discs} />
          )}
        </TabsContent>

        <TabsContent value="puutteet">
          {discsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <PuutteetTab discs={discs} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
