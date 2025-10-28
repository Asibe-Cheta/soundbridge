import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Qualification Analytics API called');
    
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
    const platform = searchParams.get('platform');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : now;

    // Get qualification progress data
    const { data: progressData, error: progressError } = await supabase
      .from('qualification_progress')
      .select('*')
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (progressError) {
      console.error('❌ Error fetching progress data:', progressError);
    }

    // Get current qualification status
    let qualificationQuery = supabase
      .from('platform_qualifications')
      .select('platform_name, requirement_type, is_met, priority, estimated_effort_hours');

    if (platform) {
      qualificationQuery = qualificationQuery.eq('platform_name', platform);
    }

    if (category) {
      qualificationQuery = qualificationQuery.eq('requirement_type', category);
    }

    const { data: qualifications, error: qualificationError } = await qualificationQuery;

    if (qualificationError) {
      console.error('❌ Error fetching qualifications:', qualificationError);
      return NextResponse.json(
        { error: 'Failed to fetch qualification data' },
        { status: 500 }
      );
    }

    // Calculate overall progress
    const totalRequirements = qualifications?.length || 0;
    const completedRequirements = qualifications?.filter(q => q.is_met).length || 0;
    const completionPercentage = totalRequirements > 0 
      ? Math.round((completedRequirements / totalRequirements) * 100) 
      : 0;

    // Calculate progress by platform
    const platformProgress = qualifications?.reduce((acc, qual) => {
      if (!acc[qual.platform_name]) {
        acc[qual.platform_name] = {
          total: 0,
          completed: 0,
          critical: 0,
          criticalCompleted: 0,
          estimatedHours: 0,
          completedHours: 0
        };
      }
      acc[qual.platform_name].total++;
      if (qual.is_met) {
        acc[qual.platform_name].completed++;
        acc[qual.platform_name].completedHours += qual.estimated_effort_hours || 0;
      }
      if (qual.priority === 'critical') {
        acc[qual.platform_name].critical++;
        if (qual.is_met) {
          acc[qual.platform_name].criticalCompleted++;
        }
      }
      acc[qual.platform_name].estimatedHours += qual.estimated_effort_hours || 0;
      return acc;
    }, {} as Record<string, any>) || {};

    // Format platform progress
    const formattedPlatformProgress = Object.entries(platformProgress).map(([platformName, data]) => ({
      platform: platformName,
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      criticalCompleted: data.criticalCompleted,
      criticalTotal: data.critical,
      criticalPercentage: data.critical > 0 ? Math.round((data.criticalCompleted / data.critical) * 100) : 0,
      estimatedHours: data.estimatedHours,
      completedHours: data.completedHours,
      remainingHours: data.estimatedHours - data.completedHours
    }));

    // Calculate progress by category
    const categoryProgress = qualifications?.reduce((acc, qual) => {
      if (!acc[qual.requirement_type]) {
        acc[qual.requirement_type] = {
          total: 0,
          completed: 0,
          platforms: new Set()
        };
      }
      acc[qual.requirement_type].total++;
      acc[qual.requirement_type].platforms.add(qual.platform_name);
      if (qual.is_met) {
        acc[qual.requirement_type].completed++;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // Format category progress
    const formattedCategoryProgress = Object.entries(categoryProgress).map(([categoryName, data]) => ({
      category: categoryName,
      completed: data.completed,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      platformCount: data.platforms.size
    }));

    // Calculate trends from progress data
    const trends = progressData?.map(item => ({
      date: item.date,
      completed: item.completed_requirements,
      total: item.total_requirements,
      percentage: item.completion_percentage
    })) || [];

    // Calculate velocity (requirements completed per day)
    const velocity = trends.length > 1 
      ? (trends[trends.length - 1].completed - trends[0].completed) / trends.length
      : 0;

    // Calculate estimated completion date
    const remainingRequirements = totalRequirements - completedRequirements;
    const estimatedDaysToComplete = velocity > 0 
      ? Math.ceil(remainingRequirements / velocity)
      : null;
    const estimatedCompletionDate = estimatedDaysToComplete 
      ? new Date(now.getTime() + estimatedDaysToComplete * 24 * 60 * 60 * 1000)
      : null;

    // Get content quality test results
    const { data: qualityTests, error: qualityError } = await supabase
      .from('content_quality_tests')
      .select(`
        *,
        content_quality_standards!inner(standard_name, category)
      `)
      .gte('test_date', start.toISOString())
      .lte('test_date', end.toISOString())
      .order('test_date', { ascending: false });

    if (qualityError) {
      console.error('❌ Error fetching quality tests:', qualityError);
    }

    // Calculate quality test summary
    const qualitySummary = {
      totalTests: qualityTests?.length || 0,
      passedTests: qualityTests?.filter(t => t.passed).length || 0,
      averageScore: qualityTests?.length > 0 
        ? Math.round(qualityTests.reduce((sum, t) => sum + t.score, 0) / qualityTests.length)
        : 0,
      improvementTrend: 'stable' // This would need historical data to calculate properly
    };

    // Group quality tests by standard
    const qualityByStandard = qualityTests?.reduce((acc, test) => {
      const standardName = test.content_quality_standards.standard_name;
      if (!acc[standardName]) {
        acc[standardName] = {
          total: 0,
          passed: 0,
          averageScore: 0,
          category: test.content_quality_standards.category
        };
      }
      acc[standardName].total++;
      if (test.passed) {
        acc[standardName].passed++;
      }
      acc[standardName].averageScore += test.score;
      return acc;
    }, {} as Record<string, any>) || {};

    // Calculate averages for quality by standard
    Object.values(qualityByStandard).forEach((standard: any) => {
      standard.averageScore = Math.round(standard.averageScore / standard.total);
      standard.percentage = Math.round((standard.passed / standard.total) * 100);
    });

    return NextResponse.json({
      success: true,
      progress: {
        totalRequirements,
        completedRequirements,
        completionPercentage,
        byPlatform: formattedPlatformProgress,
        byCategory: formattedCategoryProgress
      },
      trends,
      velocity: Math.round(velocity * 100) / 100,
      estimatedCompletionDate: estimatedCompletionDate?.toISOString(),
      qualitySummary,
      qualityByStandard,
      summary: {
        totalPlatforms: Object.keys(platformProgress).length,
        totalCategories: Object.keys(categoryProgress).length,
        averageCompletion: formattedPlatformProgress.length > 0 
          ? Math.round(formattedPlatformProgress.reduce((sum, p) => sum + p.percentage, 0) / formattedPlatformProgress.length)
          : 0,
        criticalItemsRemaining: formattedPlatformProgress.reduce((sum, p) => sum + (p.criticalTotal - p.criticalCompleted), 0),
        totalEstimatedHours: formattedPlatformProgress.reduce((sum, p) => sum + p.estimatedHours, 0),
        completedHours: formattedPlatformProgress.reduce((sum, p) => sum + p.completedHours, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error in qualification analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
