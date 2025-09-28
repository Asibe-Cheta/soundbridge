import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    console.log('📱 IAP PRODUCTS: Fetching product configurations...');

    // Create Supabase client (no auth required for product info)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get platform from query params
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    let query = supabase
      .from('iap_products')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true })
      .order('billing_cycle', { ascending: true });

    // Filter by platform if specified
    if (platform && ['apple', 'google'].includes(platform)) {
      query = query.eq('platform', platform);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('📱 IAP PRODUCTS ERROR:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('📱 IAP PRODUCTS: Found', products?.length || 0, 'products');

    // Group products by platform for easier mobile app consumption
    const groupedProducts = {
      apple: products?.filter(p => p.platform === 'apple') || [],
      google: products?.filter(p => p.platform === 'google') || [],
    };

    // Also provide a flat list for convenience
    const productList = products?.map(product => ({
      id: product.id,
      platform: product.platform,
      productId: product.product_id,
      tier: product.tier,
      billingCycle: product.billing_cycle,
      priceUsd: product.price_usd,
      currency: product.currency,
      displayName: `${product.tier.charAt(0).toUpperCase() + product.tier.slice(1)} ${product.billing_cycle.charAt(0).toUpperCase() + product.billing_cycle.slice(1)}`,
      description: `SoundBridge ${product.tier} subscription - ${product.billing_cycle} billing`
    })) || [];

    return NextResponse.json({
      success: true,
      products: groupedProducts,
      productList: productList,
      count: products?.length || 0,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('📱 IAP PRODUCTS: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
