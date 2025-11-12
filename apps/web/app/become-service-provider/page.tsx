'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import ProtectedRoute from '@/src/components/auth/ProtectedRoute';
import Footer from '@/src/components/layout/Footer';
import { Briefcase, CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function BecomeServiceProviderPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyProvider, setIsAlreadyProvider] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading
    
    if (user) {
      checkCreatorTypes();
    } else {
      router.push('/auth/signin?redirect=/become-service-provider');
    }
  }, [user, authLoading]);

  const checkCreatorTypes = async () => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}/creator-types`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Authentication failed - redirect to sign in
        console.error('Authentication failed - redirecting to sign in');
        router.push('/auth/signin?redirect=/become-service-provider');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const hasServiceProvider = data.creatorTypes?.includes('service_provider');
        setIsAlreadyProvider(hasServiceProvider);
        
        if (hasServiceProvider) {
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard?section=service-provider');
          }, 2000);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to check creator types:', errorData.error || 'Unknown error');
        setError('Failed to load your account information. Please try again.');
      }
    } catch (err) {
      console.error('Error checking creator types:', err);
      setError('An error occurred while checking your account status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleBecomeProvider = async () => {
    if (!user) {
      router.push('/auth/signin?redirect=/become-service-provider');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, get current creator types
      const getResponse = await fetch(`/api/users/${user.id}/creator-types`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (getResponse.status === 401) {
        router.push('/auth/signin?redirect=/become-service-provider');
        return;
      }

      if (!getResponse.ok) {
        const errorData = await getResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load current creator types');
      }

      const getData = await getResponse.json();
      const currentTypes = getData.creatorTypes || [];

      // Add service_provider if not already present
      if (!currentTypes.includes('service_provider')) {
        const newTypes = [...currentTypes, 'service_provider'];
        
        const postResponse = await fetch(`/api/users/${user.id}/creator-types`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creatorTypes: newTypes,
          }),
        });

        if (postResponse.status === 401) {
          router.push('/auth/signin?redirect=/become-service-provider');
          return;
        }

        if (!postResponse.ok) {
          const errorData = await postResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to add service provider type');
        }
      }

      // Success! Redirect to dashboard
      router.push('/dashboard?section=service-provider');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
            : 'bg-gray-50'
        }`}>
          <div className="text-center">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-600'
            }`} />
            <p className={theme === 'dark' ? 'text-white/80' : 'text-gray-600'}>
              Loading...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isAlreadyProvider) {
    return (
      <ProtectedRoute>
        <div className={`min-h-screen ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
            : 'bg-gray-50'
        }`}>
          <main className="main-container py-16">
            <div className={`max-w-2xl mx-auto text-center p-8 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-white/10 backdrop-blur-lg border-white/10'
                : 'bg-white border-gray-200 shadow-lg'
            }`}>
              <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`} />
              <h1 className={`text-3xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                You're Already a Service Provider!
              </h1>
              <p className={`mb-6 ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-600'
              }`}>
                Redirecting you to your Service Provider dashboard...
              </p>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gray-50'
      }`}>
        <main className="main-container py-16">
          <div className={`max-w-3xl mx-auto p-8 rounded-2xl border ${
            theme === 'dark'
              ? 'bg-white/10 backdrop-blur-lg border-white/10'
              : 'bg-white border-gray-200 shadow-lg'
          }`}>
            <div className="text-center mb-8">
              <Briefcase className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-pink-500' : 'text-pink-600'
              }`} />
              <h1 className={`text-4xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Become a Service Provider
              </h1>
              <p className={`text-lg ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-600'
              }`}>
                Offer your creative services and connect with artists and organizers
              </p>
            </div>

            {error && (
              <div className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                theme === 'dark'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className={`mb-8 p-6 rounded-xl ${
              theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                What you'll get:
              </h2>
              <ul className={`space-y-3 ${
                theme === 'dark' ? 'text-white/80' : 'text-gray-700'
              }`}>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span>Create and manage service offerings</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span>Showcase your portfolio and availability</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span>Receive booking requests from clients</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span>Get verified and earn badges</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`} />
                  <span>Manage payments and revenue</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleBecomeProvider}
                disabled={isLoading}
                className={`flex-1 px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-pink-500 hover:from-red-700 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <button
                onClick={() => router.back()}
                disabled={isLoading}
                className={`px-8 py-4 rounded-xl font-semibold transition-all border ${
                  theme === 'dark'
                    ? 'bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 border-white/20'
                    : 'bg-white text-gray-900 hover:bg-gray-50 border-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
            </div>

            <p className={`mt-6 text-sm text-center ${
              theme === 'dark' ? 'text-white/60' : 'text-gray-500'
            }`}>
              By becoming a service provider, you'll be able to create your profile and start receiving bookings.
              You can manage everything from your dashboard.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}

