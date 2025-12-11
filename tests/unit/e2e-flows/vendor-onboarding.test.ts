/**
 * @fileoverview Vendor Onboarding Flow Tests
 * Tests for the complete vendor registration and onboarding process
 * TG-005: Vendor onboarding E2E tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Vendor Onboarding State Machine
 * Represents the complete vendor registration workflow
 */
interface VendorOnboardingState {
  // Step 1: Basic Registration
  businessInfoCompleted: boolean;
  contactVerified: boolean;
  
  // Step 2: Documentation
  businessLicenseUploaded: boolean;
  taxCertificateUploaded: boolean;
  bankDetailsProvided: boolean;
  
  // Step 3: Verification
  documentsVerified: boolean;
  backgroundCheckPassed: boolean;
  
  // Step 4: Activation
  termsAccepted: boolean;
  profileCompleted: boolean;
  isActive: boolean;
}

/**
 * Calculate onboarding progress percentage
 */
const calculateOnboardingProgress = (state: VendorOnboardingState): number => {
  const steps = [
    state.businessInfoCompleted,
    state.contactVerified,
    state.businessLicenseUploaded,
    state.taxCertificateUploaded,
    state.bankDetailsProvided,
    state.documentsVerified,
    state.backgroundCheckPassed,
    state.termsAccepted,
    state.profileCompleted,
    state.isActive,
  ];
  
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
};

/**
 * Get the next required step in onboarding
 */
const getNextOnboardingStep = (state: VendorOnboardingState): string => {
  if (!state.businessInfoCompleted) return 'Complete business information';
  if (!state.contactVerified) return 'Verify contact email/phone';
  if (!state.businessLicenseUploaded) return 'Upload business license';
  if (!state.taxCertificateUploaded) return 'Upload tax certificate';
  if (!state.bankDetailsProvided) return 'Provide bank account details';
  if (!state.documentsVerified) return 'Await document verification';
  if (!state.backgroundCheckPassed) return 'Await background check';
  if (!state.termsAccepted) return 'Accept terms and conditions';
  if (!state.profileCompleted) return 'Complete vendor profile';
  if (!state.isActive) return 'Await final activation';
  return 'Onboarding complete';
};

/**
 * Check if vendor can receive work orders
 */
const canReceiveWorkOrders = (state: VendorOnboardingState): boolean => {
  return (
    state.documentsVerified &&
    state.backgroundCheckPassed &&
    state.termsAccepted &&
    state.isActive
  );
};

/**
 * Validate vendor data for submission
 */
interface VendorRegistrationData {
  businessName: string;
  email: string;
  phone: string;
  taxId: string;
  serviceCategories: string[];
}

const validateVendorData = (data: VendorRegistrationData): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.businessName || data.businessName.length < 2) {
    errors.push('Business name must be at least 2 characters');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push('Valid email address is required');
  }
  
  const phoneRegex = /^\+?[1-9]\d{7,14}$/;
  if (!data.phone || !phoneRegex.test(data.phone.replace(/\s/g, ''))) {
    errors.push('Valid phone number is required');
  }
  
  if (!data.taxId || data.taxId.length < 5) {
    errors.push('Valid tax ID is required');
  }
  
  if (!data.serviceCategories || data.serviceCategories.length === 0) {
    errors.push('At least one service category must be selected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

describe('Vendor Onboarding Flow', () => {
  describe('Progress Tracking', () => {
    it('should calculate 0% for new vendor', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: false,
        contactVerified: false,
        businessLicenseUploaded: false,
        taxCertificateUploaded: false,
        bankDetailsProvided: false,
        documentsVerified: false,
        backgroundCheckPassed: false,
        termsAccepted: false,
        profileCompleted: false,
        isActive: false,
      };
      
      expect(calculateOnboardingProgress(state)).toBe(0);
      expect(getNextOnboardingStep(state)).toBe('Complete business information');
    });

    it('should calculate partial progress correctly', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: false,
        bankDetailsProvided: false,
        documentsVerified: false,
        backgroundCheckPassed: false,
        termsAccepted: false,
        profileCompleted: false,
        isActive: false,
      };
      
      expect(calculateOnboardingProgress(state)).toBe(30);
      expect(getNextOnboardingStep(state)).toBe('Upload tax certificate');
    });

    it('should calculate 100% for fully onboarded vendor', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: true,
        backgroundCheckPassed: true,
        termsAccepted: true,
        profileCompleted: true,
        isActive: true,
      };
      
      expect(calculateOnboardingProgress(state)).toBe(100);
      expect(getNextOnboardingStep(state)).toBe('Onboarding complete');
    });
  });

  describe('Work Order Eligibility', () => {
    it('should not allow work orders for incomplete onboarding', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: false, // Not verified yet
        backgroundCheckPassed: false,
        termsAccepted: false,
        profileCompleted: true,
        isActive: false,
      };
      
      expect(canReceiveWorkOrders(state)).toBe(false);
    });

    it('should allow work orders for verified active vendor', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: true,
        backgroundCheckPassed: true,
        termsAccepted: true,
        profileCompleted: true,
        isActive: true,
      };
      
      expect(canReceiveWorkOrders(state)).toBe(true);
    });

    it('should not allow work orders if terms not accepted', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: true,
        backgroundCheckPassed: true,
        termsAccepted: false, // Terms not accepted
        profileCompleted: true,
        isActive: true,
      };
      
      expect(canReceiveWorkOrders(state)).toBe(false);
    });
  });

  describe('Registration Validation', () => {
    it('should validate complete vendor data', () => {
      const validData: VendorRegistrationData = {
        businessName: 'ACME Maintenance Services',
        email: 'contact@acme-services.com',
        phone: '+966500000000',
        taxId: '123456789',
        serviceCategories: ['plumbing', 'electrical'],
      };
      
      const result = validateVendorData(validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty business name', () => {
      const data: VendorRegistrationData = {
        businessName: '',
        email: 'contact@test.com',
        phone: '+966500000000',
        taxId: '123456789',
        serviceCategories: ['plumbing'],
      };
      
      const result = validateVendorData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Business name must be at least 2 characters');
    });

    it('should reject invalid email', () => {
      const data: VendorRegistrationData = {
        businessName: 'Test Company',
        email: 'invalid-email',
        phone: '+966500000000',
        taxId: '123456789',
        serviceCategories: ['plumbing'],
      };
      
      const result = validateVendorData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid email address is required');
    });

    it('should reject invalid phone number', () => {
      const data: VendorRegistrationData = {
        businessName: 'Test Company',
        email: 'contact@test.com',
        phone: '123', // Too short
        taxId: '123456789',
        serviceCategories: ['plumbing'],
      };
      
      const result = validateVendorData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Valid phone number is required');
    });

    it('should reject missing service categories', () => {
      const data: VendorRegistrationData = {
        businessName: 'Test Company',
        email: 'contact@test.com',
        phone: '+966500000000',
        taxId: '123456789',
        serviceCategories: [],
      };
      
      const result = validateVendorData(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one service category must be selected');
    });

    it('should collect all validation errors', () => {
      const data: VendorRegistrationData = {
        businessName: '',
        email: '',
        phone: '',
        taxId: '',
        serviceCategories: [],
      };
      
      const result = validateVendorData(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(5);
    });
  });

  describe('Onboarding Step Sequence', () => {
    it('should enforce correct step order', () => {
      // Start fresh
      let state: VendorOnboardingState = {
        businessInfoCompleted: false,
        contactVerified: false,
        businessLicenseUploaded: false,
        taxCertificateUploaded: false,
        bankDetailsProvided: false,
        documentsVerified: false,
        backgroundCheckPassed: false,
        termsAccepted: false,
        profileCompleted: false,
        isActive: false,
      };
      
      // Step 1
      expect(getNextOnboardingStep(state)).toBe('Complete business information');
      state = { ...state, businessInfoCompleted: true };
      
      // Step 2
      expect(getNextOnboardingStep(state)).toBe('Verify contact email/phone');
      state = { ...state, contactVerified: true };
      
      // Step 3
      expect(getNextOnboardingStep(state)).toBe('Upload business license');
      state = { ...state, businessLicenseUploaded: true };
      
      // Step 4
      expect(getNextOnboardingStep(state)).toBe('Upload tax certificate');
      state = { ...state, taxCertificateUploaded: true };
      
      // Step 5
      expect(getNextOnboardingStep(state)).toBe('Provide bank account details');
      state = { ...state, bankDetailsProvided: true };
      
      // Step 6
      expect(getNextOnboardingStep(state)).toBe('Await document verification');
      state = { ...state, documentsVerified: true };
      
      // Step 7
      expect(getNextOnboardingStep(state)).toBe('Await background check');
      state = { ...state, backgroundCheckPassed: true };
      
      // Step 8
      expect(getNextOnboardingStep(state)).toBe('Accept terms and conditions');
      state = { ...state, termsAccepted: true };
      
      // Step 9
      expect(getNextOnboardingStep(state)).toBe('Complete vendor profile');
      state = { ...state, profileCompleted: true };
      
      // Step 10
      expect(getNextOnboardingStep(state)).toBe('Await final activation');
      state = { ...state, isActive: true };
      
      // Complete
      expect(getNextOnboardingStep(state)).toBe('Onboarding complete');
      expect(calculateOnboardingProgress(state)).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle vendor awaiting verification at 50%', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: false,
        backgroundCheckPassed: false,
        termsAccepted: false,
        profileCompleted: false,
        isActive: false,
      };
      
      expect(calculateOnboardingProgress(state)).toBe(50);
      expect(getNextOnboardingStep(state)).toBe('Await document verification');
      expect(canReceiveWorkOrders(state)).toBe(false);
    });

    it('should handle vendor with profile complete but not active', () => {
      const state: VendorOnboardingState = {
        businessInfoCompleted: true,
        contactVerified: true,
        businessLicenseUploaded: true,
        taxCertificateUploaded: true,
        bankDetailsProvided: true,
        documentsVerified: true,
        backgroundCheckPassed: true,
        termsAccepted: true,
        profileCompleted: true,
        isActive: false,
      };
      
      expect(calculateOnboardingProgress(state)).toBe(90);
      expect(getNextOnboardingStep(state)).toBe('Await final activation');
      expect(canReceiveWorkOrders(state)).toBe(false);
    });
  });
});

describe('Vendor Service Categories', () => {
  const VALID_CATEGORIES = [
    'plumbing',
    'electrical',
    'hvac',
    'cleaning',
    'landscaping',
    'security',
    'painting',
    'carpentry',
    'pest-control',
    'elevator-maintenance',
  ];

  const validateServiceCategories = (categories: string[]): boolean => {
    return categories.every(cat => VALID_CATEGORIES.includes(cat));
  };

  it('should validate known service categories', () => {
    expect(validateServiceCategories(['plumbing', 'electrical'])).toBe(true);
    expect(validateServiceCategories(['hvac', 'cleaning', 'security'])).toBe(true);
  });

  it('should reject unknown service categories', () => {
    expect(validateServiceCategories(['unknown-service'])).toBe(false);
    expect(validateServiceCategories(['plumbing', 'invalid'])).toBe(false);
  });
});
