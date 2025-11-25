import QRCode from "qrcode";
import { minorToMajor } from "../lib/money";

type MinorAmount = string | number | { toString(): string };

function toMinorBigInt(amount: MinorAmount): bigint {
  if (typeof amount === "number") {
    return BigInt(Math.round(amount));
  }
  return BigInt(amount.toString());
}

export interface EInvoicePayload {
  subtotalMinor: MinorAmount;
  taxMinor: MinorAmount;
  totalMinor: MinorAmount;
  number: string;
  date: string;
  type: string;
  sellerVat: string;
  buyerVat: string;
  currency: string;
}

export async function generateEInvoice(invoice: EInvoicePayload) {
  const subtotalMajor = minorToMajor(toMinorBigInt(invoice.subtotalMinor));
  const taxMajor = minorToMajor(toMinorBigInt(invoice.taxMinor));
  const totalMajor = minorToMajor(toMinorBigInt(invoice.totalMinor));

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
