import QRCode from 'qrcode';

const QR_SIZE = 1200;
const LABEL_HEIGHT = 200;

/** Renders a printable Tip Room QR: the code plus username/wordmark below it. */
export async function generateTipRoomQrPng(url: string, username: string): Promise<string> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: QR_SIZE,
    margin: 3,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H',
  });

  const composite = document.createElement('canvas');
  composite.width = QR_SIZE;
  composite.height = QR_SIZE + LABEL_HEIGHT;
  const ctx = composite.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, composite.width, composite.height);
  ctx.drawImage(qrCanvas, 0, 0);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#111111';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(`@${username}`, QR_SIZE / 2, QR_SIZE + 80);

  ctx.fillStyle = '#dc2626';
  ctx.font = '600 40px sans-serif';
  ctx.fillText('SoundBridge', QR_SIZE / 2, QR_SIZE + 150);

  return composite.toDataURL('image/png');
}
