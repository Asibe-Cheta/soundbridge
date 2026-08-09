/**
 * Server-side PDF withdrawal receipt (WEB_TEAM_PAYOUT_FLOW_FINCRA_QUESTIONS.MD).
 * Reuses jsPDF's plain text/vector API (no DOM/canvas dependency), same library and layout
 * conventions already used client-side in app/agreement/AgreementClient.tsx — just outputs a
 * Buffer instead of triggering a browser download.
 */
import {
  PLATFORM_FEE_PERCENT,
  FINCRA_TRANSFER_FEE_NGN_LABEL,
  STRIPE_ESTIMATED_FEE_PERCENT,
} from '@/src/lib/platform-fees';

export interface PayoutReceiptData {
  payoutRequestId: string;
  creatorName: string;
  /** Amount in the creator's wallet currency, e.g. 34.00 USD. */
  walletAmount: number;
  walletCurrency: string;
  /** Local-currency amount actually sent via Fincra, e.g. 49530.00 NGN. */
  localAmount: number;
  localCurrency: string;
  bankName: string | null;
  accountLast4: string | null;
  completedAt: string;
  fincraTransferId: string | null;
}

function currencySymbol(currency: string): string {
  switch (currency.toUpperCase()) {
    case 'GBP': return '£';
    case 'EUR': return '€';
    case 'NGN': return '₦';
    case 'GHS': return '₵';
    case 'KES': return 'KSh';
    default: return '$';
  }
}

function formatAmount(amount: number, currency: string): string {
  return `${currencySymbol(currency)}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Returns the PDF as a Buffer, ready to base64-encode for a SendGrid attachment. */
export async function generatePayoutReceiptPdf(data: PayoutReceiptData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SoundBridge — Withdrawal Receipt', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Reference: ${data.payoutRequestId}`, margin, y);
  y += 5;
  doc.text(`Date: ${new Date(data.completedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`, margin, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Summary', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const summaryRows = [
    `Creator: ${data.creatorName}`,
    `Withdrawal requested: ${formatAmount(data.walletAmount, data.walletCurrency)}`,
    `Amount sent to your bank: ${formatAmount(data.localAmount, data.localCurrency)}`,
    data.bankName ? `Bank: ${data.bankName}${data.accountLast4 ? ` ····${data.accountLast4}` : ''}` : null,
    data.fincraTransferId ? `Transfer ID: ${data.fincraTransferId}` : null,
  ].filter((r): r is string => Boolean(r));

  for (const row of summaryRows) {
    doc.text(row, margin, y);
    y += 6;
  }

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Where the fees go', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const feeIntro = doc.splitTextToSize(
    'These figures are fixed rates, shown for transparency about what it costs to get your earnings to you — they are not deducted from this specific withdrawal.',
    pageW - margin * 2,
  );
  for (const line of feeIntro) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 3;

  doc.setFontSize(10);
  const feeRows = [
    `SoundBridge platform fee: ${PLATFORM_FEE_PERCENT}% (already reflected in your wallet balance from the original tip/sale)`,
    `Fincra transfer fee: ${FINCRA_TRANSFER_FEE_NGN_LABEL} — covered by SoundBridge`,
    `Stripe processing fee: ~${STRIPE_ESTIMATED_FEE_PERCENT}% estimated — covered by SoundBridge`,
  ];
  for (const row of feeRows) {
    const lines = doc.splitTextToSize(`• ${row}`, pageW - margin * 2);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 5;
    }
    y += 1;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`You received: ${formatAmount(data.localAmount, data.localCurrency)}`, margin, y);

  y += 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text('Questions about this receipt? Contact contact@soundbridge.live', margin, y);

  const output = doc.output('arraybuffer');
  return Buffer.from(output);
}
