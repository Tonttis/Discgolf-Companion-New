import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// POST /api/setup/fix-rls - Apply RLS fix for multiplayer score saving
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Supabase ei ole määritetty',
      }, { status: 503 });
    }

    const adminClient = await createSupabaseAdminClient();

    // If admin client is available, try to apply the fix
    if (adminClient) {
      // Try using the admin client to execute DDL via RPC
      // This won't work unless there's an exec_sql function, but we try
      try {
        const { error } = await adminClient.rpc('apply_scores_rls_fix');
        if (!error) {
          return NextResponse.json({ success: true, method: 'rpc' });
        }
      } catch {
        // RPC function doesn't exist, that's expected
      }
    }

    // Cannot apply fix automatically — return instructions
    const sql = [
      'DROP POLICY IF EXISTS "Players can insert own scores" ON scores;',
      'DROP POLICY IF EXISTS "Players can update own scores" ON scores;',
      'CREATE POLICY "Game participants can insert scores" ON scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (is_game_creator(game_id) OR is_game_participant(game_id)));',
      'CREATE POLICY "Game participants can update scores" ON scores FOR UPDATE USING (is_game_creator(game_id) OR is_game_participant(game_id));',
    ].join('\n');

    return NextResponse.json({
      success: false,
      error: 'RLS-käytäntöjä ei voitu korjata automaattisesti',
      sql,
      instructions: [
        'Suorita yllä oleva SQL Supabase SQL Editorissa:',
        '1. Avaa Supabase Dashboard',
        '2. Siirry SQL Editor -välilehdelle',
        '3. Kopioi ja suorita SQL',
        '',
        'TAI lisää SUPABASE_SERVICE_ROLE_KEY .env.local-tiedostoon',
      ],
    });
  } catch (error) {
    console.error('RLS fix error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
