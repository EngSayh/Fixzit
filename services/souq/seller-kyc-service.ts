// @ts-nocheck
/**
 * Seller KYC Service
 * Handles seller onboarding and verification
 * - Multi-step KYC workflow
 * - Document validation
 * - CR/VAT verification
 * - Bank account verification
 * - Admin review queue
 */

import { SouqSeller } from '@/server/models/souq/Seller';
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';
import mongoose from 'mongoose';

export interface IKYCCompanyInfo {
  businessName: string;
  businessNameArabic?: string;
  crNumber: string; // Commercial Registration
  vatNumber?: string;
  businessType: 'individual' | 'company' | 'establishment';
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
    fileType: 'pdf' | 'jpg' | 'png';
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
  };
  vatCertificate?: {
    fileUrl: string;
    fileType: 'pdf' | 'jpg' | 'png';
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
  };
  nationalId: {
    fileUrl: string;
    fileType: 'pdf' | 'jpg' | 'png';
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
  };
  bankLetter?: {
    fileUrl: string;
    fileType: 'pdf' | 'jpg' | 'png';
    uploadedAt: Date;
    verified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
    rejectionReason?: string;
  };
}

export interface IKYCBankDetails {
  bankName: string;
  accountHolderName: string;
  iban: string;
  swiftCode?: string;
  currency: 'SAR' | 'USD' | 'EUR';
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod?: 'micro_deposit' | 'bank_api' | 'manual';
}

export interface ISubmitKYCParams {
  sellerId: string;
  step: 'company_info' | 'documents' | 'bank_details';
  data: IKYCCompanyInfo | IKYCDocuments | IKYCBankDetails;
}

export interface IVerifyDocumentParams {
  sellerId: string;
  documentType: 'commercialRegistration' | 'vatCertificate' | 'nationalId' | 'bankLetter';
  approved: boolean;
  verifiedBy: string;
  rejectionReason?: string;
}

class SellerKYCService {
  /**
   * Submit KYC information (multi-step)
   */
  async submitKYC(params: ISubmitKYCParams): Promise<void> {
    const { sellerId, step, data } = params;

    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    switch (step) {
      case 'company_info':
        await this.submitCompanyInfo(sellerId, data as IKYCCompanyInfo);
        break;
      case 'documents':
        await this.submitDocuments(sellerId, data as IKYCDocuments);
        break;
      case 'bank_details':
        await this.submitBankDetails(sellerId, data as IKYCBankDetails);
        break;
      default:
        throw new Error(`Invalid KYC step: ${step}`);
    }
  }

  /**
   * Submit company information (Step 1)
   */
  private async submitCompanyInfo(sellerId: string, data: IKYCCompanyInfo): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    // Update seller with company info
    seller.businessName = data.businessName;
    seller.businessNameArabic = data.businessNameArabic;
    seller.crNumber = data.crNumber;
    seller.vatNumber = data.vatNumber;
    seller.businessType = data.businessType;
    seller.industry = data.industry;
    seller.description = data.description;
    seller.website = data.website;
    seller.contactEmail = data.contactEmail;
    seller.contactPhone = data.contactPhone;
    seller.businessAddress = data.businessAddress;

    // Update KYC status
    if (!seller.kycStatus) {
      seller.kycStatus = {
        status: 'pending',
        submittedAt: new Date(),
        step: 'company_info',
        companyInfoComplete: true,
        documentsComplete: false,
        bankDetailsComplete: false,
        approvedAt: undefined,
        rejectedAt: undefined,
        rejectionReason: undefined
      };
    } else {
      seller.kycStatus.step = 'documents';
      seller.kycStatus.companyInfoComplete = true;
    }

    await seller.save();

    // Validate CR number via external API (if available)
    await this.validateCRNumber(data.crNumber);

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'kyc_company_info_received',
      data: { businessName: data.businessName }
    });
  }

  /**
   * Submit documents (Step 2)
   */
  private async submitDocuments(sellerId: string, data: IKYCDocuments): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (!seller.kycStatus?.companyInfoComplete) {
      throw new Error('Complete company information first');
    }

    // Store documents
    seller.documents = {
      commercialRegistration: {
        ...data.commercialRegistration,
        verified: false
      },
      vatCertificate: data.vatCertificate ? {
        ...data.vatCertificate,
        verified: false
      } : undefined,
      nationalId: {
        ...data.nationalId,
        verified: false
      },
      bankLetter: data.bankLetter ? {
        ...data.bankLetter,
        verified: false
      } : undefined
    };

    // Update KYC status
    seller.kycStatus.step = 'bank_details';
    seller.kycStatus.documentsComplete = true;

    await seller.save();

    // Queue for admin review
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
      to: 'kyc-review-team',
      priority: 'normal',
      message: `New KYC documents submitted by ${seller.businessName} (${sellerId})`
    });

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'kyc_documents_received',
      data: { businessName: seller.businessName }
    });
  }

  /**
   * Submit bank details (Step 3)
   */
  private async submitBankDetails(sellerId: string, data: IKYCBankDetails): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (!seller.kycStatus?.documentsComplete) {
      throw new Error('Complete documents upload first');
    }

    // Validate IBAN format
    if (!this.validateIBAN(data.iban)) {
      throw new Error('Invalid IBAN format');
    }

    // Store bank details
    seller.bankDetails = {
      ...data,
      verified: false
    };

    // Update KYC status
    seller.kycStatus.step = 'verification';
    seller.kycStatus.bankDetailsComplete = true;
    seller.kycStatus.status = 'under_review';

    await seller.save();

    // Queue for final review
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
      to: 'kyc-review-team',
      priority: 'high',
      message: `KYC submission complete for ${seller.businessName} (${sellerId}) - Ready for review`
    });

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'kyc_under_review',
      data: { 
        businessName: seller.businessName,
        estimatedReviewTime: '2-3 business days'
      }
    });
  }

  /**
   * Verify a specific document (Admin action)
   */
  async verifyDocument(params: IVerifyDocumentParams): Promise<void> {
    const { sellerId, documentType, approved, verifiedBy, rejectionReason } = params;

    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (!seller.documents) {
      throw new Error('No documents submitted');
    }

    const document = seller.documents[documentType];
    if (!document) {
      throw new Error(`Document ${documentType} not found`);
    }

    // Update document verification status
    document.verified = approved;
    document.verifiedAt = new Date();
    document.verifiedBy = verifiedBy;
    if (!approved) {
      document.rejectionReason = rejectionReason;
    }

    await seller.save();

    // Check if all required documents are verified
    await this.checkAllDocumentsVerified(sellerId);

    // Notify seller
    if (!approved) {
      await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
        to: seller.contactEmail,
        template: 'kyc_document_rejected',
        data: { 
          documentType,
          reason: rejectionReason,
          businessName: seller.businessName
        }
      });
    }
  }

  /**
   * Check if all documents are verified and approve KYC
   */
  private async checkAllDocumentsVerified(sellerId: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller || !seller.documents) return;

    const requiredDocs = ['commercialRegistration', 'nationalId'];
    const allVerified = requiredDocs.every(docType => {
      const doc = seller.documents?.[docType as keyof typeof seller.documents];
      return doc && doc.verified;
    });

    // Check optional VAT certificate if provided
    if (seller.documents.vatCertificate && !seller.documents.vatCertificate.verified) {
      return; // Wait for VAT verification
    }

    if (allVerified && seller.kycStatus) {
      // Auto-approve KYC if all documents verified
      await this.approveKYC(sellerId, 'SYSTEM');
    }
  }

  /**
   * Approve seller KYC (Admin action)
   */
  async approveKYC(sellerId: string, approvedBy: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (!seller.kycStatus) {
      throw new Error('KYC not submitted');
    }

    // Update KYC status
    seller.kycStatus.status = 'approved';
    seller.kycStatus.approvedAt = new Date();
    seller.kycStatus.approvedBy = approvedBy;

    // Activate seller account
    seller.status = 'active';

    await seller.save();

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'kyc_approved',
      data: { 
        businessName: seller.businessName,
        sellerCentralUrl: 'https://seller.fixzit.sa/dashboard'
      }
    });

    // Send welcome guide
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'seller_welcome_guide',
      data: { businessName: seller.businessName }
    }, { delay: 3600000 }); // 1 hour delay
  }

  /**
   * Reject seller KYC (Admin action)
   */
  async rejectKYC(sellerId: string, rejectedBy: string, reason: string): Promise<void> {
    const seller = await SouqSeller.findById(sellerId);
    if (!seller) {
      throw new Error('Seller not found');
    }

    if (!seller.kycStatus) {
      throw new Error('KYC not submitted');
    }

    // Update KYC status
    seller.kycStatus.status = 'rejected';
    seller.kycStatus.rejectedAt = new Date();
    seller.kycStatus.rejectedBy = rejectedBy;
    seller.kycStatus.rejectionReason = reason;

    // Keep seller as pending
    seller.status = 'pending';

    await seller.save();

    // Notify seller
    await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
      to: seller.contactEmail,
      template: 'kyc_rejected',
      data: { 
        businessName: seller.businessName,
        reason,
        resubmitUrl: 'https://seller.fixzit.sa/kyc/resubmit'
      }
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
      throw new Error('Seller not found');
    }

    if (!seller.kycStatus) {
      return {
        status: 'not_started',
        step: 'company_info',
        companyInfoComplete: false,
        documentsComplete: false,
        bankDetailsComplete: false,
        canResubmit: false
      };
    }

    const documentsVerification = seller.documents ? {
      commercialRegistration: seller.documents.commercialRegistration?.verified || false,
      vatCertificate: seller.documents.vatCertificate?.verified || false,
      nationalId: seller.documents.nationalId?.verified || false,
      bankLetter: seller.documents.bankLetter?.verified || false
    } : undefined;

    return {
      status: seller.kycStatus.status,
      step: seller.kycStatus.step,
      companyInfoComplete: seller.kycStatus.companyInfoComplete,
      documentsComplete: seller.kycStatus.documentsComplete,
      bankDetailsComplete: seller.kycStatus.bankDetailsComplete,
      documentsVerification,
      canResubmit: seller.kycStatus.status === 'rejected'
    };
  }

  /**
   * Get pending KYC submissions (Admin view)
   */
  async getPendingKYCSubmissions(): Promise<Array<{
    sellerId: string;
    businessName: string;
    submittedAt: Date;
    step: string;
    waitingDays: number;
  }>> {
    const sellers = await SouqSeller.find({
      'kycStatus.status': 'under_review'
    }).sort({ 'kycStatus.submittedAt': 1 });

    return sellers.map(seller => {
      const waitingDays = seller.kycStatus?.submittedAt
        ? Math.floor((Date.now() - seller.kycStatus.submittedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        sellerId: seller._id.toString(),
        businessName: seller.businessName || 'Unknown',
        submittedAt: seller.kycStatus?.submittedAt || new Date(),
        step: seller.kycStatus?.step || 'unknown',
        waitingDays
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
      throw new Error('Invalid CR number format. Must be 10 digits.');
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
    const cleanIBAN = iban.replace(/\s/g, '');

    // Saudi IBAN format: SA + 2 digits + 18 alphanumeric
    if (!/^SA\d{2}[A-Z0-9]{18}$/.test(cleanIBAN)) {
      return false;
    }

    // TODO: Implement MOD-97 checksum validation
    return true;
  }

  /**
   * Background job: Auto-escalate pending KYC reviews
   * Alert if KYC pending for 3+ days
   */
  async autoEscalatePendingKYC(): Promise<number> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const pendingSellers = await SouqSeller.find({
      'kycStatus.status': 'under_review',
      'kycStatus.submittedAt': { $lt: threeDaysAgo }
    });

    let escalated = 0;
    for (const seller of pendingSellers) {
      await addJob(QUEUE_NAMES.NOTIFICATIONS, 'internal-notification', {
        to: 'kyc-manager',
        priority: 'high',
        message: `KYC pending for 3+ days: ${seller.businessName} (${seller._id})`
      }, { priority: 2 });
      escalated++;
    }

    return escalated;
  }
}

export const sellerKYCService = new SellerKYCService();
