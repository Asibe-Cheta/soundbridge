import { paragraphsFromSnapshot } from '@/src/lib/agreements/agreement-content';

export interface AgreementPdfData {
  partnerName: string;
  agreementTextSnapshot: string;
  documentHash: string;
  signerName: string;
  signerRole: string;
  signerEntity: string;
  /** PNG data URL (data:image/png;base64,...) */
  signatureImageDataUrl: string;
  signedAt: string; // ISO
}

/** Same jsPDF plain-text/vector pattern as src/lib/payouts/payout-receipt-pdf.ts. */
export async function generateAgreementPdf(data: AgreementPdfData): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const bottomLimit = pageH - 18;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const title = `Partnership agreement: SoundBridge Live Ltd and ${data.partnerName}`;
  for (const line of doc.splitTextToSize(title, pageW - margin * 2)) {
    ensureSpace(7);
    doc.text(line, margin, y);
    y += 7;
  }
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const paragraph of paragraphsFromSnapshot(data.agreementTextSnapshot)) {
    const lines = doc.splitTextToSize(paragraph, pageW - margin * 2);
    for (const line of lines) {
      ensureSpace(5.5);
      doc.text(line, margin, y);
      y += 5.5;
    }
    y += 3;
  }

  y += 6;
  ensureSpace(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Signatures', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Signed for SoundBridge Live Ltd: Justice Asibe, Founder and CEO', margin, y);
  y += 10;

  ensureSpace(45);
  doc.text(`Signed by: ${data.signerName}`, margin, y);
  y += 6;
  doc.text(`Role: ${data.signerRole}`, margin, y);
  y += 6;
  doc.text(`On behalf of: ${data.signerEntity}`, margin, y);
  y += 6;
  doc.text(
    `Date and time: ${new Date(data.signedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`,
    margin,
    y,
  );
  y += 8;

  ensureSpace(35);
  try {
    doc.addImage(data.signatureImageDataUrl, 'PNG', margin, y, 70, 28);
    y += 32;
  } catch (e) {
    console.error('[agreement-pdf] failed to embed signature image:', e);
  }

  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  ensureSpace(10);
  doc.text(`Document hash: ${data.documentHash}`, margin, y);

  const output = doc.output('arraybuffer');
  return Buffer.from(output);
}
