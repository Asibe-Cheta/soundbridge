'use client';

import React from 'react';
import type { FincraApiExchange } from '@/src/lib/fincra-api-exchange';

type Props = {
  log: FincraApiExchange;
  title?: string;
  dark?: boolean;
  onDismiss?: () => void;
};

export function FincraApiLogPanel({ log, title = 'Fincra API log', dark = true, onDismiss }: Props) {
  const cardClass = dark ? 'bg-gray-900/90 border-gray-600' : 'bg-gray-50 border-gray-300';
  const textClass = dark ? 'text-gray-200' : 'text-gray-800';
  const mutedClass = dark ? 'text-gray-400' : 'text-gray-600';
  const preClass = dark
    ? 'bg-black/50 text-gray-300 border border-gray-700'
    : 'bg-white text-gray-800 border border-gray-200';

  return (
    <div className={`rounded-lg border p-4 ${cardClass}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className={`text-sm font-semibold ${textClass}`}>{title}</h3>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className={`text-xs ${mutedClass} hover:underline`}
          >
            Dismiss
          </button>
        ) : null}
      </div>
      <p className={`text-xs ${mutedClass} mb-3`}>
        {log.method} {log.url} · HTTP {log.response_status} · {new Date(log.at).toLocaleString()}
      </p>

      <details className="mb-2" open>
        <summary className={`text-xs cursor-pointer font-medium ${textClass}`}>curl (redacted)</summary>
        <pre className={`mt-2 text-xs p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap ${preClass}`}>
          {log.curl}
        </pre>
      </details>

      <details className="mb-2">
        <summary className={`text-xs cursor-pointer font-medium ${textClass}`}>Request body (redacted)</summary>
        <pre className={`mt-2 text-xs p-3 rounded overflow-auto max-h-48 ${preClass}`}>
          {JSON.stringify(log.request_body, null, 2)}
        </pre>
      </details>

      <details open>
        <summary className={`text-xs cursor-pointer font-medium ${textClass}`}>Response body</summary>
        <pre className={`mt-2 text-xs p-3 rounded overflow-auto max-h-64 ${preClass}`}>
          {JSON.stringify(log.response_body, null, 2)}
        </pre>
      </details>
    </div>
  );
}
