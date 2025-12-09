'use client';
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, FileText, Image as ImageIcon, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClaimFormProps {
  orderId: string;
  orderDetails: {
    itemName: string;
    orderAmount: number;
    orderDate: string;
    sellerId: string;
    sellerName: string;
    productId: string; // Added: Required for API payload
  };
  onSuccess?: (_claimId: string) => void;
  onCancel?: () => void;
}

interface EvidenceFile {
  file: File;
  preview?: string;
  type: "photo" | "video" | "document";
}

const CLAIM_TYPES = [
  {
    value: "item_not_received",
    label: "لم أستلم السلعة (Item Not Received)",
    reason: "Item never arrived",
  },
  {
    value: "defective_item",
    label: "السلعة معيبة (Defective Item)",
    reason: "Item is damaged or defective",
  },
  {
    value: "not_as_described",
    label: "لا تطابق الوصف (Not as Described)",
    reason: "Item does not match listing description",
  },
  {
    value: "wrong_item",
    label: "سلعة خاطئة (Wrong Item Sent)",
    reason: "Received incorrect product",
  },
  {
    value: "missing_parts",
    label: "أجزاء ناقصة (Missing Parts)",
    reason: "Item is incomplete or missing components",
  },
  {
    value: "counterfeit",
    label: "سلعة مزيفة (Counterfeit Item)",
    reason: "Suspected counterfeit or fake product",
  },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

export default function ClaimForm({
  orderId,
  orderDetails,
  onSuccess,
  onCancel,
}: ClaimFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimType, setClaimType] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [error, setError] = useState("");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (evidenceFiles.length + files.length > MAX_FILES) {
      setError(
        `يمكنك رفع ${MAX_FILES} ملفات كحد أقصى (Maximum ${MAX_FILES} files)`,
      );
      return;
    }

    const validFiles: EvidenceFile[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} يتجاوز 10MB`);
        return;
      }

      let fileType: "photo" | "video" | "document" = "document";
      if (file.type.startsWith("image/")) {
        fileType = "photo";
      } else if (file.type.startsWith("video/")) {
        fileType = "video";
      }

      const evidenceFile: EvidenceFile = { file, type: fileType };

      // Generate preview for images
      if (fileType === "photo") {
        const reader = new FileReader();
        reader.onload = (e) => {
          evidenceFile.preview = e.target?.result as string;
          setEvidenceFiles((prev) => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      validFiles.push(evidenceFile);
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
    } else {
      setError("");
    }

    setEvidenceFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!claimType) {
      setError("الرجاء اختيار نوع المشكلة (Please select claim type)");
      return;
    }

    if (description.trim().length < 20) {
      setError(
        "الرجاء تقديم وصف تفصيلي (20 حرف على الأقل) - Please provide detailed description (minimum 20 characters)",
      );
      return;
    }

    if (evidenceFiles.length === 0) {
      setError(
        "الرجاء رفع دليل واحد على الأقل (Please upload at least one evidence file)",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload evidence files first
      const evidenceUrls: Array<{
        url: string;
        type: string;
        uploadedBy: string;
      }> = [];

      for (const evidenceFile of evidenceFiles) {
        const formData = new FormData();
        formData.append("file", evidenceFile.file);

        // Upload to your file storage service
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("فشل رفع الملفات (File upload failed)");
        }

        const uploadData = await uploadResponse.json();
        evidenceUrls.push({
          url: uploadData.url,
          type: evidenceFile.type,
          uploadedBy: "buyer",
        });
      }

      // Create claim with all required fields matching API contract
      const selectedClaimType = CLAIM_TYPES.find((t) => t.value === claimType);
      if (!selectedClaimType) {
        throw new Error("Invalid claim type selected");
      }

      const response = await fetch("/api/souq/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          sellerId: orderDetails.sellerId,
          productId: orderDetails.productId,
          type: selectedClaimType.value,
          reason: selectedClaimType.reason, // Auto-fill reason based on type
          description,
          evidence: evidenceUrls,
          orderAmount: orderDetails.orderAmount, // Required number field
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "فشل تقديم المطالبة (Failed to submit claim)",
        );
      }

      const data = await response.json();

      toast({
        title: "تم تقديم المطالبة بنجاح",
        description: `رقم المطالبة: ${data.claimNumber}`,
      });

      if (onSuccess) {
        onSuccess(data.claimId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "خطأ (Error)",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>تقديم مطالبة حماية من الألف إلى الياء</CardTitle>
        <CardDescription>
          A-to-Z Guarantee Claim - نموذج تقديم مطالبة
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Order Details Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">السلعة (Item):</span>
              <span className="text-sm">{orderDetails.itemName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">المبلغ (Amount):</span>
              <span className="text-sm">{orderDetails.orderAmount} SAR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                تاريخ الطلب (Order Date):
              </span>
              <span className="text-sm">
                {new Date(orderDetails.orderDate).toLocaleDateString("ar-SA")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">البائع (Seller):</span>
              <span className="text-sm">{orderDetails.sellerName}</span>
            </div>
          </div>

          {/* Claim Type */}
          <div className="space-y-2">
            <Label htmlFor="claimType">نوع المشكلة (Problem Type) *</Label>
            <Select
              id="claimType"
              value={claimType}
              onValueChange={setClaimType}
              placeholder="اختر نوع المشكلة (Select problem type)"
            >
              {CLAIM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              وصف المشكلة التفصيلي (Detailed Description) *
            </Label>
            <Textarea
              id="description"
              placeholder="الرجاء وصف المشكلة بالتفصيل... (Please describe the problem in detail...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 - الحد الأدنى 20 حرف (Minimum 20
              characters)
            </p>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label>الأدلة الداعمة (Supporting Evidence) *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="evidence"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={evidenceFiles.length >= MAX_FILES}
              />
              <label
                htmlFor="evidence"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <div className="text-sm">
                  <span className="font-medium text-primary">انقر للرفع</span>
                  <span className="text-muted-foreground">
                    {" "}
                    أو اسحب الملفات هنا
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  صور، فيديو، أو مستندات (حتى 10MB لكل ملف)
                  <br />
                  Photos, videos, or documents (up to 10MB per file)
                </p>
              </label>
            </div>

            {/* Uploaded Files */}
            {evidenceFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {evidenceFiles.map((evidence, index) => (
                  <div key={index} className="relative group">
                    <div className="border rounded-lg p-3 bg-muted">
                      {evidence.preview ? (
                        <img
                          src={evidence.preview}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center">
                          {getFileIcon(evidence.type)}
                        </div>
                      )}
                      <p className="text-xs mt-2 truncate">
                        {evidence.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(evidence.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -end-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Important Information */}
          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">
                معلومات هامة (Important Information):
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  سيتم إشعار البائع وسيكون لديه 48 ساعة للرد (Seller will be
                  notified and has 48 hours to respond)
                </li>
                <li>
                  سيتم مراجعة المطالبة خلال 3-5 أيام عمل (Claim will be reviewed
                  within 3-5 business days)
                </li>
                <li>
                  قد نطلب معلومات إضافية أثناء التحقيق (Additional information
                  may be requested during investigation)
                </li>
                <li>
                  سيتم إشعارك بالقرار عبر البريد الإلكتروني والإشعارات (Decision
                  will be communicated via email and notifications)
                </li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            إلغاء (Cancel)
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري التقديم..." : "تقديم المطالبة (Submit Claim)"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
