import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Content Quality Standards API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    // Build query for content quality standards
    let query = supabase
      .from('content_quality_standards')
      .select('*')
      .order('category', { ascending: true })
      .order('standard_name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: standards, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching content standards:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch content standards' },
        { status: 500 }
      );
    }

    // Calculate implementation statistics
    const totalStandards = standards?.length || 0;
    const implementedStandards = standards?.filter(s => s.is_implemented).length || 0;
    const implementationPercentage = totalStandards > 0 
      ? Math.round((implementedStandards / totalStandards) * 100) 
      : 0;

    // Group by category
    const groupedStandards = standards?.reduce((acc, standard) => {
      if (!acc[standard.category]) {
        acc[standard.category] = [];
      }
      acc[standard.category].push(standard);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Calculate category-specific implementation
    const categoryStats = Object.entries(groupedStandards).map(([categoryName, categoryStandards]) => ({
      category: categoryName,
      total: categoryStandards.length,
      implemented: categoryStandards.filter(s => s.is_implemented).length,
      percentage: categoryStandards.length > 0 
        ? Math.round((categoryStandards.filter(s => s.is_implemented).length / categoryStandards.length) * 100) 
        : 0
    }));

    return NextResponse.json({
      success: true,
      standards: standards || [],
      implementedCount: implementedStandards,
      totalCount: totalStandards,
      implementationPercentage,
      categoryStats,
      summary: {
        totalCategories: Object.keys(groupedStandards).length,
        averageImplementation: categoryStats.length > 0 
          ? Math.round(categoryStats.reduce((sum, c) => sum + c.percentage, 0) / categoryStats.length)
          : 0
      }
    });

  } catch (error) {
    console.error('❌ Error in content standards API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Content Quality Test API called');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { standardId, testData } = body;

    if (!standardId || !testData) {
      return NextResponse.json(
        { error: 'Standard ID and test data are required' },
        { status: 400 }
      );
    }

    // Get the standard details
    const { data: standard, error: standardError } = await supabase
      .from('content_quality_standards')
      .select('*')
      .eq('id', standardId)
      .single();

    if (standardError || !standard) {
      return NextResponse.json(
        { error: 'Content standard not found' },
        { status: 404 }
      );
    }

    // Perform quality test based on standard type
    let testResults: any = {
      passed: false,
      score: 0,
      details: {},
      recommendations: []
    };

    // Basic quality test logic (can be enhanced with actual validation)
    switch (standard.category) {
      case 'audio':
        testResults = await performAudioQualityTest(standard, testData);
        break;
      case 'metadata':
        testResults = await performMetadataQualityTest(standard, testData);
        break;
      case 'artwork':
        testResults = await performArtworkQualityTest(standard, testData);
        break;
      case 'legal':
        testResults = await performLegalQualityTest(standard, testData);
        break;
      default:
        testResults = {
          passed: false,
          score: 0,
          details: { error: 'Unknown standard category' },
          recommendations: ['Contact support for this standard type']
        };
    }

    // Determine if test passed
    testResults.passed = testResults.score >= standard.min_score;

    // Store test results
    const { data: testRecord, error: storeError } = await supabase
      .from('content_quality_tests')
      .insert({
        track_id: testData.trackId || null,
        user_id: user.id,
        standard_id: standardId,
        passed: testResults.passed,
        score: testResults.score,
        details: testResults.details,
        recommendations: testResults.recommendations,
        retest_required: !testResults.passed
      })
      .select()
      .single();

    if (storeError) {
      console.error('❌ Error storing test results:', storeError);
      // Don't fail the request, test was performed successfully
    }

    console.log('✅ Content quality test completed:', testResults.passed ? 'PASSED' : 'FAILED');

    return NextResponse.json({
      success: true,
      testResults: {
        passed: testResults.passed,
        score: testResults.score,
        details: testResults.details,
        recommendations: testResults.recommendations,
        standardName: standard.standard_name,
        minScore: standard.min_score,
        testId: testRecord?.id
      }
    });

  } catch (error) {
    console.error('❌ Error in content quality test API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for quality testing
async function performAudioQualityTest(standard: any, testData: any) {
  // Mock audio quality test - replace with actual audio analysis
  const score = Math.random() * 100; // Mock score
  const passed = score >= standard.min_score;
  
  return {
    passed,
    score: Math.round(score),
    details: {
      bitrate: testData.bitrate || 'Unknown',
      sampleRate: testData.sampleRate || 'Unknown',
      channels: testData.channels || 'Unknown',
      duration: testData.duration || 'Unknown'
    },
    recommendations: passed ? [] : [
      'Ensure audio bitrate is at least 320 kbps',
      'Use 44.1 kHz or higher sample rate',
      'Provide stereo audio'
    ]
  };
}

async function performMetadataQualityTest(standard: any, testData: any) {
  // Mock metadata quality test
  const score = Math.random() * 100;
  const passed = score >= standard.min_score;
  
  return {
    passed,
    score: Math.round(score),
    details: {
      title: testData.title || 'Missing',
      artist: testData.artist || 'Missing',
      genre: testData.genre || 'Missing',
      isrc: testData.isrc || 'Missing'
    },
    recommendations: passed ? [] : [
      'Ensure all required metadata fields are filled',
      'Provide accurate genre classification',
      'Generate ISRC for the track'
    ]
  };
}

async function performArtworkQualityTest(standard: any, testData: any) {
  // Mock artwork quality test
  const score = Math.random() * 100;
  const passed = score >= standard.min_score;
  
  return {
    passed,
    score: Math.round(score),
    details: {
      resolution: testData.resolution || 'Unknown',
      format: testData.format || 'Unknown',
      aspectRatio: testData.aspectRatio || 'Unknown'
    },
    recommendations: passed ? [] : [
      'Use minimum 3000x3000 pixel resolution',
      'Ensure square aspect ratio (1:1)',
      'Use JPG or PNG format'
    ]
  };
}

async function performLegalQualityTest(standard: any, testData: any) {
  // Mock legal quality test
  const score = Math.random() * 100;
  const passed = score >= standard.min_score;
  
  return {
    passed,
    score: Math.round(score),
    details: {
      copyrightOwnership: testData.copyrightOwnership || false,
      rightsVerification: testData.rightsVerification || false,
      explicitContent: testData.explicitContent || false
    },
    recommendations: passed ? [] : [
      'Confirm copyright ownership',
      'Verify no conflicting distribution rights',
      'Properly label explicit content'
    ]
  };
}
