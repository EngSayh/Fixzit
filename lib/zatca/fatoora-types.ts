/**
 * ZATCA Fatoora API Types
 * @module lib/zatca/fatoora-types
 */

export type ZatcaInvoiceTypeCode = "388" | "381" | "383";
export type ZatcaInvoiceSubtype = "0100000" | "0200000" | "0100001" | "0100010" | "0200001" | "0200010";
export type ZatcaTaxCategory = "S" | "Z" | "E" | "O";
export type ZatcaApiStatus = "PASS" | "WARNING" | "ERROR";

export interface ZatcaPartyAddress {
  streetName: string;
  buildingNumber?: string;
  citySubdivisionName?: string;
  cityName: string;
  postalZone?: string;
  countryCode: string;
  additionalStreetName?: string;
  plotIdentification?: string;
}

export interface ZatcaPartyIdentification {
  id: string;
  schemeId: "CRN" | "MOM" | "MLS" | "SAG" | "GCC" | "OTH" | "TIN" | "700" | "NAT";
}

export interface ZatcaParty {
  partyIdentification?: ZatcaPartyIdentification;
  postalAddress: ZatcaPartyAddress;
  partyLegalEntity: {
    registrationName: string;
  };
  partyTaxScheme: {
    companyId: string;
    taxScheme: {
      id: "VAT";
    };
  };
}

export interface ZatcaAllowanceCharge {
  chargeIndicator: boolean;
  allowanceChargeReason?: string;
  allowanceChargeReasonCode?: string;
  multiplierFactorNumeric?: number;
  amount: number;
  baseAmount?: number;
  taxCategory: {
    id: ZatcaTaxCategory;
    percent: number;
    taxScheme: {
      id: "VAT";
    };
  };
}

export interface ZatcaInvoiceLine {
  id: string;
  invoicedQuantity: {
    value: number;
    unitCode: string;
  };
  lineExtensionAmount: number;
  item: {
    name: string;
    classifiedTaxCategory: {
      id: ZatcaTaxCategory;
      percent: number;
      taxScheme: {
        id: "VAT";
      };
    };
  };
  price: {
    priceAmount: number;
    baseQuantity?: {
      value: number;
      unitCode: string;
    };
    allowanceCharge?: ZatcaAllowanceCharge;
  };
  taxTotal?: {
    taxAmount: number;
    roundingAmount?: number;
  };
  allowanceCharge?: ZatcaAllowanceCharge[];
}

export interface ZatcaTaxSubtotal {
  taxableAmount: number;
  taxAmount: number;
  taxCategory: {
    id: ZatcaTaxCategory;
    percent: number;
    taxExemptionReason?: string;
    taxExemptionReasonCode?: string;
    taxScheme: {
      id: "VAT";
    };
  };
}

export interface ZatcaTaxTotal {
  taxAmount: number;
  taxSubtotal?: ZatcaTaxSubtotal[];
}

export interface ZatcaInvoiceRequest {
  id: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  invoiceTypeCode: ZatcaInvoiceTypeCode;
  invoiceSubtype: ZatcaInvoiceSubtype;
  documentCurrencyCode: string;
  taxCurrencyCode?: string;
  billingReference?: {
    invoiceDocumentReference: {
      id: string;
      uuid?: string;
      issueDate?: string;
    };
  };
  invoiceCounterValue: number;
  previousInvoiceHash: string;
  paymentMeans?: {
    paymentMeansCode: string;
    instructionNote?: string;
  };
  delivery?: {
    actualDeliveryDate?: string;
    latestDeliveryDate?: string;
  };
  accountingSupplierParty: ZatcaParty;
  accountingCustomerParty?: ZatcaParty;
  allowanceCharge?: ZatcaAllowanceCharge[];
  taxTotal: ZatcaTaxTotal[];
  legalMonetaryTotal: {
    lineExtensionAmount: number;
    taxExclusiveAmount: number;
    taxInclusiveAmount: number;
    allowanceTotalAmount?: number;
    chargeTotalAmount?: number;
    prepaidAmount?: number;
    payableRoundingAmount?: number;
    payableAmount: number;
  };
  invoiceLine: ZatcaInvoiceLine[];
}

export interface ZatcaClearanceRequest {
  invoiceHash: string;
  uuid: string;
  invoice: string;
}

export interface ZatcaReportingRequest {
  invoiceHash: string;
  uuid: string;
  invoice: string;
}

export interface ZatcaComplianceRequest {
  csr: string;
}

export interface ZatcaApiError {
  type: string;
  code: string;
  category: string;
  message: string;
  status: string;
}

export interface ZatcaValidationError {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  category: string;
  message: string;
  status: string;
}

export interface ZatcaWarning {
  type: "WARNING";
  code: string;
  category: string;
  message: string;
  status: string;
}

export interface ZatcaSubmissionResult {
  success: boolean;
  status: ZatcaApiStatus;
  invoiceHash?: string;
  clearanceStatus?: string;
  reportingStatus?: string;
  signedInvoice?: string;
  qrCode?: string;
  validationResults?: {
    infoMessages?: ZatcaValidationError[];
    warningMessages?: ZatcaValidationError[];
    errorMessages?: ZatcaValidationError[];
    status: ZatcaApiStatus;
  };
  errors?: ZatcaApiError[];
  warnings?: ZatcaWarning[];
}

export interface ZatcaComplianceResponse {
  success: boolean;
  requestId?: string;
  csid?: string;
  secret?: string;
  binarySecurityToken?: string;
  expiresAt?: string;
  errors?: ZatcaApiError[];
  warnings?: ZatcaWarning[];
}

export interface ZatcaProductionCsidRequest {
  complianceRequestId: string;
}

export interface ZatcaProductionCsidResponse {
  success: boolean;
  requestId?: string;
  csid?: string;
  secret?: string;
  binarySecurityToken?: string;
  expiresAt?: string;
  errors?: ZatcaApiError[];
  warnings?: ZatcaWarning[];
}

export interface ZatcaCsrConfig {
  commonName: string;
  serialNumber: string;
  organizationIdentifier: string;
  organizationUnitName?: string;
  organizationName: string;
  countryName: string;
  invoiceType: string;
  location: string;
  industry: string;
}

export interface SimplifiedInvoiceData {
  invoiceNumber: string;
  issueDateTime: Date | string;
  sellerName?: string;
  sellerVat?: string;
  sellerAddress?: {
    street: string;
    city: string;
    postalCode?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    unitCode?: string;
  }>;
  invoiceCounter?: number;
  previousHash?: string;
}
