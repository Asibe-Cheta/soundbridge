import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    return NextResponse.json({
      success: true,
      cookieCount: allCookies.length,
      cookies: allCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      })),
      supabaseCookies: allCookies
        .filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
        .map(c => ({
          name: c.name,
          valuePreview: c.value?.substring(0, 20) + '...',
        })),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

