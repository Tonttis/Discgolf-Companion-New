import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/users/[id]/games - Get a user's completed games (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ games: [] }, { status: 200 });
    }

    const { id: userId } = await params;

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    // Get game IDs for this user
    const { data: playerGames } = await clientToUse
      .from('game_players')
      .select('game_id')
      .eq('user_id', userId);

    if (!playerGames || playerGames.length === 0) {
      return NextResponse.json({ games: [] });
    }

    const gameIds = playerGames.map((pg) => pg.game_id);

    // Get only completed games
    const { data: games, error } = await clientToUse
      .from('games')
      .select('*')
      .in('id', gameIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ games: [] }, { status: 200 });
    }

    // For each game, get players and scores
    const enrichedGames = await Promise.all(
      (games ?? []).map(async (game) => {
        const [playersRes, scoresRes] = await Promise.all([
          clientToUse
            .from('game_players')
            .select('*, profiles:user_id(username, display_name)')
            .eq('game_id', game.id),
          clientToUse
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
  } catch (err) {
    console.error('User games fetch error:', err);
    return NextResponse.json({ games: [] }, { status: 200 });
  }
}
