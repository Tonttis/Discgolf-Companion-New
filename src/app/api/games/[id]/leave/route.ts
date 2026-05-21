import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// POST /api/games/[id]/leave - Remove the current user from a game
// If they're the only player, the entire game is deleted
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

    const { id: gameId } = await params;

    // Check game exists
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, created_by, status')
      .eq('id', gameId)
      .maybeSingle();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Peliä ei löytynyt' }, { status: 404 });
    }

    // Get all players in the game
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('id, user_id')
      .eq('game_id', gameId);

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }

    // Find the current user's player record
    const currentPlayer = players?.find((p) => p.user_id === user.id);
    if (!currentPlayer) {
      return NextResponse.json({ error: 'Et ole tässä pelissä' }, { status: 403 });
    }

    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    if (players!.length <= 1) {
      // Only player — delete the entire game (cascade will delete players and scores)
      const { error: deleteError } = await clientToUse
        .from('games')
        .delete()
        .eq('id', gameId);

      if (deleteError) {
        console.error('Game delete error:', deleteError.message);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'deleted' });
    }

    // Multiple players — just remove this player's data
    // 1. Delete their scores
    const { error: scoresError } = await clientToUse
      .from('scores')
      .delete()
      .eq('player_id', currentPlayer.id);

    if (scoresError) {
      console.error('Scores delete error:', scoresError.message);
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    // 2. Delete their player record
    const { error: playerError } = await clientToUse
      .from('game_players')
      .delete()
      .eq('id', currentPlayer.id);

    if (playerError) {
      console.error('Player delete error:', playerError.message);
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }

    // 3. If the creator left, transfer ownership to another player
    if (game.created_by === user.id) {
      const remainingPlayers = players!.filter((p) => p.user_id !== user.id);
      if (remainingPlayers.length > 0) {
        await clientToUse
          .from('games')
          .update({ created_by: remainingPlayers[0].user_id })
          .eq('id', gameId);
      }
    }

    return NextResponse.json({ success: true, action: 'left' });
  } catch (err) {
    console.error('Game leave error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
