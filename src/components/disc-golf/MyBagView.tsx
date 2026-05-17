'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Search,
  Plus,
  X,
  Loader2,
  Backpack,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Check,
  Disc3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  useBag,
  useDiscSearch,
  useAddDiscToBag,
  useRemoveDiscFromBag,
} from '@/hooks/use-disc-golf';
import type { BagDisc, Disc, GapItem, GapReport } from '@/lib/types';
import {
  getCategoryLabel,
  getCategorySingular,
  getCategoryIcon,
  getStabilityColor,
  getStabilityBg,
  getStabilityLabel,
} from '@/lib/types';
import { toast } from 'sonner';

// ==========================================
// Category ordering & colors
// ==========================================
const CATEGORY_ORDER = [
  'Distance Driver',
  'Hybrid Driver',
  'Control Driver',
  'Midrange',
  'Approach',
  'Putter',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Distance Driver': '#10b981',  // emerald
  'Hybrid Driver': '#34d399',    // emerald-light
  'Control Driver': '#6ee7b7',   // emerald-lighter
  'Midrange': '#3b82f6',         // blue
  'Approach': '#60a5fa',         // blue-light
  'Putter': '#f59e0b',           // amber
};

const CATEGORY_BG: Record<string, string> = {
  'Distance Driver': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  'Hybrid Driver': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  'Control Driver': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  'Midrange': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  'Approach': 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  'Putter': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

const SEARCH_CATEGORY_OPTIONS = [
  { value: 'all', label: 'Kaikki' },
  { value: 'Distance Driver', label: 'Kaukokiekot' },
  { value: 'Midrange', label: 'Midarit' },
  { value: 'Putter', label: 'Putterit' },
  { value: 'other', label: 'Muut' },
];

const POPULAR_BRANDS = [
  'Innova',
  'Discraft',
  'Latitude 64',
  'Discmania',
  'MVP',
  'Axiom',
  'Prodigy',
  'Westside',
  'Dynamic Discs',
  'Kastaplast',
  'Clash Discs',
  'Viking',
  'Yikun',
  'Daredevil',
];

// ==========================================
// Flight number pill
// ==========================================
function FlightPill({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-[10px] font-bold" title={label}>
      {value}
    </span>
  );
}

// ==========================================
// Stability badge
// ==========================================
function StabilityBadge({ stability }: { stability: string }) {
  const shortLabel = stability
    .replace('Very Understable', 'Hy. aliv.')
    .replace('Understable', 'Alivakaa')
    .replace('Very Overstable', 'Hy. yliv.')
    .replace('Overstable', 'Ylivakaa')
    .replace('Stable', 'Vakaa');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStabilityBg(stability)} ${getStabilityColor(stability)}`}>
      {shortLabel}
    </span>
  );
}

// ==========================================
// Flight chart tooltip
// ==========================================
function FlightChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; brand: string; speed: number; glide: number; turn: number; fade: number; category: string; stability: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-xs text-muted-foreground">{d.brand} · {getCategoryLabel(d.category)}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-xs">Nopeus: {d.speed}</span>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-xs">Liito: {d.glide}</span>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-xs">Kaarto: {d.turn}</span>
        <span className="text-xs text-muted-foreground">|</span>
        <span className="text-xs">Pudotus: {d.fade}</span>
      </div>
      <div className="mt-1">
        <StabilityBadge stability={d.stability} />
      </div>
    </div>
  );
}

// ==========================================
// Gap analysis logic — uses stability field from API
// ==========================================
function analyzeGaps(discs: BagDisc[]): GapReport[] {
  const reports: GapReport[] = [];

  const categories = ['Putter', 'Midrange', 'Control Driver', 'Hybrid Driver', 'Distance Driver'];

  for (const cat of categories) {
    const catDiscs = discs.filter((d) => d.category === cat);
    const gaps: GapItem[] = [];

    // Check for no discs in category
    if (catDiscs.length === 0) {
      gaps.push({
        description: `Laukustasi puuttuu ${getCategoryLabel(cat).toLowerCase()}`,
        severity: cat === 'Putter' || cat === 'Midrange' ? 'high' : 'medium',
        existingCount: 0,
      });
      reports.push({ category: cat, gaps });
      continue;
    }

    // Check stability coverage using the stability field from the API
    const hasUnderstable = catDiscs.some((d) => d.stability.includes('Understable'));
    const hasStable = catDiscs.some((d) => d.stability === 'Stable');
    const hasOverstable = catDiscs.some((d) => d.stability.includes('Overstable'));

    if (!hasUnderstable) {
      gaps.push({
        description: `Ei alivakaata ${getCategorySingular(cat)}`,
        severity: cat === 'Putter' ? 'high' : 'medium',
        suggestedStability: 'Understable',
        existingCount: catDiscs.length,
      });
    }

    if (!hasOverstable) {
      gaps.push({
        description: `Ei ylivakaata ${getCategorySingular(cat)}`,
        severity: cat.includes('Distance') ? 'high' : 'medium',
        suggestedStability: 'Overstable',
        existingCount: catDiscs.length,
      });
    }

    // Check for only one disc in critical categories
    if (cat === 'Putter' && catDiscs.length === 1) {
      gaps.push({
        description: 'Vain yksi putti',
        severity: 'medium',
        suggestedStability: 'Stable',
        existingCount: 1,
      });
    }

    if (cat === 'Midrange' && catDiscs.length === 1) {
      gaps.push({
        description: 'Vain yksi midari',
        severity: 'low',
        existingCount: 1,
      });
    }

    reports.push({ category: cat, gaps });
  }

  return reports;
}

function getSeverityColor(severity: string) {
  if (severity === 'high') return 'text-red-600 dark:text-red-400 bg-red-500/15';
  if (severity === 'medium') return 'text-orange-600 dark:text-orange-400 bg-orange-500/15';
  return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/15';
}

function getSeverityLabel(severity: string) {
  if (severity === 'high') return 'Korkea';
  if (severity === 'medium') return 'Keskitaso';
  return 'Matala';
}

// ==========================================
// Tab content components
// ==========================================

function BagTab({
  discs,
  bagName,
  onRemoveDisc,
  onSearchClick,
}: {
  discs: BagDisc[];
  bagName: string;
  onRemoveDisc: (disc: BagDisc) => void;
  onSearchClick: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(bagName);

  const grouped = useMemo(() => {
    const map = new Map<string, BagDisc[]>();
    for (const disc of discs) {
      const cat = disc.category || 'Muu';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(disc);
    }
    // Sort by category order
    const sorted = [...map.entries()].sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return sorted;
  }, [discs]);

  if (discs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="flex items-center justify-center size-20 rounded-2xl bg-muted mb-6">
          <Backpack className="size-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Laukkusi on tyhjä</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
          Hae kiekkoja DiscIt-tietokannasta ja lisää ne laukkuusi
        </p>
        <Button
          onClick={onSearchClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          <Search className="size-4 mr-2" />
          Hae kiekkoja
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-8 text-sm w-40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingName(false);
                  if (e.key === 'Escape') {
                    setNameValue(bagName);
                    setEditingName(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setEditingName(false)}
              >
                <Check className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{bagName}</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setEditingName(true)}
              >
                <Pencil className="size-3" />
              </Button>
            </div>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {discs.length} kiekko{discs.length !== 1 ? 'a' : ''}
        </Badge>
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {grouped.map(([category, catDiscs]) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{getCategoryIcon(category)}</span>
              <h4 className="font-medium text-sm">{getCategoryLabel(category)}</h4>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {catDiscs.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {catDiscs.map((disc, i) => (
                  <motion.div
                    key={disc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    layout
                  >
                    <div className="group flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      {/* Flight path thumbnail */}
                      {disc.pic ? (
                        <div className="size-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          <img
                            src={disc.pic}
                            alt={`${disc.name} lento`}
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="size-10 rounded-md bg-muted shrink-0 flex items-center justify-center">
                          <Disc3 className="size-5 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{disc.name}</p>
                          <StabilityBadge stability={disc.stability} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{disc.brand}</span>
                          <div className="flex items-center gap-0.5">
                            <FlightPill value={disc.speed} label="Nopeus" />
                            <FlightPill value={disc.glide} label="Liito" />
                            <FlightPill value={disc.turn} label="Kaarto" />
                            <FlightPill value={disc.fade} label="Pudotus" />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
                        onClick={() => onRemoveDisc(disc)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SearchTab({
  bagDiscs,
  onAddDisc,
  addPending,
}: {
  bagDiscs: BagDisc[];
  onAddDisc: (disc: Disc) => void;
  addPending: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filters = useMemo(() => ({
    category: categoryFilter !== 'all' && categoryFilter !== 'other'
      ? categoryFilter
      : undefined,
    brand: brandFilter !== 'all' ? brandFilter : undefined,
  }), [categoryFilter, brandFilter]);

  const adjustedFilters = useMemo(() => {
    if (categoryFilter === 'other') {
      return {
        ...filters,
        category: undefined,
      };
    }
    return filters;
  }, [filters, categoryFilter]);

  const { data, isLoading, error } = useDiscSearch(debouncedQuery, adjustedFilters);

  const bagDiscIds = useMemo(
    () => new Set(bagDiscs.map((d) => d.discId)),
    [bagDiscs]
  );

  const filteredDiscs = useMemo(() => {
    if (!data?.discs) return [];
    if (categoryFilter !== 'other') return data.discs;
    // "Other" category = Hybrid Driver, Control Driver, Approach
    return data.discs.filter(
      (d) =>
        d.category === 'Hybrid Driver' ||
        d.category === 'Control Driver' ||
        d.category === 'Approach'
    );
  }, [data, categoryFilter]);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Hae kiekkoa (esim. Destroyer, Wraith...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {SEARCH_CATEGORY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={categoryFilter === opt.value ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs px-2.5 ${categoryFilter === opt.value ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              onClick={() => setCategoryFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger size="sm" className="h-7 text-xs w-auto min-w-[120px]">
            <SelectValue placeholder="Merkki" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki merkit</SelectItem>
            {POPULAR_BRANDS.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {debouncedQuery.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Disc3 className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Kirjoita vähintään 2 merkkiä hakeaksesi
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-emerald-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="size-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Haku epäonnistui</p>
          <p className="text-xs text-muted-foreground mt-1">Yritä myöhemmin uudelleen</p>
        </div>
      ) : filteredDiscs.length === 0 ? (
        <div className="text-center py-12">
          <Search className="size-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ei tuloksia</p>
          <p className="text-xs text-muted-foreground mt-1">Kokeile eri hakusanoja tai suodattimia</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-3">
            <p className="text-xs text-muted-foreground mb-2">
              {filteredDiscs.length} kiekko{filteredDiscs.length !== 1 ? 'a' : ''} löydetty
            </p>
            <AnimatePresence mode="popLayout">
              {filteredDiscs.map((disc, i) => {
                const isInBag = bagDiscIds.has(disc.id);
                return (
                  <motion.div
                    key={disc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    layout
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Flight path image */}
                          {disc.pic ? (
                            <div className="size-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                              <img
                                src={disc.pic}
                                alt={`${disc.name} lento`}
                                className="w-full h-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="size-12 rounded-md bg-muted shrink-0 flex items-center justify-center">
                              <Disc3 className="size-6 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{disc.name}</p>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] h-5 px-1.5 ${CATEGORY_BG[disc.category] || 'bg-muted text-muted-foreground'}`}
                              >
                                {getCategoryLabel(disc.category)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{disc.brand}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center gap-0.5">
                                <FlightPill
                                  value={parseInt(disc.speed) || 0}
                                  label="Nopeus"
                                />
                                <FlightPill
                                  value={parseInt(disc.glide) || 0}
                                  label="Liito"
                                />
                                <FlightPill
                                  value={parseInt(disc.turn) || 0}
                                  label="Kaarto"
                                />
                                <FlightPill
                                  value={parseInt(disc.fade) || 0}
                                  label="Pudotus"
                                />
                              </div>
                              <StabilityBadge stability={disc.stability} />
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isInBag ? (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs"
                              >
                                Lisätty ✓
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={addPending}
                                onClick={() => onAddDisc(disc)}
                              >
                                {addPending ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Plus className="size-3.5 mr-1" />
                                    Lisää
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ==========================================
// Enhanced Flight Tab with disc detail cards
// ==========================================
function FlightTab({ discs }: { discs: BagDisc[] }) {
  const [selectedDisc, setSelectedDisc] = useState<BagDisc | null>(null);

  const chartData = useMemo(
    () =>
      discs.map((d) => ({
        id: d.discId,
        name: d.name,
        brand: d.brand,
        speed: d.speed,
        glide: d.glide,
        turn: d.turn,
        fade: d.fade,
        category: d.category,
        stability: d.stability,
        pic: d.pic,
      })),
    [discs]
  );

  const categoriesInBag = useMemo(() => {
    const cats = new Set(discs.map((d) => d.category));
    return CATEGORY_ORDER.filter((c) => cats.has(c));
  }, [discs]);

  if (discs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Disc3 className="size-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Lisää kiekkoja laukkuusi nähdäksesi lentokuvion
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scatter chart */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          Vaaka: Kaarto (alivakaa vasemmalla, ylivakaa oikealla) · Pysty: Nopeus
        </p>
        <div className="w-full h-[300px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="turn"
                name="Kaarto"
                domain={[-5, 2]}
                ticks={[-5, -4, -3, -2, -1, 0, 1]}
                reversed
                label={{ value: 'Kaarto', position: 'bottom', offset: 5, className: 'text-xs fill-muted-foreground' }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="speed"
                name="Nopeus"
                domain={[1, 15]}
                ticks={[1, 3, 5, 7, 9, 11, 13, 15]}
                label={{ value: 'Nopeus', angle: -90, position: 'insideLeft', offset: 10, className: 'text-xs fill-muted-foreground' }}
                tick={{ fontSize: 11 }}
              />
              <ZAxis type="number" range={[60, 200]} />
              <Tooltip content={<FlightChartTooltip />} />
              {categoriesInBag.map((cat) => (
                <Scatter
                  key={cat}
                  name={getCategoryLabel(cat)}
                  data={chartData.filter((d) => d.category === cat)}
                  fill={CATEGORY_COLORS[cat] || '#8884d8'}
                  opacity={0.8}
                  onClick={(data) => {
                    const disc = discs.find(d => d.discId === data.id);
                    if (disc) setSelectedDisc(disc);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {categoriesInBag.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span className="text-xs text-muted-foreground">{getCategoryLabel(cat)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected disc detail */}
      {selectedDisc && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Flight path image */}
                {selectedDisc.pic ? (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    <img
                      src={selectedDisc.pic}
                      alt={`${selectedDisc.name} lentokuva`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                    <Disc3 className="size-10 text-muted-foreground/30" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-base">{selectedDisc.name}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground"
                      onClick={() => setSelectedDisc(null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedDisc.brand}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${CATEGORY_BG[selectedDisc.category] || 'bg-muted'}`}
                    >
                      {getCategoryLabel(selectedDisc.category)}
                    </Badge>
                    <StabilityBadge stability={selectedDisc.stability} />
                  </div>

                  {/* Flight numbers */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold">{selectedDisc.speed}</p>
                      <p className="text-[10px] text-muted-foreground">Nopeus</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{selectedDisc.glide}</p>
                      <p className="text-[10px] text-muted-foreground">Liito</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{selectedDisc.turn}</p>
                      <p className="text-[10px] text-muted-foreground">Kaarto</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{selectedDisc.fade}</p>
                      <p className="text-[10px] text-muted-foreground">Pudotus</p>
                    </div>
                  </div>

                  {/* Link to Marshall Street */}
                  {selectedDisc.link && (
                    <a
                      href={selectedDisc.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-2 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Marshall Street
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disc grid with flight path images */}
      <div>
        <h4 className="text-sm font-medium mb-3">Kiekkojen lentoprofiilit</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {discs
            .sort((a, b) => {
              const ai = CATEGORY_ORDER.indexOf(a.category);
              const bi = CATEGORY_ORDER.indexOf(b.category);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            })
            .map((disc) => (
            <motion.div
              key={disc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className={`cursor-pointer rounded-lg border p-2 transition-colors ${selectedDisc?.id === disc.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30' : 'bg-card hover:bg-muted/30'}`}
              onClick={() => setSelectedDisc(selectedDisc?.id === disc.id ? null : disc)}
            >
              {/* Flight path thumbnail */}
              <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted mb-2 flex items-center justify-center">
                {disc.pic ? (
                  <img
                    src={disc.pic}
                    alt={`${disc.name} lentokuva`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <Disc3 className="size-8 text-muted-foreground/30" />
                )}
              </div>
              <p className="text-xs font-medium truncate">{disc.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{disc.brand}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono">{disc.speed}/{disc.glide}/{disc.turn}/{disc.fade}</span>
                <StabilityBadge stability={disc.stability} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GapsTab({ discs }: { discs: BagDisc[] }) {
  const gapReports = useMemo(() => analyzeGaps(discs), [discs]);
  const allGaps = gapReports.flatMap((r) => r.gaps);
  const hasGaps = allGaps.length > 0;

  return (
    <div className="space-y-4">
      {!hasGaps ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="flex items-center justify-center size-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 mb-4">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Laukkusi on tasapainoinen!</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Kiekkojesi vakauden ja tyyppijakauma näyttää hyvältä
          </p>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="size-5 text-orange-600 dark:text-orange-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {allGaps.length} puutetta havaittu
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Tarkista alla olevat suositukset tasapainottaaksesi kiekkovalikoimaasi
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {gapReports
              .filter((r) => r.gaps.length > 0)
              .map((report) => (
                <motion.div
                  key={report.category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span>{getCategoryIcon(report.category)}</span>
                        {getCategoryLabel(report.category)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                      {report.gaps.map((gap, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2.5 rounded-lg ${getSeverityColor(gap.severity)}`}
                        >
                          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{gap.description}</p>
                            {gap.suggestedStability && (
                              <p className="text-xs mt-0.5 opacity-80">
                                Suositus: {getStabilityLabel(gap.suggestedStability)} kiekko
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-5 px-1.5 shrink-0 ${getSeverityColor(gap.severity)}`}
                          >
                            {getSeverityLabel(gap.severity)}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        </>
      )}

      {/* Summary stats */}
      {discs.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Laukun yhteenveto</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_ORDER.map((cat) => {
                const count = discs.filter((d) => d.category === cat).length;
                if (count === 0) return null;
                const catDiscs = discs.filter((d) => d.category === cat);
                const hasUnderstable = catDiscs.some((d) => d.stability.includes('Understable'));
                const hasOverstable = catDiscs.some((d) => d.stability.includes('Overstable'));
                return (
                  <div
                    key={cat}
                    className={`flex items-center gap-2 p-2 rounded-lg ${CATEGORY_BG[cat] || 'bg-muted'}`}
                  >
                    <span className="text-sm">{getCategoryIcon(cat)}</span>
                    <div>
                      <p className="text-xs font-medium">{getCategoryLabel(cat)}</p>
                      <p className="text-[10px] opacity-80">
                        {count} kiekko{count !== 1 ? 'a' : ''}
                        {!hasUnderstable && ' · ⚠️ Ei aliv.'}
                        {!hasOverstable && ' · ⚠️ Ei yliv.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// Main component
// ==========================================
export function MyBagView() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('bag');
  const [removeDialog, setRemoveDialog] = useState<BagDisc | null>(null);

  const { data: bagData, isLoading: bagLoading, error: bagError } = useBag();
  const addDisc = useAddDiscToBag();
  const removeDisc = useRemoveDiscFromBag();

  const queryClient = useQueryClient();

  const bag = bagData?.bags?.[0] ?? null;
  const discs = bag?.discs ?? [];
  const bagName = bag?.name ?? 'Minun laukkuni';

  const handleAddDisc = useCallback(
    (disc: Disc) => {
      // If bag doesn't exist yet, refetch to trigger auto-create on server, then try again
      if (!bag?.id) {
        queryClient.invalidateQueries({ queryKey: ['bag'] });
        toast.error('Laukkua ei löydy', { description: 'Yritä uudelleen hetken kuluttua' });
        return;
      }
      addDisc.mutate(
        {
          bagId: bag.id,
          discId: disc.id,
          name: disc.name,
          brand: disc.brand,
          category: disc.category,
          speed: parseInt(disc.speed) || 0,
          glide: parseInt(disc.glide) || 0,
          turn: parseInt(disc.turn) || 0,
          fade: parseInt(disc.fade) || 0,
          stability: disc.stability,
          pic: disc.pic || undefined,
          link: disc.link || undefined,
        },
        {
          onSuccess: () => {
            toast.success('Kiekko lisätty!', {
              description: `${disc.name} lisätty laukkuusi`,
            });
          },
          onError: () => {
            toast.error('Lisäys epäonnistui', {
              description: 'Kiekkoa ei voitu lisätä laukkuun',
            });
          },
        }
      );
    },
    [addDisc, bag, queryClient]
  );

  const handleRemoveDisc = useCallback(
    (disc: BagDisc) => {
      removeDisc.mutate(
        { bagId: disc.bagId, discId: disc.discId },
        {
          onSuccess: () => {
            toast.success('Kiekko poistettu', {
              description: `${disc.name} poistettu laukusta`,
            });
            setRemoveDialog(null);
          },
          onError: () => {
            toast.error('Poisto epäonnistui', {
              description: 'Kiekkoa ei voitu poistaa',
            });
          },
        }
      );
    },
    [removeDisc]
  );

  // Not authenticated state
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
          <Backpack className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Kirjaudu sisään</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Kirjaudu sisään tallentaaksesi ja hallitaksesi kiekkolaukkuasi
        </p>
      </div>
    );
  }

  // Loading state
  if (authLoading || bagLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
          <Backpack className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Kiekkolaukku</h2>
          <p className="text-xs text-muted-foreground">
            {discs.length > 0
              ? `${discs.length} kiekko${discs.length !== 1 ? 'a' : ''} laukussa`
              : 'Hallitse kiekkojasi'}
          </p>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="bag" className="text-xs gap-1">
            <span>🎒</span>
            <span>Laukku</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs gap-1">
            <span>🔍</span>
            <span>Hae</span>
          </TabsTrigger>
          <TabsTrigger value="flight" className="text-xs gap-1">
            <span>📊</span>
            <span>Lento</span>
          </TabsTrigger>
          <TabsTrigger value="gaps" className="text-xs gap-1">
            <span>📋</span>
            <span>Puutteet</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bag">
          <BagTab
            discs={discs}
            bagName={bagName}
            onRemoveDisc={(disc) => setRemoveDialog(disc)}
            onSearchClick={() => setActiveTab('search')}
          />
        </TabsContent>

        <TabsContent value="search">
          <SearchTab
            bagDiscs={discs}
            onAddDisc={handleAddDisc}
            addPending={addDisc.isPending}
          />
        </TabsContent>

        <TabsContent value="flight">
          <FlightTab discs={discs} />
        </TabsContent>

        <TabsContent value="gaps">
          <GapsTab discs={discs} />
        </TabsContent>
      </Tabs>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeDialog} onOpenChange={(open) => !open && setRemoveDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Poista kiekko</DialogTitle>
            <DialogDescription>
              Haluatko varmasti poistaa kiekon <strong>{removeDialog?.name}</strong> laukusta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRemoveDialog(null)}
              disabled={removeDisc.isPending}
            >
              Peruuta
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeDialog && handleRemoveDisc(removeDialog)}
              disabled={removeDisc.isPending}
            >
              {removeDisc.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Poista'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
