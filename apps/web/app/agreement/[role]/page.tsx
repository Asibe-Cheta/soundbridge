import type { Metadata } from 'next';
import { createServiceClient } from '@/src/lib/supabase';
import { getRoleAgreementConfig } from '@/src/lib/role-agreement-text';
import { getCurrentUserIsAdmin } from '@/src/lib/role-agreement';
import { RoleAgreementClient } from './RoleAgreementClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const config = getRoleAgreementConfig(role);
  return {
    title: config ? `${config.roleTitle} Volunteer Agreement - SoundBridge` : 'Agreement - SoundBridge',
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ role: string }>;
};

export default async function RoleAgreementPage({ params }: PageProps) {
  const { role } = await params;
  const config = getRoleAgreementConfig(role);

  if (!config) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center sm:p-8">
            <h1 className="text-lg font-semibold">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Please check the link you were sent, or contact SoundBridge if you think this is a mistake.
            </p>
          </article>
        </div>
      </div>
    );
  }

  const supabase = createServiceClient();
  const [{ data: record, error }, { isAdmin, adminName }] = await Promise.all([
    supabase
      .from('role_agreement_signups')
      .select(
        'id, role_title, signer_name, agreement_version, signer_email, signer_signature_png, signer_agreed_at, admin_signed_by, admin_signature_png, admin_signed_at',
      )
      .eq('slug', config.slug)
      .maybeSingle(),
    getCurrentUserIsAdmin(),
  ]);

  if (error) {
    console.error('[role-agreement-page] lookup failed:', error.message);
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {record ? (
          <RoleAgreementClient
            slug={config.slug}
            roleTitle={record.role_title || config.roleTitle}
            defaultSignerName={record.signer_name || config.signerName}
            agreementVersion={record.agreement_version}
            isAdmin={isAdmin}
            adminName={adminName}
            signerEmail={record.signer_email}
            signerSignaturePng={record.signer_signature_png}
            signerAgreedAt={record.signer_agreed_at}
            adminSignedBy={record.admin_signed_by}
            adminSignaturePng={record.admin_signature_png}
            adminSignedAt={record.admin_signed_at}
            referenceId={`REF-${config.slug.toUpperCase()}-${record.id.slice(0, 8).toUpperCase()}`}
          />
        ) : error ? (
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center sm:p-8">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              We couldn&apos;t load this page right now. Please refresh, or try again in a few minutes.
            </p>
          </article>
        ) : (
          <article className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center sm:p-8">
            <h1 className="text-lg font-semibold">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Please check the link you were sent, or contact SoundBridge if you think this is a mistake.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
