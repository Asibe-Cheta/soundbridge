import { createServiceClient } from '@/src/lib/supabase';

/** Round down to nearest 50 for public display (e.g. 1,423 → 1,400). */
export function roundCreatorCountForDisplay(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.floor(count / 50) * 50;
}

export async function getPublicCreatorCountRounded(): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'creator');

    if (error || count == null) return 0;
    return roundCreatorCountForDisplay(count);
  } catch {
    return 0;
  }
}
