import QRCode from 'qrcode';
import { config } from '@/src/config/environment';

interface ZATCAInvoice {
  sellerName: string;
  vatNumber: string;
  timestamp: Date;
  total: number;
  vat: number;
}

interface TLVData {
  tag: number;
  value: string;
}

/**
 * ZATCA QR Code Generator
 * Generates QR codes compliant with ZATCA (Zakat, Tax and Customs Authority) requirements
 * for e-invoicing in Saudi Arabia
 */
export class ZATCAQRGenerator {
  /**
   * Generate ZATCA-compliant QR code for invoice
   */
  static async generateQR(invoice: ZATCAInvoice): Promise<string> {
    try {
      // Generate TLV encoded data
      const tlvData = this.generateTLV(invoice);
      
      // Generate QR code as data URL
      const qrCodeDataUrl: string = await new Promise((resolve, reject) => {
        (QRCode as any).toDataURL(
          tlvData,
          {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            margin: 1,
            width: 300,
            color: { dark: '#000000', light: '#FFFFFF' }
          },
          (err: any, url: string) => {
            if (err) return reject(err);
            resolve(url);
          }
        );
      });

      return qrCodeDataUrl as string;
    } catch (error) {
      console.error('Error generating ZATCA QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate TLV (Tag-Length-Value) encoded data as per ZATCA requirements
   */
  private static generateTLV(invoice: ZATCAInvoice): string {
    const tlvData: TLVData[] = [
      { tag: 1, value: invoice.sellerName },
      { tag: 2, value: invoice.vatNumber },
      { tag: 3, value: this.formatTimestamp(invoice.timestamp) },
      { tag: 4, value: invoice.total.toFixed(2) },
      { tag: 5, value: invoice.vat.toFixed(2) }
    ];

    // Convert to base64
    const buffer = this.encodeTLV(tlvData);
    return buffer.toString('base64');
  }

  /**
   * Encode TLV data to buffer
   */
  private static encodeTLV(data: TLVData[]): Buffer {
    const buffers: Buffer[] = [];

    for (const item of data) {
      // Convert value to UTF-8 buffer
      const valueBuffer = Buffer.from(item.value, 'utf8');
      
      // Create TLV structure: Tag (1 byte) + Length (1 byte) + Value
      const tlvBuffer = Buffer.concat([
        Buffer.from([item.tag]),
        Buffer.from([valueBuffer.length]),
        valueBuffer
      ]);
      
      buffers.push(tlvBuffer);
    }

    return Buffer.concat(buffers);
  }

  /**
   * Format timestamp as per ZATCA requirements (ISO 8601)
   */
  private static formatTimestamp(date: Date): string {
    // Format: YYYY-MM-DDTHH:mm:ssZ
    return date.toISOString();
  }

  /**
   * Validate VAT number format
   */
  static validateVATNumber(vatNumber: string): boolean {
    // Saudi VAT number format: 15 digits starting with 3
    const vatRegex = /^3\d{14}$/;
    return vatRegex.test(vatNumber);
  }

  /**
   * Calculate VAT amount (15% in Saudi Arabia)
   */
  static calculateVAT(amount: number, vatRate: number = 0.15): { total: number; vat: number; subtotal: number } {
    const subtotal = amount;
    const vat = subtotal * vatRate;
    const total = subtotal + vat;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      vat: parseFloat(vat.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }

  /**
   * Generate simplified tax invoice data
   */
  static generateSimplifiedInvoice(data: {
    invoiceNumber: string;
    customerName: string;
    items: Array<{ description: string; quantity: number; price: number }>;
    sellerName?: string;
    vatNumber?: string;
  }): ZATCAInvoice {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const { total, vat } = this.calculateVAT(subtotal);

    return {
      sellerName: data.sellerName || config.zatca.sellerName,
      vatNumber: data.vatNumber || config.zatca.vatNumber,
      timestamp: new Date(),
      total,
      vat
    };
  }

  /**
   * Generate full ZATCA-compliant invoice object
   */
  static async generateInvoice(data: {
    invoiceNumber: string;
    customerName: string;
    customerVAT?: string;
    items: Array<{ 
      description: string; 
      quantity: number; 
      price: number;
      vat?: number;
    }>;
    currency?: string;
    paymentMethod?: string;
    sellerName?: string;
    vatNumber?: string;
  }) {
    // Calculate totals
    let subtotal = 0;
    let totalVAT = 0;

    const itemsWithVAT = data.items.map(item => {
      const itemSubtotal = item.quantity * item.price;
      const itemVAT = item.vat || (itemSubtotal * 0.15);
      subtotal += itemSubtotal;
      totalVAT += itemVAT;

      return {
        ...item,
        subtotal: itemSubtotal,
        vat: itemVAT,
        total: itemSubtotal + itemVAT
      };
    });

    const invoiceData: ZATCAInvoice = {
      sellerName: data.sellerName || config.zatca.sellerName,
      vatNumber: data.vatNumber || config.zatca.vatNumber,
      timestamp: new Date(),
      total: subtotal + totalVAT,
      vat: totalVAT
    };

    // Generate QR code
    const qrCode = await this.generateQR(invoiceData);

    return {
      invoice: {
        number: data.invoiceNumber,
        date: invoiceData.timestamp,
        seller: {
          name: invoiceData.sellerName,
          vatNumber: invoiceData.vatNumber
        },
        customer: {
          name: data.customerName,
          vatNumber: data.customerVAT
        },
        items: itemsWithVAT,
        currency: data.currency || 'SAR',
        paymentMethod: data.paymentMethod || 'CASH',
        totals: {
          subtotal,
          vat: totalVAT,
          total: subtotal + totalVAT
        }
      },
      qrCode,
      tlvData: this.generateTLV(invoiceData)
    };
  }
}

// Export default instance
export default ZATCAQRGenerator;

// Export convenience function for backwards compatibility
export const generateZATCAQR = ZATCAQRGenerator.generateQR.bind(ZATCAQRGenerator);