# ADR-002: ZATCA E-Invoicing Phase 2 Compliance

**Status:** Proposed → Scaffolding Ready  
**Date:** 2025-12-20 (Updated: 2025-12-21)  
**Decision Makers:** Eng. Sultan Al Hassni  
**Context:** COMP-001 from Production Readiness backlog  
**Regulatory Deadline:** Q2 2026 (April-June 2026)
**Implementation:** services/finance/zatca/index.ts (scaffolding)

## Context

Fixzit currently implements ZATCA Phase 1 (Fatoora) requirements:
- TLV-encoded QR codes on invoices
- 5-field structure: Seller Name, VAT Number, Timestamp, Total, VAT Amount
- QR code generation via `lib/zatca.ts`

**ZATCA Phase 2 (Integration Phase)** requires:
- Real-time API integration with ZATCA's Fatoora Portal
- Cryptographic signing of invoices (XML-DSig)
- Unique Invoice Reference Number (IRN) from ZATCA
- Clearance for B2B invoices before issuance
- Reporting for B2C invoices within 24 hours

## Current Implementation Analysis

### Existing Files:
```
lib/zatca.ts                           # Phase 1 QR generation
services/aqar/fm-lifecycle-service.ts  # Uses generateZATCAQR
app/api/invoices/route.ts              # Invoice creation with QR
app/api/invoices/[id]/route.ts         # Invoice update with QR
```

### Current `lib/zatca.ts` Capabilities:
- ✅ TLV encoding (5 fields)
- ✅ Base64 QR generation
- ✅ Field validation (VAT number, timestamp, amounts)
- ❌ XML invoice generation (UBL 2.1)
- ❌ Cryptographic signing
- ❌ ZATCA API integration
- ❌ Certificate management
- ❌ Clearance/Reporting workflow

## Phase 2 Requirements Breakdown

### 1. Certificate Management (CSID)
```typescript
interface ZATCACertificate {
  csid: string;           // Compliance CSID from ZATCA
  privateKey: string;     // PEM-encoded private key
  certificate: string;    // X.509 certificate
  expiresAt: Date;
  lastRenewed: Date;
}
```

**Workflow:**
1. Generate CSR (Certificate Signing Request)
2. Submit to ZATCA Portal → receive Compliance CSID
3. Complete onboarding tests
4. Receive Production CSID
5. Auto-renew before expiry

### 2. Invoice XML Generation (UBL 2.1)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>INV-2025-001</cbc:ID>
  <cbc:IssueDate>2025-12-20</cbc:IssueDate>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <!-- ... full UBL 2.1 structure -->
</Invoice>
```

### 3. Cryptographic Signing (XML-DSig)
- Sign invoice XML with private key
- Embed signature in invoice
- Generate invoice hash (SHA-256)
- Include previous invoice hash (chain integrity)

### 4. ZATCA API Integration

**Endpoints:**
| Environment | Base URL |
|------------|----------|
| Sandbox | `https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal` |
| Simulation | `https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation` |
| Production | `https://gw-fatoora.zatca.gov.sa/e-invoicing/core` |

**API Operations:**
```typescript
interface ZATCAAPIClient {
  // Clearance (B2B) - MUST be cleared before issuing
  clearInvoice(invoice: UBLInvoice): Promise<ClearanceResponse>;
  
  // Reporting (B2C) - Report within 24 hours
  reportInvoice(invoice: UBLInvoice): Promise<ReportingResponse>;
  
  // Compliance check
  checkCompliance(invoice: UBLInvoice): Promise<ComplianceResponse>;
}
```

### 5. Invoice Types

| Code | Type | Workflow |
|------|------|----------|
| 388 | Standard Tax Invoice (B2B) | Clearance required |
| 381 | Credit Note | Clearance required |
| 383 | Debit Note | Clearance required |
| 0100000 | Simplified Tax Invoice (B2C) | Reporting only |

## Implementation Plan

### Phase 2.1: Foundation (40h) - Q1 2026

#### Week 1-2: XML Generation
```
services/finance/zatca/
├── xml-generator.ts         # UBL 2.1 XML generation
├── xml-templates/
│   ├── standard-invoice.xml # B2B template
│   ├── simplified-invoice.xml # B2C template
│   ├── credit-note.xml
│   └── debit-note.xml
└── validators/
    └── ubl-validator.ts     # XML schema validation
```

#### Week 3-4: Signing Infrastructure
```
lib/zatca/
├── index.ts                 # Re-export (backward compat)
├── qr.ts                    # Existing QR generation
├── signing.ts               # XML-DSig implementation
├── certificate-manager.ts   # CSID management
└── hash-chain.ts            # Invoice chain integrity
```

### Phase 2.2: ZATCA Integration (40h) - Q1 2026

#### Week 5-6: API Client
```
services/finance/zatca/
├── api-client.ts            # ZATCA API integration
├── clearance-service.ts     # B2B clearance workflow
├── reporting-service.ts     # B2C reporting workflow
└── retry-queue.ts           # Failed submission retry
```

#### Week 7-8: Database & Queue
```sql
-- New collections
zatca_submissions: {
  invoiceId: ObjectId,
  type: 'clearance' | 'reporting',
  status: 'pending' | 'submitted' | 'accepted' | 'rejected' | 'warning',
  zatcaResponse: Object,
  retryCount: number,
  submittedAt: Date,
  processedAt: Date
}

zatca_certificates: {
  orgId: ObjectId,
  environment: 'sandbox' | 'simulation' | 'production',
  csid: string,
  certificate: string (encrypted),
  privateKey: string (encrypted),
  expiresAt: Date,
  status: 'active' | 'expired' | 'revoked'
}
```

### Phase 2.3: Integration & Testing (40h) - Q2 2026

#### Week 9-10: Invoice Flow Integration
- Modify `app/api/invoices/route.ts` to trigger ZATCA submission
- Add clearance gate for B2B invoices
- Implement 24-hour reporting queue for B2C

#### Week 11-12: Testing & Certification
- Complete ZATCA sandbox testing
- Generate test scenarios (100+ invoice types)
- Obtain ZATCA certification approval

## Environment Variables Required

```env
# ZATCA Phase 2 Configuration
ZATCA_ENVIRONMENT=sandbox|simulation|production
ZATCA_API_KEY=<api-key-from-zatca>
ZATCA_API_SECRET=<api-secret-from-zatca>

# Certificate paths (or encrypted storage)
ZATCA_PRIVATE_KEY_ENCRYPTED=<encrypted-pem>
ZATCA_CERTIFICATE_ENCRYPTED=<encrypted-pem>
ZATCA_ENCRYPTION_KEY=<32-byte-key>

# Organization defaults
ZATCA_SELLER_NAME=Fixzit
ZATCA_VAT_NUMBER=300000000000003
ZATCA_CR_NUMBER=<commercial-registration>
ZATCA_STREET_ADDRESS=Riyadh, Saudi Arabia
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ZATCA API downtime | Implement retry queue with exponential backoff |
| Certificate expiry | Automated renewal 30 days before expiry + alerts |
| Failed clearance | Block invoice issuance, notify finance team |
| Hash chain corruption | Regular integrity checks, backup chain state |
| Multi-tenant isolation | Separate certificates per org_id |

## Cost Estimate

| Item | Estimate |
|------|----------|
| Development | 120 hours |
| ZATCA Certification | 2-4 weeks |
| Testing Infrastructure | $500/month (simulation env) |
| Production Maintenance | 4 hours/month |

## Success Criteria

1. ✅ Generate ZATCA-compliant UBL 2.1 XML invoices
2. ✅ Sign invoices with valid CSID
3. ✅ Clear B2B invoices in <5 seconds
4. ✅ Report B2C invoices within 24 hours
5. ✅ Pass ZATCA certification tests
6. ✅ Zero manual intervention for standard flows

## Timeline

```
Q1 2026 (Jan-Mar):
├── Week 1-4: XML Generation + Signing (Phase 2.1)
├── Week 5-8: ZATCA API Integration (Phase 2.2)
└── Week 9-12: Testing + Certification prep

Q2 2026 (Apr-Jun):
├── Month 1: ZATCA Sandbox Testing
├── Month 2: Simulation Environment + Fixes
└── Month 3: Production Rollout (before deadline)
```

## References

- [ZATCA E-Invoicing Developer Portal](https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx)
- [ZATCA Technical Specifications v2.3](https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing_Technical_Specification_v2.3.pdf)
- [UBL 2.1 Invoice Schema](http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd)
- [XML-DSig Specification](https://www.w3.org/TR/xmldsig-core1/)
