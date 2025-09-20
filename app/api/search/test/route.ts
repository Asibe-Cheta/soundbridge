import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    console.log('🧪 Testing enhanced search with query:', query);
    
    // Test the enhanced search endpoint
    const response = await fetch(`http://localhost:3000/api/search/enhanced?q=${encodeURIComponent(query)}&limit=5`);
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      testQuery: query,
      results: data,
      message: `Enhanced search test for "${query}"`
    });
    
  } catch (error) {
    console.error('❌ Search test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Search test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
