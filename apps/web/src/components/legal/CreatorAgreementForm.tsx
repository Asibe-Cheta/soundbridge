'use client';

import Link from 'next/link';
import {
  CREATOR_AGREEMENT_CHECKBOXES,
  type CreatorAgreementCheckboxId,
} from '@/src/constants/creatorAgreement';

type CreatorAgreementFormProps = {
  checks: Record<CreatorAgreementCheckboxId, boolean>;
  onToggle: (id: CreatorAgreementCheckboxId) => void;
  compact?: boolean;
};

export function CreatorAgreementForm({ checks, onToggle, compact }: CreatorAgreementFormProps) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {CREATOR_AGREEMENT_CHECKBOXES.map((item) => (
        <label
          key={item.id}
          className={`flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 cursor-pointer transition hover:bg-white/[0.08] ${
            compact ? 'p-3' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={checks[item.id]}
            onChange={() => onToggle(item.id)}
            className="mt-1 h-4 w-4 shrink-0 accent-pink-500"
          />
          <span className={`leading-relaxed text-white/90 ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>
            {item.id === 'terms_privacy' ? (
              <>
                I have read and agree to the{' '}
                <Link href="/legal/terms" className="text-pink-300 underline hover:text-pink-200">
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/legal/privacy" className="text-pink-300 underline hover:text-pink-200">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="/agreement" className="text-pink-300 underline hover:text-pink-200">
                  Creator Rights Agreement
                </Link>
                .
              </>
            ) : (
              item.label
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
