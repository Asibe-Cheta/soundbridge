/**
 * POST /api/posts/upload-image
 * 
 * Upload image for post attachment
 * 
 * Request: Multipart form data
 * - file: Image file (max 5MB, JPG, PNG, WEBP)
 * - post_id: Optional, if attaching to existing post
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "file_url": "https://storage.supabase.co/...",
 *     "file_name": "image.jpg",
 *     "file_size": 2048000,
 *     "mime_type": "image/jpeg"
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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB - align with mobile (WEB_TEAM_UX_POST)
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Upload Image API called');

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
        { success: false, error: 'File must be JPG, PNG, WEBP, or AVIF' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size (5MB per WEB_TEAM_UX_POST)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'One or more photos exceed the 5 MB limit and were not added.' },
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
    const fileExt = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const fileName = postId
      ? `post-${postId}-${timestamp}.${fileExt}`
      : `temp-${user.id}-${timestamp}.${fileExt}`;
    const filePath = postId
      ? `post-attachments/images/${postId}/${fileName}`
      : `post-attachments/images/temp/${user.id}/${fileName}`;

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
      console.error('❌ Error uploading image:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image', details: uploadError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseService.storage
      .from('post-attachments')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // If post_id provided, create attachment record
    if (postId) {
      const { error: attachmentError } = await supabase
        .from('post_attachments')
        .insert({
          post_id: postId,
          attachment_type: 'image',
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_at: new Date().toISOString(),
        });

      if (attachmentError) {
        console.error('❌ Error creating attachment record:', attachmentError);
        // Continue anyway, file is uploaded
      }
    }

    console.log('✅ Image uploaded successfully:', publicUrl);

    return NextResponse.json(
      {
        success: true,
        data: {
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          post_id: postId || null,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error uploading image:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

