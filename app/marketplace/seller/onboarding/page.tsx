'use client';

import { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, Upload, FileText, CreditCard, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FileUpload {
  file: File | null;
  preview: string | null;
  error: string | null;
}

export default function SellerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    taxId: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    iban: '',
  });
  const [documents, setDocuments] = useState<{
    commercialRegistration: FileUpload;
    taxCertificate: FileUpload;
  }>({
    commercialRegistration: { file: null, preview: null, error: null },
    taxCertificate: { file: null, preview: null, error: null },
  });
  
  const commercialRegRef = useRef<HTMLInputElement>(null);
  const taxCertRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return !!(formData.businessName && formData.businessType && formData.taxId);
      case 2:
        return !!(formData.contactName && formData.email && formData.phone && formData.address);
      case 3:
        return !!(documents.commercialRegistration.file && documents.taxCertificate.file);
      case 4:
        return !!(formData.bankName && formData.accountNumber && formData.iban);
      default:
        return false;
    }
  };

  const handleFileChange = (type: 'commercialRegistration' | 'taxCertificate', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setDocuments(prev => ({
        ...prev,
        [type]: { file: null, preview: null, error: 'Invalid file type. Please upload PDF, JPG, or PNG.' }
      }));
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setDocuments(prev => ({
        ...prev,
        [type]: { file: null, preview: null, error: 'File too large. Maximum size is 5MB.' }
      }));
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setDocuments(prev => ({
      ...prev,
      [type]: { file, preview, error: null }
    }));
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      setSubmitError('Please fill in all required fields before proceeding.');
      return;
    }
    setSubmitError(null);
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // In production, upload files first and get URLs
      const response = await fetch('/api/souq/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          documents: {
            commercialRegistration: documents.commercialRegistration.file?.name,
            taxCertificate: documents.taxCertificate.file?.name,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Onboarding failed');
      }
      
      router.push('/marketplace/vendor/portal');
    } catch (error) {
      console.error('Onboarding error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to complete onboarding. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 4 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      s < step ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className={step === 1 ? 'font-semibold' : 'text-muted-foreground'}>Business Info</span>
            <span className={step === 2 ? 'font-semibold' : 'text-muted-foreground'}>Contact Details</span>
            <span className={step === 3 ? 'font-semibold' : 'text-muted-foreground'}>KYC Documents</span>
            <span className={step === 4 ? 'font-semibold' : 'text-muted-foreground'}>Banking</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1 && 'Business Information'}
              {step === 2 && 'Contact Details'}
              {step === 3 && 'KYC Documents'}
              {step === 4 && 'Banking Information'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Business Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Type *</label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select type</option>
                    <option value="sole_proprietor">Sole Proprietor</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tax ID / Commercial Registration *</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Contact Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name *</label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Business Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Step 3: KYC Documents */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium mb-2">Upload Commercial Registration</p>
                  <p className="text-xs text-muted-foreground mb-4">PDF, JPG, PNG (Max 5MB)</p>
                  <input
                    ref={commercialRegRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('commercialRegistration', e)}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => commercialRegRef.current?.click()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Choose File
                  </button>
                  {documents.commercialRegistration.file && (
                    <p className="text-sm text-green-600 mt-2">✓ {documents.commercialRegistration.file.name}</p>
                  )}
                  {documents.commercialRegistration.error && (
                    <p className="text-sm text-red-600 mt-2">{documents.commercialRegistration.error}</p>
                  )}
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium mb-2">Upload Tax Certificate</p>
                  <p className="text-xs text-muted-foreground mb-4">PDF, JPG, PNG (Max 5MB)</p>
                  <input
                    ref={taxCertRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange('taxCertificate', e)}
                    className="hidden"
                  />
                  <button 
                    type="button"
                    onClick={() => taxCertRef.current?.click()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Choose File
                  </button>
                  {documents.taxCertificate.file && (
                    <p className="text-sm text-green-600 mt-2">✓ {documents.taxCertificate.file.name}</p>
                  )}
                  {documents.taxCertificate.error && (
                    <p className="text-sm text-red-600 mt-2">{documents.taxCertificate.error}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Banking */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-600">Secure banking information for settlement payments</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bank Name *</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Account Number *</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">IBAN *</label>
                  <input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {/* Error Display */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={step === 1 || submitting}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
