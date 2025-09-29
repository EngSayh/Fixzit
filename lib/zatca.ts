import QRCode from 'qrcode';

interface ZATCAInvoice {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: number;
  vat: number;
}

// TLV encoder for ZATCA compliance
function encodeTLV(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, 'utf8');
  return Buffer.concat([
    Buffer.from([tag]),
    Buffer.from([valueBuffer.length]),
    valueBuffer
  ]);
}

export async function generateZATCAQR(invoice: ZATCAInvoice) {
  // Build TLV structure according to ZATCA specifications
  const tlvData = Buffer.concat([
    encodeTLV(1, invoice.sellerName),
    encodeTLV(2, invoice.vatNumber),
    encodeTLV(3, invoice.timestamp),
    encodeTLV(4, invoice.total.toFixed(2)),
    encodeTLV(5, invoice.vat.toFixed(2))
  ]);
  
  const base64 = tlvData.toString('base64');
  
  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(base64, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300
  });
  
  return {
    base64,
    dataUrl: qrDataUrl
  };
}
