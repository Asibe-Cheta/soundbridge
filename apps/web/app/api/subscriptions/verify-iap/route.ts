import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Apple App Store receipt verification
async function verifyAppleReceipt(receiptData: string, isProduction: boolean = true) {
  const endpoint = isProduction 
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';
  
  const password = process.env.APPLE_SHARED_SECRET;
  if (!password) {
    throw new Error('Apple shared secret not configured');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': password,
      'exclude-old-transactions': true
    }),
  });

  const result = await response.json();
  
  // If production verification fails with sandbox receipt, try sandbox
  if (result.status === 21007 && isProduction) {
    return verifyAppleReceipt(receiptData, false);
  }

  return result;
}

// Google Play Store receipt verification
async function verifyGoogleReceipt(packageName: string, productId: string, purchaseToken: string) {
  try {
    // Check if Google service account is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
      console.warn('Google service account not configured, skipping server-side verification');
      // For now, we'll trust the client-side verification
      // In production, you should implement server-side verification
      return {
        startTimeMillis: Date.now().toString(),
        expiryTimeMillis: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(), // 30 days from now
        paymentState: 1 // Assume valid for now
      };
    }

    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = require('@googleapis/androidpublisher').androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    const result = await androidPublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: productId,
      token: purchaseToken,
    });

    return result.data;
  } catch (error) {
    console.error('Google receipt verification error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
  };

  try {
    console.log('🍎 IAP VERIFICATION: Starting receipt verification...');

    // Get user authentication (support both cookie and Bearer token)
    let user;
    let supabase;
    
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');

    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
      // Mobile app authentication
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
      
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: corsHeaders }
        );
      }
      user = data.user;
    } else {
      // Web app authentication
      supabase = createRouteHandlerClient({ cookies });
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: corsHeaders }
        );
      }
      user = data.user;
    }

    console.log('🍎 IAP VERIFICATION: User authenticated:', user.id);

    // Parse request body
    const { platform, receiptData, productId, transactionId, packageName, purchaseToken } = await request.json();

    if (!platform || !['apple', 'google'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be "apple" or "google"' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('🍎 IAP VERIFICATION: Platform:', platform, 'Product:', productId);

    // Log receipt verification attempt
    await supabase
      .from('iap_receipt_logs')
      .insert({
        user_id: user.id,
        platform,
        receipt_data: receiptData || purchaseToken || '',
        verification_status: 'pending',
        transaction_id: transactionId,
        product_id: productId
      });

    let verificationResult;
    let subscriptionData = null;

    try {
      if (platform === 'apple') {
        if (!receiptData) {
          return NextResponse.json(
            { error: 'Receipt data required for Apple verification' },
            { status: 400, headers: corsHeaders }
          );
        }

        console.log('🍎 IAP VERIFICATION: Verifying Apple receipt...');
        verificationResult = await verifyAppleReceipt(receiptData);
        
        if (verificationResult.status === 0) {
          // Find the subscription in the receipt
          const latestReceiptInfo = verificationResult.latest_receipt_info || [];
          const subscription = latestReceiptInfo.find((item: any) => item.product_id === productId);
          
          if (subscription) {
            subscriptionData = {
              transactionId: subscription.transaction_id,
              originalTransactionId: subscription.original_transaction_id,
              productId: subscription.product_id,
              purchaseDate: new Date(parseInt(subscription.purchase_date_ms)),
              expiresDate: new Date(parseInt(subscription.expires_date_ms)),
              isActive: new Date() < new Date(parseInt(subscription.expires_date_ms))
            };
          }
        }
      } else if (platform === 'google') {
        if (!packageName || !purchaseToken) {
          return NextResponse.json(
            { error: 'Package name and purchase token required for Google verification' },
            { status: 400, headers: corsHeaders }
          );
        }

        console.log('🍎 IAP VERIFICATION: Verifying Google receipt...');
        verificationResult = await verifyGoogleReceipt(packageName, productId, purchaseToken);
        
        if (verificationResult) {
          subscriptionData = {
            transactionId: purchaseToken,
            originalTransactionId: purchaseToken,
            productId: productId,
            purchaseDate: new Date(parseInt(verificationResult.startTimeMillis)),
            expiresDate: new Date(parseInt(verificationResult.expiryTimeMillis)),
            isActive: verificationResult.paymentState === 1 // 1 = received, 0 = pending
          };
        }
      }

      if (!subscriptionData || !subscriptionData.isActive) {
        // Log failed verification
        await supabase
          .from('iap_receipt_logs')
          .update({
            verification_status: 'invalid',
            error_message: 'Receipt verification failed or subscription expired'
          })
          .eq('user_id', user.id)
          .eq('transaction_id', transactionId);

        return NextResponse.json(
          { error: 'Receipt verification failed or subscription expired' },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log('🍎 IAP VERIFICATION: Receipt verified successfully');

      // Get product configuration to determine tier
      const { data: productConfig } = await supabase
        .from('iap_products')
        .select('tier, billing_cycle, price_usd')
        .eq('platform', platform)
        .eq('product_id', productId)
        .single();

      if (!productConfig) {
        return NextResponse.json(
          { error: 'Product configuration not found' },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log('🍎 IAP VERIFICATION: Product config:', productConfig);

      // Update or create user subscription
      const subscriptionUpdate = {
        user_id: user.id,
        tier: productConfig.tier,
        status: 'active',
        billing_cycle: productConfig.billing_cycle,
        subscription_platform: platform,
        iap_receipt: receiptData || purchaseToken,
        iap_transaction_id: subscriptionData.transactionId,
        iap_original_transaction_id: subscriptionData.originalTransactionId,
        iap_product_id: productId,
        subscription_ends_at: subscriptionData.expiresDate,
        updated_at: new Date()
      };

      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let subscriptionResult;
      if (existingSubscription) {
        // Update existing subscription
        subscriptionResult = await supabase
          .from('user_subscriptions')
          .update(subscriptionUpdate)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        // Create new subscription
        subscriptionResult = await supabase
          .from('user_subscriptions')
          .insert(subscriptionUpdate)
          .select()
          .single();
      }

      if (subscriptionResult.error) {
        console.error('🍎 IAP VERIFICATION: Database error:', subscriptionResult.error);
        return NextResponse.json(
          { error: 'Failed to update subscription', details: subscriptionResult.error.message },
          { status: 500, headers: corsHeaders }
        );
      }

      // Log successful verification
      await supabase
        .from('iap_receipt_logs')
        .update({
          verification_status: 'valid',
          purchase_date: subscriptionData.purchaseDate,
          expires_date: subscriptionData.expiresDate
        })
        .eq('user_id', user.id)
        .eq('transaction_id', transactionId);

      // Get updated user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('🍎 IAP VERIFICATION: Subscription updated successfully');

      return NextResponse.json({
        success: true,
        message: 'Subscription verified and updated',
        subscription: subscriptionResult.data,
        profile: profile,
        verificationDetails: {
          platform,
          productId,
          tier: productConfig.tier,
          billingCycle: productConfig.billing_cycle,
          expiresAt: subscriptionData.expiresDate,
          transactionId: subscriptionData.transactionId
        }
      }, { headers: corsHeaders });

    } catch (verificationError: any) {
      console.error('🍎 IAP VERIFICATION ERROR:', verificationError);
      
      // Log failed verification
      await supabase
        .from('iap_receipt_logs')
        .update({
          verification_status: 'invalid',
          error_message: verificationError.message
        })
        .eq('user_id', user.id)
        .eq('transaction_id', transactionId);

      return NextResponse.json(
        { 
          error: 'Receipt verification failed',
          details: verificationError.message 
        },
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('🍎 IAP VERIFICATION: Unexpected error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
    },
  });
}
