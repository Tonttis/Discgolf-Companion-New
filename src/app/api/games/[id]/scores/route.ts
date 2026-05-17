import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// POST /api/games/[id]/scores - Save scores for a hole
// Strategy: Try admin client first (bypasses RLS), fall back to regular client
// (which works if RLS policies allow game participants to save for all players)
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

    // Validate that the user is a participant in this game
    const { data: userPlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userPlayer) {
      return NextResponse.json({ error: 'Not a participant in this game' }, { status: 403 });
    }

    // Filter to only valid player IDs
    const validScores = scores.filter(
      (s: { playerId: string; holeNumber: number; throws: number; par: number | null }) => validPlayerIds.has(s.playerId)
    );

    if (validScores.length === 0) {
      return NextResponse.json({ error: 'No valid scores to save' }, { status: 400 });
    }

    // Try admin client first (bypasses RLS), fall back to regular client
    // (regular client works if RLS policies allow game participants to save for all players)
    const adminClient = await createSupabaseAdminClient();
    const clientToUse = adminClient || supabase;

    if (!adminClient) {
      console.warn('Supabase admin client unavailable — using regular client with RLS policies');
    }

    // Upsert each score
    const upsertResults = await Promise.all(
      validScores.map(async (s: { playerId: string; holeNumber: number; throws: number; par: number | null }) => {
        const { error, data } = await clientToUse
          .from('scores')
          .upsert({
            game_id: gameId,
            player_id: s.playerId,
            hole_number: s.holeNumber,
            throws: s.throws,
            par: s.par,
          }, { onConflict: 'game_id,player_id,hole_number' })
          .select()
          .maybeSingle();

        if (error) {
          console.error('Score upsert error:', { playerId: s.playerId, hole: s.holeNumber, error: error.message });
          return { success: false, error: error.message, playerId: s.playerId, hole: s.holeNumber };
        }
        return { success: true, data };
      })
    );

    const failures = upsertResults.filter((r: { success: boolean }) => !r.success);

    if (failures.length > 0) {
      // If all scores failed, it's likely an RLS issue
      if (failures.length === validScores.length) {
        console.error('All scores failed to save — likely RLS policy issue. Run supabase/fix-scores-rls.sql');
        return NextResponse.json(
          {
            error: 'Tulosten tallennus epäonnistui. Suorita tietokantakorjaus: supabase/fix-scores-rls.sql',
            details: failures,
          },
          { status: 500 }
        );
      }
      // Partial failure
      console.error('Some scores failed to save:', failures);
      return NextResponse.json(
        { error: `${failures.length} tulosta epäonnistui tallennuksessa`, details: failures },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: upsertResults.length,
    });
  } catch (error) {
    console.error('Scores save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
