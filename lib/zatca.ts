import QRCode from 'qrcode';
import { logger } from '@/lib/logger';

interface ZATCAData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatAmount: string;
}

function toTLV(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, 'utf8');
  const tagBuffer = Buffer.from([tag]);
  const lengthBuffer = Buffer.from([valueBuffer.length]);
  
  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

export function generateZATCATLV(data: ZATCAData): string {
  const tlvArray = [
    toTLV(1, data.sellerName),
    toTLV(2, data.vatNumber),
    toTLV(3, data.timestamp),
    toTLV(4, data.total),
    toTLV(5, data.vatAmount)
  ];
  
  const tlvBuffer = Buffer.concat(tlvArray);
  return tlvBuffer.toString('base64');
}

export async function generateZATCAQR(data: ZATCAData): Promise<string> {
  const tlvString = generateZATCATLV(data);
  
  try {
    const qrDataURL = await QRCode.toDataURL(tlvString, {
      errorCorrectionLevel: 'L',
      margin: 1,
      width: 300
    });
    return qrDataURL;
  } catch (error) {
    logger.error('QR Code generation error:', { error });
    throw new Error('Failed to generate QR code');
  }
}

export function validateZATCAData(data: ZATCAData): boolean {
  // Validate seller name
  if (!data.sellerName || data.sellerName.length > 300) {
    return false;
  }
  
  // Validate VAT number (should be 15 digits for Saudi Arabia)
  if (!data.vatNumber || !/^\d{15}$/.test(data.vatNumber)) {
    return false;
  }
  
  // Validate timestamp (ISO 8601 format)
  if (!data.timestamp || isNaN(Date.parse(data.timestamp))) {
    return false;
  }
  
  // Validate total amount
  if (!data.total || isNaN(parseFloat(data.total)) || parseFloat(data.total) < 0) {
    return false;
  }
  
  // Validate VAT amount
  if (!data.vatAmount || isNaN(parseFloat(data.vatAmount)) || parseFloat(data.vatAmount) < 0) {
    return false;
  }
  
  return true;
}
