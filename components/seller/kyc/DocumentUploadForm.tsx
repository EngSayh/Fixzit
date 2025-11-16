'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, X } from 'lucide-react';

interface DocumentFile {
  file: File;
  preview: string;
  uploaded: boolean;
}

interface Props {
  onSubmit: (_data: Record<string, string>) => Promise<void>;
  onBack: () => void;
}

const REQUIRED_DOCUMENTS = [
  { key: 'crCertificate', label: 'Commercial Registration Certificate', required: true },
  { key: 'vatCertificate', label: 'VAT Registration Certificate', required: false },
  { key: 'nationalId', label: 'National ID / Iqama', required: true },
  { key: 'bankLetter', label: 'Bank Account Letter', required: true }
];

export default function DocumentUploadForm({ onSubmit, onBack }: Props) {
  const [documents, setDocuments] = useState<Record<string, DocumentFile | null>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (key: string, file: File | null) => {
    if (!file) {
      setDocuments(prev => ({ ...prev, [key]: null }));
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const preview = URL.createObjectURL(file);
    setDocuments(prev => ({
      ...prev,
      [key]: { file, preview, uploaded: false }
    }));
    setError(null);
  };

  const handleRemove = (key: string) => {
    setDocuments(prev => {
      const newDocs = { ...prev };
      if (newDocs[key]?.preview) {
        URL.revokeObjectURL(newDocs[key]!.preview);
      }
      delete newDocs[key];
      return newDocs;
    });
  };

  const handleSubmit = async () => {
    try {
      setUploading(true);
      setError(null);

      // Validate required documents
      for (const doc of REQUIRED_DOCUMENTS) {
        if (doc.required && !documents[doc.key]) {
          throw new Error(`${doc.label} is required`);
        }
      }

      // In production, upload to S3 and get URLs
      // For now, simulate upload
      const documentUrls: Record<string, string> = {};
      for (const [key, docFile] of Object.entries(documents)) {
        if (docFile) {
          // TODO: Upload to S3 and get presigned URL
          documentUrls[key] = `/uploads/kyc/${Date.now()}-${docFile.file.name}`;
        }
      }

      await onSubmit(documentUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const allRequiredUploaded = REQUIRED_DOCUMENTS
    .filter(doc => doc.required)
    .every(doc => documents[doc.key]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Documents</h2>
        <p className="text-gray-600 mb-6">
          Please upload clear, legible copies of the required documents. 
          Accepted formats: PDF, JPG, PNG (max 10MB each).
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map(doc => {
          const uploaded = documents[doc.key];
          
          return (
            <div key={doc.key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Label className="text-base font-medium">
                    {doc.label} {doc.required && <span className="text-red-500">*</span>}
                  </Label>
                </div>
                {uploaded && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(doc.key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {!uploaded ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG (max 10MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{uploaded.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploaded.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!allRequiredUploaded || uploading}
        >
          {uploading ? 'Uploading...' : 'Continue to Bank Details'}
        </Button>
      </div>
    </div>
  );
}
