'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { 
  Rocket, 
  CheckCircle, 
  ArrowRight,
  Briefcase,
  DollarSign,
  Calendar,
  Star,
  Shield,
  ArrowLeft,
  User,
  Upload
} from 'lucide-react';

export default function ServiceProviderQuickStartPage() {
  const { theme } = useTheme();

  const steps = [
    {
      number: 1,
      title: 'Become a Service Provider',
      description: 'Click "Become a Service Provider" from your dashboard or visit /become-service-provider',
      icon: Briefcase,
      link: '/become-service-provider'
    },
    {
      number: 2,
      title: 'Set Up Your Profile',
      description: 'Fill out your display name, headline, bio, categories, and default rate. Choose from 40+ currencies!',
      icon: User,
      link: '/help/service-provider-guide#creating-profile'
    },
    {
      number: 3,
      title: 'Create Service Offerings',
      description: 'Add specific services you offer (e.g., "Full Mix & Master", "Guitar Lessons") with pricing',
      icon: DollarSign,
      link: '/help/service-provider-guide#managing-offerings'
    },
    {
      number: 4,
      title: 'Add Portfolio Items',
      description: 'Showcase your past work with images and videos to build credibility',
      icon: Upload,
      link: '/help/service-provider-guide#showcasing-work'
    },
    {
      number: 5,
      title: 'Set Your Availability',
      description: 'Let clients know when you\'re available for bookings',
      icon: Calendar,
      link: '/help/service-provider-guide'
    },
    {
      number: 6,
      title: 'Activate Your Profile',
      description: 'Change your status from "Draft" to "Active" to make your profile visible to clients',
      icon: CheckCircle,
      link: '/help/service-provider-guide'
    },
    {
      number: 7,
      title: 'Get Verified (Optional)',
      description: 'Submit verification documents to earn a verified badge and increase trust',
      icon: Shield,
      link: '/help/service-verification'
    }
  ];

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
        : 'bg-gray-50'
    }`}>
      <main className="main-container py-8 lg:py-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link 
                href="/help" 
                className={`hover:underline ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Help Center
              </Link>
            </li>
            <li className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>/</li>
            <li>
              <Link 
                href="/help/service-provider-quick-start" 
                className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Quick Start Guide
              </Link>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-600 to-pink-500 mb-6">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-4xl lg:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Service Provider Quick Start Guide
          </h1>
          <p className={`text-lg lg:text-xl max-w-3xl ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Get your service provider profile up and running in 7 simple steps. Start earning by connecting with musicians, artists, and creators.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.number} className={`p-6 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-white/5 backdrop-blur-lg border-white/10'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    theme === 'dark' ? 'bg-gradient-to-r from-orange-600 to-pink-500 text-white' : 'bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700'
                  }`}>
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <step.icon className={`w-6 h-6 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`} />
                      <h2 className={`text-2xl font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {step.title}
                      </h2>
                    </div>
                    <p className={`text-lg mb-4 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {step.description}
                    </p>
                    {step.link && (
                      <Link
                        href={step.link}
                        className={`inline-flex items-center gap-2 font-semibold ${
                          theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        Learn more <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Next Steps */}
          <section className={`p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-blue-500/10 border-blue-500/20'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <h2 className={`text-2xl font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              What's Next?
            </h2>
            <p className={`mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Once your profile is active, clients can discover and book your services. Here's what happens:
            </p>
            <ol className={`space-y-2 mb-4 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <li>1. Clients find you through discovery and search</li>
              <li>2. They view your profile and service offerings</li>
              <li>3. They submit booking requests</li>
              <li>4. You confirm and they pay (funds held securely)</li>
              <li>5. You deliver the service</li>
              <li>6. You get paid and receive reviews</li>
            </ol>
            <Link
              href="/help/service-bookings"
              className={`inline-flex items-center gap-2 font-semibold ${
                theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              Learn about the booking process →
            </Link>
          </section>

          {/* Related Articles */}
          <section>
            <div className={`p-6 rounded-xl border ${
              theme === 'dark'
                ? 'bg-white/5 backdrop-blur-lg border-white/10'
                : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <h3 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Need More Help?
              </h3>
              <div className="space-y-2">
                <Link 
                  href="/help/service-provider-guide" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Complete Service Provider Guide
                </Link>
                <Link 
                  href="/help/service-bookings" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → How Bookings Work
                </Link>
                <Link 
                  href="/help/service-verification" 
                  className={`block hover:underline ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  → Getting Verified
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

