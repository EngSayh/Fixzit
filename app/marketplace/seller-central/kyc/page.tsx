'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import CompanyInfoForm from '@/components/seller/kyc/CompanyInfoForm';
import DocumentUploadForm from '@/components/seller/kyc/DocumentUploadForm';
import BankDetailsForm from '@/components/seller/kyc/BankDetailsForm';
import KYCProgress from '@/components/seller/kyc/KYCProgress';

type Step = 'company_info' | 'documents' | 'bank_details' | 'verification';

interface KYCStatus {
  status: 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected';
  currentStep: Step;
  completedSteps: Step[];
  companyInfoCompleted: boolean;
  documentsCompleted: boolean;
  bankDetailsCompleted: boolean;
  rejectionReason?: string;
}

export default function SellerKYCPage() {
  const [currentStep, setCurrentStep] = useState<Step>('company_info');
  const [kycStatus, setKYCStatus] = useState<KYCStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/souq/seller-central/kyc/status');
      if (!response.ok) throw new Error('Failed to fetch KYC status');
      const { success, ...status } = await response.json();
      setKYCStatus(status);
      setCurrentStep(status.currentStep || 'company_info');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (step: Step, data: unknown) => {
    try {
      const response = await fetch('/api/souq/seller-central/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit KYC');
      }

      const result = await response.json();
      
      // Move to next step
      if (result.nextStep && result.nextStep !== 'verification') {
        setCurrentStep(result.nextStep as Step);
      }
      
      // Refresh status
      await fetchKYCStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KYC status...</p>
        </div>
      </div>
    );
  }

  // KYC Approved
  if (kycStatus?.status === 'approved') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Approved!</h1>
          <p className="text-gray-600 mb-6">
            Your seller account has been verified and approved. You can now start listing products.
          </p>
          <Button onClick={() => window.location.href = '/marketplace/seller-central/dashboard'}>
            Go to Seller Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // KYC Rejected
  if (kycStatus?.status === 'rejected') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">KYC Rejected</h1>
            <p className="text-gray-600">
              Your KYC submission was rejected. Please review the reason and resubmit.
            </p>
          </div>
          
          {kycStatus.rejectionReason && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>
                <strong>Rejection Reason:</strong> {kycStatus.rejectionReason}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={() => {
              setKYCStatus({ ...kycStatus, status: 'pending' });
              setCurrentStep('company_info');
            }}
            className="w-full"
          >
            Resubmit KYC
          </Button>
        </Card>
      </div>
    );
  }

  // KYC Under Review
  if (kycStatus?.status === 'under_review') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <Circle className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Under Review</h1>
          <p className="text-gray-600 mb-6">
            Your KYC submission is currently being reviewed by our team. 
            This typically takes 24-48 hours.
          </p>
          <p className="text-sm text-gray-500">
            We'll notify you via email once the review is complete.
          </p>
        </Card>
      </div>
    );
  }

  // KYC Form
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Verification (KYC)</h1>
          <p className="text-gray-600">
            Complete the following steps to verify your seller account and start selling.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <KYCProgress 
          currentStep={currentStep}
          completedSteps={kycStatus?.completedSteps || []}
        />

        <Card className="p-6 mt-6">
          {currentStep === 'company_info' && (
            <CompanyInfoForm 
              onSubmit={(data) => handleStepComplete('company_info', data)}
            />
          )}

          {currentStep === 'documents' && (
            <DocumentUploadForm 
              onSubmit={(data) => handleStepComplete('documents', data)}
              onBack={() => setCurrentStep('company_info')}
            />
          )}

          {currentStep === 'bank_details' && (
            <BankDetailsForm 
              onSubmit={(data) => handleStepComplete('bank_details', data)}
              onBack={() => setCurrentStep('documents')}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
