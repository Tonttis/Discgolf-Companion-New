import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// POST /api/bag/discs — Add disc to bag
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
    const { bagId, discId, name, brand, category, speed, glide, turn, fade, stability } = body;

    if (!bagId || !discId || !name || !brand || !category || !stability) {
      return NextResponse.json({ error: 'Missing required fields: bagId, discId, name, brand, category, stability' }, { status: 400 });
    }

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    const { data: bag, error: bagError } = await clientToUse
      .from('disc_bags')
      .select('id')
      .eq('id', bagId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bagError) {
      return NextResponse.json({ error: bagError.message }, { status: 500 });
    }

    if (!bag) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    const { data: existing, error: checkError } = await clientToUse
      .from('bag_discs')
      .select('*')
      .eq('bag_id', bagId)
      .eq('disc_id', discId)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        disc: {
          id: existing.id,
          bagId: existing.bag_id,
          discId: existing.disc_id,
          name: existing.name,
          brand: existing.brand,
          category: existing.category,
          speed: existing.speed,
          glide: existing.glide,
          turn: existing.turn,
          fade: existing.fade,
          stability: existing.stability,
          addedAt: existing.added_at,
        },
      });
    }

    const { data: disc, error } = await clientToUse
      .from('bag_discs')
      .insert({
        bag_id: bagId,
        disc_id: discId,
        name,
        brand,
        category,
        speed: speed ?? 0,
        glide: glide ?? 0,
        turn: turn ?? 0,
        fade: fade ?? 0,
        stability,
      })
      .select()
      .single();

    if (error || !disc) {
      return NextResponse.json({ error: error?.message || 'Failed to add disc to bag' }, { status: 500 });
    }

    return NextResponse.json({
      disc: {
        id: disc.id,
        bagId: disc.bag_id,
        discId: disc.disc_id,
        name: disc.name,
        brand: disc.brand,
        category: disc.category,
        speed: disc.speed,
        glide: disc.glide,
        turn: disc.turn,
        fade: disc.fade,
        stability: disc.stability,
        addedAt: disc.added_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Bag disc POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/bag/discs — Remove disc from bag
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
    const { bagId, discId } = body;

    if (!bagId || !discId) {
      return NextResponse.json({ error: 'Missing required fields: bagId, discId' }, { status: 400 });
    }

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    const { data: bag, error: bagError } = await clientToUse
      .from('disc_bags')
      .select('id')
      .eq('id', bagId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bagError) {
      return NextResponse.json({ error: bagError.message }, { status: 500 });
    }

    if (!bag) {
      return NextResponse.json({ error: 'Bag not found or not owned by user' }, { status: 404 });
    }

    const { error } = await clientToUse
      .from('bag_discs')
      .delete()
      .eq('bag_id', bagId)
      .eq('disc_id', discId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bag disc DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
