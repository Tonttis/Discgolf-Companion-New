import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/users/[id] - Get a user's public profile (games, bag info)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { id: userId } = await params;

    // Use admin client to bypass RLS for public profile viewing
    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    // Fetch profile
    const { data: profile, error: profileError } = await clientToUse
      .from('profiles')
      .select('id, username, display_name, avatar_url, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Käyttäjää ei löytynyt' }, { status: 404 });
    }

    // Fetch game count
    const { count: gameCount } = await clientToUse
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Fetch completed games count
    const { data: playerGames } = await clientToUse
      .from('game_players')
      .select('game_id')
      .eq('user_id', userId);

    let completedCount = 0;
    if (playerGames && playerGames.length > 0) {
      const gameIds = playerGames.map((pg) => pg.game_id);
      const { count } = await clientToUse
        .from('games')
        .select('*', { count: 'exact', head: true })
        .in('id', gameIds)
        .eq('status', 'completed');
      completedCount = count ?? 0;
    }

    // Fetch bag disc count
    const { data: bags } = await clientToUse
      .from('disc_bags')
      .select('id')
      .eq('user_id', userId);

    let bagDiscCount = 0;
    if (bags && bags.length > 0) {
      const bagIds = bags.map((b) => b.id);
      const { count } = await clientToUse
        .from('bag_discs')
        .select('*', { count: 'exact', head: true })
        .in('bag_id', bagIds);
      bagDiscCount = count ?? 0;
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        gameCount: gameCount ?? 0,
        completedCount,
        bagDiscCount,
      },
    });
  } catch (err) {
    console.error('User profile fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
