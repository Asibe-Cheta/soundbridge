import type { CustomBranding } from './types/branding';
import { DEFAULT_BRANDING } from './types/branding';

/** `get_user_branding` returns a single JSON object (or legacy TABLE as array). */
export function normalizeBrandingRpcResult(data: unknown, userId: string): CustomBranding | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? (data as unknown[])[0] : data;
  if (row == null || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;

  const bgRaw = o.background_gradient;
  let background_gradient: string | null;
  if (typeof bgRaw === 'string') {
    background_gradient = bgRaw;
  } else if (bgRaw != null && typeof bgRaw === 'object') {
    const g = bgRaw as Record<string, unknown>;
    background_gradient =
      typeof g.classes === 'string' ? g.classes : DEFAULT_BRANDING.background_gradient;
  } else {
    background_gradient = DEFAULT_BRANDING.background_gradient;
  }

  const wmRaw = o.watermark_opacity;
  let watermark_opacity = DEFAULT_BRANDING.watermark_opacity;
  if (typeof wmRaw === 'number' && !Number.isNaN(wmRaw)) {
    watermark_opacity =
      wmRaw <= 1 ? Math.round(wmRaw * 100) : Math.round(wmRaw);
    watermark_opacity = Math.min(100, Math.max(0, watermark_opacity));
  }

  const abt = o.avatar_border_type;
  const avatar_border_type =
    abt === 'none' || abt === 'single' || abt === 'gradient'
      ? abt
      : DEFAULT_BRANDING.avatar_border_type;

  const primary_color = (o.primary_color as string | null | undefined) ?? DEFAULT_BRANDING.primary_color;
  const secondary_color = (o.secondary_color as string | null | undefined) ?? DEFAULT_BRANDING.secondary_color;
  const accent_color = (o.accent_color as string | null | undefined) ?? DEFAULT_BRANDING.accent_color;
  const isBadTripletDefault =
    primary_color === '#EF4444' &&
    secondary_color === '#1F2937' &&
    accent_color === '#F59E0B';

  return {
    user_id: userId,
    custom_logo_url: (o.custom_logo_url as string | null | undefined) ?? undefined,
    custom_logo_width:
      (o.custom_logo_width as number | null | undefined) ?? DEFAULT_BRANDING.custom_logo_width,
    custom_logo_height:
      (o.custom_logo_height as number | null | undefined) ?? DEFAULT_BRANDING.custom_logo_height,
    custom_logo_position:
      (o.custom_logo_position as CustomBranding['custom_logo_position']) ??
      DEFAULT_BRANDING.custom_logo_position,
    primary_color: isBadTripletDefault ? null : primary_color,
    secondary_color: isBadTripletDefault ? null : secondary_color,
    accent_color: isBadTripletDefault ? null : accent_color,
    background_gradient,
    layout_style:
      (o.layout_style as CustomBranding['layout_style']) ?? DEFAULT_BRANDING.layout_style,
    show_powered_by: isBadTripletDefault
      ? false
      : ((o.show_powered_by as boolean) ?? DEFAULT_BRANDING.show_powered_by),
    watermark_enabled: (o.watermark_enabled as boolean) ?? DEFAULT_BRANDING.watermark_enabled,
    watermark_opacity,
    watermark_position:
      (o.watermark_position as CustomBranding['watermark_position']) ??
      DEFAULT_BRANDING.watermark_position,
    user_tier: (o.user_tier as CustomBranding['user_tier']) ?? DEFAULT_BRANDING.user_tier,
    avatar_border_type,
    avatar_border_color: (o.avatar_border_color as string | null | undefined) ?? null,
    avatar_border_gradient_start:
      (o.avatar_border_gradient_start as string | null | undefined) ?? null,
    avatar_border_gradient_end:
      (o.avatar_border_gradient_end as string | null | undefined) ?? null,
  };
}
