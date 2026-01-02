"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, X } from "@/components/ui/icons";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

interface DocumentFile {
  file: File;
  preview: string;
  uploaded: boolean;
}

interface Props {
  onSubmit: (data: KYCDocumentsPayload) => Promise<void>;
  onBack: () => void;
}

type KYCDocumentKey =
  | "commercialRegistration"
  | "vatCertificate"
  | "nationalId"
  | "bankLetter";

type KYCDocumentPayload = {
  fileUrl: string;
  fileType: "pdf" | "jpg" | "png" | "heic" | "heif";
  uploadedAt?: string;
  verified: boolean;
  fileKey?: string;
};

type KYCDocumentsPayload = {
  commercialRegistration: KYCDocumentPayload;
  nationalId: KYCDocumentPayload;
  bankLetter: KYCDocumentPayload;
  vatCertificate?: KYCDocumentPayload;
};

const REQUIRED_DOCUMENTS: Array<{
  key: KYCDocumentKey;
  label: string;
  required: boolean;
}> = [
  {
    key: "commercialRegistration",
    label: "Commercial Registration Certificate",
    required: true,
  },
  {
    key: "vatCertificate",
    label: "VAT Registration Certificate",
    required: false,
  },
  { key: "nationalId", label: "National ID / Iqama", required: true },
  { key: "bankLetter", label: "Bank Account Letter", required: true },
];

export default function DocumentUploadForm({ onSubmit, onBack }: Props) {
  const [documents, setDocuments] = useState<
    Partial<Record<KYCDocumentKey, DocumentFile | null>>
  >({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auto = useAutoTranslator("seller.kyc.documents");
  const fileTypeError = auto(
    "Only PDF, JPG, PNG, HEIC, and HEIF files are allowed",
    "errors.fileType",
  );
  const fileSizeError = auto(
    "File size must be less than 10MB",
    "errors.fileSize",
  );
  const submitError = auto("Failed to upload documents", "errors.submitFailed");
  const requiredDocError = auto(
    "{{label}} is required",
    "errors.requiredDocument",
  );
  const docLabel = (
    key: (typeof REQUIRED_DOCUMENTS)[number]["key"],
    fallback: string,
  ) => auto(fallback, `documents.${key}.label`);

  const normalizeFileType = (mime: string): KYCDocumentPayload["fileType"] => {
    if (mime === "application/pdf") return "pdf";
    if (mime === "image/png") return "png";
    if (mime === "image/heic") return "heic";
    if (mime === "image/heif") return "heif";
    return "jpg";
  };

  const handleFileChange = (key: KYCDocumentKey, file: File | null) => {
    if (!file) {
      setDocuments((prev) => ({ ...prev, [key]: null }));
      return;
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/heic",
      "image/heif",
    ];
    if (!validTypes.includes(file.type)) {
      setError(fileTypeError);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(fileSizeError);
      return;
    }

    const preview = URL.createObjectURL(file);
    setDocuments((prev) => ({
      ...prev,
      [key]: { file, preview, uploaded: false },
    }));
    setError(null);
  };

  const handleRemove = (key: KYCDocumentKey) => {
    setDocuments((prev) => {
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
          const label = docLabel(doc.key, doc.label);
          throw new Error(requiredDocError.replace("{{label}}", label));
        }
      }

      const documentPayload: Partial<KYCDocumentsPayload> = {};
      for (const [key, docFile] of Object.entries(documents)) {
        const docKey = key as KYCDocumentKey;
        if (!docFile) continue;

        // Step 1: Request presigned URL
        const presignRes = await fetch("/api/upload/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: docFile.file.name,
            fileType: docFile.file.type,
            fileSize: docFile.file.size,
            category: "kyc",
          }),
        });
        if (!presignRes.ok) {
          throw new Error(await presignRes.text());
        }
        const presign = await presignRes.json();

        // Step 2: Upload file to S3 using PUT presigned URL
        const putHeaders: Record<string, string> = {
          ...(presign.uploadHeaders ?? {}),
          "Content-Type": docFile.file.type || "application/octet-stream",
        };

        const putRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: putHeaders,
          body: docFile.file,
        });
        if (!putRes.ok) {
          throw new Error("Failed to upload document");
        }

        // Store public URL (strip query params)
        const publicUrl = presign.uploadUrl.split("?")[0];
        const fileType = normalizeFileType(docFile.file.type);
        const payload: KYCDocumentPayload = {
          fileUrl: publicUrl,
          fileType,
          uploadedAt: new Date().toISOString(),
          verified: false,
          fileKey: presign.key,
        };

        if (docKey === "vatCertificate") {
          documentPayload.vatCertificate = payload;
        } else if (docKey === "commercialRegistration") {
          documentPayload.commercialRegistration = payload;
        } else if (docKey === "nationalId") {
          documentPayload.nationalId = payload;
        } else if (docKey === "bankLetter") {
          documentPayload.bankLetter = payload;
        }
      }

      if (
        !documentPayload.commercialRegistration ||
        !documentPayload.nationalId ||
        !documentPayload.bankLetter
      ) {
        throw new Error(submitError);
      }

      await onSubmit(documentPayload as KYCDocumentsPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : submitError);
    } finally {
      setUploading(false);
    }
  };

  const allRequiredUploaded = REQUIRED_DOCUMENTS.filter(
    (doc) => doc.required,
  ).every((doc) => documents[doc.key]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {auto("Upload Documents", "header.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {auto(
            "Please upload clear, legible copies of the required documents. Accepted formats: PDF, JPG, PNG, HEIC, HEIF (max 10MB each).",
            "header.description",
          )}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploaded = documents[doc.key];

          return (
            <div key={doc.key} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Label className="text-base font-medium">
                    {docLabel(doc.key, doc.label)}{" "}
                    {doc.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                </div>
                {uploaded && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(doc.key)}
                    aria-label={auto("Remove document", "actions.remove")}
                    title={auto("Remove document", "actions.remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {!uploaded ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {auto(
                        "Click to upload or drag and drop",
                        "upload.instructions",
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {auto("PDF, JPG, PNG, HEIC, HEIF (max 10MB)", "upload.formats")}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
                    onChange={(e) =>
                      handleFileChange(doc.key, e.target.files?.[0] || null)
                    }
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-success/5 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {uploaded.file.name}
                    </p>
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
        <Button type="button" variant="outline" onClick={onBack} aria-label={auto("Back", "actions.back")}>
          {auto("Back", "actions.back")}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!allRequiredUploaded || uploading}
          aria-label={uploading ? auto("Uploading...", "actions.uploading") : auto("Continue to Bank Details", "actions.next")}
        >
          {uploading
            ? auto("Uploading...", "actions.uploading")
            : auto("Continue to Bank Details", "actions.next")}
        </Button>
      </div>
    </div>
  );
}
