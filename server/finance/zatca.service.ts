import QRCode from 'qrcode';
import { decimal128ToMinor, minorToMajor } from '../lib/money';

export async function generateEInvoice(invoice: any) {
  const subtotalMajor = minorToMajor(decimal128ToMinor(invoice.subtotalMinor));
  const taxMajor = minorToMajor(decimal128ToMinor(invoice.taxMinor));
  const totalMajor = minorToMajor(decimal128ToMinor(invoice.totalMinor));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${invoice.number}</cbc:ID>
  <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${invoice.type}</cbc:InvoiceTypeCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${invoice.sellerVat}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${invoice.buyerVat}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="${invoice.currency}">${taxMajor}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${subtotalMajor}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${totalMajor}</cbc:TaxInclusiveAmount></cac:LegalMonetaryTotal>
</Invoice>`;

  const qr = await QRCode.toDataURL(xml);
  return { xml, qr };
}
