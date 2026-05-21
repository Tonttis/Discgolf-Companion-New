import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for DiscIt API results (5-minute TTL)
interface CacheEntry {
  results: DiscSearchResult[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface DiscSearchResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  speed: number;
  glide: number;
  turn: number;
  fade: number;
  stability: string;
  pic: string | null;
  link: string | null;
}

// Map DiscIt category strings to our internal categories
function mapCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('putter')) return 'putter';
  if (cat.includes('midrange') || cat.includes('mid-range')) return 'midrange';
  if (cat.includes('fairway') || cat.includes('control')) return 'fairway';
  if (cat.includes('distance') || cat.includes('driver')) return 'distance';
  return cat;
}

// Map DiscIt stability strings to our internal stability values
function mapStability(stability: string): string {
  const s = stability.toLowerCase();
  if (s.includes('overstable')) return 'overstable';
  if (s.includes('understable')) return 'understable';
  if (s.includes('stable')) return 'stable';
  return s;
}

// GET /api/discs/search - Proxy search to DiscIt API with in-memory caching
// DiscIt API docs: https://discit-api.fly.dev/reference
// Endpoint: GET /disc?name=searchterm&brand=brandfilter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    const brand = searchParams.get('brand');

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ discs: [] }, { status: 200 });
    }

    const searchTerm = q.trim();
    const brandFilter = brand?.trim() ?? '';
    const cacheKey = `${searchTerm.toLowerCase()}:${brandFilter.toLowerCase()}`;

    // Check cache
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ discs: cached.results });
    }

    // Build DiscIt API URL — use name param for search
    const params = new URLSearchParams();
    params.set('name', searchTerm);
    if (brandFilter) params.set('brand', brandFilter);

    const apiUrl = `https://discit-api.fly.dev/disc?${params.toString()}`;
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { discs: [], error: 'Failed to fetch from DiscIt API' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // DiscIt API returns an array of disc objects
    // Fields: id, name, brand, category, speed (string), glide (string), turn (string), fade (string),
    //         stability, link, pic, name_slug, brand_slug, category_slug, stability_slug, color, background_color
    const results: DiscSearchResult[] = (Array.isArray(data) ? data : []).map(
      (disc: Record<string, unknown>) => ({
        id: String(disc.id),
        name: String(disc.name ?? ''),
        brand: String(disc.brand ?? ''),
        category: mapCategory(String(disc.category ?? '')),
        speed: disc.speed != null ? Number(disc.speed) : 0,
        glide: disc.glide != null ? Number(disc.glide) : 0,
        turn: disc.turn != null ? Number(disc.turn) : 0,
        fade: disc.fade != null ? Number(disc.fade) : 0,
        stability: mapStability(String(disc.stability ?? '')),
        pic: disc.pic ? String(disc.pic) : null,
        link: disc.link ? String(disc.link) : null,
      })
    );

    // Cache the results
    searchCache.set(cacheKey, { results, timestamp: Date.now() });

    // Prune stale entries periodically (simple cleanup)
    if (searchCache.size > 200) {
      const now = Date.now();
      for (const [key, entry] of searchCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
          searchCache.delete(key);
        }
      }
    }

    return NextResponse.json({ discs: results });
  } catch {
    return NextResponse.json(
      { discs: [], error: 'Internal server error' },
      { status: 500 }
    );
  }
}
