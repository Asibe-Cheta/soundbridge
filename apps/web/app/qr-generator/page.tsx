'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ArrowLeft, Download, Loader2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

const DEFAULT_QR_PATH = '/app';
const PREVIEW_SIZE = 280;
const DOWNLOAD_SIZE = 1024;
const DEFAULT_DARK = '#000000';
const DEFAULT_LIGHT = '#ffffff';

type PartnerLookupResult = {
  displayName: string;
  referralCode: string;
  qrUrl: string;
};

export default function QRGeneratorPage() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const partnerCanvasRef = useRef<HTMLCanvasElement>(null);

  const [url, setUrl] = useState('');
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [foregroundColor, setForegroundColor] = useState(DEFAULT_DARK);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_LIGHT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerMeta, setPartnerMeta] = useState<PartnerLookupResult | null>(null);
  const [partnerQrUrl, setPartnerQrUrl] = useState('');
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerLookupLoading, setPartnerLookupLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  useEffect(() => {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://soundbridge.live';
    const path = url.trim() || DEFAULT_QR_PATH;
    const full = path.startsWith('http')
      ? path
      : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    setResolvedUrl(full);
  }, [url]);

  useEffect(() => {
    if (!resolvedUrl || !canvasRef.current) return;
    setError(null);
    setIsLoading(true);
    const canvas = canvasRef.current;
    QRCode.toCanvas(
      canvas,
      resolvedUrl,
      {
        width: PREVIEW_SIZE,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        setIsLoading(false);
        if (err) setError(err.message || 'Failed to generate QR code');
      },
    );
  }, [resolvedUrl, foregroundColor, backgroundColor]);

  useEffect(() => {
    if (!partnerQrUrl || !partnerCanvasRef.current) return;
    setPartnerError(null);
    setPartnerLoading(true);
    const canvas = partnerCanvasRef.current;
    QRCode.toCanvas(
      canvas,
      partnerQrUrl,
      {
        width: PREVIEW_SIZE,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        setPartnerLoading(false);
        if (err) setPartnerError(err.message || 'Failed to generate partner QR code');
      },
    );
  }, [partnerQrUrl, foregroundColor, backgroundColor]);

  const handlePartnerLookup = useCallback(async () => {
    const email = partnerEmail.trim().toLowerCase();
    if (!email) {
      setPartnerError('Enter the email address on your partner account.');
      return;
    }

    setPartnerLookupLoading(true);
    setPartnerError(null);
    setPartnerMeta(null);
    setPartnerQrUrl('');

    try {
      const response = await fetch('/api/partners/qr-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setPartnerError(payload.error || 'Could not generate partner QR code.');
        return;
      }

      setPartnerMeta(payload.data);
      setPartnerQrUrl(payload.data.qrUrl);
    } catch {
      setPartnerError('Network error. Please try again.');
    } finally {
      setPartnerLookupLoading(false);
    }
  }, [partnerEmail]);

  const handleDownload = useCallback(async () => {
    if (!resolvedUrl) return;
    try {
      const dataUrl = await QRCode.toDataURL(resolvedUrl, {
        width: DOWNLOAD_SIZE,
        margin: 3,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        type: 'image/png',
        errorCorrectionLevel: 'H',
      });
      const link = document.createElement('a');
      link.download = `soundbridge-app-qr-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [resolvedUrl, foregroundColor, backgroundColor]);

  const handlePartnerDownload = useCallback(async () => {
    if (!partnerQrUrl || !partnerMeta) return;
    try {
      const dataUrl = await QRCode.toDataURL(partnerQrUrl, {
        width: DOWNLOAD_SIZE,
        margin: 3,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        type: 'image/png',
        errorCorrectionLevel: 'H',
      });
      const link = document.createElement('a');
      link.download = `soundbridge-partner-${partnerMeta.referralCode}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      setPartnerError(e instanceof Error ? e.message : 'Download failed');
    }
  }, [partnerQrUrl, partnerMeta, foregroundColor, backgroundColor]);

  const isDark = theme === 'dark';
  const inputClass = `w-full px-4 py-3 rounded-xl border text-base placeholder-gray-500 ${
    isDark
      ? 'bg-white/10 border-white/20 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
      : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
  }`;
  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900'
          : 'bg-gray-50'
      }`}
    >
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <span
            className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            QR Code Generator
          </span>
          <Link
            href="/app"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isDark
                ? 'text-white hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">App download page</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-8">
        <div
          className={`rounded-2xl border-2 p-6 md:p-8 ${
            isDark
              ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/40'
              : 'bg-white border-purple-300 shadow-md'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <QrCode className="w-6 h-6" />
            </div>
            <h1
              className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Partner referral QR code
            </h1>
          </div>
          <p
            className={`text-base mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Enter the email on your partner account to generate a QR code for your
            referral link. Scans open{' '}
            <span className="font-mono text-sm">soundbridge.live/join</span> in the
            browser — works on mobile even when the app is not installed, then guides
            people to sign up and install.
          </p>

          <div className="mb-4">
            <label className={labelClass}>Partner account email</label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handlePartnerLookup();
              }}
              placeholder="you@example.com"
              className={inputClass}
              autoComplete="email"
            />
          </div>

          <button
            type="button"
            onClick={() => void handlePartnerLookup()}
            disabled={partnerLookupLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {partnerLookupLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying partner…
              </>
            ) : (
              <>
                <QrCode className="w-5 h-5" />
                Generate Partner QR Code
              </>
            )}
          </button>

          {partnerError && (
            <p className="mt-4 text-red-500 text-sm">{partnerError}</p>
          )}

          {partnerMeta && partnerQrUrl && (
            <div className="mt-6 space-y-4">
              <div
                className={`rounded-xl border p-4 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-purple-50 border-purple-100'
                }`}
              >
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Partner:{' '}
                  <span className="font-semibold">{partnerMeta.displayName}</span>
                </p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Referral code:{' '}
                  <span className="font-mono">{partnerMeta.referralCode}</span>
                </p>
                <p className={`text-sm mt-1 break-all ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Link: <span className="font-mono">{partnerQrUrl}</span>
                </p>
              </div>

              <div
                className={`rounded-xl border-2 p-4 flex flex-col items-center justify-center min-h-[320px] relative ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                }`}
              >
                {partnerLoading && (
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating…</span>
                  </div>
                )}
                <canvas
                  ref={partnerCanvasRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  className="max-w-full h-auto"
                  style={{ maxWidth: '280px' }}
                  aria-label="Partner QR code preview"
                />
              </div>

              <button
                type="button"
                onClick={() => void handlePartnerDownload()}
                disabled={!partnerQrUrl || partnerLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download className="w-5 h-5" />
                Download partner QR PNG
              </button>
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border p-6 md:p-8 ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
          }`}
        >
          <h2
            className={`text-xl md:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            Event banner QR code
          </h2>
          <p
            className={`text-base mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Generate a high-quality QR code for any SoundBridge URL — e.g. the app
            download page for event banners. Preview updates as you type; change colours
            below then download PNG for print.
          </p>

          <div className="mb-6">
            <label className={labelClass}>Target URL (path or full URL)</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_QR_PATH}
              className={inputClass}
            />
            <p
              className={`mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
            >
              Resolves to:{' '}
              <span className="font-mono break-all">{resolvedUrl || '—'}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>QR colour (foreground)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border font-mono text-sm ${
                    isDark
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Background colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border font-mono text-sm ${
                    isDark
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border-2 p-4 flex flex-col items-center justify-center min-h-[320px] relative ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
            }`}
          >
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating…</span>
              </div>
            )}
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <canvas
              ref={canvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="max-w-full h-auto"
              style={{ maxWidth: '280px' }}
              aria-label="QR code preview"
            />
            <p
              className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Preview (scans to: {resolvedUrl || '—'})
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!resolvedUrl}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download className="w-5 h-5" />
              Download PNG ({DOWNLOAD_SIZE}×{DOWNLOAD_SIZE}px)
            </button>
            <p
              className={`text-sm self-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              High resolution for print and banners
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
