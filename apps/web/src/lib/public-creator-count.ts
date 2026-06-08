import { createServiceClient } from '@/src/lib/supabase';

/** Round down to nearest 50 for public display (e.g. 1,487 → 1,450). */
export function roundUserCountForDisplay(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count / 50) * 50;
}

/** Count all registered auth users (matches Supabase Auth > Users total). */
export async function getPublicUserCountRounded(): Promise<number> {
  try {
    const supabase = createServiceClient();
    let total = 0;
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error || !data?.users) {
        break;
      }

      total += data.users.length;
      if (data.users.length < perPage) {
        break;
      }
      page += 1;
    }

    if (total > 0) {
      return roundUserCountForDisplay(total);
    }

    // Fallback if admin API unavailable
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error || count == null) return 0;
    return roundUserCountForDisplay(count);
  } catch {
    return 0;
  }
}

/** @deprecated Use getPublicUserCountRounded */
export const getPublicCreatorCountRounded = getPublicUserCountRounded;

/** @deprecated Use roundUserCountForDisplay */
export const roundCreatorCountForDisplay = roundUserCountForDisplay;
