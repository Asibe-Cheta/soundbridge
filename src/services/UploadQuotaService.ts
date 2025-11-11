import { Session } from '@supabase/supabase-js';
import { apiFetch } from '../lib/apiClient';

export type UploadQuota = {
  tier: string;
  upload_limit: number | null;
  uploads_this_month: number;
  remaining: number | null;
  reset_date: string | null;
  is_unlimited: boolean;
  can_upload: boolean;
};

type UploadQuotaResponse = {
  success: boolean;
  quota?: UploadQuota;
  message?: string;
};

export async function getUploadQuota(session: Session | null): Promise<UploadQuota | null> {
  if (!session?.access_token) {
    return null;
  }

  try {
    const response = await apiFetch<UploadQuotaResponse>('/api/upload/quota', {
      method: 'GET',
      session,
    });

    if (!response.success || !response.quota) {
      return null;
    }

    return response.quota;
  } catch (error) {
    console.warn('UploadQuotaService: failed to load quota', error);
    return null;
  }
}



