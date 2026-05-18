import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ available: false, error: 'Supabase not configured' }, { status: 503 });
    }

    const username = request.nextUrl.searchParams.get('username');
    if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ available: false, error: 'Invalid username format' }, { status: 400 });
    }

    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    return NextResponse.json({ available: !data });
  } catch {
    return NextResponse.json({ available: false }, { status: 500 });
  }
}
