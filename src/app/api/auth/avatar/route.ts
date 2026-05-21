import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

// POST /api/auth/avatar - Upload a profile picture
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
    }

    // Prepare buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use admin client for reliable storage operations (bypasses RLS)
    const adminClient = await createSupabaseAdminClient();
    const storageClient = adminClient || supabase;

    // Ensure the avatars bucket exists
    try {
      const { data: buckets } = await storageClient.storage.listBuckets();
      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      if (!avatarsBucket && adminClient) {
        const { error: createBucketError } = await adminClient.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 2 * 1024 * 1024,
        });
        if (createBucketError) {
          console.error('Failed to create avatars bucket:', createBucketError.message);
        }
      }
    } catch (bucketErr) {
      console.error('Bucket check error:', bucketErr);
    }

    // Delete ALL existing avatar files for this user before uploading the new one
    // This prevents stale files from different extensions lingering
    try {
      const { data: existingFiles } = await storageClient.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filePaths = existingFiles.map(f => `${user.id}/${f.name}`);
        await storageClient.storage.from('avatars').remove(filePaths);
      }
    } catch (listErr) {
      console.error('Failed to clean up old avatars:', listErr);
      // Continue anyway — old files just won't be cleaned up
    }

    // Generate a fixed file path (always use the same name, no extension variation)
    // Using a timestamp-based name to ensure CDN/browser cache busting
    const ext = file.type.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const filePath = `${user.id}/avatar_${timestamp}.${ext}`;

    // Upload the new file
    let uploadData: { path: string } | null = null;
    let uploadError: { message: string; statusCode?: string } | null = null;

    // Try admin client first
    if (adminClient) {
      const result = await adminClient.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      uploadData = result.data;
      uploadError = result.error as { message: string; statusCode?: string } | null;
    }

    // Fallback to regular client
    if (uploadError || !uploadData) {
      if (uploadError) {
        console.error('Avatar upload error (admin client):', uploadError.message);
      }
      const result = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });
      uploadData = result.data;
      uploadError = result.error as { message: string; statusCode?: string } | null;

      if (uploadError) {
        console.error('Avatar upload error (regular client):', uploadError.message);

        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket not found')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const projectRef = supabaseUrl?.replace('https://', '').replace('.supabase.co', '');
          return NextResponse.json({
            error: 'Avatar-varasto ei ole vielä määritetty. Suorita tietokantamigraatio ensin.',
            needsSetup: true,
            sqlEditorUrl: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql` : undefined,
          }, { status: 500 });
        }

        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
    }

    // Get public URL with cache-busting query parameter
    const clientForUrl = adminClient || supabase;
    const { data: urlData } = clientForUrl.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // The avatar URL WITH cache buster to ensure browser never serves stale image
    const cacheBuster = `t=${timestamp}`;
    const avatarUrl = urlData?.publicUrl
      ? `${urlData.publicUrl}?${cacheBuster}`
      : null;

    if (!avatarUrl) {
      return NextResponse.json({ error: 'Failed to get avatar URL' }, { status: 500 });
    }

    // Update profile with new avatar URL (store with cache buster)
    const profileClient = adminClient || supabase;
    const { error: updateError } = await profileClient
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile avatar update error:', updateError.message);
      // Don't fail - the file was uploaded, just the profile update failed
    }

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/auth/avatar - Remove profile picture
export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminClient = await createSupabaseAdminClient();
    const storageClient = adminClient || supabase;

    // Delete all avatar files for this user
    const { data: files } = await storageClient.storage
      .from('avatars')
      .list(user.id);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${user.id}/${f.name}`);
      await storageClient.storage.from('avatars').remove(filePaths);
    }

    // Update profile to remove avatar URL
    const profileClient = adminClient || supabase;
    await profileClient
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Avatar delete error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
