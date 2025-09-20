const crypto = require('crypto');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

class ZATCAService {
  constructor() {
    this.config = {
      organizationIdentifier: process.env.ZATCA_ORG_ID || '310175397400003',
      organizationUnit: process.env.ZATCA_ORG_UNIT || 'Fixzit Property Management',
      organizationUnitArabic: 'إدارة عقارات فيكس إت',
      commonName: process.env.ZATCA_COMMON_NAME || 'TST-886431145-399999999900003',
      registeredAddress: 'Riyadh, Saudi Arabia',
      businessCategory: 'Real Estate',
      invoiceType: '0100000',
      apiUrl: process.env.ZATCA_API_URL || 'https://gw-apic-gov.gazt.gov.sa/e-invoicing/developer-portal'
    };
  }

  // Generate ZATCA compliant invoice XML
  async generateInvoiceXML(invoice) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:UUID>${invoice.uuid || this.generateUUID()}</cbc:UUID>
  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${invoice.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoice.typeCode === '388' ? 'Debit Note' : 'Tax Invoice'}">${invoice.typeCode || '388'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${this.config.organizationIdentifier}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.config.organizationUnit}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.supplier.address.street}</cbc:StreetName>
        <cbc:CityName>${invoice.supplier.address.city}</cbc:CityName>
        <cbc:PostalZone>${invoice.supplier.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.supplier.vatNumber}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="NAT">${invoice.customer.nationalId || invoice.customer.crn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${invoice.customer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${invoice.customer.address.street}</cbc:StreetName>
        <cbc:CityName>${invoice.customer.address.city}</cbc:CityName>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${invoice.customer.vatNumber || 'N/A'}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  ${invoice.items.map((item, index) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unitCode || 'PCE'}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="SAR">${item.lineTotal.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="SAR">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>${item.taxCategory || 'S'}</cbc:ID>
          <cbc:Percent>${item.vatRate || 15}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${item.description}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  `).join('')}
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${invoice.totalVat.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${invoice.totalVat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    return xml;
  }

  // Generate UUID v4
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Generate digital signature
  async generateDigitalSignature(xmlContent) {
    const privateKey = await this.getPrivateKey();
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(xmlContent);
    sign.end();
    
    const signature = sign.sign(privateKey, 'base64');
    return signature;
  }

  // Get or generate private key
  async getPrivateKey() {
    const keyPath = path.join(__dirname, '../keys/zatca-private.pem');
    
    try {
      return await fs.readFile(keyPath, 'utf8');
    } catch (error) {
      // Generate new key pair if not exists
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      await fs.mkdir(path.dirname(keyPath), { recursive: true });
      await fs.writeFile(keyPath, privateKey);
      await fs.writeFile(path.join(__dirname, '../keys/zatca-public.pem'), publicKey);
      
      return privateKey;
    }
  }

  // Generate ZATCA compliant QR code
  async generateQRCode(invoice) {
    const tlvData = this.generateTLV([
      { tag: 1, value: this.config.organizationUnit }, // Seller name
      { tag: 2, value: invoice.supplier.vatNumber }, // VAT number
      { tag: 3, value: invoice.timestamp }, // Timestamp
      { tag: 4, value: invoice.total.toFixed(2) }, // Total with VAT
      { tag: 5, value: invoice.totalVat.toFixed(2) } // VAT amount
    ]);
    
    const qrCodeDataUrl = await QRCode.toDataURL(tlvData.toString('base64'));
    return qrCodeDataUrl;
  }

  // Generate TLV (Tag-Length-Value) format
  generateTLV(data) {
    const tlvBuffers = data.map(item => {
      const value = Buffer.from(item.value, 'utf8');
      const tag = Buffer.from([item.tag]);
      const length = Buffer.from([value.length]);
      return Buffer.concat([tag, length, value]);
    });
    
    return Buffer.concat(tlvBuffers);
  }

  // Submit invoice to ZATCA
  async submitInvoice(invoice) {
    const xml = await this.generateInvoiceXML(invoice);
    const signature = await this.generateDigitalSignature(xml);
    const qrCode = await this.generateQRCode(invoice);
    
    // In production, this would submit to ZATCA API
    const submission = {
      invoiceHash: crypto.createHash('sha256').update(xml).digest('hex'),
      submissionDate: new Date().toISOString(),
      status: 'REPORTED',
      clearanceStatus: 'CLEARED',
      qrCode,
      signature,
      xml
    };
    
    // Store submission record
    invoice.zatcaSubmission = submission;
    await invoice.save();
    
    return submission;
  }

  // Validate invoice before submission
  validateInvoice(invoice) {
    const errors = [];
    
    if (!invoice.invoiceNumber) errors.push('Invoice number is required');
    if (!invoice.supplier?.vatNumber) errors.push('Supplier VAT number is required');
    if (!invoice.customer?.name) errors.push('Customer name is required');
    if (!invoice.items?.length) errors.push('Invoice must have at least one item');
    if (!invoice.total || invoice.total <= 0) errors.push('Invoice total must be greater than 0');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate compliance report
  async generateComplianceReport(startDate, endDate) {
    const Invoice = require('../models/Invoice');
    
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const report = {
      period: { startDate, endDate },
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalVat: invoices.reduce((sum, inv) => sum + inv.totalVat, 0),
      submittedCount: invoices.filter(inv => inv.zatcaSubmission?.status === 'REPORTED').length,
      clearedCount: invoices.filter(inv => inv.zatcaSubmission?.clearanceStatus === 'CLEARED').length,
      rejectedCount: invoices.filter(inv => inv.zatcaSubmission?.clearanceStatus === 'REJECTED').length,
      generatedAt: new Date().toISOString()
    };
    
    return report;
  }
}

module.exports = new ZATCAService();