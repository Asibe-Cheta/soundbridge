import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/src/lib/stripe';
import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import {
  createDistributionAudioSignedUrl,
  createDistributionCoverSignedUrl,
} from '@/src/lib/distribution-signed-urls';
import { sendPartnerDistributionEmail } from '@/src/lib/distribution-emails';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, x-authorization, x-auth-token, x-supabase-token',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getSupabaseRouteClient(request, true);
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json();
    const paymentIntentId = String(body.paymentIntentId ?? body.payment_intent_id ?? '').trim();
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'paymentIntentId is required' }, { status: 400, headers: corsHeaders });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded yet', status: paymentIntent.status },
        { status: 400, headers: corsHeaders },
      );
    }

    const service = createServiceClient();
    const { data: requestRow, error: fetchErr } = await service
      .from('distribution_requests')
      .select('*')
      .eq('stripe_payment_id', paymentIntentId)
      .eq('creator_id', user.id)
      .maybeSingle();

    if (fetchErr || !requestRow) {
      return NextResponse.json({ error: 'Distribution request not found' }, { status: 404, headers: corsHeaders });
    }

    if (requestRow.track_status === 'submitted' && requestRow.email_sent_to_partner) {
      return NextResponse.json(
        { success: true, requestId: requestRow.id, alreadyConfirmed: true },
        { headers: corsHeaders },
      );
    }

    const { data: track } = await service
      .from('audio_tracks')
      .select('file_url, cover_art_url')
      .eq('id', requestRow.track_id)
      .maybeSingle();

    const [audioDownloadUrl, coverDownloadUrl] = await Promise.all([
      createDistributionAudioSignedUrl(track?.file_url ?? null),
      createDistributionCoverSignedUrl(track?.cover_art_url ?? null),
    ]);

    let emailSent = false;
    if (!requestRow.email_sent_to_partner) {
      emailSent = await sendPartnerDistributionEmail({
        requestId: requestRow.id,
        trackTitle: requestRow.track_title,
        artistName: requestRow.artist_name,
        featuredArtists: requestRow.featured_artists,
        genre: requestRow.genre,
        isrcCode: requestRow.isrc_code,
        explicitContent: Boolean(requestRow.explicit_content),
        requestedReleaseDate: String(requestRow.requested_release_date),
        creatorEmail: requestRow.creator_email,
        creatorId: requestRow.creator_id,
        amountPaid: Number(requestRow.amount_paid),
        audioDownloadUrl,
        coverDownloadUrl,
      });
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await service
      .from('distribution_requests')
      .update({
        track_status: 'submitted',
        stripe_payment_id: paymentIntentId,
        email_sent_to_partner: requestRow.email_sent_to_partner || emailSent,
        email_sent_at: requestRow.email_sent_at || (emailSent ? now : null),
      })
      .eq('id', requestRow.id);

    if (updateErr) {
      console.error('[distribution/confirm] update failed:', updateErr);
      return NextResponse.json({ error: 'Failed to update distribution request' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        success: true,
        requestId: requestRow.id,
        emailSentToPartner: requestRow.email_sent_to_partner || emailSent,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('[distribution/confirm]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
