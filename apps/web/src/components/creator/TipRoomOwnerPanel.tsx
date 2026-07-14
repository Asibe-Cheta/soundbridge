'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ChevronDown, ChevronUp, Download, Laptop, Printer, Projector } from 'lucide-react';
import { generateTipRoomQrPng } from '@/src/lib/tip-room-qr';

const PREVIEW_SIZE = 220;

export function TipRoomOwnerPanel({ username }: { username: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [tipRoomUrl, setTipRoomUrl] = useState('');

  useEffect(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://soundbridge.live';
    setTipRoomUrl(`${base}/tip/${username}`);
  }, [username]);

  useEffect(() => {
    if (!expanded || !tipRoomUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, tipRoomUrl, {
      width: PREVIEW_SIZE,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  }, [expanded, tipRoomUrl]);

  const handleDownload = async () => {
    if (!tipRoomUrl) return;
    setDownloading(true);
    try {
      const dataUrl = await generateTipRoomQrPng(tipRoomUrl, username);
      const link = document.createElement('a');
      link.download = `soundbridge-tip-room-qr-${username}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-8 w-full rounded-xl border border-white/10 bg-white/5 text-left">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white"
      >
        Your QR code &amp; how to use it
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex justify-center rounded-lg bg-white p-3">
            <canvas ref={canvasRef} width={PREVIEW_SIZE} height={PREVIEW_SIZE} />
          </div>

          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-pink-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Preparing…' : 'Download printable QR code'}
          </button>

          <div className="mt-5 space-y-3 text-sm text-gray-300">
            <p className="font-semibold text-white">Using your QR code at live events</p>
            <div className="flex gap-2">
              <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p>
                <span className="font-medium text-white">Laptop:</span> Open your Tip Room link
                ({`soundbridge.live/tip/${username}`}) in a browser and place your laptop where fans can
                see it — no extra setup needed.
              </p>
            </div>
            <div className="flex gap-2">
              <Projector className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p>
                <span className="font-medium text-white">Projector:</span> Connect to a projector and
                display the QR code full-screen. Any smartphone camera can scan it from across a room.
              </p>
            </div>
            <div className="flex gap-2">
              <Printer className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p>
                <span className="font-medium text-white">Print:</span> Print the QR code as a card or
                poster for your merch table. It never expires or changes.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              This is a static link with no session tokens or expiry, so it&apos;s safe to print and reuse
              indefinitely.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
