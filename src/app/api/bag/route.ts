import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/bag — Get user's bag(s) with discs
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ bags: [], error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: bags, error: bagsError } = await supabase
      .from('disc_bags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (bagsError) {
      // Check if the error is because the table doesn't exist
      if (bagsError.message?.includes('does not exist') || bagsError.code === '42P01') {
        return NextResponse.json({
          bags: [],
          error: 'Bag tables not created yet. Please run the bag migration SQL in your Supabase SQL Editor.',
          needsMigration: true,
        }, { status: 503 });
      }
      return NextResponse.json({ bags: [], error: bagsError.message }, { status: 500 });
    }

    if (!bags || bags.length === 0) {
      const adminClient = await createSupabaseAdminClient();
      const clientToUse = adminClient || supabase;

      const { data: newBag, error: createError } = await clientToUse
        .from('disc_bags')
        .insert({
          user_id: user.id,
          name: 'Minun laukku',
          is_primary: true,
        })
        .select()
        .single();

      if (createError || !newBag) {
        return NextResponse.json({ bags: [], error: createError?.message || 'Failed to create bag' }, { status: 500 });
      }

      return NextResponse.json({
        bags: [{
          id: newBag.id,
          userId: newBag.user_id,
          name: newBag.name,
          isPrimary: newBag.is_primary,
          discs: [],
          createdAt: newBag.created_at,
          updatedAt: newBag.updated_at,
        }],
      });
    }

    const bagIds = bags.map(b => b.id);

    const { data: allDiscs, error: discsError } = await supabase
      .from('bag_discs')
      .select('*')
      .in('bag_id', bagIds)
      .order('added_at', { ascending: true });

    if (discsError) {
      return NextResponse.json({ bags: [], error: discsError.message }, { status: 500 });
    }

    const discsByBag = new Map<string, typeof allDiscs>();
    for (const disc of allDiscs ?? []) {
      const list = discsByBag.get(disc.bag_id) ?? [];
      list.push(disc);
      discsByBag.set(disc.bag_id, list);
    }

    const enrichedBags = bags.map(bag => ({
      id: bag.id,
      userId: bag.user_id,
      name: bag.name,
      isPrimary: bag.is_primary,
      discs: (discsByBag.get(bag.id) ?? []).map(d => ({
        id: d.id,
        bagId: d.bag_id,
        discId: d.disc_id,
        name: d.name,
        brand: d.brand,
        category: d.category,
        speed: d.speed,
        glide: d.glide,
        turn: d.turn,
        fade: d.fade,
        stability: d.stability,
        addedAt: d.added_at,
      })),
      createdAt: bag.created_at,
      updatedAt: bag.updated_at,
    }));

    return NextResponse.json({ bags: enrichedBags });
  } catch (error) {
    console.error('Bag GET error:', error);
    return NextResponse.json({ bags: [], error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/bag — Create a new bag
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

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    const { data: bag, error } = await clientToUse
      .from('disc_bags')
      .insert({
        user_id: user.id,
        name: name.trim(),
        is_primary: false,
      })
      .select()
      .single();

    if (error || !bag) {
      return NextResponse.json({ error: error?.message || 'Failed to create bag' }, { status: 500 });
    }

    return NextResponse.json({
      bag: {
        id: bag.id,
        userId: bag.user_id,
        name: bag.name,
        isPrimary: bag.is_primary,
        discs: [],
        createdAt: bag.created_at,
        updatedAt: bag.updated_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Bag POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/bag — Update bag name
export async function PATCH(request: NextRequest) {
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
    const { bagId, name } = body;

    if (!bagId || !name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid bagId or name' }, { status: 400 });
    }

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    const { data: existing, error: checkError } = await clientToUse
      .from('disc_bags')
      .select('id')
      .eq('id', bagId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    const { data: bag, error } = await clientToUse
      .from('disc_bags')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', bagId)
      .select()
      .single();

    if (error || !bag) {
      return NextResponse.json({ error: error?.message || 'Failed to update bag' }, { status: 500 });
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
  } catch (error) {
    console.error('Bag PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bag — Delete a bag
export async function DELETE(request: NextRequest) {
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
    const { bagId } = body;

    if (!bagId) {
      return NextResponse.json({ error: 'Missing bagId' }, { status: 400 });
    }

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    const { data: existing, error: checkError } = await clientToUse
      .from('disc_bags')
      .select('id, is_primary')
      .eq('id', bagId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    if (existing.is_primary) {
      return NextResponse.json({ error: 'Cannot delete primary bag' }, { status: 400 });
    }

    const { error } = await clientToUse
      .from('disc_bags')
      .delete()
      .eq('id', bagId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bag DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
