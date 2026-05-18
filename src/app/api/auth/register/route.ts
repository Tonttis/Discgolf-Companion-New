import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

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
    const { username, displayName } = body;

    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters, lowercase letters, numbers, underscores' }, { status: 400 });
    }

    // Check if username is taken by another user
    const adminClient = await createSupabaseAdminClient();

    if (adminClient) {
      // Use admin client to check username (bypasses RLS)
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (existing && existing.id !== user.id) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }

      // Use admin client to upsert profile (bypasses RLS)
      const { error } = await adminClient
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          display_name: displayName || username,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Admin profile upsert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Fallback: use regular client (may fail due to RLS)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        display_name: displayName || username,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Profile upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
