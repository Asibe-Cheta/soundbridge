'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, User, Briefcase, ShieldCheck, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { fetchJsonWithAuth } from '@/src/lib/fetchWithAuth';

interface SignupSetupChecklistProps {
  isOpen: boolean;
  onContinue: () => void;
}

const CHECKLIST_ITEMS = [
  {
    id: 'profile',
    label: 'Complete your profile',
    description: 'Add your photo, bio, and location so creators can find you.',
    href: '/settings',
    icon: User,
  },
  {
    id: 'service_provider',
    label: 'Set up your Service Provider Dashboard',
    description: 'List your services, rates, and availability.',
    href: '/dashboard?section=service-provider',
    icon: Briefcase,
  },
  {
    id: 'identity',
    label: 'Verify your identity',
    description: 'Unlock verified professional status with Persona.',
    href: '/dashboard?section=service-provider#verification',
    icon: ShieldCheck,
  },
] as const;

export function SignupSetupChecklist({ isOpen, onContinue }: SignupSetupChecklistProps) {
  const [visited, setVisited] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    void fetchJsonWithAuth('/api/feature-nudges', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_shown', nudgeType: 'signup_setup_checklist' }),
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleItemClick = (id: string) => {
    setVisited((prev) => ({ ...prev, [id]: true }));
  };

  const handleContinue = () => {
    void fetchJsonWithAuth('/api/feature-nudges', {
      method: 'POST',
      body: JSON.stringify({ action: 'mark_dismissed', nudgeType: 'signup_setup_checklist' }),
    });
    onContinue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-md">
        <div className="mb-6 text-center">
          <Image
            src="/images/logos/logo-trans.png"
            alt="SoundBridge"
            width={160}
            height={48}
            className="mx-auto mb-6"
            style={{ height: 'auto' }}
          />
          <h1 className="text-2xl font-bold text-white md:text-3xl">Let&apos;s get you set up properly</h1>
          <p className="mt-2 text-sm text-white/70">
            Work through these steps in order — each link takes you straight to the right screen.
          </p>
        </div>

        <ol className="mb-8 space-y-4">
          {CHECKLIST_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const done = visited[item.id];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => handleItemClick(item.id)}
                  className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-pink-500/40 hover:bg-white/10"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-pink-400" />
                      <span className="font-semibold text-white">{item.label}</span>
                      {done ? (
                        <CheckCircle2 className="ml-auto h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="ml-auto h-5 w-5 text-white/30" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-white/60">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-white/40 group-hover:text-pink-400" />
                </Link>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={handleContinue}
          className="w-full rounded-xl bg-gradient-to-r from-red-600 to-pink-500 py-3.5 text-sm font-semibold text-white hover:from-red-700 hover:to-pink-600"
        >
          Continue to onboarding
        </button>
      </div>
    </div>
  );
}
