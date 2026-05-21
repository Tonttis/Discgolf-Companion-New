import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/games - List games for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ games: [], error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ games: [] }, { status: 200 });
    }

    const status = request.nextUrl.searchParams.get('status');

    // Use admin client for reliable reads (bypasses RLS)
    const adminClient = await createSupabaseAdminClient();
    const client = adminClient || supabase;

    // Get all games where user is a player
    const { data: playerGames } = await client
      .from('game_players')
      .select('game_id')
      .eq('user_id', user.id);

    // Also get games created by user
    const { data: createdGames } = await client
      .from('games')
      .select('id')
      .eq('created_by', user.id);

    const gameIds = [
      ...new Set([
        ...(playerGames?.map(p => p.game_id) ?? []),
        ...(createdGames?.map(g => g.id) ?? []),
      ]),
    ];

    if (gameIds.length === 0) {
      return NextResponse.json({ games: [] });
    }

    let gamesQuery = client
      .from('games')
      .select('*')
      .in('id', gameIds)
      .order('started_at', { ascending: false });

    if (status) {
      gamesQuery = gamesQuery.eq('status', status);
    }

    const { data: games, error } = await gamesQuery;

    if (error) {
      return NextResponse.json({ games: [], error: error.message }, { status: 500 });
    }

    // For each game, get players and scores
    const enrichedGames = await Promise.all(
      (games ?? []).map(async (game) => {
        const [playersRes, scoresRes] = await Promise.all([
          client
            .from('game_players')
            .select('*, profiles:user_id(username, display_name)')
            .eq('game_id', game.id),
          client
            .from('scores')
            .select('*')
            .eq('game_id', game.id)
            .order('hole_number', { ascending: true }),
        ]);

        return {
          id: game.id,
          courseSlug: game.course_slug,
          courseName: game.course_name,
          totalHoles: game.total_holes,
          totalPar: game.total_par,
          createdBy: game.created_by,
          status: game.status,
          startedAt: game.started_at,
          completedAt: game.completed_at,
          createdAt: game.created_at,
          players: (playersRes.data ?? []).map((p: Record<string, unknown>) => ({
            id: p.id,
            gameId: p.game_id,
            userId: p.user_id,
            username: (p.profiles as Record<string, unknown>)?.username ?? '',
            displayName: (p.profiles as Record<string, unknown>)?.display_name ?? null,
            joinedAt: p.joined_at,
          })),
          scores: (scoresRes.data ?? []).map((s: Record<string, unknown>) => ({
            id: s.id,
            gameId: s.game_id,
            playerId: s.player_id,
            holeNumber: s.hole_number,
            throws: s.throws,
            par: s.par,
          })),
        };
      })
    );

    return NextResponse.json({ games: enrichedGames });
  } catch (error) {
    console.error('Games list error:', error);
    return NextResponse.json({ games: [], error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: Ensure a user's profile exists in the profiles table
async function ensureProfile(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, userId: string, userEmail?: string, userMetadata?: Record<string, unknown>) {
  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return true;

  // Profile doesn't exist — try to create it
  const username = (userMetadata?.username as string) || userEmail?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').toLowerCase() || `user_${userId.slice(0, 8)}`;
  const displayName = (userMetadata?.display_name as string) || username;

  // Try with admin client first (bypasses RLS)
  const adminClient = await createSupabaseAdminClient();
  if (adminClient) {
    const { error } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        username,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (!error) return true;
    console.error('Admin profile upsert failed:', error);
  }

  // Fallback: try with regular client (requires INSERT policy)
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Profile upsert failed:', error);
    return false;
  }

  return true;
}

// POST /api/games - Create a new game
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
    const { courseSlug, courseName, totalHoles, totalPar, playerUsernames } = body;

    if (!courseSlug || !courseName || !totalHoles) {
      return NextResponse.json({ error: 'Missing required fields: courseSlug, courseName, totalHoles' }, { status: 400 });
    }

    // Ensure the creator's profile exists before creating the game
    // (the games.created_by FK references profiles.id)
    const profileOk = await ensureProfile(supabase, user.id, user.email, user.user_metadata as Record<string, unknown> | undefined);
    if (!profileOk) {
      return NextResponse.json({ error: 'Profiilin luonti epäonnistui. Suorita tietokantakorjaus SQL Editorissa.' }, { status: 500 });
    }

    // Create the game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        course_slug: courseSlug,
        course_name: courseName,
        total_holes: totalHoles,
        total_par: totalPar ?? 0,
        created_by: user.id,
        status: 'in_progress',
      })
      .select()
      .single();

    if (gameError || !game) {
      console.error('Game creation error:', gameError);
      return NextResponse.json({ error: gameError?.message || 'Failed to create game' }, { status: 500 });
    }

    // Add creator as a player
    const { error: creatorPlayerError } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        user_id: user.id,
      });

    if (creatorPlayerError) {
      console.error('Failed to add creator as player:', creatorPlayerError);
      // Don't fail the whole operation — the game was created
    }

    // Add other players by username
    const otherUsernames = (playerUsernames ?? []).filter((u: string) => u.length > 0);
    if (otherUsernames.length > 0) {
      const adminClient = await createSupabaseAdminClient();
      const clientToUse = adminClient || supabase;

      const { data: otherUsers } = await clientToUse
        .from('profiles')
        .select('id, username')
        .in('username', otherUsernames);

      if (otherUsers && otherUsers.length > 0) {
        const playerInserts = otherUsers
          .filter(u => u.id !== user.id) // Don't add creator again
          .map(u => ({
            game_id: game.id,
            user_id: u.id,
          }));

        if (playerInserts.length > 0) {
          const { error: playersError } = await supabase
            .from('game_players')
            .insert(playerInserts);

          if (playersError) {
            console.error('Failed to add players:', playersError);
          }
        }
      }
    }

    // Fetch the complete game with players
    const [playersRes, scoresRes] = await Promise.all([
      supabase
        .from('game_players')
        .select('*, profiles:user_id(username, display_name)')
        .eq('game_id', game.id),
      supabase
        .from('scores')
        .select('*')
        .eq('game_id', game.id),
    ]);

    const enrichedGame = {
      id: game.id,
      courseSlug: game.course_slug,
      courseName: game.course_name,
      totalHoles: game.total_holes,
      totalPar: game.total_par,
      createdBy: game.created_by,
      status: game.status,
      startedAt: game.started_at,
      completedAt: game.completed_at,
      createdAt: game.created_at,
      players: (playersRes.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        gameId: p.game_id,
        userId: p.user_id,
        username: (p.profiles as Record<string, unknown>)?.username ?? '',
        displayName: (p.profiles as Record<string, unknown>)?.display_name ?? null,
        joinedAt: p.joined_at,
      })),
      scores: (scoresRes.data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id,
        gameId: s.game_id,
        playerId: s.player_id,
        holeNumber: s.hole_number,
        throws: s.throws,
        par: s.par,
      })),
    };

    return NextResponse.json({ game: enrichedGame }, { status: 201 });
  } catch (error) {
    console.error('Game creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
