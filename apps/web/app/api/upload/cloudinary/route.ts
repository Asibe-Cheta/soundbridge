import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'verification-documents';
    const resourceType = formData.get('resourceType') as string || 'auto'; // 'image' or 'raw' for documents

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file size (10MB max for images, 20MB for documents)
    const maxSize = resourceType === 'raw' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSize / 1024 / 1024}MB` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate file type
    if (resourceType === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check Cloudinary environment variables (using existing variable names)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName) {
      console.error('❌ Cloudinary configuration missing:', {
        hasCloudName: !!cloudName,
        hasUploadPreset: !!uploadPreset,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      });
      return NextResponse.json(
        { error: 'Cloudinary configuration not available' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('folder', `${folder}/${user.id}`);
    
    // Use unsigned upload preset if available, otherwise use signed upload with API key/secret
    if (uploadPreset) {
      uploadFormData.append('upload_preset', uploadPreset);
    } else if (apiKey && apiSecret) {
      // For signed uploads, we need to generate a signature
      // Note: In production, you might want to use Cloudinary's server-side SDK for signed uploads
      uploadFormData.append('api_key', apiKey);
      // Signature generation would be done server-side for security
      // For now, we'll use unsigned preset if available
    } else {
      return NextResponse.json(
        { error: 'Cloudinary upload preset or API credentials required' },
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Add transformation for images (optimize and secure)
    if (resourceType === 'image' || resourceType === 'auto') {
      uploadFormData.append('transformation', JSON.stringify([
        { quality: 'auto', fetch_format: 'auto' },
        { flags: 'attachment' } // Force download for security documents
      ]));
    }

    console.log('📤 Uploading to Cloudinary:', {
      cloudName,
      folder: `${folder}/${user.id}`,
      resourceType,
      fileName: file.name,
      fileSize: file.size,
    });

    const cloudinaryResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!cloudinaryResponse.ok) {
      const errorData = await cloudinaryResponse.json().catch(() => ({}));
      console.error('❌ Cloudinary upload error:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to upload file to Cloudinary',
          details: errorData.error?.message || 'Unknown error'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const cloudinaryData = await cloudinaryResponse.json();

    console.log('✅ Cloudinary upload successful:', {
      publicId: cloudinaryData.public_id,
      secureUrl: cloudinaryData.secure_url,
    });

    return NextResponse.json(
      {
        success: true,
        url: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        format: cloudinaryData.format,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        bytes: cloudinaryData.bytes,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error in Cloudinary upload:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

