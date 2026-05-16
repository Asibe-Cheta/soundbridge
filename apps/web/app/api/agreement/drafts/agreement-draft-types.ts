export type AgreementDraftPayload = {
  sbCompany: string;
  sbRep: string;
  sbTitle: string;
  sbDate: string;
  creatorName: string;
  creatorArtist: string;
  creatorEmail: string;
  creatorDate: string;
  sbSignaturePng: string | null;
  creatorSignaturePng: string | null;
};

const MAX_SIG_CHARS = 600_000;

export function validateDraftPayload(raw: unknown): AgreementDraftPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '');
  const sig = (k: string) => {
    const v = o[k];
    if (v == null || v === '') return null;
    if (typeof v !== 'string' || !v.startsWith('data:image/png;base64,')) return null;
    if (v.length > MAX_SIG_CHARS) return null;
    return v;
  };

  return {
    sbCompany: str('sbCompany').slice(0, 200),
    sbRep: str('sbRep').slice(0, 200),
    sbTitle: str('sbTitle').slice(0, 200),
    sbDate: str('sbDate').slice(0, 32),
    creatorName: str('creatorName').slice(0, 200),
    creatorArtist: str('creatorArtist').slice(0, 200),
    creatorEmail: str('creatorEmail').slice(0, 320),
    creatorDate: str('creatorDate').slice(0, 32),
    sbSignaturePng: sig('sbSignaturePng'),
    creatorSignaturePng: sig('creatorSignaturePng'),
  };
}

/** Creator completing via share link may only update these fields (no save token). */
export function mergeCreatorOnlyUpdate(
  existing: AgreementDraftPayload,
  incoming: AgreementDraftPayload,
): AgreementDraftPayload {
  return {
    ...existing,
    creatorName: incoming.creatorName || existing.creatorName,
    creatorArtist: incoming.creatorArtist || existing.creatorArtist,
    creatorEmail: incoming.creatorEmail || existing.creatorEmail,
    creatorDate: incoming.creatorDate || existing.creatorDate,
    creatorSignaturePng: incoming.creatorSignaturePng ?? existing.creatorSignaturePng,
  };
}
