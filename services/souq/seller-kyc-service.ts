export interface IKYCDocumentFile {
  fileUrl: string;
  fileType: "pdf" | "jpg" | "png";
  uploadedAt: Date;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  expiresAt?: Date;
}

/**
 * Seller KYC Service
 * Handles seller onboarding and verification
 * - Multi-step KYC workflow
 * - Document validation
 * - CR/VAT verification
 * - Bank account verification
 * - Admin review queue
 */

import {
  SouqSeller,
  type IKYCDocumentEntry,
} from "@/server/models/souq/Seller";
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";

export interface IKYCCompanyInfo {
  businessName: string;
  businessNameArabic?: string;
  crNumber: string; // Commercial Registration
  vatNumber?: string;
  businessType: "individual" | "company" | "establishment";
  industry: string;
  description: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface IKYCDocuments {
  commercialRegistration: {
    fileUrl: string;
    fileType: "pdf" | "jpg" | "png";
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    expiresAt?: Date;
  };
  vatCertificate?: {
    fileUrl: string;
    fileType: "pdf" | "jpg" | "png";
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    expiresAt?: Date;
  };
  nationalId: {
    fileUrl: string;
    fileType: "pdf" | "jpg" | "png";
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    expiresAt?: Date;
  };
  bankLetter?: {
    fileUrl: string;
    fileType: "pdf" | "jpg" | "png";
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
    expiresAt?: Date;
  };
}

export interface IKYCBankDetails {
  bankName: string;
  accountHolderName: string;
  iban: string;
  swiftCode?: string;
  currency: "SAR" | "USD" | "EUR";
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod?: "micro_deposit" | "bank_api" | "manual";
}

export interface ISubmitKYCParams {
  sellerId: string;
  step: "company_info" | "documents" | "bank_details";
  data: IKYCCompanyInfo | IKYCDocuments | IKYCBankDetails;
}

export interface IVerifyDocumentParams {
  sellerId: string;
  documentType:
    | "commercialRegistration"
    | "vatCertificate"
    | "nationalId"
    | "bankLetter";
  approved: boolean;
  verifiedBy: string;
  rejectionReason?: string;
}

const DOCUMENT_TYPE_MAP = {
  commercialRegistration: "cr",
  vatCertificate: "vat_certificate",
  nationalId: "id",
  bankLetter: "bank_letter",
} as const;

type DocumentKey = keyof typeof DOCUMENT_TYPE_MAP;
type StoredDocumentType = (typeof DOCUMENT_TYPE_MAP)[DocumentKey];

const mapBusinessTypeToRegistration = (
  type: IKYCCompanyInfo["businessType"],
): "individual" | "company" | "partnership" => {
  if (type === "individual") return "individual";
  if (type === "company") return "company";
  // Treat establishment as company for now
  return "company";
};

const convertDocumentEntry = <K extends DocumentKey>(
  doc: NonNullable<IKYCDocuments[K]>,
  type: StoredDocumentType,
): IKYCDocumentEntry => ({
  type,
  url: doc.fileUrl,
  uploadedAt: doc.uploadedAt ?? new Date(),
  verified: doc.verified ?? false,
  expiresAt: "expiresAt" in doc ? doc.expiresAt : undefined,
  verifiedAt: "verifiedAt" in doc ? doc.verifiedAt : undefined,
  verifiedBy: "verifiedBy" in doc ? doc.verifiedBy : undefined,
  rejectionReason: "rejectionReason" in doc ? doc.rejectionReason : undefined,
});

const findDocument = (
  documents: IKYCDocumentEntry[] | undefined,
  key: DocumentKey,
) => documents?.find((entry) => entry.type === DOCUMENT_TYPE_MAP[key]);

const buildVerificationSnapshot = (
  documents: IKYCDocumentEntry[] | undefined,
) => ({
  commercialRegistration: Boolean(
    findDocument(documents, "commercialRegistration")?.verified,
  ),
  vatCertificate: Boolean(findDocument(documents, "vatCertificate")?.verified),
  nationalId: Boolean(findDocument(documents, "nationalId")?.verified),
  bankLetter: Boolean(findDocument(documents, "bankLetter")?.verified),
});

class SellerKYCService {
  /**
   * Submit KYC information (multi-step)
   */
  async submitKYC(params: ISubmitKYCParams): Promise<void> {
    const { sellerId, step, data } = params;

    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    switch (step) {
      case "company_info":
        await this.submitCompanyInfo(sellerId, data as IKYCCompanyInfo);
        break;
      case "documents":
        await this.submitDocuments(sellerId, data as IKYCDocuments);
        break;
      case "bank_details":
        await this.submitBankDetails(sellerId, data as IKYCBankDetails);
        break;
      default:
        throw new Error(`Invalid KYC step: ${step}`);
    }
  }

  /**
   * Submit company information (Step 1)
   */
  private async submitCompanyInfo(
    sellerId: string,
    data: IKYCCompanyInfo,
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    // Update seller with company info
    seller.businessName = data.businessName;
    seller.businessNameArabic = data.businessNameArabic;
    seller.registrationNumber = data.crNumber;
    seller.vatNumber = data.vatNumber;
    seller.registrationType = mapBusinessTypeToRegistration(data.businessType);
    seller.industry = data.industry;
    seller.description = data.description;
    seller.website = data.website;
    seller.contactEmail = data.contactEmail;
    seller.contactPhone = data.contactPhone;
    seller.businessAddress = {
      street: data.businessAddress.street,
      city: data.businessAddress.city,
      region: data.businessAddress.state,
      postalCode: data.businessAddress.postalCode,
      country: data.businessAddress.country,
    };

    // Update KYC status
    if (!seller.kycStatus) {
      seller.kycStatus = {
        status: "pending",
        submittedAt: new Date(),
        step: "company_info",
        companyInfoComplete: true,
        documentsComplete: false,
        bankDetailsComplete: false,
        approvedAt: undefined,
        rejectedAt: undefined,
        rejectionReason: undefined,
      };
    } else {
      seller.kycStatus.step = "documents";
      seller.kycStatus.companyInfoComplete = true;
    }

    await seller.save();

    // Validate CR number via external API (if available)
    await this.validateCRNumber(data.crNumber);

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
      to: seller.contactEmail,
      template: "kyc_company_info_received",
      data: { businessName: data.businessName },
    });
  }

  /**
   * Submit documents (Step 2)
   */
  private async submitDocuments(
    sellerId: string,
    data: IKYCDocuments,
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.kycStatus?.companyInfoComplete) {
      throw new Error("Complete company information first");
    }

    // Store documents
    const documents: IKYCDocumentEntry[] = [
      convertDocumentEntry(
        data.commercialRegistration,
        DOCUMENT_TYPE_MAP.commercialRegistration,
      ),
      convertDocumentEntry(data.nationalId, DOCUMENT_TYPE_MAP.nationalId),
    ];

    if (data.vatCertificate) {
      documents.push(
        convertDocumentEntry(
          data.vatCertificate,
          DOCUMENT_TYPE_MAP.vatCertificate,
        ),
      );
    }
    if (data.bankLetter) {
      documents.push(
        convertDocumentEntry(data.bankLetter, DOCUMENT_TYPE_MAP.bankLetter),
      );
    }

    seller.documents = documents;

    // Update KYC status
    seller.kycStatus.step = "bank_details";
    seller.kycStatus.documentsComplete = true;

    await seller.save();

    // Queue for admin review
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "internal-notification", {
      to: "kyc-review-team",
      priority: "normal",
      message: `New KYC documents submitted by ${seller.businessName} (${sellerId})`,
    });

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
      to: seller.contactEmail,
      template: "kyc_documents_received",
      data: { businessName: seller.businessName },
    });
  }

  /**
   * Submit bank details (Step 3)
   */
  private async submitBankDetails(
    sellerId: string,
    data: IKYCBankDetails,
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.kycStatus?.documentsComplete) {
      throw new Error("Complete documents upload first");
    }

    // Validate IBAN format
    if (!this.validateIBAN(data.iban)) {
      throw new Error("Invalid IBAN format");
    }

    // Store bank details
    seller.bankAccount = {
      bankName: data.bankName,
      accountName: data.accountHolderName,
      accountNumber: data.iban, // Use IBAN as account number for Saudi banks
      iban: data.iban,
      swiftCode: data.swiftCode,
    };

    // Update KYC status
    seller.kycStatus.step = "verification";
    seller.kycStatus.bankDetailsComplete = true;
    seller.kycStatus.status = "in_review";

    await seller.save();

    // Queue for final review
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "internal-notification", {
      to: "kyc-review-team",
      priority: "high",
      message: `KYC submission complete for ${seller.businessName} (${sellerId}) - Ready for review`,
    });

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
      to: seller.contactEmail,
      template: "kyc_under_review",
      data: {
        businessName: seller.businessName,
        estimatedReviewTime: "2-3 business days",
      },
    });
  }

  /**
   * Verify a specific document (Admin action)
   */
  async verifyDocument(params: IVerifyDocumentParams): Promise<void> {
    const { sellerId, documentType, approved, verifiedBy, rejectionReason } =
      params;

    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    const document = findDocument(seller.documents, documentType);
    if (!document) {
      throw new Error(`Document ${documentType} not found`);
    }

    // Update document verification status
    document.verified = approved;
    document.verifiedAt = approved ? new Date() : undefined;
    document.verifiedBy = verifiedBy;
    if (!approved) {
      document.rejectionReason = rejectionReason;
      if (seller.kycStatus) {
        seller.kycStatus.rejectionReason = rejectionReason;
        seller.kycStatus.rejectedBy = verifiedBy;
      }
    }

    await seller.save();

    // Check if all required documents are verified
    await this.checkAllDocumentsVerified(sellerId);

    // Notify seller
    if (!approved) {
      await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
        to: seller.contactEmail,
        template: "kyc_document_rejected",
        data: {
          documentType,
          reason: rejectionReason,
          businessName: seller.businessName,
        },
      });
    }
  }

  /**
   * Check if all documents are verified and approve KYC
   */
  private async checkAllDocumentsVerified(sellerId: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller || !seller.documents) return;

    const requiredDocs: DocumentKey[] = [
      "commercialRegistration",
      "nationalId",
    ];
    const allVerified = requiredDocs.every((docType) => {
      const doc = findDocument(seller.documents, docType);
      return doc?.verified;
    });

    const vatDoc = findDocument(seller.documents, "vatCertificate");
    if (vatDoc && !vatDoc.verified) {
      return;
    }

    if (allVerified && seller.kycStatus) {
      // Auto-approve KYC if all documents verified
      await this.approveKYC(sellerId, "SYSTEM");
    }
  }

  /**
   * Approve seller KYC (Admin action)
   */
  async approveKYC(sellerId: string, approvedBy: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.kycStatus) {
      throw new Error("KYC not submitted");
    }

    // Update KYC status
    seller.kycStatus.status = "approved";
    seller.kycStatus.approvedAt = new Date();
    seller.kycStatus.approvedBy = approvedBy;

    seller.isActive = true;
    seller.isSuspended = false;
    seller.suspensionReason = undefined;

    await seller.save();

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
      to: seller.contactEmail,
      template: "kyc_approved",
      data: {
        businessName: seller.businessName,
        sellerCentralUrl: "https://seller.fixzit.sa/dashboard",
      },
    });

    // Send welcome guide
    await addJob(
      QUEUE_NAMES.NOTIFICATIONS,
      "send-email",
      {
        to: seller.contactEmail,
        template: "seller_welcome_guide",
        data: { businessName: seller.businessName },
      },
      { delay: 3600000 },
    ); // 1 hour delay
  }

  /**
   * Reject seller KYC (Admin action)
   */
  async rejectKYC(
    sellerId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.kycStatus) {
      throw new Error("KYC not submitted");
    }

    // Update KYC status
    seller.kycStatus.status = "rejected";
    seller.kycStatus.rejectedAt = new Date();
    seller.kycStatus.rejectedBy = rejectedBy;
    seller.kycStatus.rejectionReason = reason;

    seller.isActive = false;
    seller.isSuspended = true;
    seller.suspensionReason = reason;

    await seller.save();

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
      to: seller.contactEmail,
      template: "kyc_rejected",
      data: {
        businessName: seller.businessName,
        reason,
        resubmitUrl: "https://seller.fixzit.sa/kyc/resubmit",
      },
    });
  }

  /**
   * Get KYC status for a seller
   */
  async getKYCStatus(sellerId: string): Promise<{
    status: string;
    step: string;
    companyInfoComplete: boolean;
    documentsComplete: boolean;
    bankDetailsComplete: boolean;
    documentsVerification?: Record<string, boolean>;
    canResubmit: boolean;
  }> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error("Seller not found");
    }

    if (!seller.kycStatus) {
      return {
        status: "not_started",
        step: "company_info",
        companyInfoComplete: false,
        documentsComplete: false,
        bankDetailsComplete: false,
        canResubmit: false,
      };
    }

    const documentsVerification =
      seller.documents && seller.documents.length > 0
        ? buildVerificationSnapshot(seller.documents)
        : undefined;

    return {
      status: seller.kycStatus.status,
      step: seller.kycStatus.step,
      companyInfoComplete: seller.kycStatus.companyInfoComplete,
      documentsComplete: seller.kycStatus.documentsComplete,
      bankDetailsComplete: seller.kycStatus.bankDetailsComplete,
      documentsVerification,
      canResubmit: seller.kycStatus.status === "rejected",
    };
  }

  /**
   * Get pending KYC submissions (Admin view)
   */
  async getPendingKYCSubmissions(): Promise<
    Array<{
      sellerId: string;
      businessName: string;
      submittedAt: Date;
      step: string;
      waitingDays: number;
    }>
  > {
    const sellers = await SouqSeller.find({
      "kycStatus.status": "in_review",
    }).sort({ "kycStatus.submittedAt": 1 });

    return sellers.map((seller) => {
      const waitingDays = seller.kycStatus?.submittedAt
        ? Math.floor(
            (Date.now() - seller.kycStatus.submittedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        sellerId: seller._id.toString(),
        businessName: seller.businessName || "Unknown",
        submittedAt: seller.kycStatus?.submittedAt || new Date(),
        step: seller.kycStatus?.step || "unknown",
        waitingDays,
      };
    });
  }

  /**
   * Validate CR number (Saudi Arabia)
   * In production, integrate with Ministry of Commerce API
   */
  private async validateCRNumber(crNumber: string): Promise<boolean> {
    // Basic format validation: 10 digits
    if (!/^\d{10}$/.test(crNumber)) {
      throw new Error("Invalid CR number format. Must be 10 digits.");
    }

    // In production, call external API:
    // const response = await fetch('https://api.mc.gov.sa/validate-cr', {
    //   method: 'POST',
    //   body: JSON.stringify({ crNumber })
    // });

    return true;
  }

  /**
   * Validate IBAN format
   */
  private validateIBAN(iban: string): boolean {
    // Remove spaces
    const cleanIBAN = iban.replace(/\s/g, "");

    // Saudi IBAN format: SA + 2 digits + 18 alphanumeric
    if (!/^SA\d{2}[A-Z0-9]{18}$/.test(cleanIBAN)) {
      return false;
    }

    // MOD-97 checksum validation
    // 1. Move first 4 chars to end: SA22 1234... → 1234...SA22
    const rearranged = cleanIBAN.slice(4) + cleanIBAN.slice(0, 4);

    // 2. Replace letters with numbers (A=10, B=11, ..., Z=35)
    const numericString = rearranged
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        // A-Z: convert to 10-35
        if (code >= 65 && code <= 90) {
          return (code - 55).toString();
        }
        // 0-9: keep as is
        return char;
      })
      .join("");

    // 3. Calculate MOD 97 (handle large numbers by processing in chunks)
    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
    }

    // Valid IBAN has remainder of 1
    return remainder === 1;
  }

  /**
   * Background job: Auto-escalate pending KYC reviews
   * Alert if KYC pending for 3+ days
   */
  async autoEscalatePendingKYC(): Promise<number> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const pendingSellers = await SouqSeller.find({
      "kycStatus.status": "in_review",
      "kycStatus.submittedAt": { $lt: threeDaysAgo },
    });

    let escalated = 0;
    for (const seller of pendingSellers) {
      await addJob(
        QUEUE_NAMES.NOTIFICATIONS,
        "internal-notification",
        {
          to: "kyc-manager",
          priority: "high",
          message: `KYC pending for 3+ days: ${seller.businessName} (${seller._id})`,
        },
        { priority: 2 },
      );
      escalated++;
    }

    return escalated;
  }
}

export const sellerKYCService = new SellerKYCService();
