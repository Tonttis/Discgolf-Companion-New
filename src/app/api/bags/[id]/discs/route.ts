import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// In-memory cache for DiscIt API disc details (for enrichment)
interface DiscDetailCache {
  details: Record<string, unknown>;
  timestamp: number;
}
const discDetailCache = new Map<string, DiscDetailCache>();
const DISC_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

    if (!response.ok) {
      // Fallback: try search by name (discId is often a slug like "innova-destroyer")
      const searchName = discId.split('-').pop() || discId;
      const searchResponse = await fetch(`https://discit-api.fly.dev/disc?name=${encodeURIComponent(searchName)}`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      });

      if (searchResponse.ok) {
        const results = await searchResponse.json();
        if (Array.isArray(results) && results.length > 0) {
          const disc = results.find((d: Record<string, unknown>) => String(d.id) === discId) || results[0];
          const details = mapDiscItResult(disc);
          discDetailCache.set(discId, { details, timestamp: Date.now() });
          return details;
        }
      }
      return null;
    }

    const disc = await response.json();
    const details = mapDiscItResult(disc);
    discDetailCache.set(discId, { details, timestamp: Date.now() });
    return details;
  } catch {
    return null;
  }
}

function mapDiscItResult(disc: Record<string, unknown>): Record<string, unknown> {
  return {
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
}

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

// POST /api/bags/[id]/discs - Add disc(s) to a bag
// This handler is designed to be resilient to schema mismatches:
// 1. Try the add_disc_to_bag RPC function (if migration was applied)
// 2. Try a simple INSERT with just bag_id + disc_id (works on any schema)
// 3. If INSERT fails (duplicate), the disc is already in the bag — fetch and return it
export async function POST(
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

    const { id: bagId } = await params;

    // Verify bag ownership using admin client for reliable reads
    const adminClient = await createSupabaseAdminClient();
    const ownershipClient = adminClient || supabase;

    const { data: bag } = await ownershipClient
      .from('disc_bags')
      .select('id, user_id')
      .eq('id', bagId)
      .maybeSingle();

    if (!bag || bag.user_id !== user.id) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    const body = await request.json();
    const { discs } = body;

    if (!Array.isArray(discs) || discs.length === 0) {
      return NextResponse.json({ error: 'Missing or empty discs array' }, { status: 400 });
    }

    const client = adminClient || supabase;
    const results: Record<string, unknown>[] = [];

    for (const disc of discs) {
      const discId: string = disc.discId;
      const discName: string = disc.discName || discId;
      const result = await addSingleDisc(client, supabase, bagId, discId, discName, disc);
      if (result) {
        results.push(result);
      } else {
        return NextResponse.json({
          error: `Failed to add disc "${discName}". The database schema may need updating — please run the migration from Settings.`,
        }, { status: 500 });
      }
    }

    // Enrich the returned data with DiscIt API details
    const enrichedData = await enrichDiscData(results);

    return NextResponse.json({
      discs: enrichedData.map(mapBagDisc),
    }, { status: 201 });
  } catch (err) {
    console.error('Bag disc POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add a single disc to a bag, trying multiple strategies
async function addSingleDisc(
  client: NonNullable<Awaited<ReturnType<typeof createSupabaseAdminClient>>>,
  regularClient: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  bagId: string,
  discId: string,
  discName: string,
  disc: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  // Strategy 1: Try the add_disc_to_bag RPC function (SECURITY DEFINER)
  // This works if the migration has been applied and creates a function that
  // handles schema differences internally
  try {
    const { data: rpcData, error: rpcError } = await client.rpc('add_disc_to_bag', {
      p_bag_id: bagId,
      p_disc_id: discId,
      p_disc_name: discName,
      p_brand: disc.brand ?? null,
      p_category: disc.category ?? null,
      p_speed: disc.speed != null ? Number(disc.speed) : null,
      p_glide: disc.glide != null ? Number(disc.glide) : null,
      p_turn: disc.turn != null ? Number(disc.turn) : null,
      p_fade: disc.fade != null ? Number(disc.fade) : null,
      p_stability: disc.stability ?? null,
      p_pic: disc.pic ?? null,
      p_link: disc.link ?? null,
      p_notes: disc.notes ?? null,
    });

    if (!rpcError) {
      // RPC returned the new row ID — fetch the full row
      const { data: newRow } = await client
        .from('bag_discs')
        .select('*')
        .eq('id', rpcData)
        .maybeSingle();
      if (newRow) return newRow as Record<string, unknown>;

      // If we can't fetch by ID, construct a minimal result
      return { id: rpcData, bag_id: bagId, disc_id: discId, disc_name: discName };
    }

    // RPC not available or failed — log and try next strategy
    console.log('add_disc_to_bag RPC not available:', rpcError.message);
  } catch {
    // RPC not available, continue to next strategy
  }

  // Strategy 2: Try INSERT with full columns (works if migration was applied)
  const fullRow: Record<string, unknown> = {
    bag_id: bagId,
    disc_id: discId,
    disc_name: discName,
    brand: disc.brand ?? null,
    category: disc.category ?? null,
    speed: disc.speed != null ? disc.speed : null,
    glide: disc.glide != null ? disc.glide : null,
    turn: disc.turn != null ? disc.turn : null,
    fade: disc.fade != null ? disc.fade : null,
    stability: disc.stability ?? null,
    pic: disc.pic ?? null,
    link: disc.link ?? null,
    notes: disc.notes ?? null,
  };

  // Try upsert with full columns first
  const { data: fullData, error: fullError } = await client
    .from('bag_discs')
    .upsert(fullRow, { onConflict: 'bag_id,disc_id' })
    .select()
    .maybeSingle();

  if (!fullError && fullData) {
    return fullData as Record<string, unknown>;
  }

  if (fullError) {
    console.log('Full column upsert failed:', fullError.message, fullError.code);
  }

  // Strategy 3: Try INSERT with minimal columns only (bag_id, disc_id)
  // This works even if the table only has the basic columns
  const minimalRow = { bag_id: bagId, disc_id: discId };

  // Try plain INSERT first (no onConflict — works even without UNIQUE constraint)
  const { data: insertData, error: insertError } = await client
    .from('bag_discs')
    .insert(minimalRow)
    .select()
    .maybeSingle();

  if (!insertError && insertData) {
    return insertData as Record<string, unknown>;
  }

  if (insertError) {
    // If it's a unique violation (disc already in bag), that's OK — just fetch it
    if (insertError.code === '23505') {
      const { data: existing } = await client
        .from('bag_discs')
        .select('*')
        .eq('bag_id', bagId)
        .eq('disc_id', discId)
        .maybeSingle();
      if (existing) return existing as Record<string, unknown>;
    }

    console.log('Minimal insert failed:', insertError.message, insertError.code);

    // Try with the regular client instead
    const { data: regularInsert, error: regularError } = await regularClient
      .from('bag_discs')
      .insert(minimalRow)
      .select()
      .maybeSingle();

    if (!regularError && regularInsert) {
      return regularInsert as Record<string, unknown>;
    }

    if (regularError) {
      // Check if it's a unique violation — disc already in bag
      if (regularError.code === '23505') {
        const { data: existing } = await regularClient
          .from('bag_discs')
          .select('*')
          .eq('bag_id', bagId)
          .eq('disc_id', discId)
          .maybeSingle();
        if (existing) return existing as Record<string, unknown>;
      }

      console.log('Regular client insert also failed:', regularError.message, regularError.code);

      // Strategy 4: Maybe the table has disc_name as NOT NULL — try with disc_name
      const semiRow = { bag_id: bagId, disc_id: discId, disc_name: discName };

      const { data: semiData, error: semiError } = await client
        .from('bag_discs')
        .insert(semiRow)
        .select()
        .maybeSingle();

      if (!semiError && semiData) {
        return semiData as Record<string, unknown>;
      }

      if (semiError) {
        // Unique violation — disc already exists
        if (semiError.code === '23505') {
          const { data: existing } = await client
            .from('bag_discs')
            .select('*')
            .eq('bag_id', bagId)
            .eq('disc_id', discId)
            .maybeSingle();
          if (existing) return existing as Record<string, unknown>;
        }

        console.log('Semi-full insert also failed:', semiError.message, semiError.code);
      }
    }
  }

  return null;
}

// DELETE /api/bags/[id]/discs - Remove a disc from a bag
export async function DELETE(
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

    const { id: bagId } = await params;
    const body = await request.json();
    const { discId } = body;

    if (!discId) {
      return NextResponse.json({ error: 'Missing discId' }, { status: 400 });
    }

    // Verify bag ownership
    const adminClient = await createSupabaseAdminClient();
    const ownershipClient = adminClient || supabase;

    const { data: bag } = await ownershipClient
      .from('disc_bags')
      .select('id, user_id')
      .eq('id', bagId)
      .maybeSingle();

    if (!bag || bag.user_id !== user.id) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    // Try to delete using disc_id (the disc's unique identifier, not the row id)
    // This is more reliable than using the row 'id' since the client may not have it
    let deleted = false;
    let lastError: string | null = null;

    if (adminClient) {
      const { error } = await adminClient
        .from('bag_discs')
        .delete()
        .eq('bag_id', bagId)
        .eq('disc_id', discId);

      if (!error) {
        deleted = true;
      } else {
        console.error('Bag disc delete error (admin client):', error.message);
        lastError = error.message;

        // If disc_id column doesn't exist, try by row id
        const { error: error2 } = await adminClient
          .from('bag_discs')
          .delete()
          .eq('bag_id', bagId)
          .eq('id', discId);

        if (!error2) {
          deleted = true;
        } else {
          lastError = error2.message;
        }
      }
    }

    if (!deleted) {
      const { error } = await supabase
        .from('bag_discs')
        .delete()
        .eq('bag_id', bagId)
        .eq('disc_id', discId);

      if (!error) {
        deleted = true;
      } else {
        console.error('Bag disc delete error (regular client):', error.message);
        lastError = error.message;

        // Try by row id
        const { error: error2 } = await supabase
          .from('bag_discs')
          .delete()
          .eq('bag_id', bagId)
          .eq('id', discId);

        if (!error2) {
          deleted = true;
        } else {
          lastError = error2.message;
        }
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: lastError || 'Failed to delete disc' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Bag disc DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Enrich disc data with DiscIt API details when database columns are missing
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

      // Merge: database values take precedence, DiscIt fills in gaps
      return {
        ...details,
        ...disc,
      };
    })
  );

  return enriched;
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
