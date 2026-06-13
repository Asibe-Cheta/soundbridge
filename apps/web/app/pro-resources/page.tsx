'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Footer } from '@/src/components/layout/Footer';
import { trackProResource } from '@/src/lib/pro-resource-analytics';
import {
  HertsUniTab,
  MBGSonicsTab,
  ProResourcesBackButton,
  ProResourcesTabBar,
  SoundAcademyTab,
  Talk2DanTab,
} from '@/src/components/pro-resources/ProResourcesUI';
import type { ProResourcesTabId } from '@/src/content/pro-resources/data';

export default function ProResourcesPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ProResourcesTabId>('sound-academy');

  useEffect(() => {
    void trackProResource('screen_view');
  }, []);

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
        {activeTab === 'talk2dan' && <Talk2DanTab />}
        {activeTab === 'herts' && <HertsUniTab />}
        {activeTab === 'mbg-sonics' && <MBGSonicsTab />}
      </div>

      <Footer />
    </div>
  );
}
