import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    // Try to fetch existing profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch error:', error);
    }

    // If profile exists, return it
    if (profile) {
      // Add cache-busting to avatar URL if it doesn't already have one
      let avatarUrl = profile.avatar_url;
      if (avatarUrl && !avatarUrl.includes('?t=')) {
        const separator = avatarUrl.includes('?') ? '&' : '?';
        avatarUrl = `${avatarUrl}${separator}t=${Date.now()}`;
      }

      return NextResponse.json({
        profile: {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
      });
    }

    // Profile doesn't exist yet — try to create it using admin client (bypasses RLS)
    const adminClient = await createSupabaseAdminClient();
    const username = (user.user_metadata?.username as string) || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
    const displayName = (user.user_metadata?.display_name as string) || username;

    if (adminClient) {
      // Use admin client to bypass RLS
      const { data: newProfile, error: createError } = await adminClient
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single();

      if (!createError && newProfile) {
        return NextResponse.json({
          profile: {
            id: newProfile.id,
            username: newProfile.username,
            displayName: newProfile.display_name,
            avatarUrl: newProfile.avatar_url,
            createdAt: newProfile.created_at,
            updatedAt: newProfile.updated_at,
          },
        });
      }

      console.error('Admin profile creation error:', createError);
    }

    // Fallback: try with regular client
    const { data: upsertedProfile, error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (!upsertError && upsertedProfile) {
      return NextResponse.json({
        profile: {
          id: upsertedProfile.id,
          username: upsertedProfile.username,
          displayName: upsertedProfile.display_name,
          avatarUrl: upsertedProfile.avatar_url,
          createdAt: upsertedProfile.created_at,
          updatedAt: upsertedProfile.updated_at,
        },
      });
    }

    // Last resort: return minimal profile from auth data
    console.error('Profile upsert error:', upsertError);
    return NextResponse.json({
      profile: {
        id: user.id,
        username,
        displayName,
        avatarUrl: null,
        createdAt: user.created_at,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ profile: null }, { status: 200 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };

    if (body.displayName !== undefined) updates.display_name = body.displayName;
    if (body.avatarUrl !== undefined) updates.avatar_url = body.avatarUrl;

    // Try with regular client first
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      // If regular client fails (RLS), try admin client
      const adminClient = await createSupabaseAdminClient();
      if (adminClient) {
        const { error: adminError } = await adminClient
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (adminError) {
          return NextResponse.json({ error: adminError.message }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
