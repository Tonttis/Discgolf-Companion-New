import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/users/search?username=foo - Search for users by username
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const username = request.nextUrl.searchParams.get('username');
    if (!username || username.length < 1) {
      return NextResponse.json({ users: [] });
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `${username}%`)
      .limit(10);

    if (error) {
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    return NextResponse.json({
      users: (users ?? []).map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
      })),
    });
  } catch {
    return NextResponse.json({ users: [] }, { status: 200 });
  }
}
