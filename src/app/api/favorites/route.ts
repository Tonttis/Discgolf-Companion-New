import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// GET /api/favorites - List user's favorite courses
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ favorites: [] }, { status: 200 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ favorites: [] }, { status: 200 });
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ favorites: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      favorites: (favorites ?? []).map(f => ({
        id: f.id,
        userId: f.user_id,
        courseSlug: f.course_slug,
        createdAt: f.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ favorites: [] }, { status: 200 });
  }
}

// POST /api/favorites - Add a favorite
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
    const { courseSlug } = body;

    if (!courseSlug) {
      return NextResponse.json({ error: 'Missing courseSlug' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        course_slug: courseSlug,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already favorited' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorite: { id: data.id, userId: data.user_id, courseSlug: data.course_slug, createdAt: data.created_at } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
