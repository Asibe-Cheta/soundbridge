import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/src/lib/supabase';

export async function GET() {
  try {
    const supabase = createApiClient();

    // Test database connection by querying profiles table
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 });
    }

    // Test auth functionality
    const { error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1
    });

    if (authError) {
      console.error('Auth test error:', authError);
      return NextResponse.json({
        status: 'error',
        message: 'Auth functionality test failed',
        error: authError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Authentication system is working correctly',
      tests: {
        database: {
          passed: true,
          message: '✅ Database connection successful'
        },
        auth: {
          passed: true,
          message: '✅ Auth functionality working'
        }
      },
      summary: {
        totalTests: 2,
        passedTests: 2,
        failedTests: 0,
        message: '🎉 Authentication system ready!'
      }
    });

  } catch (error) {
    console.error('Unexpected error in auth test:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 