import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// In-memory cache for DiscIt API disc details (for enrichment when DB columns are missing)
interface DiscDetailCacheEntry {
  details: Record<string, unknown>;
  timestamp: number;
}
const discDetailCache = new Map<string, DiscDetailCacheEntry>();
const DISC_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function mapCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes('putter')) return 'putter';
  if (cat.includes('midrange') || cat.includes('mid-range')) return 'midrange';
  if (cat.includes('fairway') || cat.includes('control')) return 'fairway';
  if (cat.includes('distance') || cat.includes('driver')) return 'distance';
  return cat;
}

function mapStability(stability: string): string {
  const s = stability.toLowerCase();
  if (s.includes('overstable')) return 'overstable';
  if (s.includes('understable')) return 'understable';
  if (s.includes('stable')) return 'stable';
  return s;
}

async function fetchDiscDetailsFromDiscIt(discId: string): Promise<Record<string, unknown> | null> {
  const cached = discDetailCache.get(discId);
  if (cached && Date.now() - cached.timestamp < DISC_CACHE_TTL) {
    return cached.details;
  }

  try {
    const response = await fetch(`https://discit-api.fly.dev/disc/${discId}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (response.ok) {
      const disc = await response.json();
      const details = {
        disc_name: disc.name ?? null,
        brand: disc.brand ?? null,
        category: mapCategory(String(disc.category ?? '')),
        speed: disc.speed != null ? Number(disc.speed) : null,
        glide: disc.glide != null ? Number(disc.glide) : null,
        turn: disc.turn != null ? Number(disc.turn) : null,
        fade: disc.fade != null ? Number(disc.fade) : null,
        stability: mapStability(String(disc.stability ?? '')),
        pic: disc.pic ? String(disc.pic) : null,
        link: disc.link ? String(disc.link) : null,
      };
      discDetailCache.set(discId, { details, timestamp: Date.now() });
      return details;
    }

    const searchName = discId.split('-').pop() || discId;
    const searchResponse = await fetch(`https://discit-api.fly.dev/disc?name=${encodeURIComponent(searchName)}`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (searchResponse.ok) {
      const results = await searchResponse.json();
      if (Array.isArray(results) && results.length > 0) {
        const disc = results.find((d: Record<string, unknown>) => String(d.id) === discId) || results[0];
        const details = {
          disc_name: disc.name ?? null,
          brand: disc.brand ?? null,
          category: mapCategory(String(disc.category ?? '')),
          speed: disc.speed != null ? Number(disc.speed) : null,
          glide: disc.glide != null ? Number(disc.glide) : null,
          turn: disc.turn != null ? Number(disc.turn) : null,
          fade: disc.fade != null ? Number(disc.fade) : null,
          stability: mapStability(String(disc.stability ?? '')),
          pic: disc.pic ? String(disc.pic) : null,
          link: disc.link ? String(disc.link) : null,
        };
        discDetailCache.set(discId, { details, timestamp: Date.now() });
        return details;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function enrichDiscData(discs: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  const needsEnrichment = discs.some(d => !d.disc_name);
  if (!needsEnrichment) return discs;

  const enriched = await Promise.all(
    discs.map(async (disc) => {
      if (disc.disc_name) return disc;

      const discId = String(disc.disc_id || '');
      if (!discId) return disc;

      const details = await fetchDiscDetailsFromDiscIt(discId);
      if (!details) return disc;

      return { ...details, ...disc };
    })
  );

  return enriched;
}

// GET /api/users/[id]/bag - Get a user's primary bag with discs (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ bag: null, discs: [] }, { status: 200 });
    }

    const { id: userId } = await params;

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    // Get user's primary bag
    const { data: bags } = await clientToUse
      .from('disc_bags')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (!bags || bags.length === 0) {
      return NextResponse.json({ bag: null, discs: [] });
    }

    const primaryBag = bags[0];

    // Get discs in the bag
    const { data: discs, error } = await clientToUse
      .from('bag_discs')
      .select('*')
      .eq('bag_id', primaryBag.id)
      .order('added_at', { ascending: true });

    if (error) {
      return NextResponse.json({ bag: null, discs: [] }, { status: 200 });
    }

    // Enrich disc data with DiscIt API if columns are missing
    const enrichedDiscs = await enrichDiscData((discs ?? []) as Record<string, unknown>[]);

    const mapBagDisc = (disc: Record<string, unknown>) => ({
      id: disc.id,
      bagId: disc.bag_id,
      discId: disc.disc_id,
      discName: disc.disc_name || disc.disc_id || 'Tuntematon kiekko',
      brand: disc.brand ?? null,
      category: disc.category ?? null,
      speed: disc.speed !== null && disc.speed !== undefined ? Number(disc.speed) : null,
      glide: disc.glide !== null && disc.glide !== undefined ? Number(disc.glide) : null,
      turn: disc.turn !== null && disc.turn !== undefined ? Number(disc.turn) : null,
      fade: disc.fade !== null && disc.fade !== undefined ? Number(disc.fade) : null,
      stability: disc.stability ?? null,
      pic: disc.pic ?? null,
      link: disc.link ?? null,
      notes: disc.notes ?? null,
      addedAt: disc.added_at,
    });

    return NextResponse.json({
      bag: {
        id: primaryBag.id,
        userId: primaryBag.user_id,
        name: primaryBag.name,
        isPrimary: primaryBag.is_primary,
        createdAt: primaryBag.created_at,
        updatedAt: primaryBag.updated_at,
      },
      discs: enrichedDiscs.map(mapBagDisc),
    });
  } catch (err) {
    console.error('User bag fetch error:', err);
    return NextResponse.json({ bag: null, discs: [] }, { status: 200 });
  }
}
