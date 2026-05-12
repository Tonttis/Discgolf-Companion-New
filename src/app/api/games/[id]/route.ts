import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/games/[id] - Get a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { id } = await params;

    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const [playersRes, scoresRes] = await Promise.all([
      supabase
        .from('game_players')
        .select('*, profiles:user_id(username, display_name)')
        .eq('game_id', game.id),
      supabase
        .from('scores')
        .select('*')
        .eq('game_id', game.id)
        .order('hole_number', { ascending: true }),
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

    return NextResponse.json({ game: enrichedGame });
  } catch (error) {
    console.error('Game fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/games/[id] - Update game (complete, abandon)
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
    const { status } = body;

    if (!status || !['completed', 'abandoned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data: game, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error || !game) {
      return NextResponse.json({ error: error?.message || 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json({ game: { id: game.id, status: game.status } });
  } catch (error) {
    console.error('Game update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
