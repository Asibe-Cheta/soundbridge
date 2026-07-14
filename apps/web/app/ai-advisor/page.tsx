import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AiAdvisorClient } from '@/src/components/ai-advisor/AiAdvisorClient';

function AiAdvisorLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2B0B5B] via-[#2C0B57] to-black text-white flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-accent-pink" />
    </div>
  );
}

export default function AiAdvisorPage() {
  return (
    <Suspense fallback={<AiAdvisorLoading />}>
      <AiAdvisorClient />
    </Suspense>
  );
}
