import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('\n🔍 === ENVIRONMENT DEBUG API ===');
  
  try {
    // Get all environment variables (filtered for security)
    const allEnvVars = Object.keys(process.env);
    const supabaseVars = allEnvVars.filter(key => key.includes('SUPABASE'));
    const nextPublicVars = allEnvVars.filter(key => key.startsWith('NEXT_PUBLIC'));
    const nodeEnvVars = allEnvVars.filter(key => key.startsWith('NODE_'));
    
    // Check specific required variables
    const requiredVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    
    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    const response = {
      timestamp: new Date().toISOString(),
      serverContext: typeof window === 'undefined',
      nodeEnv: process.env.NODE_ENV || 'unknown',
      
      // Required variables status
      requiredVariables: {
        status: missingVars.length === 0 ? '✅ All set' : '❌ Missing variables',
        missing: missingVars,
        variables: Object.fromEntries(
          Object.entries(requiredVars).map(([key, value]) => [
            key, 
            {
              set: !!value,
              preview: value ? `${value.substring(0, 20)}...` : 'undefined',
              length: value ? value.length : 0
            }
          ])
        )
      },
      
      // All environment variables (filtered)
      environmentVariables: {
        total: allEnvVars.length,
        supabase: supabaseVars.length,
        nextPublic: nextPublicVars.length,
        nodeEnv: nodeEnvVars.length,
        
        // Show actual variable names (but not values for security)
        supabaseVars,
        nextPublicVars,
        nodeEnvVars
      },
      
      // Debug information
      debug: {
        isServer: typeof window === 'undefined',
        hasProcessEnv: typeof process !== 'undefined' && typeof process.env !== 'undefined',
        envKeysCount: allEnvVars.length,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('📊 Environment Debug Results:');
    console.log('   Server context:', response.serverContext);
    console.log('   NODE_ENV:', response.nodeEnv);
    console.log('   Missing variables:', missingVars);
    console.log('   Total env vars:', allEnvVars.length);
    console.log('   Supabase vars:', supabaseVars.length);
    console.log('   Next Public vars:', nextPublicVars.length);
    
    return NextResponse.json(response, { 
      status: 200 
    });
    
  } catch (error) {
    console.error('💥 Debug API error:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Debug API failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        isServer: typeof window === 'undefined',
        hasProcessEnv: typeof process !== 'undefined' && typeof process.env !== 'undefined',
        error: true
      }
    }, { status: 500 });
  }
} 