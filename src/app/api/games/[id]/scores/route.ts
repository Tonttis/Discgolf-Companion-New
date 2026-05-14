import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// POST /api/games/[id]/scores - Save scores for a hole
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
    const body = await request.json();
    const { scores } = body;

    if (!scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'Missing scores' }, { status: 400 });
    }

    // Validate that all players are in this game
    const playerIds = scores.map((s: { playerId: string }) => s.playerId);
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .in('id', playerIds);

    const validPlayerIds = new Set((gamePlayers ?? []).map(p => p.id));

    // Upsert each score
    const upsertResults = await Promise.all(
      scores
        .filter((s: { playerId: string; holeNumber: number; throws: number; par: number | null }) => validPlayerIds.has(s.playerId))
        .map(async (s: { playerId: string; holeNumber: number; throws: number; par: number | null }) => {
          const { error } = await supabase
            .from('scores')
            .upsert({
              game_id: gameId,
              player_id: s.playerId,
              hole_number: s.holeNumber,
              throws: s.throws,
              par: s.par,
            }, { onConflict: 'game_id,player_id,hole_number' });

          if (error) {
            console.error('Score upsert error:', error);
          }
          return !error;
        })
    );

    const allSuccess = upsertResults.every(Boolean);

    if (!allSuccess) {
      return NextResponse.json({ error: 'Some scores failed to save' }, { status: 207 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scores save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
