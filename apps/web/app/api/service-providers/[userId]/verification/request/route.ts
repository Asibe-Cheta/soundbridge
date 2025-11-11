import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseRouteClient } from '@/src/lib/api-auth';
import { createServiceClient } from '@/src/lib/supabase';
import { providerVerificationService } from '@/src/services/ProviderVerificationService';
import type { ProviderVerificationStatus } from '@/src/services/ProviderVerificationService';
import type { Database } from '@/src/lib/types';

type VerificationRequestInsert = Database['public']['Tables']['service_provider_verification_requests']['Insert'];
type VerificationDocumentInsert = Database['public']['Tables']['service_provider_verification_documents']['Insert'];
type Json = Database['public']['Tables']['service_provider_verification_requests']['Insert']['automated_checks'];

const serializePrerequisite = (
  prerequisite: ProviderVerificationStatus['prerequisites'][keyof ProviderVerificationStatus['prerequisites']],
): Json => ({
  met: prerequisite.met,
  value: prerequisite.value ?? null,
  required: prerequisite.required ?? null,
  description: prerequisite.description ?? null,
});

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return fallback;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface VerificationDocumentPayload {
  docType: string;
  storagePath: string;
  metadata?: Record<string, unknown>;
}

interface VerificationRequestPayload {
  notes?: string;
  documents: VerificationDocumentPayload[];
}

const REQUIRED_DOCUMENT_TYPES = ['government_id', 'selfie'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { supabase, user, error } = await getSupabaseRouteClient(request, true);

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  if (user.id !== userId) {
    return NextResponse.json({ error: 'You can only submit verification for your own profile' }, { status: 403, headers: corsHeaders });
  }

  let payload: VerificationRequestPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400, headers: corsHeaders });
  }

  const documents = payload.documents ?? [];
  if (documents.length === 0) {
    return NextResponse.json({ error: 'Verification documents are required' }, { status: 400, headers: corsHeaders });
  }

  const missingDoc = REQUIRED_DOCUMENT_TYPES.find(
    (type) => !documents.some((doc) => doc.docType === type && doc.storagePath),
  );
  if (missingDoc) {
    return NextResponse.json(
      { error: `Missing required document: ${missingDoc}` },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const status = await providerVerificationService.getStatus(userId);
    if (!status) {
      return NextResponse.json({ error: 'Service provider profile not found' }, { status: 404, headers: corsHeaders });
    }

    if (status.verificationStatus === 'pending') {
      return NextResponse.json({ error: 'Verification request already pending review.' }, { status: 409, headers: corsHeaders });
    }

    const unmet = Object.entries(status.prerequisites).filter(([, prerequisite]) => !prerequisite.met);
    if (unmet.length > 0) {
      return NextResponse.json(
        {
          error: 'Verification prerequisites not met',
          unmet: unmet.map(([key, value]) => ({
            key,
            description: value.description,
            value: value.value,
            required: value.required,
          })),
        },
        { status: 409, headers: corsHeaders },
      );
    }

    const supabaseAdmin = createServiceClient();
    const nowIso = new Date().toISOString();

    const requestPayload: VerificationRequestInsert = {
      provider_id: userId,
      status: 'pending',
      submitted_at: nowIso,
      provider_notes: payload.notes ?? null,
      automated_checks: {
        completedBookings: serializePrerequisite(status.prerequisites.completedBookings),
        averageRating: serializePrerequisite(status.prerequisites.averageRating),
        portfolio: serializePrerequisite(status.prerequisites.portfolioItems),
        offerings: serializePrerequisite(status.prerequisites.offeringsPublished),
        profileComplete: serializePrerequisite(status.prerequisites.profileComplete),
        connectAccount: serializePrerequisite(status.prerequisites.connectAccount),
      } as Json,
  bookings_completed: toNumber(status.prerequisites.completedBookings.value),
  average_rating: toNumber(status.prerequisites.averageRating.value),
  portfolio_items: toNumber(status.prerequisites.portfolioItems.value),
      profile_completeness: {
        profile: status.prerequisites.profileComplete.met,
        offerings: status.prerequisites.offeringsPublished.met,
        portfolio: status.prerequisites.portfolioItems.met,
      },
    };

    const { data: requestRecord, error: insertError } = await supabaseAdmin
      .from('service_provider_verification_requests')
      .insert(requestPayload)
      .select('*')
      .single();

    if (insertError || !requestRecord) {
      console.error('Failed to create verification request', insertError);
      return NextResponse.json(
        { error: 'Failed to submit verification request', details: insertError?.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const documentPayload: VerificationDocumentInsert[] = documents.map((doc) => ({
      request_id: requestRecord.id,
      doc_type: doc.docType,
      storage_path: doc.storagePath,
      metadata: (doc.metadata ?? null) as Json,
    }));

    if (documentPayload.length > 0) {
      const { error: docError } = await supabaseAdmin
        .from('service_provider_verification_documents')
        .insert(documentPayload);

      if (docError) {
        console.error('Failed to store verification documents', docError);
        return NextResponse.json(
          { error: 'Verification request created but failed to store documents', details: docError.message },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from('service_provider_profiles')
      .update({
        verification_status: 'pending',
        verification_requested_at: nowIso,
        verification_reviewed_at: null,
        verification_reviewer_id: null,
        verification_notes: payload.notes ?? null,
      })
      .eq('user_id', userId);

    if (updateProfileError) {
      console.error('Failed to update provider profile verification status', updateProfileError);
    }

    return NextResponse.json(
      {
        request: {
          ...requestRecord,
          documents: documentPayload,
        },
      },
      { status: 201, headers: corsHeaders },
    );
  } catch (requestError) {
    console.error('Failed to submit verification request', requestError);
    return NextResponse.json(
      { error: 'Failed to submit verification request', details: requestError instanceof Error ? requestError.message : 'Unknown error' },
      { status: 500, headers: corsHeaders },
    );
  }
}


