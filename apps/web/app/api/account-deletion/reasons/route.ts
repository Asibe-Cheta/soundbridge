import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    reasons: [
      { key: 'privacy_concerns', label: 'Privacy concerns' },
      { key: 'not_useful', label: 'Not useful' },
      { key: 'found_alternative', label: 'Found alternative' },
      { key: 'other', label: 'Other' },
    ],
  });
}
