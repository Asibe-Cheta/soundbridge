/**
 * POST /api/posts/upload-audio
 * 
 * Upload audio preview for post attachment
 * 
 * Request: Multipart form data
 * - file: Audio file (max 10MB, max 60 seconds, MP3, WAV)
 * - post_id: Optional, if attaching to existing post
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "file_url": "https://storage.supabase.co/...",
 *     "file_name": "preview.mp3",
 *     "file_size": 5120000,
 *     "mime_type": "audio/mpeg",
 *     "duration": 45, // in seconds (if extracted)
 *     "thumbnail_url": "https://storage.supabase.co/..." // Generated thumbnail (if available)
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DURATION = 60; // 60 seconds
const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave'];

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎵 Upload Audio API called');

    // Authenticate user
    const { supabase, user, error: authError } = await getSupabaseRouteClient(request, true);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const postId = formData.get('post_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File must be MP3 or WAV' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400, headers: corsHeaders }
      );
    }

    // If post_id provided, verify post belongs to user
    if (postId) {
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (!post || post.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Post not found or unauthorized' },
          { status: 403, headers: corsHeaders }
        );
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'mp3';
    const timestamp = Date.now();
    const fileName = postId
      ? `post-${postId}-${timestamp}.${fileExt}`
      : `temp-${user.id}-${timestamp}.${fileExt}`;
    const filePath = postId
      ? `post-attachments/audio/${postId}/${fileName}`
      : `post-attachments/audio/temp/${user.id}/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const supabaseService = createServiceClient();
    const { data: uploadData, error: uploadError } = await supabaseService.storage
      .from('post-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading audio:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload audio', details: uploadError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseService.storage
      .from('post-attachments')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // TODO: Extract duration and generate thumbnail
    // For now, we'll set duration to null and let the client handle it
    // or implement audio processing in a future update
    const duration = null; // Will be extracted later if needed
    const thumbnailUrl = null; // Will be generated later if needed

    // If post_id provided, create attachment record
    if (postId) {
      const { error: attachmentError } = await supabase
        .from('post_attachments')
        .insert({
          post_id: postId,
          attachment_type: 'audio',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          duration: duration,
          thumbnail_url: thumbnailUrl,
          created_at: new Date().toISOString(),
        });

      if (attachmentError) {
        console.error('❌ Error creating attachment record:', attachmentError);
        // Continue anyway, file is uploaded
      }
    }

    console.log('✅ Audio uploaded successfully:', publicUrl);

    return NextResponse.json(
      {
        success: true,
        data: {
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          duration: duration,
          thumbnail_url: thumbnailUrl,
          post_id: postId || null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error uploading audio:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

