"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  User,
  Building2,
  FileText,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export type OnboardingRole = "TENANT" | "PROPERTY_OWNER" | "OWNER" | "VENDOR" | "AGENT";

export interface OnboardingWizardProps {
  role?: OnboardingRole;
  caseId?: string;
  initialStep?: number;
  onComplete?: (caseId: string) => void;
  className?: string;
}

interface StepConfig {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  {
    id: "role",
    title: "Select Your Role",
    titleAr: "اختر دورك",
    description: "Tell us how you'll be using Fixzit",
    descriptionAr: "أخبرنا كيف ستستخدم فيكزت",
    icon: User,
  },
  {
    id: "profile",
    title: "Your Information",
    titleAr: "معلوماتك",
    description: "Basic details to set up your account",
    descriptionAr: "التفاصيل الأساسية لإعداد حسابك",
    icon: Building2,
  },
  {
    id: "documents",
    title: "Documents",
    titleAr: "المستندات",
    description: "Upload required verification documents",
    descriptionAr: "تحميل مستندات التحقق المطلوبة",
    icon: FileText,
  },
  {
    id: "review",
    title: "Review & Submit",
    titleAr: "مراجعة وإرسال",
    description: "Confirm your details and submit",
    descriptionAr: "تأكيد تفاصيلك وإرسال",
    icon: CheckCircle,
  },
];

const ROLE_OPTIONS: Array<{
  value: OnboardingRole;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
}> = [
  {
    value: "TENANT",
    label: "Tenant",
    labelAr: "مستأجر",
    description: "I rent a property and need maintenance services",
    descriptionAr: "أنا أستأجر عقاراً وأحتاج خدمات الصيانة",
  },
  {
    value: "PROPERTY_OWNER",
    label: "Property Owner",
    labelAr: "مالك عقار",
    description: "I own properties and want to manage them",
    descriptionAr: "أملك عقارات وأريد إدارتها",
  },
  {
    value: "OWNER",
    label: "Corporate Owner",
    labelAr: "مالك مؤسسي",
    description: "I manage properties for a company",
    descriptionAr: "أدير عقارات لشركة",
  },
  {
    value: "VENDOR",
    label: "Service Vendor",
    labelAr: "مقدم خدمات",
    description: "I provide maintenance or services",
    descriptionAr: "أقدم خدمات الصيانة أو غيرها",
  },
  {
    value: "AGENT",
    label: "Real Estate Agent",
    labelAr: "وكيل عقاري",
    description: "I help clients buy, sell, or rent properties",
    descriptionAr: "أساعد العملاء في شراء أو بيع أو استئجار العقارات",
  },
];

const REQUIRED_DOCS: Record<OnboardingRole, string[]> = {
  TENANT: ["National ID/Iqama", "Lease Agreement"],
  PROPERTY_OWNER: ["National ID/Iqama", "Property Deed"],
  OWNER: ["Commercial Registration", "Authorization Letter", "National ID/Iqama"],
  VENDOR: ["Commercial Registration", "VAT Certificate", "Trade License"],
  AGENT: ["National ID/Iqama", "REGA License"],
};

export default function OnboardingWizard({
  role: initialRole,
  caseId: existingCaseId,
  initialStep = 1,
  onComplete,
  className,
}: OnboardingWizardProps) {
  const { t, isRTL } = useTranslation();
  const router = useRouter();
  const { data: session } = useSession();

  // State
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [caseId, setCaseId] = useState(existingCaseId);

  // Form data
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | undefined>(initialRole);
  const [basicInfo, setBasicInfo] = useState({
    name: (session?.user as { name?: string })?.name || "",
    email: (session?.user as { email?: string })?.email || "",
    phone: "",
    companyName: "",
    address: "",
    country: "SA",
  });
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

  // Load existing case data
  const loadCaseData = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/onboarding/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRole(data.role);
        setBasicInfo((prev) => ({ ...prev, ...data.basic_info }));
        setPayload(data.payload || {});
        setCurrentStep(data.current_step || 1);
        if (Array.isArray(data.documents)) {
          const map: Record<string, string> = {};
          for (const doc of data.documents) {
            if (typeof doc === "string") {
              map[doc] = doc;
            } else if (doc?.documentType && doc?.documentId) {
              map[doc.documentType] = doc.documentId;
            }
          }
          setUploadedDocs(map);
        }
      }
    } catch (_error) {
      // Silent fail - case data will be loaded on retry
    }
  }, [session?.user]);

  useEffect(() => {
    if (existingCaseId) {
      loadCaseData(existingCaseId);
    }
  }, [existingCaseId, loadCaseData]);

  const progress = (currentStep / STEPS.length) * 100;

  const validateProfileStep = useCallback(() => {
    if (!basicInfo.name.trim()) {
      toast.error(isRTL ? "الرجاء إدخال الاسم" : "Please enter your name");
      return false;
    }
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(basicInfo.email.trim())) {
      toast.error(isRTL ? "الرجاء إدخال بريد إلكتروني صالح" : "Please enter a valid email");
      return false;
    }
    if (
      (selectedRole === "OWNER" || selectedRole === "VENDOR") &&
      !basicInfo.companyName.trim()
    ) {
      toast.error(isRTL ? "اسم الشركة مطلوب" : "Company name is required");
      return false;
    }
    if (basicInfo.phone.trim()) {
      const phonePattern = /^\+?\d{7,15}$/;
      if (!phonePattern.test(basicInfo.phone.trim())) {
        toast.error(isRTL ? "الرجاء إدخال رقم هاتف صالح" : "Please enter a valid phone number");
        return false;
      }
    }
    return true;
  }, [basicInfo, isRTL, selectedRole]);

  const ensureRequiredDocs = useCallback(() => {
    if (!selectedRole) return true;
    const requiredDocs = REQUIRED_DOCS[selectedRole] || [];
    const missingDocs = requiredDocs.filter((doc) => !uploadedDocs[doc]);
    if (missingDocs.length > 0) {
      toast.error(
        isRTL
          ? "يرجى تحميل جميع المستندات المطلوبة قبل الإرسال"
          : "Please upload all required documents before submitting",
      );
      return false;
    }
    return true;
  }, [isRTL, selectedRole, uploadedDocs]);

  // Navigate between steps
  const nextStep = useCallback(async () => {
    if (currentStep === 1 && !selectedRole) {
      toast.error(isRTL ? "الرجاء اختيار دورك" : "Please select your role");
      return;
    }

    if (currentStep === 1 && !caseId) {
      if (!validateProfileStep()) return;
      // Create case on first step completion
      setIsLoading(true);
      try {
        const res = await fetch("/api/onboarding/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: selectedRole,
            basic_info: {
              name: basicInfo.name || session?.user?.name || "User",
              email: basicInfo.email || session?.user?.email || "",
            },
            country: basicInfo.country,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to initiate onboarding");
        }

        const data = await res.json();
        setCaseId(data.id);
        setCurrentStep(2);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to start onboarding"
        );
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Validate profile before moving past profile/doc steps
    if (currentStep === 2 && !validateProfileStep()) {
      return;
    }

    // Save progress for subsequent steps
    if (caseId) {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/onboarding/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basic_info: basicInfo,
            payload,
            current_step: currentStep + 1,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to save progress");
        }
        setCurrentStep((s) => Math.min(s + 1, STEPS.length));
      } catch (_error) {
        toast.error(
          isRTL ? "فشل في حفظ التقدم" : "Failed to save progress",
        );
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentStep, selectedRole, caseId, basicInfo, payload, session, isRTL, validateProfileStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  // Submit final step
  const handleSubmit = useCallback(async () => {
    if (!caseId) return;
    if (!validateProfileStep()) return;
    if (!ensureRequiredDocs()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/onboarding/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SUBMITTED",
          current_step: 4,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      toast.success(
        isRTL
          ? "تم إرسال طلبك بنجاح. سنراجعه قريباً."
          : "Your application has been submitted. We'll review it shortly."
      );

      if (onComplete) {
        onComplete(caseId);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit application"
      );
    } finally {
      setIsLoading(false);
    }
  }, [caseId, isRTL, onComplete, router, validateProfileStep, ensureRequiredDocs]);

  // Document upload handler
  const handleDocUpload = async (docType: string, file: File) => {
    if (!caseId) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(
        isRTL ? "حجم الملف يتجاوز 5 ميغابايت" : "File size exceeds 5MB limit",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", docType);

    try {
      const res = await fetch(
        `/api/onboarding/${caseId}/documents/request-upload`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentType: docType,
            fileName: file.name,
            mimeType: file.type,
          }),
        }
      );

      if (res.ok) {
        const { uploadUrl, documentId } = await res.json();
        // Upload to presigned URL (S3)
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) {
          throw new Error("upload_failed");
        }

        // Confirm upload
        await fetch(`/api/onboarding/${caseId}/documents/confirm-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        setUploadedDocs((prev) => ({ ...prev, [docType]: documentId }));
        toast.success(
          isRTL ? `تم تحميل ${docType} بنجاح` : `${docType} uploaded successfully`
        );
      }
    } catch (_error) {
      toast.error(isRTL ? "فشل تحميل المستند" : "Failed to upload document");
    }
  };

  // Step content renderers
  const renderRoleStep = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {ROLE_OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              selectedRole === option.value && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setSelectedRole(option.value)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {isRTL ? option.labelAr : option.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {isRTL ? option.descriptionAr : option.description}
              </p>
            </CardContent>
            {selectedRole === option.value && (
              <div className="absolute top-3 end-3">
                <Check className="h-5 w-5 text-primary" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );

  const renderProfileStep = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("onboarding.name", "Full Name")}</Label>
          <Input
            id="name"
            value={basicInfo.name}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={isRTL ? "الاسم الكامل" : "Enter your full name"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("onboarding.email", "Email")}</Label>
          <Input
            id="email"
            type="email"
            value={basicInfo.email}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, email: e.target.value }))}
            placeholder={isRTL ? "البريد الإلكتروني" : "Enter your email"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t("onboarding.phone", "Phone Number")}</Label>
          <Input
            id="phone"
            type="tel"
            value={basicInfo.phone}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={isRTL ? "رقم الهاتف" : "+966 5XX XXX XXXX"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">{t("onboarding.country", "Country")}</Label>
          <Select
            value={basicInfo.country}
            onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, country: value }))}
          >
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SA">{isRTL ? "المملكة العربية السعودية" : "Saudi Arabia"}</SelectItem>
              <SelectItem value="AE">{isRTL ? "الإمارات العربية المتحدة" : "UAE"}</SelectItem>
              <SelectItem value="KW">{isRTL ? "الكويت" : "Kuwait"}</SelectItem>
              <SelectItem value="BH">{isRTL ? "البحرين" : "Bahrain"}</SelectItem>
              <SelectItem value="OM">{isRTL ? "عمان" : "Oman"}</SelectItem>
              <SelectItem value="QA">{isRTL ? "قطر" : "Qatar"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(selectedRole === "OWNER" || selectedRole === "VENDOR") && (
        <div className="space-y-2">
          <Label htmlFor="companyName">
            {t("onboarding.companyName", "Company Name")}
          </Label>
          <Input
            id="companyName"
            value={basicInfo.companyName}
            onChange={(e) => setBasicInfo((prev) => ({ ...prev, companyName: e.target.value }))}
            placeholder={isRTL ? "اسم الشركة" : "Enter company name"}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="address">{t("onboarding.address", "Address")}</Label>
        <Textarea
          id="address"
          value={basicInfo.address}
          onChange={(e) => setBasicInfo((prev) => ({ ...prev, address: e.target.value }))}
          placeholder={isRTL ? "العنوان" : "Enter your address"}
          rows={2}
        />
      </div>

      {selectedRole === "VENDOR" && (
        <div className="space-y-2">
          <Label>{t("onboarding.serviceCategories", "Service Categories")}</Label>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? "اختر فئات الخدمات التي تقدمها"
              : "Select the service categories you provide"}
          </p>
          {/* Service category multi-select would go here */}
        </div>
      )}
    </div>
  );

  const renderDocumentsStep = () => {
    const requiredDocs = selectedRole ? REQUIRED_DOCS[selectedRole] : [];

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {isRTL
            ? "يرجى تحميل المستندات المطلوبة للتحقق من هويتك"
            : "Please upload the required documents to verify your identity"}
        </p>

        <div className="space-y-4">
          {requiredDocs.map((docType) => (
            <Card key={docType} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{docType}</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, or PNG (max 5MB)
                    </p>
                  </div>
                </div>
                <div>
                  {uploadedDocs[docType] ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-sm">{isRTL ? "تم التحميل" : "Uploaded"}</span>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocUpload(docType, file);
                        }}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 me-2" />
                          {isRTL ? "تحميل" : "Upload"}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">
            {isRTL ? "الدور" : "Role"}
          </h4>
          <p className="font-medium">
            {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.[isRTL ? "labelAr" : "label"]}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? "الاسم" : "Name"}
            </h4>
            <p>{basicInfo.name}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? "البريد الإلكتروني" : "Email"}
            </h4>
            <p>{basicInfo.email}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? "الهاتف" : "Phone"}
            </h4>
            <p>{basicInfo.phone || "-"}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? "البلد" : "Country"}
            </h4>
            <p>{basicInfo.country}</p>
          </div>
        </div>

        {basicInfo.companyName && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground">
              {isRTL ? "الشركة" : "Company"}
            </h4>
            <p>{basicInfo.companyName}</p>
          </div>
        )}

        <div>
          <h4 className="font-medium text-sm text-muted-foreground">
            {isRTL ? "المستندات المحملة" : "Uploaded Documents"}
          </h4>
          <p>
            {Object.keys(uploadedDocs).length} / {selectedRole ? REQUIRED_DOCS[selectedRole].length : 0}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {isRTL
          ? "بالنقر على إرسال، أنت توافق على شروط الخدمة وسياسة الخصوصية."
          : "By clicking Submit, you agree to our Terms of Service and Privacy Policy."}
      </p>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderRoleStep();
      case 2:
        return renderProfileStep();
      case 3:
        return renderDocumentsStep();
      case 4:
        return renderReviewStep();
      default:
        return null;
    }
  };

  const currentStepConfig = STEPS[currentStep - 1];
  const StepIcon = currentStepConfig?.icon || User;

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const stepNum = index + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1",
                  isActive && "text-primary",
                  isCompleted && "text-green-600",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                    isActive && "border-primary bg-primary/10",
                    isCompleted && "border-green-600 bg-green-600 text-white",
                    !isActive && !isCompleted && "border-muted"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-xs hidden sm:block">
                  {isRTL ? step.titleAr : step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>
                {isRTL ? currentStepConfig.titleAr : currentStepConfig.title}
              </CardTitle>
              <CardDescription>
                {isRTL ? currentStepConfig.descriptionAr : currentStepConfig.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1 || isLoading}
        >
          {isRTL ? (
            <>
              <ChevronRight className="h-4 w-4 me-2" />
              {t("onboarding.previous", "السابق")}
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 me-2" />
              {t("onboarding.previous", "Previous")}
            </>
          )}
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={nextStep} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t("onboarding.next", isRTL ? "التالي" : "Next")}
            {isRTL ? (
              <ChevronLeft className="h-4 w-4 ms-2" />
            ) : (
              <ChevronRight className="h-4 w-4 ms-2" />
            )}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t("onboarding.submit", isRTL ? "إرسال" : "Submit")}
          </Button>
        )}
      </div>
    </div>
  );
}
