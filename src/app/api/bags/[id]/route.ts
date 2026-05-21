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
    // Try direct lookup by ID first
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

    // Fallback: try search by name derived from disc_id
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

// GET /api/bags/[id] - Get a single bag with all its discs
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { id } = await params;

    // Use admin client for reliable reads
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    const { data: bag, error: bagError } = await client
      .from('disc_bags')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (bagError || !bag) {
      return NextResponse.json({ error: 'Bag not found' }, { status: 404 });
    }

    const { data: discs, error: discsError } = await client
      .from('bag_discs')
      .select('*')
      .eq('bag_id', id)
      .order('added_at', { ascending: true });

    if (discsError) {
      return NextResponse.json({ error: discsError.message }, { status: 500 });
    }

    // Enrich disc data with DiscIt API if columns are missing
    const enrichedDiscs = await enrichDiscData((discs ?? []) as Record<string, unknown>[]);

    return NextResponse.json({
      bag: {
        id: bag.id,
        userId: bag.user_id,
        name: bag.name,
        isPrimary: bag.is_primary,
        createdAt: bag.created_at,
        updatedAt: bag.updated_at,
      },
      discs: enrichedDiscs.map(mapBagDisc),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/bags/[id] - Update bag name
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid bag name' }, { status: 400 });
    }

    // Use admin client for reliable writes
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    // Verify ownership first
    const { data: existingBag } = await client
      .from('disc_bags')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingBag || existingBag.user_id !== user.id) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    const { data: bag, error } = await client
      .from('disc_bags')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Bag with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bag) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    return NextResponse.json({
      bag: {
        id: bag.id,
        userId: bag.user_id,
        name: bag.name,
        isPrimary: bag.is_primary,
        createdAt: bag.created_at,
        updatedAt: bag.updated_at,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bags/[id] - Delete a bag (cascades to discs via FK)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    // Use admin client for reliable operations
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    // Prevent deletion of primary bag
    const { data: bag } = await client
      .from('disc_bags')
      .select('is_primary, user_id')
      .eq('id', id)
      .maybeSingle();

    if (!bag || bag.user_id !== user.id) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    if (bag.is_primary) {
      return NextResponse.json({ error: 'Cannot delete primary bag' }, { status: 400 });
    }

    const { error } = await client
      .from('disc_bags')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function mapBagDisc(disc: Record<string, unknown>) {
  return {
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
  };
}
