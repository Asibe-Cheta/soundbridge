'use client';

import { useEffect } from 'react';

interface PerformanceMonitorProps {
  pageName: string;
}

export function PerformanceMonitor({ pageName }: PerformanceMonitorProps) {
  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== 'production') return;

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Send to analytics service (replace with your preferred service)
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
          // sendToAnalytics('LCP', entry.startTime, pageName);
        }
        if (entry.entryType === 'first-input') {
          console.log('FID:', entry.processingStart - entry.startTime);
          // sendToAnalytics('FID', entry.processingStart - entry.startTime, pageName);
        }
        if (entry.entryType === 'layout-shift') {
          console.log('CLS:', (entry as any).value);
          // sendToAnalytics('CLS', (entry as any).value, pageName);
        }
      }
    });

    // Observe Core Web Vitals
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

    // Monitor page load performance
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.loadEventStart;
      const domContentLoaded = navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart;

      console.log('Page Load Time:', loadTime);
      console.log('DOM Content Loaded:', domContentLoaded);
      // sendToAnalytics('page_load', loadTime, pageName);
    }

    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'img' || entry.initiatorType === 'audio') {
          console.log(`${entry.initiatorType} load time:`, entry.duration);
          // sendToAnalytics('resource_load', entry.duration, `${pageName}_${entry.initiatorType}`);
        }
      }
    });

    resourceObserver.observe({ entryTypes: ['resource'] });

    // Monitor errors
    const originalError = console.error;
    console.error = (...args) => {
      // sendToAnalytics('error', args.join(' '), pageName);
      originalError.apply(console, args);
    };

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // sendToAnalytics('unhandled_rejection', event.reason, pageName);
    });

    return () => {
      observer.disconnect();
      resourceObserver.disconnect();
      console.error = originalError;
    };
  }, [pageName]);

  return null; // This component doesn't render anything
}

// Utility function to send analytics (replace with your preferred service)
function sendToAnalytics(metric: string, value: number, page: string) {
  // Example: Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'performance', {
      metric_name: metric,
      value: value,
      page: page,
    });
  }

  // Example: Custom analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, value, page }),
  }).catch(console.error);
} 