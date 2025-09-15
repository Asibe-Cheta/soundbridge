import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { uploadValidationService } from '../../../../src/lib/upload-validation';
import type { UploadValidationRequest } from '../../../../src/lib/types/upload-validation';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Upload validation API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const userTier = subscription?.tier || 'free';
    console.log('👤 User tier:', userTier);
    
    // Parse request body
    const body = await request.json();
    const { 
      fileData, 
      metadata,
      fileInfo, // For large files, we might only send file info
      config = {
        enableCopyrightCheck: false, // Start with basic validation
        enableContentModeration: false,
        enableCommunityGuidelines: true,
        enableMetadataValidation: true,
        enableFileIntegrityCheck: true,
        strictMode: userTier === 'enterprise'
      }
    } = body;
    
    // Validate required fields
    if ((!fileData && !fileInfo) || !metadata) {
      return NextResponse.json(
        { error: 'File data (or file info) and metadata are required' },
        { status: 400 }
      );
    }
    
    // Create a File object from the base64 data or file info
    let file: File;
    if (fileData) {
      file = await createFileFromBase64(fileData);
    } else if (fileInfo) {
      // For large files, create a minimal file object with just the info we need
      file = {
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        stream: () => new ReadableStream(),
        arrayBuffer: async () => new ArrayBuffer(0),
        text: async () => '',
        slice: () => file
      } as File;
    } else {
      return NextResponse.json(
        { error: 'Either file data or file info must be provided' },
        { status: 400 }
      );
    }
    
    // Create validation request
    const validationRequest: UploadValidationRequest = {
      file,
      metadata,
      userId: user.id,
      userTier: userTier as 'free' | 'pro' | 'enterprise',
      config
    };
    
    console.log('🔍 Starting validation for file:', file.name, 'Size:', file.size);
    
    // Perform validation
    const validationResult = await uploadValidationService.validateUpload(validationRequest);
    
    console.log('✅ Validation complete:', {
      isValid: validationResult.result.isValid,
      errors: validationResult.result.errors.length,
      warnings: validationResult.result.warnings.length
    });
    
    return NextResponse.json({
      success: true,
      data: validationResult
    });
    
  } catch (error) {
    console.error('❌ Upload validation error:', error);
    
    // Ensure we always return valid JSON
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Upload validation failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Helper function to create File object from base64 data
async function createFileFromBase64(base64Data: string): Promise<File> {
  try {
    // Parse base64 data (format: "data:audio/mp3;base64,iVBORw0KGgoAAAANSUhEUgAA...")
    const [header, data] = base64Data.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp3';
    
    // Convert base64 to binary using Node.js Buffer (server-side compatible)
    const binaryData = Buffer.from(data, 'base64');
    
    // Create a File-like object that works on server side
    const fileLike = {
      name: 'uploaded-file',
      type: mimeType,
      size: binaryData.length,
      stream: () => new ReadableStream({
        start(controller) {
          controller.enqueue(binaryData);
          controller.close();
        }
      }),
      arrayBuffer: async () => binaryData.buffer,
      text: async () => binaryData.toString(),
      slice: (start: number, end?: number) => {
        const sliced = binaryData.slice(start, end);
        return {
          ...fileLike,
          size: sliced.length,
          arrayBuffer: async () => sliced.buffer,
          stream: () => new ReadableStream({
            start(controller) {
              controller.enqueue(sliced);
              controller.close();
            }
          })
        };
      }
    } as File;
    
    return fileLike;
  } catch (error) {
    console.error('Error creating file from base64:', error);
    throw new Error('Invalid file data format');
  }
}

// GET endpoint to retrieve validation rules for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user subscription tier
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const userTier = subscription?.tier || 'free';
    
    // Get tier-specific limits
    const tierLimits = uploadValidationService.getTierLimits(userTier as 'free' | 'pro' | 'enterprise');
    
    return NextResponse.json({
      success: true,
      data: {
        tier: userTier,
        limits: tierLimits,
        rules: uploadValidationService.getValidationRules()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting validation rules:', error);
    
    return NextResponse.json(
      { error: 'Failed to get validation rules' },
      { status: 500 }
    );
  }
}
