import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/src/lib/supabase';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(request: NextRequest) {
  let body: {
    fullName?: string;
    email?: string;
    phone?: string;
    context?: string;
    agreed?: boolean;
    signaturePng?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim().slice(0, 50) : null;
  const context = body.context ? String(body.context).trim().slice(0, 1000) : null;
  const signaturePng = String(body.signaturePng || '').trim();

  if (fullName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (!signaturePng.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Please draw your signature before signing.' }, { status: 400 });
  }
  if (body.agreed !== true) {
    return NextResponse.json({ error: 'You must agree to the terms to sign.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('partner_agreement_signups')
    .insert({
      full_name: fullName,
      email,
      phone,
      context,
      signature_png: signaturePng,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[agreement/partner] insert', error);
    return NextResponse.json({ error: 'Could not save your application. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
