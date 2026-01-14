import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {}
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options, maxAge: 0 });
              } catch (error) {}
            },
          },
        }
      );
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    const contentId = params.contentId;
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('content_type');

    if (!contentType || !['track', 'album', 'podcast'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'content_type is required and must be track, album, or podcast' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check ownership
    let isCreator = false;
    let fileUrl: string | null = null;

    if (contentType === 'track') {
      const { data: track } = await supabase
        .from('audio_tracks')
        .select('creator_id, file_url')
        .eq('id', contentId)
        .single();

      if (!track) {
        return NextResponse.json(
          { success: false, error: 'Content not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      isCreator = track.creator_id === user.id;
      fileUrl = track.file_url;
    }

    // Check if user has purchased
    const { data: purchase } = await supabase
      .from('content_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .eq('status', 'completed')
      .single();

    if (!isCreator && !purchase) {
      return NextResponse.json(
        { success: false, error: 'You do not own this content' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: 'Content file not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Increment download count if purchased
    if (purchase) {
      const { data: currentPurchase } = await supabase
        .from('content_purchases')
        .select('download_count')
        .eq('id', purchase.id)
        .single();

      await supabase
        .from('content_purchases')
        .update({
          download_count: (currentPurchase?.download_count || 0) + 1,
        })
        .eq('id', purchase.id);
    }

    // Generate signed URL (1 hour expiration)
    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // If file is in Supabase storage, create signed URL
    if (fileUrl.includes('supabase.co') || fileUrl.includes('storage')) {
      // Extract bucket and path from URL
      const urlParts = fileUrl.split('/storage/v1/object/');
      if (urlParts.length === 2) {
        const [bucket, ...pathParts] = urlParts[1].split('/');
        const path = pathParts.join('/');

        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (!signedUrlError && signedUrlData) {
          return NextResponse.json(
            {
              success: true,
              data: {
                download_url: signedUrlData.signedUrl,
                expires_at: expiresAt.toISOString(),
              },
            },
            { headers: corsHeaders }
          );
        }
      }
    }

    // Fallback: return direct URL (if already public)
    return NextResponse.json(
      {
        success: true,
        data: {
          download_url: fileUrl,
          expires_at: expiresAt.toISOString(),
        },
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
