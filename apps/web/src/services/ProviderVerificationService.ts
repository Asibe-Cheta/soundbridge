import { createClient } from '@supabase/supabase-js';

import type {
  ServiceProviderVerificationDocumentTable,
  ServiceProviderVerificationRequestTable,
} from '@/src/lib/types';

interface VerificationPrerequisite {
  met: boolean;
  value?: number | boolean | string | null;
  required?: number | boolean | string | null;
  description?: string;
}

export interface ProviderVerificationStatus {
  verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  verificationNotes: string | null;
  verificationRequestedAt: string | null;
  verificationReviewedAt: string | null;
  latestRequest: (ServiceProviderVerificationRequestTable & { documents: ServiceProviderVerificationDocumentTable[] }) | null;
  prerequisites: {
    profileComplete: VerificationPrerequisite;
    offeringsPublished: VerificationPrerequisite;
    portfolioItems: VerificationPrerequisite;
    completedBookings: VerificationPrerequisite;
    averageRating: VerificationPrerequisite;
    connectAccount: VerificationPrerequisite;
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class ProviderVerificationService {
  private supabase =
    supabaseUrl && supabaseServiceRoleKey
      ? createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

  private ensureReady() {
    if (!this.supabase) {
      throw new Error('ProviderVerificationService not initialised (missing Supabase credentials)');
    }
  }

  async getStatus(providerId: string): Promise<ProviderVerificationStatus | null> {
    this.ensureReady();

    const supabase = this.supabase!;

    const { data: provider, error: providerError } = await supabase
      .from('service_provider_profiles')
      .select('*')
      .eq('user_id', providerId)
      .maybeSingle();

    if (providerError) {
      console.error('Failed to load provider profile for verification status', providerError);
      return null;
    }

    if (!provider) {
      return null;
    }

    const latestRequest = await this.getLatestRequestWithDocuments(providerId);
    const prerequisites = await this.evaluatePrerequisites(providerId, provider.average_rating ?? 0);

    return {
      verificationStatus: provider.verification_status,
      isVerified: provider.is_verified,
      verificationNotes: provider.verification_notes,
      verificationRequestedAt: provider.verification_requested_at,
      verificationReviewedAt: provider.verification_reviewed_at,
      latestRequest,
      prerequisites,
    };
  }

  async getLatestRequestWithDocuments(providerId: string) {
    this.ensureReady();
    const supabase = this.supabase!;

    const { data: request, error } = await supabase
      .from('service_provider_verification_requests')
      .select('*')
      .eq('provider_id', providerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch latest verification request', error);
      return null;
    }

    if (!request) {
      return null;
    }

    const { data: documents, error: docError } = await supabase
      .from('service_provider_verification_documents')
      .select('*')
      .eq('request_id', request.id);

    if (docError) {
      console.error('Failed to fetch verification documents', docError);
      return { ...request, documents: [] as ServiceProviderVerificationDocumentTable[] };
    }

    return { ...request, documents: documents ?? [] };
  }

  async evaluatePrerequisites(providerId: string, averageRating: number): Promise<ProviderVerificationStatus['prerequisites']> {
    this.ensureReady();
    const supabase = this.supabase!;

    const [
      { data: offerings, error: offeringsError },
      { data: portfolioItems, error: portfolioError },
      { count: completedBookingsTotal, error: completedBookingsError },
      { data: connectAccount, error: connectAccountError },
      { data: providerProfile, error: profileError },
    ] = await Promise.all([
      supabase
        .from('service_offerings')
        .select('id')
        .eq('provider_id', providerId)
        .eq('is_active', true),
      supabase
        .from('service_portfolio_items')
        .select('id')
        .eq('provider_id', providerId),
      supabase
        .from('service_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('status', 'completed'),
      supabase
        .from('provider_connect_accounts')
        .select('*')
        .eq('provider_id', providerId)
        .maybeSingle(),
      supabase
        .from('service_provider_profiles')
        .select('*')
        .eq('user_id', providerId)
        .maybeSingle(),
    ]);

    if (offeringsError) console.error('Failed to load offerings for verification prerequisites', offeringsError);
    if (portfolioError) console.error('Failed to load portfolio for verification prerequisites', portfolioError);
    if (completedBookingsError) console.error('Failed to load bookings for verification prerequisites', completedBookingsError);
    if (connectAccountError) console.error('Failed to load connect account for verification prerequisites', connectAccountError);
    if (profileError) console.error('Failed to reload provider profile for verification prerequisites', profileError);

    const activeOfferings = offerings?.length ?? 0;
    const portfolioCount = portfolioItems?.length ?? 0;
    const completedBookings = completedBookingsTotal ?? 0;
    const connectAccountReady =
      !!connectAccount?.charges_enabled && !!connectAccount?.payouts_enabled && !!connectAccount?.details_submitted;

    const profileComplete =
      !!providerProfile?.display_name &&
      !!providerProfile?.headline &&
      !!providerProfile?.bio &&
      (providerProfile?.categories?.length ?? 0) > 0 &&
      providerProfile?.default_rate !== null &&
      providerProfile?.rate_currency !== null;

    return {
      profileComplete: {
        met: profileComplete,
        description: 'Profile must include display name, headline, bio, categories, rate & currency',
      },
      offeringsPublished: {
        met: activeOfferings > 0,
        value: activeOfferings,
        required: 1,
        description: 'At least one active service offering',
      },
      portfolioItems: {
        met: portfolioCount >= 2,
        value: portfolioCount,
        required: 2,
        description: 'Minimum of two portfolio items',
      },
      completedBookings: {
        met: completedBookings >= 3,
        value: completedBookings,
        required: 3,
        description: 'Completed bookings to demonstrate delivery track record',
      },
      averageRating: {
        met: averageRating >= 4,
        value: averageRating,
        required: 4,
        description: 'Maintain an average rating of 4.0 or higher',
      },
      connectAccount: {
        met: connectAccountReady,
        description: 'Stripe Connect account must be fully enabled for payouts',
      },
    };
  }
}

export const providerVerificationService = new ProviderVerificationService();

