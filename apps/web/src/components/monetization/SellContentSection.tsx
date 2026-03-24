'use client';

import React, { useState } from 'react';

type PricingState = {
  is_paid: boolean;
  price: number | null;
  currency: string | null;
  total_sales_count: number | null;
};

interface SellContentSectionProps {
  resource: 'track' | 'album';
  resourceId: string;
  isOwner: boolean;
  initial: PricingState;
}

const CURRENCIES = ['USD', 'GBP', 'EUR'] as const;

export function SellContentSection({ resource, resourceId, isOwner, initial }: SellContentSectionProps) {
  const [pricing, setPricing] = useState<PricingState>(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftPaid, setDraftPaid] = useState(initial.is_paid);
  const [draftPrice, setDraftPrice] = useState(
    initial.price != null ? String(initial.price) : '2.99'
  );
  const [draftCurrency, setDraftCurrency] = useState(initial.currency || 'USD');

  if (!isOwner) {
    return null;
  }

  const title = resource === 'track' ? 'Sell This Track' : 'Sell This Album';
  const apiPath =
    resource === 'track'
      ? `/api/audio-tracks/${resourceId}/pricing`
      : `/api/albums/${resourceId}/pricing`;

  const openEdit = () => {
    setError(null);
    const goingPaid = !pricing.is_paid;
    setDraftPaid(pricing.is_paid || goingPaid);
    setDraftPrice(pricing.price != null ? String(pricing.price) : '2.99');
    setDraftCurrency(pricing.currency || 'USD');
    setEditing(true);
  };

  const save = async () => {
    setError(null);
    const isPaid = draftPaid;
    let price: number | undefined;
    if (isPaid) {
      price = parseFloat(draftPrice);
      if (Number.isNaN(price) || price < 0.99 || price > 50) {
        setError('Price must be between 0.99 and 50.00');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(apiPath, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: isPaid,
          ...(isPaid ? { price, currency: draftCurrency } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        setError(data.message || 'Failed to save pricing');
        return;
      }
      setPricing((prev) => ({
        ...prev,
        is_paid: isPaid,
        price: isPaid ? price! : null,
        currency: isPaid ? draftCurrency : null,
      }));
      setEditing(false);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 mb-6">
      <h2 className="text-lg font-semibold text-emerald-100 mb-3">{title}</h2>

      {!pricing.is_paid && !editing && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">This {resource} is free. Set a price to sell it.</p>
          <button
            type="button"
            onClick={openEdit}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Set a Price
          </button>
        </div>
      )}

      {pricing.is_paid && !editing && (
        <div className="space-y-3">
          <p className="text-gray-200">
            <span className="text-emerald-300 font-semibold">
              {pricing.currency} {Number(pricing.price).toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-gray-400">
            {pricing.total_sales_count ?? 0} sale{(pricing.total_sales_count ?? 0) === 1 ? '' : 's'}
          </p>
          <button
            type="button"
            onClick={openEdit}
            className="px-4 py-2 rounded-lg border border-emerald-500/60 text-emerald-200 hover:bg-emerald-900/40 text-sm font-medium transition-colors"
          >
            Edit Pricing
          </button>
        </div>
      )}

      {editing && (
        <div className="space-y-4 text-sm">
          <label className="flex items-center gap-2 text-gray-200">
            <input
              type="checkbox"
              checked={draftPaid}
              onChange={(e) => setDraftPaid(e.target.checked)}
            />
            Offer for sale (paid)
          </label>

          {draftPaid && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.99}
                  max={50}
                  value={draftPrice}
                  onChange={(e) => setDraftPrice(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Currency</label>
                <select
                  value={draftCurrency}
                  onChange={(e) => setDraftCurrency(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
