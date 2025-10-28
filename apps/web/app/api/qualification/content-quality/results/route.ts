import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Content Quality Results API called');
    
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
    const standardId = searchParams.get('standardId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : now;

    // Build query for content quality tests
    let query = supabase
      .from('content_quality_tests')
      .select(`
        *,
        content_quality_standards!inner(standard_name, category, min_score),
        audio_tracks!inner(title, artist_name)
      `)
      .gte('test_date', start.toISOString())
      .lte('test_date', end.toISOString())
      .order('test_date', { ascending: false });

    if (standardId) {
      query = query.eq('standard_id', standardId);
    }

    const { data: testResults, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching quality test results:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch quality test results' },
        { status: 500 }
      );
    }

    // Format results
    const formattedResults = testResults?.map(result => ({
      id: result.id,
      standardName: result.content_quality_standards.standard_name,
      category: result.content_quality_standards.category,
      trackTitle: result.audio_tracks?.title || 'Unknown Track',
      artistName: result.audio_tracks?.artist_name || 'Unknown Artist',
      testDate: result.test_date,
      passed: result.passed,
      score: result.score,
      minScore: result.content_quality_standards.min_score,
      details: result.details,
      recommendations: result.recommendations,
      retestRequired: result.retest_required,
      retestDate: result.retest_date
    })) || [];

    // Calculate summary statistics
    const totalTests = formattedResults.length;
    const passedTests = formattedResults.filter(r => r.passed).length;
    const averageScore = totalTests > 0 
      ? Math.round(formattedResults.reduce((sum, r) => sum + r.score, 0) / totalTests)
      : 0;

    // Calculate improvement trend (simplified - would need more historical data for accuracy)
    const recentTests = formattedResults.slice(0, Math.min(10, totalTests));
    const olderTests = formattedResults.slice(-Math.min(10, totalTests));
    const recentAverage = recentTests.length > 0 
      ? recentTests.reduce((sum, r) => sum + r.score, 0) / recentTests.length
      : 0;
    const olderAverage = olderTests.length > 0 
      ? olderTests.reduce((sum, r) => sum + r.score, 0) / olderTests.length
      : 0;
    
    let improvementTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAverage > olderAverage + 5) {
      improvementTrend = 'up';
    } else if (recentAverage < olderAverage - 5) {
      improvementTrend = 'down';
    }

    // Group results by standard
    const resultsByStandard = formattedResults.reduce((acc, result) => {
      const standardName = result.standardName;
      if (!acc[standardName]) {
        acc[standardName] = {
          standardName,
          category: result.category,
          total: 0,
          passed: 0,
          averageScore: 0,
          minScore: result.minScore,
          results: []
        };
      }
      acc[standardName].total++;
      if (result.passed) {
        acc[standardName].passed++;
      }
      acc[standardName].averageScore += result.score;
      acc[standardName].results.push(result);
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for each standard
    Object.values(resultsByStandard).forEach((standard: any) => {
      standard.averageScore = Math.round(standard.averageScore / standard.total);
      standard.percentage = Math.round((standard.passed / standard.total) * 100);
    });

    // Group results by category
    const resultsByCategory = formattedResults.reduce((acc, result) => {
      const category = result.category;
      if (!acc[category]) {
        acc[category] = {
          category,
          total: 0,
          passed: 0,
          averageScore: 0,
          standards: new Set()
        };
      }
      acc[category].total++;
      acc[category].standards.add(result.standardName);
      if (result.passed) {
        acc[category].passed++;
      }
      acc[category].averageScore += result.score;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for each category
    Object.values(resultsByCategory).forEach((category: any) => {
      category.averageScore = Math.round(category.averageScore / category.total);
      category.percentage = Math.round((category.passed / category.total) * 100);
      category.standardCount = category.standards.size;
    });

    // Get most common recommendations
    const allRecommendations = formattedResults.flatMap(r => r.recommendations || []);
    const recommendationCounts = allRecommendations.reduce((acc, rec) => {
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([recommendation, count]) => ({ recommendation, count }));

    // Calculate retest statistics
    const retestRequired = formattedResults.filter(r => r.retestRequired).length;
    const retestPercentage = totalTests > 0 
      ? Math.round((retestRequired / totalTests) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      results: formattedResults,
      summary: {
        totalTests,
        passedTests,
        averageScore,
        improvementTrend,
        retestRequired,
        retestPercentage
      },
      resultsByStandard: Object.values(resultsByStandard),
      resultsByCategory: Object.values(resultsByCategory),
      topRecommendations,
      trends: {
        improvementTrend,
        recentAverage: Math.round(recentAverage),
        olderAverage: Math.round(olderAverage),
        scoreRange: {
          min: totalTests > 0 ? Math.min(...formattedResults.map(r => r.score)) : 0,
          max: totalTests > 0 ? Math.max(...formattedResults.map(r => r.score)) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in content quality results API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
