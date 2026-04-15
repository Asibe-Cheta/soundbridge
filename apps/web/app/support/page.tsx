import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support | SoundBridge',
  description:
    'Get help with your SoundBridge account, uploads, payments, and technical issues.',
  alternates: {
    canonical: '/support',
  },
};

const faqItems = [
  {
    question: 'How do I contact SoundBridge support?',
    answer:
      'Email us at contact@soundbridge.live. We usually respond within 1-2 business days.',
  },
  {
    question: 'I cannot log in to my account. What should I do?',
    answer:
      'First, reset your password from the login screen. If you still cannot access your account, email contact@soundbridge.live with your username and device details.',
  },
  {
    question: 'My upload or payment is not working.',
    answer:
      'Please share your username, the time the issue happened, and a screenshot if available. Send details to contact@soundbridge.live so we can investigate quickly.',
  },
  {
    question: 'Where can I send business or urgent inquiries?',
    answer:
      'For direct business communication, you can also email justice@soundbridge.live.',
  },
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">SoundBridge Support</h1>
        <p className="mt-4 text-base text-gray-600">
          Need help with the SoundBridge app? We are here to help.
        </p>

        <section className="mt-8 rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>
              General support:{' '}
              <a className="text-blue-600 hover:underline" href="mailto:contact@soundbridge.live">
                contact@soundbridge.live
              </a>
            </li>
            <li>
              Business/urgent:{' '}
              <a className="text-blue-600 hover:underline" href="mailto:justice@soundbridge.live">
                justice@soundbridge.live
              </a>
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-4">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-10 text-sm text-gray-600">
          <p>
            Looking for the homepage?{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              Go to SoundBridge
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
