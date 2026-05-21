import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/bags - List user's bags (with disc count). Auto-creates primary bag if none exists.
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ bags: [] }, { status: 200 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ bags: [] }, { status: 200 });
    }

    // Use admin client for reliable reads (bypasses RLS)
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    // Fetch bags with disc count
    const { data: bags, error } = await client
      .from('disc_bags')
      .select('*, bag_discs(count)')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ bags: [], error: error.message }, { status: 500 });
    }

    // Auto-create primary bag if none exists
    if (!bags || bags.length === 0) {
      const { data: newBag, error: createError } = await client
        .from('disc_bags')
        .insert({
          user_id: user.id,
          name: 'Päälaukku',
          is_primary: true,
        })
        .select('*, bag_discs(count)')
        .single();

      if (createError || !newBag) {
        return NextResponse.json({ bags: [], error: createError?.message }, { status: 500 });
      }

      return NextResponse.json({
        bags: [mapBag(newBag)],
      });
    }

    return NextResponse.json({
      bags: bags.map(mapBag),
    });
  } catch {
    return NextResponse.json({ bags: [] }, { status: 200 });
  }
}

// POST /api/bags - Create a new bag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid bag name' }, { status: 400 });
    }

    // Use admin client for reliable writes
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    const { data: bag, error } = await client
      .from('disc_bags')
      .insert({
        user_id: user.id,
        name: name.trim(),
        is_primary: false,
      })
      .select('*, bag_discs(count)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Bag with this name already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bag: mapBag(bag) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: map a Supabase bag row (with bag_discs count) to camelCase response
function mapBag(bag: Record<string, unknown>) {
  const bagDiscs = bag.bag_discs as { count: number }[] | { count: number } | undefined;
  const discCount = Array.isArray(bagDiscs) ? (bagDiscs[0]?.count ?? 0) : (bagDiscs?.count ?? 0);
  return {
    id: bag.id as string,
    userId: bag.user_id as string,
    name: bag.name as string,
    isPrimary: bag.is_primary as boolean,
    discCount: typeof discCount === 'number' ? discCount : Number(discCount),
    createdAt: bag.created_at as string,
    updatedAt: bag.updated_at as string,
  };
}
