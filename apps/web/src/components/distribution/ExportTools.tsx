// Export Tools Component for SoundBridge
// Provides tools for exporting content for manual distribution

import React, { useState } from 'react';
import { 
  Download, 
  FileAudio, 
  FileImage, 
  FileText, 
  Globe, 
  Music, 
  Mic, 
  Calendar,
  Package,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Info
} from 'lucide-react';

interface ExportToolsProps {
  userId: string;
  userTier: 'free' | 'pro' | 'enterprise';
  className?: string;
}

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  format: string;
  includes: string[];
  platforms: string[];
}

export function ExportTools({ userId, userTier, className = '' }: ExportToolsProps) {
  const [selectedExport, setSelectedExport] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: 'audio-files',
      name: 'Audio Files',
      description: 'Export your tracks as high-quality audio files',
      icon: <FileAudio className="w-5 h-5" />,
      available: true,
      format: 'WAV, FLAC, MP3',
      includes: ['Master audio files', 'Metadata', 'Cover art'],
      platforms: ['All platforms', 'SoundCloud', 'Bandcamp', 'Direct sales']
    },
    {
      id: 'metadata-package',
      name: 'Metadata Package',
      description: 'Complete metadata package for distribution',
      icon: <FileText className="w-5 h-5" />,
      available: userTier !== 'free',
      format: 'CSV, XML, JSON',
      includes: ['Track info', 'Artist details', 'ISRC codes', 'Release dates'],
      platforms: ['DistroKid', 'CD Baby', 'TuneCore', 'AWAL']
    },
    {
      id: 'social-media-pack',
      name: 'Social Media Pack',
      description: 'Optimized content for social media promotion',
      icon: <Globe className="w-5 h-5" />,
      available: userTier !== 'free',
      format: 'Various formats',
      includes: ['Audio clips', 'Visual assets', 'Captions', 'Hashtags'],
      platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook']
    },
    {
      id: 'streaming-prep',
      name: 'Streaming Preparation',
      description: 'Files optimized for streaming platforms',
      icon: <Music className="w-5 h-5" />,
      available: userTier === 'enterprise',
      format: 'Multiple formats',
      includes: ['Optimized audio', 'Platform specs', 'Delivery guides'],
      platforms: ['Spotify', 'Apple Music', 'Amazon Music', 'YouTube Music']
    }
  ];

  const distributionGuides = [
    {
      platform: 'Spotify',
      icon: '🎵',
      description: 'Submit directly or through distributors',
      steps: [
        'Prepare audio files (WAV/FLAC, 44.1kHz, 16-bit minimum)',
        'Create album artwork (3000x3000px minimum)',
        'Complete metadata (title, artist, genre, etc.)',
        'Choose distributor (DistroKid, CD Baby, TuneCore)',
        'Upload and submit for review (1-7 days)'
      ],
      requirements: ['Audio files', 'Cover art', 'Metadata', 'ISRC codes'],
      cost: 'Free through distributors ($20-50/year)'
    },
    {
      platform: 'Apple Music',
      icon: '🍎',
      description: 'Requires Apple Music for Artists account',
      steps: [
        'Prepare audio files (WAV/FLAC preferred)',
        'Create high-resolution artwork',
        'Complete detailed metadata',
        'Submit through distributor or Apple Music Connect',
        'Wait for approval (24-48 hours)'
      ],
      requirements: ['Audio files', 'Cover art', 'Artist profile', 'Bank details'],
      cost: 'Free through distributors'
    },
    {
      platform: 'YouTube Music',
      icon: '📺',
      description: 'Integrated with YouTube platform',
      steps: [
        'Upload to YouTube as music video or audio',
        'Claim content through YouTube Music for Artists',
        'Set up monetization if eligible',
        'Manage through YouTube Creator Studio'
      ],
      requirements: ['Audio/video content', 'YouTube channel', 'Copyright ownership'],
      cost: 'Free'
    },
    {
      platform: 'Amazon Music',
      icon: '🛒',
      description: 'Part of Amazon Music Unlimited',
      steps: [
        'Prepare audio files and metadata',
        'Submit through distributor',
        'Amazon reviews and approves',
        'Content appears in Amazon Music catalog'
      ],
      requirements: ['Audio files', 'Metadata', 'Cover art'],
      cost: 'Free through distributors'
    }
  ];

  const handleExport = async (exportId: string) => {
    setIsExporting(true);
    setSelectedExport(exportId);
    setExportProgress(0);

    // Simulate export process
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const copyToClipboard = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const getTierLimitation = () => {
    if (userTier === 'free') {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-800">Free Tier Limitations</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Some export tools are available only for Pro and Enterprise users. 
                Upgrade to access advanced export features and bulk operations.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Export Tools</h2>
            <p className="text-sm text-gray-600">
              Export your content for manual distribution to streaming platforms
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          userTier === 'free' ? 'bg-gray-100 text-gray-800' :
          userTier === 'pro' ? 'bg-blue-100 text-blue-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {userTier.charAt(0).toUpperCase() + userTier.slice(1)} Tier
        </span>
      </div>

      {/* Tier Limitations */}
      {getTierLimitation()}

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option) => (
          <div
            key={option.id}
            className={`p-4 rounded-lg border-2 transition-all ${
              option.available
                ? 'border-gray-200 hover:border-orange-300 bg-white'
                : 'border-gray-100 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  option.available ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {option.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{option.name}</h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>
              {!option.available && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {userTier === 'free' ? 'Pro+' : 'Enterprise'}
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">FORMAT:</span>
                <span className="text-xs text-gray-700">{option.format}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-500">INCLUDES:</span>
                <div className="flex flex-wrap gap-1">
                  {option.includes.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => option.available && handleExport(option.id)}
              disabled={!option.available || isExporting}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                option.available && !isExporting
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isExporting && selectedExport === option.id ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Exporting... {exportProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Export {option.name}</span>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Distribution Guides */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Globe className="w-5 h-5 mr-2 text-orange-500" />
          Distribution Platform Guides
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {distributionGuides.map((guide, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{guide.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{guide.platform}</h4>
                  <p className="text-sm text-gray-600">{guide.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Steps:</h5>
                  <ol className="text-sm text-gray-600 space-y-1">
                    {guide.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start space-x-2">
                        <span className="text-orange-500 font-medium">{stepIndex + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Requirements:</h5>
                  <div className="flex flex-wrap gap-1">
                    {guide.requirements.map((req, reqIndex) => (
                      <span key={reqIndex} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Cost:</h5>
                  <p className="text-sm text-gray-600">{guide.cost}</p>
                </div>

                <button
                  onClick={() => copyToClipboard(
                    `${guide.platform} Distribution Guide:\n\nSteps:\n${guide.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nRequirements: ${guide.requirements.join(', ')}\nCost: ${guide.cost}`,
                    guide.platform
                  )}
                  className="flex items-center space-x-2 text-sm text-orange-600 hover:text-orange-700 transition-colors"
                >
                  {copiedFormat === guide.platform ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Guide</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800">Cross-Platform Distribution Coming Soon</h4>
            <p className="text-sm text-blue-700 mt-1">
              We're working on automated distribution to Spotify, Apple Music, Amazon Music, and other platforms. 
              For now, use our export tools and guides to distribute your music manually. 
              Subscribe to our newsletter for updates on this feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
