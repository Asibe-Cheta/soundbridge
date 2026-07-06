'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { trackProResource } from '@/src/lib/pro-resource-analytics';
import {
  AbbeyRoadTab,
  AbbeyRoadTabErrorBoundary,
  HertsUniTab,
  MBGSonicsTab,
  ProResourcesBackButton,
  ProResourcesTabBar,
  SoundAcademyTab,
  Talk2DanTab,
} from '@/src/components/pro-resources/ProResourcesUI';
import type { ProResourcesTabId } from '@/src/content/pro-resources/data';

function isProResourcesTabId(value: string | null): value is ProResourcesTabId {
  return (
    value === 'sound-academy' ||
    value === 'abbey-road' ||
    value === 'talk2dan' ||
    value === 'herts' ||
    value === 'mbg-sonics'
  );
}

function ProResourcesContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<ProResourcesTabId>(
    isProResourcesTabId(tabParam) ? tabParam : 'sound-academy',
  );

  useEffect(() => {
    if (isProResourcesTabId(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    void trackProResource('screen_view');
  }, [activeTab]);

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900'
          : 'bg-gray-50'
      }`}
    >
      <div className="pt-2 px-2">
        <ProResourcesBackButton />
      </div>

      <header className="px-6 pt-2 pb-6">
        <h1
          className={`mb-2 whitespace-pre-line ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          Pro{'\n'}Resources
        </h1>
        <p
          className={`text-lead ${
            theme === 'dark' ? 'text-white/55' : 'text-gray-600'
          }`}
        >
          Courses, coaching & career tools from our partners
        </p>
      </header>

      <ProResourcesTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pb-10">
        {activeTab === 'sound-academy' && <SoundAcademyTab />}
        {activeTab === 'abbey-road' && (
          <AbbeyRoadTabErrorBoundary>
            <AbbeyRoadTab />
          </AbbeyRoadTabErrorBoundary>
        )}
        {activeTab === 'talk2dan' && <Talk2DanTab />}
        {activeTab === 'herts' && <HertsUniTab />}
        {activeTab === 'mbg-sonics' && <MBGSonicsTab />}
      </div>

      <Footer />
    </div>
  );
}

export default function ProResourcesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <ProResourcesContent />
    </Suspense>
  );
}
