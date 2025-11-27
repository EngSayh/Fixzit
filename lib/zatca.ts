import QRCode from "qrcode";
import { logger } from "@/lib/logger";

// ZATCA specification limits
const MAX_TLV_FIELD_LENGTH = 256; // Maximum bytes per field per ZATCA spec

interface ZATCAData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string | number;
  vatAmount: string | number;
}

/**
 * Create a TLV (Tag-Length-Value) buffer for ZATCA QR code
 * @throws Error if value exceeds ZATCA maximum field length (256 bytes)
 */
function toTLV(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, "utf8");
  
  // SECURITY FIX: Validate TLV field length per ZATCA specification
  if (valueBuffer.length > MAX_TLV_FIELD_LENGTH) {
    throw new Error(
      `ZATCA TLV field (tag ${tag}) exceeds maximum length of ${MAX_TLV_FIELD_LENGTH} bytes. ` +
      `Actual: ${valueBuffer.length} bytes. Truncate or split the value.`
    );
  }
  
  const tagBuffer = Buffer.from([tag]);
  const lengthBuffer = Buffer.from([valueBuffer.length]);

  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

export function generateZATCATLV(data: ZATCAData): string {
  const tlvArray = [
    toTLV(1, data.sellerName),
    toTLV(2, data.vatNumber),
    toTLV(3, data.timestamp),
    toTLV(4, String(data.total)),
    toTLV(5, String(data.vatAmount)),
  ];

  const tlvBuffer = Buffer.concat(tlvArray);
  return tlvBuffer.toString("base64");
}

export async function generateZATCAQR(data: ZATCAData): Promise<string> {
  const tlvString = generateZATCATLV(data);

  try {
    const qrDataURL = await QRCode.toDataURL(tlvString, {
      errorCorrectionLevel: "L",
      margin: 1,
      width: 300,
    });
    return qrDataURL;
  } catch (_error) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    logger.error("QR Code generation error:", { error });
    throw new Error("Failed to generate QR code");
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
  const totalStr = String(data.total);
  if (!data.total || isNaN(parseFloat(totalStr)) || parseFloat(totalStr) < 0) {
    return false;
  }

  // Validate VAT amount
  const vatStr = String(data.vatAmount);
  if (!data.vatAmount || isNaN(parseFloat(vatStr)) || parseFloat(vatStr) < 0) {
    return false;
  }

  return true;
}
