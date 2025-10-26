import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      trackTitle, 
      artistName, 
      isOriginalContent, 
      ownsRights, 
      hasExclusiveDeals, 
      isOnOtherPlatforms, 
      platforms,
      hasSamples,
      sampleInfo
    } = body;

    console.log('🔍 Verifying upload rights for:', trackTitle, 'by', artistName);

    const supabase = createServiceClient();

    // Check for potential copyright violations
    const violations = [];
    const warnings = [];
    const requiresReview = false;

    // 1. Check if content is original
    if (!isOriginalContent) {
      violations.push({
        type: 'NOT_ORIGINAL',
        message: 'You must own the rights to upload this content',
        severity: 'high'
      });
    }

    // 2. Check if user owns rights
    if (!ownsRights) {
      violations.push({
        type: 'NO_RIGHTS',
        message: 'You must own the rights to distribute this content',
        severity: 'high'
      });
    }

    // 3. Check for exclusive deals
    if (hasExclusiveDeals) {
      violations.push({
        type: 'EXCLUSIVE_DEAL',
        message: 'Content with exclusive distribution deals cannot be uploaded',
        severity: 'high'
      });
    }

    // 4. Check for existing content on major platforms
    if (isOnOtherPlatforms && platforms?.length > 0) {
      // This is generally OK, but flag for review
      warnings.push({
        type: 'MULTI_PLATFORM',
        message: `Content is already distributed on: ${platforms.join(', ')}`,
        severity: 'medium'
      });
    }

    // 5. Check for samples
    if (hasSamples && (!sampleInfo || !sampleInfo.isLicensed)) {
      violations.push({
        type: 'UNLICENSED_SAMPLES',
        message: 'All samples must be properly licensed',
        severity: 'high'
      });
    }

    // 6. Check for potential duplicate content
    const { data: existingTracks } = await supabase
      .from('audio_tracks')
      .select('id, title, creator_id')
      .ilike('title', `%${trackTitle}%`)
      .ilike('artist_name', `%${artistName}%`);

    if (existingTracks && existingTracks.length > 0) {
      warnings.push({
        type: 'POTENTIAL_DUPLICATE',
        message: 'Similar content already exists on the platform',
        severity: 'medium'
      });
    }

    // Determine if upload can proceed
    const canUpload = violations.length === 0;
    const needsReview = warnings.length > 0 || violations.some(v => v.severity === 'high');

    // If content needs review, add to moderation queue
    if (needsReview) {
      await (supabase.from('admin_review_queue') as any).insert({
        queue_type: 'content_verification',
        priority: violations.length > 0 ? 'urgent' : 'normal',
        status: 'pending',
        reference_data: {
          track_title: trackTitle,
          artist_name: artistName,
          violations: violations,
          warnings: warnings,
          verification_data: {
            isOriginalContent,
            ownsRights,
            hasExclusiveDeals,
            isOnOtherPlatforms,
            platforms,
            hasSamples,
            sampleInfo
          }
        }
      });
    }

    const verificationResult = {
      canUpload,
      needsReview,
      violations,
      warnings,
      recommendations: generateRecommendations(violations, warnings)
    };

    console.log('✅ Rights verification completed:', verificationResult);

    return NextResponse.json({
      success: true,
      data: verificationResult
    });

  } catch (error: any) {
    console.error('❌ Error verifying upload rights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify upload rights', details: error.message },
      { status: 500 }
    );
  }
}

function generateRecommendations(violations: any[], warnings: any[]): string[] {
  const recommendations = [];

  if (violations.some(v => v.type === 'NOT_ORIGINAL')) {
    recommendations.push('Only upload content you created or have explicit rights to distribute');
  }

  if (violations.some(v => v.type === 'NO_RIGHTS')) {
    recommendations.push('Ensure you own the master recording and publishing rights');
  }

  if (violations.some(v => v.type === 'EXCLUSIVE_DEAL')) {
    recommendations.push('Check your distribution agreements - exclusive deals may prevent multi-platform sharing');
  }

  if (violations.some(v => v.type === 'UNLICENSED_SAMPLES')) {
    recommendations.push('Obtain proper licenses for all samples before uploading');
  }

  if (warnings.some(w => w.type === 'MULTI_PLATFORM')) {
    recommendations.push('Multi-platform distribution is allowed if you own the rights');
  }

  if (warnings.some(w => w.type === 'POTENTIAL_DUPLICATE')) {
    recommendations.push('Consider if this is a different version or remix of existing content');
  }

  return recommendations;
}
