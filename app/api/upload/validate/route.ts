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
    if (!fileData || !metadata) {
      return NextResponse.json(
        { error: 'File data and metadata are required' },
        { status: 400 }
      );
    }
    
    // Create a File object from the base64 data
    const file = await createFileFromBase64(fileData);
    
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
    
    return NextResponse.json(
      { 
        error: 'Upload validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
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
    
    // Convert base64 to binary
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create File object
    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], 'uploaded-file', { type: mimeType });
    
    return file;
  } catch (error) {
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
