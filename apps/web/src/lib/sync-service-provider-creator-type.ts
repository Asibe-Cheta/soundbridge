import { createServiceClient } from '@/src/lib/supabase';

/**
 * Keeps `user_creator_types` aligned with `service_provider_profiles`.
 * Call after SP profile create/update, and from GET creator-types to heal legacy drift
 * (e.g. web-created profiles without a matching row in user_creator_types).
 */
export async function ensureServiceProviderCreatorTypeSynced(userId: string): Promise<void> {
  const service = createServiceClient();

  const { data: profile, error: profileError } = await service
    .from('service_provider_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return;
  }

  const { data: existing, error: existingError } = await service
    .from('user_creator_types')
    .select('creator_type')
    .eq('user_id', userId)
    .eq('creator_type', 'service_provider')
    .maybeSingle();

  if (existingError || existing) {
    return;
  }

  const { error: insertError } = await service.from('user_creator_types').insert({
    user_id: userId,
    creator_type: 'service_provider',
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error('[ensureServiceProviderCreatorTypeSynced] insert failed:', {
      userId,
      message: insertError.message,
      code: insertError.code,
    });
  }
}
