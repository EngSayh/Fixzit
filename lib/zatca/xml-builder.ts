/**
 * ZATCA XML Builder
 * @module lib/zatca/xml-builder
 */

import { generateInvoiceHash, generateInvoiceUuid } from "./crypto";
import type { ZatcaInvoiceRequest, SimplifiedInvoiceData } from "./fatoora-types";

export function formatAmount(amount: number): string { return amount.toFixed(2); }
export function formatDate(date: Date | string): string { const d = typeof date === "string" ? new Date(date) : date; return d.toISOString().split("T")[0]; }
export function formatTime(date: Date | string): string { const d = typeof date === "string" ? new Date(date) : date; return d.toISOString().split("T")[1].replace("Z", ""); }

/**
 * Escape special XML characters to prevent XML injection
 */
export function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildInvoiceXml(request: ZatcaInvoiceRequest): string {
  const lines = request.invoiceLine.map((line) => {
    const escapedName = escapeXml(line.item.name);
    return `<cac:InvoiceLine><cbc:ID>${line.id}</cbc:ID><cbc:InvoicedQuantity unitCode="${line.invoicedQuantity.unitCode}">${line.invoicedQuantity.value}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="${request.documentCurrencyCode}">${formatAmount(line.lineExtensionAmount)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${escapedName}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${line.item.classifiedTaxCategory.id}</cbc:ID><cbc:Percent>${line.item.classifiedTaxCategory.percent}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="${request.documentCurrencyCode}">${formatAmount(line.price.priceAmount)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`;
  }).join("");
  
  const escapedRegistrationName = escapeXml(request.accountingSupplierParty.partyLegalEntity.registrationName);
  const escapedStreetName = escapeXml(request.accountingSupplierParty.postalAddress.streetName);
  const escapedCityName = escapeXml(request.accountingSupplierParty.postalAddress.cityName);
  
  return `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:ProfileID>reporting:1.0</cbc:ProfileID><cbc:ID>${request.id}</cbc:ID><cbc:UUID>${request.uuid}</cbc:UUID><cbc:IssueDate>${request.issueDate}</cbc:IssueDate><cbc:IssueTime>${request.issueTime}</cbc:IssueTime><cbc:InvoiceTypeCode name="${request.invoiceSubtype}">${request.invoiceTypeCode}</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>${request.documentCurrencyCode}</cbc:DocumentCurrencyCode><cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${request.invoiceCounterValue}</cbc:UUID></cac:AdditionalDocumentReference><cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${request.previousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference><cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${request.accountingSupplierParty.partyTaxScheme.companyId}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${escapedRegistrationName}</cbc:RegistrationName></cac:PartyLegalEntity><cac:PostalAddress><cbc:StreetName>${escapedStreetName}</cbc:StreetName><cbc:CityName>${escapedCityName}</cbc:CityName><cbc:CountrySubentityCode>${request.accountingSupplierParty.postalAddress.countryCode}</cbc:CountrySubentityCode><cac:Country><cbc:IdentificationCode>${request.accountingSupplierParty.postalAddress.countryCode}</cbc:IdentificationCode></cac:Country></cac:PostalAddress></cac:Party></cac:AccountingSupplierParty><cac:TaxTotal><cbc:TaxAmount currencyID="${request.documentCurrencyCode}">${formatAmount(request.taxTotal[0]?.taxAmount || 0)}</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${request.documentCurrencyCode}">${formatAmount(request.legalMonetaryTotal.lineExtensionAmount)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="${request.documentCurrencyCode}">${formatAmount(request.legalMonetaryTotal.taxExclusiveAmount)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="${request.documentCurrencyCode}">${formatAmount(request.legalMonetaryTotal.taxInclusiveAmount)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="${request.documentCurrencyCode}">${formatAmount(request.legalMonetaryTotal.payableAmount)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</Invoice>`;
}

export function buildSimplifiedInvoiceXml(data: SimplifiedInvoiceData): string {
  const issueDate = formatDate(data.issueDateTime);
  const issueTime = formatTime(data.issueDateTime);
  const uuid = generateInvoiceUuid();
  const previousHash = data.previousHash || generateInvoiceHash("0");
  
  // Escape user-controlled strings to prevent XML injection
  const escapedSellerName = escapeXml(data.sellerName || "");
  const escapedSellerVat = escapeXml(data.sellerVat || "");
  
  let lineExtension = 0;
  let totalVat = 0;
  const lines = data.items.map((item, idx) => {
    const lineTotal = item.quantity * item.unitPrice;
    const lineVat = lineTotal * (item.vatRate / 100);
    lineExtension += lineTotal;
    totalVat += lineVat;
    const escapedItemName = escapeXml(item.name);
    // [AGENT-0008] PR Review: Use "Z" for zero-rated items per ZATCA requirements
    const taxCategoryId = item.vatRate === 0 ? "Z" : "S";
    return `<cac:InvoiceLine><cbc:ID>${idx + 1}</cbc:ID><cbc:InvoicedQuantity unitCode="${item.unitCode || "PCE"}">${item.quantity}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="SAR">${formatAmount(lineTotal)}</cbc:LineExtensionAmount><cac:Item><cbc:Name>${escapedItemName}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${taxCategoryId}</cbc:ID><cbc:Percent>${item.vatRate}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="SAR">${formatAmount(item.unitPrice)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`;
  }).join("");
  const taxInclusive = lineExtension + totalVat;
  return `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:ProfileID>reporting:1.0</cbc:ProfileID><cbc:ID>${data.invoiceNumber}</cbc:ID><cbc:UUID>${uuid}</cbc:UUID><cbc:IssueDate>${issueDate}</cbc:IssueDate><cbc:IssueTime>${issueTime}</cbc:IssueTime><cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode><cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${data.invoiceCounter || 1}</cbc:UUID></cac:AdditionalDocumentReference><cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${previousHash}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference><cac:AccountingSupplierParty><cac:Party><cac:PartyTaxScheme><cbc:CompanyID>${escapedSellerVat}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme><cac:PartyLegalEntity><cbc:RegistrationName>${escapedSellerName}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty><cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${formatAmount(totalVat)}</cbc:TaxAmount></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="SAR">${formatAmount(lineExtension)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="SAR">${formatAmount(lineExtension)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="SAR">${formatAmount(taxInclusive)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="SAR">${formatAmount(taxInclusive)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</Invoice>`;
}

export function hashInvoice(xml: string): string { return generateInvoiceHash(xml); }
export function newInvoiceUuid(): string { return generateInvoiceUuid(); }
export const ZatcaXmlBuilder = { buildInvoiceXml, buildSimplifiedInvoiceXml, hashInvoice, newInvoiceUuid, formatDate, formatTime, formatAmount, escapeXml };
