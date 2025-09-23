import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTH HOOK TEST ===');
    
    // Log all headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Headers:', headers);
    
    // Get body
    const body = await request.text();
    console.log('Body:', body);
    
    // Try to parse JSON
    let bodyJson;
    try {
      bodyJson = JSON.parse(body);
      console.log('Parsed JSON:', JSON.stringify(bodyJson, null, 2));
    } catch (error) {
      console.log('Failed to parse JSON:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auth hook test successful',
      headers,
      bodyLength: body.length,
      bodyJson: bodyJson || 'Could not parse JSON'
    });
    
  } catch (error) {
    console.error('Auth hook test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auth hook test endpoint',
    instructions: 'Send a POST request to test the auth hook'
  });
}
