import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// GET /api/setup/check - Check if Supabase is properly configured
export async function GET() {
  const result = {
    supabaseConfigured: false,
    adminClientAvailable: false,
    needsRLSFix: false,
    issues: [] as string[],
    instructions: [] as string[],
  };

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      result.issues.push('Supabase ei ole määritetty.');
      result.instructions.push('Lisää .env.local: NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      return NextResponse.json(result);
    }

    result.supabaseConfigured = true;

    // Check if admin client is available
    const adminClient = await createSupabaseAdminClient();
    result.adminClientAvailable = !!adminClient;

    if (!adminClient) {
      result.needsRLSFix = true;
      result.issues.push('SUPABASE_SERVICE_ROLE_KEY puuttuu — moninpelitulosten tallennus vaatii RLS-korjauksen.');
      result.instructions.push(
        'Vaihtoehto 1: Lisää .env.local: SUPABASE_SERVICE_ROLE_KEY=... (Supabase Dashboard → Settings → API)',
        'Vaihtoehto 2: Suorita supabase/fix-scores-rls.sql Supabase SQL Editorissa'
      );
    }
  } catch (error) {
    result.issues.push(`Virhe: ${error}`);
  }

  return NextResponse.json(result);
}
