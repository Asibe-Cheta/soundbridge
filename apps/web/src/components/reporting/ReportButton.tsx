import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { ContentReportModal } from './ContentReportModal';
import { DMCAFormModal } from '@/src/components/dmca/DMCAFormModal';

interface ReportButtonProps {
  contentId: string;
  contentType: 'track' | 'profile' | 'comment' | 'playlist';
  contentTitle?: string;
  contentUrl?: string;
  variant?: 'button' | 'icon' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  contentId,
  contentType,
  contentTitle,
  contentUrl,
  variant = 'icon',
  size = 'md',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDmcaOpen, setIsDmcaOpen] = useState(false);

  const handleReportClick = () => {
    setIsModalOpen(true);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return variant === 'icon' ? 'h-4 w-4' : 'px-2 py-1 text-xs';
      case 'lg':
        return variant === 'icon' ? 'h-6 w-6' : 'px-4 py-2 text-base';
      default: // md
        return variant === 'icon' ? 'h-5 w-5' : 'px-3 py-1.5 text-sm';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'button':
        return 'inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-colors';
      case 'link':
        return 'inline-flex items-center gap-1 text-red-600 hover:text-red-700 underline hover:no-underline transition-colors';
      default: // icon
        return 'text-gray-400 hover:text-red-500 transition-colors cursor-pointer';
    }
  };

  const renderContent = () => {
    const iconClass = getSizeClasses();
    const variantClass = getVariantClasses();

    switch (variant) {
      case 'button':
        return (
          <button
            onClick={handleReportClick}
            className={`${variantClass} ${getSizeClasses()} ${className}`}
            title="Report this content"
          >
            <Flag className={iconClass} />
            Report
          </button>
        );

      case 'link':
        return (
          <button
            onClick={handleReportClick}
            className={`${variantClass} ${getSizeClasses()} ${className}`}
            title="Report this content"
          >
            <Flag className={iconClass} />
            Report
          </button>
        );

      default: // icon
        return (
          <button
            onClick={handleReportClick}
            className={`${variantClass} ${className}`}
            title="Report this content"
          >
            <Flag className={iconClass} />
          </button>
        );
    }
  };

  return (
    <>
      {renderContent()}
      
      <ContentReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contentId={contentId}
        contentType={contentType}
        contentTitle={contentTitle}
        contentUrl={contentUrl}
        onOpenDMCA={() => {
          setIsModalOpen(false);
          setIsDmcaOpen(true);
        }}
      />

      <DMCAFormModal
        isOpen={isDmcaOpen}
        onClose={() => setIsDmcaOpen(false)}
        contentId={contentId}
        contentTitle={contentTitle}
        contentUrl={contentUrl}
      />
    </>
  );
};

// DMCA Report Button (for copyright-specific reporting)
interface DMCAReportButtonProps {
  contentId?: string;
  contentTitle?: string;
  contentUrl?: string;
  variant?: 'button' | 'icon' | 'link';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DMCAReportButton: React.FC<DMCAReportButtonProps> = ({
  contentId,
  contentTitle,
  contentUrl,
  variant = 'link',
  size = 'md',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDMCAReportClick = () => {
    setIsModalOpen(true);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return variant === 'icon' ? 'h-4 w-4' : 'px-2 py-1 text-xs';
      case 'lg':
        return variant === 'icon' ? 'h-6 w-6' : 'px-4 py-2 text-base';
      default: // md
        return variant === 'icon' ? 'h-5 w-5' : 'px-3 py-1.5 text-sm';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'button':
        return 'inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors';
      case 'link':
        return 'inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 underline hover:no-underline transition-colors';
      default: // icon
        return 'text-gray-400 hover:text-blue-500 transition-colors cursor-pointer';
    }
  };

  const renderContent = () => {
    const iconClass = getSizeClasses();
    const variantClass = getVariantClasses();

    switch (variant) {
      case 'button':
        return (
          <button
            onClick={handleDMCAReportClick}
            className={`${variantClass} ${getSizeClasses()} ${className}`}
            title="Submit DMCA takedown request"
          >
            <AlertTriangle className={iconClass} />
            DMCA Report
          </button>
        );

      case 'link':
        return (
          <button
            onClick={handleDMCAReportClick}
            className={`${variantClass} ${getSizeClasses()} ${className}`}
            title="Submit DMCA takedown request"
          >
            <AlertTriangle className={iconClass} />
            DMCA Report
          </button>
        );

      default: // icon
        return (
          <button
            onClick={handleDMCAReportClick}
            className={`${variantClass} ${className}`}
            title="Submit DMCA takedown request"
          >
            <AlertTriangle className={iconClass} />
          </button>
        );
    }
  };

  return (
    <>
      {renderContent()}
      
      {/* DMCA Form Modal would go here */}
      {/* For now, we'll use the regular report modal */}
      <ContentReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contentId={contentId || ''}
        contentType="track"
        contentTitle={contentTitle}
        contentUrl={contentUrl}
      />
    </>
  );
};
