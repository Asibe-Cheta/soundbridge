import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { stripe } from '@/src/lib/stripe';
import { SendGridService } from '@/src/lib/sendgrid-service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    let user;
    let authError;

    // Handle authentication (mobile and web)
    const authHeader = request.headers.get('authorization') || 
                      request.headers.get('Authorization') ||
                      request.headers.get('x-authorization') ||
                      request.headers.get('x-auth-token') ||
                      request.headers.get('x-supabase-token');
    
    if (authHeader && (authHeader.startsWith('Bearer ') || request.headers.get('x-supabase-token'))) {
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      user = userData.user;
      authError = userError;
    } else {
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value, ...options });
              } catch (error) {}
            },
            remove(name: string, options: CookieOptions) {
              try {
                cookieStore.set({ name, value: '', ...options, maxAge: 0 });
              } catch (error) {}
            },
          },
        }
      );
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      user = userData;
      authError = userError;
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    const { content_id, content_type, payment_method_id } = await request.json();

    if (!content_id || !content_type || !payment_method_id) {
      return NextResponse.json(
        { success: false, message: 'content_id, content_type, and payment_method_id are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!['track', 'album', 'podcast'].includes(content_type)) {
      return NextResponse.json(
        { success: false, message: 'content_type must be track, album, or podcast' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already owns the content
    const { data: existingPurchase } = await supabase
      .from('content_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', content_id)
      .eq('content_type', content_type)
      .eq('status', 'completed')
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { success: false, message: 'You already own this content' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get content details (for tracks)
    let content: any = null;
    let creatorId: string | null = null;
    let price: number = 0;
    let currency: string = 'USD';

    if (content_type === 'track') {
      const { data: track, error: trackError } = await supabase
        .from('audio_tracks')
        .select('id, title, creator_id, is_paid, price, currency')
        .eq('id', content_id)
        .single();

      if (trackError || !track) {
        return NextResponse.json(
          { success: false, message: 'Content not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      if (!track.is_paid) {
        return NextResponse.json(
          { success: false, message: 'This content is free' },
          { status: 400, headers: corsHeaders }
        );
      }

      if (track.creator_id === user.id) {
        return NextResponse.json(
          { success: false, message: 'You cannot purchase your own content' },
          { status: 400, headers: corsHeaders }
        );
      }

      content = track;
      creatorId = track.creator_id;
      price = Number(track.price);
      currency = track.currency || 'USD';
    } else {
      // TODO: Handle albums and podcasts when those tables are available
      return NextResponse.json(
        { success: false, message: 'Album and podcast purchases not yet implemented' },
        { status: 501, headers: corsHeaders }
      );
    }

    // Validate price range
    if (price < 0.99 || price > 50.00) {
      return NextResponse.json(
        { success: false, message: 'Invalid price range' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate fees (90/10 split)
    const platformFee = Math.round(price * 0.10 * 100) / 100;
    const creatorEarnings = Math.round(price * 0.90 * 100) / 100;

    // Create Stripe Payment Intent
    if (!stripe) {
      return NextResponse.json(
        { success: false, message: 'Payment system not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: payment_method_id,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/purchase-success`,
      metadata: {
        content_id: content_id,
        content_type: content_type,
        creator_id: creatorId || '',
        buyer_id: user.id,
        buyer_email: user.email || '',
      },
      description: `Purchase: ${content.title || 'Content'}`,
    });

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, message: 'Payment failed. Please try again.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('content_purchases')
      .insert({
        user_id: user.id,
        content_id: content_id,
        content_type: content_type,
        price_paid: price,
        currency: currency,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        transaction_id: paymentIntent.id,
        status: 'completed',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase record:', purchaseError);
      // Payment succeeded but record creation failed - refund or handle manually
      return NextResponse.json(
        { success: false, message: 'Purchase recorded but there was an error. Please contact support.' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Transfer earnings to creator's wallet
    if (creatorId) {
      try {
        const { error: walletError } = await supabase
          .rpc('add_wallet_transaction', {
            user_uuid: creatorId,
            transaction_type: 'content_sale',
            amount: creatorEarnings,
            description: `Sale: ${content.title || 'Content'}`,
            reference_id: paymentIntent.id,
            metadata: {
              content_id: content_id,
              content_type: content_type,
              buyer_id: user.id,
              buyer_username: user.user_metadata?.username || user.email,
              original_price: price,
              platform_fee: platformFee,
            }
          });

        if (walletError) {
          console.error('Error adding sale to creator wallet:', walletError);
          // Don't fail - purchase is complete, wallet update can be retried
        }
      } catch (walletError) {
        console.error('Error processing wallet transaction:', walletError);
      }
    }

    // Update content sales metrics
    if (content_type === 'track') {
      // Get current values first
      const { data: currentTrack } = await supabase
        .from('audio_tracks')
        .select('total_sales_count, total_revenue')
        .eq('id', content_id)
        .single();

      const { error: updateError } = await supabase
        .from('audio_tracks')
        .update({
          total_sales_count: (currentTrack?.total_sales_count || 0) + 1,
          total_revenue: Number(currentTrack?.total_revenue || 0) + price,
        })
        .eq('id', content_id);

      if (updateError) {
        console.error('Error updating sales metrics:', updateError);
        // Don't fail - purchase is complete
      }
    }

    // Send email notifications (non-blocking)
    try {
      // Get buyer email and username
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('email, username, display_name')
        .eq('id', user.id)
        .single();

      // Get creator email and username
      if (creatorId) {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('email, username, display_name')
          .eq('id', creatorId)
          .single();

        // Send purchase confirmation to buyer
        if (buyerProfile?.email) {
          await SendGridService.sendPurchaseConfirmationEmail({
            to: buyerProfile.email,
            userName: buyerProfile.display_name || buyerProfile.username || 'User',
            contentTitle: content.title || 'Content',
            creatorName: creatorProfile?.display_name || creatorProfile?.username || 'Creator',
            pricePaid: price,
            currency: currency,
            transactionId: paymentIntent.id,
            purchaseDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            libraryUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/user/purchases`,
          });
        }

        // Send sale notification to creator
        if (creatorProfile?.email) {
          await SendGridService.sendSaleNotificationEmail({
            to: creatorProfile.email,
            creatorName: creatorProfile.display_name || creatorProfile.username || 'Creator',
            contentTitle: content.title || 'Content',
            buyerUsername: buyerProfile?.username || 'User',
            amountEarned: creatorEarnings,
            currency: currency,
            analyticsUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.soundbridge.live'}/creator/sales`,
          });
        }
      }
    } catch (emailError) {
      console.error('Error sending email notifications:', emailError);
      // Don't fail the purchase if emails fail
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          purchase: {
            id: purchase.id,
            user_id: purchase.user_id,
            content_id: purchase.content_id,
            content_type: purchase.content_type,
            price_paid: purchase.price_paid,
            currency: purchase.currency,
            platform_fee: purchase.platform_fee,
            creator_earnings: purchase.creator_earnings,
            transaction_id: purchase.transaction_id,
            status: purchase.status,
            purchased_at: purchase.purchased_at,
            download_count: purchase.download_count,
          },
        },
        message: 'Purchase successful',
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error processing purchase:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
