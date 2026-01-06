/**
 * Lease Contract Types (Ejar Integration)
 * @module types/contract
 * @description Ejar lease contract management for Fixzit Souq Phase 2
 */

import type { ObjectId } from "mongodb";

// ============================================================================
// Contract Core Types
// ============================================================================

export type ContractType = "residential" | "commercial";
export type LessorType = "owner" | "agent";
export type ContractStatus = 
  | "draft" 
  | "pending_documents" 
  | "pending_info" 
  | "pending_payment" 
  | "pending_review"
  | "pending_license" 
  | "licensed" 
  | "expired" 
  | "terminated"
  | "rejected";

export type PaymentFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";

export interface IOwnershipDocument {
  deed_url?: string;
  deed_number?: string;
  power_of_attorney_url?: string;
  commercial_registration_url?: string;
  commercial_registration_number?: string;
  verified?: boolean;
  verified_at?: Date;
}

export interface IContractParty {
  name: string;
  name_ar?: string;
  national_id: string;
  phone: string;
  email?: string;
  address?: string;
  nationality?: string;
  iqama_number?: string; // For non-Saudi residents
}

export interface IPropertyDetails {
  type: string;
  type_ar?: string;
  address: string;
  address_ar?: string;
  city: string;
  district?: string;
  neighborhood?: string;
  area_sqm: number;
  rooms?: number;
  bathrooms?: number;
  floor_number?: number;
  building_number?: string;
  unit_number?: string;
  postal_code?: string;
  additional_info?: string;
}

export interface IRentalInfo {
  annual_rent: number; // In SAR
  payment_frequency: PaymentFrequency;
  start_date: Date;
  end_date: Date;
  deposit?: number;
  utilities_included: boolean;
  electricity_account?: string;
  water_account?: string;
  maintenance_included: boolean;
  maintenance_details?: string;
  special_conditions?: string;
}

export interface ILeaseContract {
  _id?: ObjectId | string;
  org_id: ObjectId | string;
  created_by: ObjectId | string;
  
  // Contract Type
  contract_type: ContractType;
  ejar_reference?: string; // Government reference number
  
  // Ownership
  lessor_type: LessorType;
  ownership_document: IOwnershipDocument;
  
  // Parties
  lessor: IContractParty;
  lessee: IContractParty;
  
  // Property
  property_id?: ObjectId | string;
  property_details: IPropertyDetails;
  
  // Rental Terms
  rental_info: IRentalInfo;
  
  // Wizard State
  current_step: number;
  completed_steps: number[];
  
  // Status & Payment
  status: ContractStatus;
  service_fee: number; // In SAR
  payment_status: "pending" | "paid" | "refunded";
  payment_reference?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  submitted_at?: Date;
  licensed_at?: Date;
  expires_at?: Date;
  
  // Rejection/Termination
  rejection_reason?: string;
  termination_reason?: string;
  terminated_at?: Date;
}

// ============================================================================
// Wizard Step Types
// ============================================================================

export interface IContractWizardStep {
  id: number;
  key: string;
  label: string;
  label_ar: string;
  description?: string;
  description_ar?: string;
  required: boolean;
  fields: string[];
}

export const RESIDENTIAL_CONTRACT_STEPS: IContractWizardStep[] = [
  {
    id: 1,
    key: "ownership",
    label: "Ownership Document",
    label_ar: "وثيقة الملكية",
    description: "Upload deed and ownership documents",
    description_ar: "رفع الصك ووثائق الملكية",
    required: true,
    fields: ["lessor_type", "ownership_document"],
  },
  {
    id: 2,
    key: "parties",
    label: "Parties Information",
    label_ar: "معلومات الأطراف",
    description: "Lessor and lessee details",
    description_ar: "بيانات المؤجر والمستأجر",
    required: true,
    fields: ["lessor", "lessee"],
  },
  {
    id: 3,
    key: "property",
    label: "Property Information",
    label_ar: "معلومات العقار",
    description: "Property details and location",
    description_ar: "تفاصيل العقار والموقع",
    required: true,
    fields: ["property_details"],
  },
  {
    id: 4,
    key: "additional",
    label: "Additional Data",
    label_ar: "بيانات إضافية",
    description: "Utility accounts and extras",
    description_ar: "حسابات الخدمات والإضافات",
    required: false,
    fields: ["utilities", "maintenance"],
  },
  {
    id: 5,
    key: "rental",
    label: "Rental Information",
    label_ar: "معلومات الإيجار",
    description: "Rent amount and payment terms",
    description_ar: "مبلغ الإيجار وشروط الدفع",
    required: true,
    fields: ["rental_info"],
  },
];

export const COMMERCIAL_CONTRACT_STEPS: IContractWizardStep[] = [
  {
    id: 1,
    key: "ownership",
    label: "Ownership Document",
    label_ar: "وثيقة الملكية",
    required: true,
    fields: ["lessor_type", "ownership_document"],
  },
  {
    id: 2,
    key: "parties",
    label: "Parties Information",
    label_ar: "معلومات الأطراف",
    required: true,
    fields: ["lessor", "lessee"],
  },
  {
    id: 3,
    key: "property",
    label: "Property Information",
    label_ar: "معلومات العقار",
    required: true,
    fields: ["property_details"],
  },
  {
    id: 4,
    key: "rental",
    label: "Rental Information",
    label_ar: "معلومات الإيجار",
    required: true,
    fields: ["rental_info"],
  },
];

// ============================================================================
// API Request/Response DTOs
// ============================================================================

export interface ContractTypesResponse {
  types: Array<{
    id: ContractType;
    name: string;
    name_ar: string;
    price: number;
    steps: IContractWizardStep[];
  }>;
}

export interface CreateContractRequest {
  contract_type: ContractType;
  lessor_type: LessorType;
  property_id?: string;
}

export interface CreateContractResponse {
  contract_id: string;
  status: ContractStatus;
  current_step: number;
  steps: IContractWizardStep[];
}

export interface UpdateContractStepRequest {
  step: number;
  data: Partial<{
    lessor_type: LessorType;
    ownership_document: Partial<IOwnershipDocument>;
    lessor: Partial<IContractParty>;
    lessee: Partial<IContractParty>;
    property_details: Partial<IPropertyDetails>;
    rental_info: Partial<IRentalInfo>;
  }>;
}

export interface UpdateContractStepResponse {
  contract_id: string;
  current_step: number;
  completed_steps: number[];
  status: ContractStatus;
  validation_errors?: Record<string, string>;
}

export interface UploadDocumentRequest {
  document_type: "deed" | "power_of_attorney" | "commercial_registration";
  file: File;
}

export interface UploadDocumentResponse {
  document_url: string;
  document_type: string;
}

export interface SubmitContractRequest {
  accept_terms: boolean;
}

export interface SubmitContractResponse {
  contract_id: string;
  status: ContractStatus;
  payment_required: boolean;
  payment_amount: number;
  payment_url?: string;
}

export interface ContractFilters {
  status?: ContractStatus | ContractStatus[];
  contract_type?: ContractType;
  search?: string;
  created_after?: Date;
  created_before?: Date;
  page?: number;
  limit?: number;
}

export interface ContractListResponse {
  contracts: ILeaseContract[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ContractDetailResponse {
  contract: ILeaseContract;
  documents: Array<{
    type: string;
    url: string;
    uploaded_at: Date;
  }>;
  history: Array<{
    action: string;
    user: string;
    timestamp: Date;
    details?: string;
  }>;
  property?: {
    id: string;
    title: string;
    images: string[];
  };
}

// ============================================================================
// UI Component Props
// ============================================================================

export interface ContractWizardProps {
  contract?: ILeaseContract;
  steps: IContractWizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onStepSubmit: (data: UpdateContractStepRequest["data"]) => Promise<void>;
  onSaveDraft: () => Promise<void>;
  isLoading?: boolean;
}

export interface ContractTypeCardProps {
  type: ContractType;
  name: string;
  name_ar: string;
  price: number;
  stepsCount: number;
  onSelect: () => void;
  isSelected?: boolean;
  className?: string;
}

export interface ContractListItemProps {
  contract: ILeaseContract;
  onClick: () => void;
  className?: string;
}

// ============================================================================
// Pricing Configuration
// ============================================================================

export const CONTRACT_PRICING = {
  residential: {
    price: 249, // SAR - undercut Aqar's 299
    name: "Residential Contract",
    name_ar: "العقد السكني",
    steps: 5,
  },
  commercial: {
    price: 449, // SAR - undercut Aqar's 499
    name: "Commercial Contract",
    name_ar: "العقد التجاري",
    steps: 4,
  },
};

export const CONTRACT_STATUS_CONFIG: Record<ContractStatus, {
  label: string;
  label_ar: string;
  color: string;
  bgColor: string;
}> = {
  draft: {
    label: "Draft",
    label_ar: "مسودة",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  pending_documents: {
    label: "Pending Documents",
    label_ar: "بانتظار الوثائق",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  pending_info: {
    label: "Pending Information",
    label_ar: "بانتظار المعلومات",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  pending_payment: {
    label: "Pending Payment",
    label_ar: "بانتظار الدفع",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  pending_review: {
    label: "Under Review",
    label_ar: "قيد المراجعة",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  pending_license: {
    label: "Pending License",
    label_ar: "بانتظار الترخيص",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  licensed: {
    label: "Licensed",
    label_ar: "مرخص",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  expired: {
    label: "Expired",
    label_ar: "منتهي",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
  terminated: {
    label: "Terminated",
    label_ar: "منهي",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  rejected: {
    label: "Rejected",
    label_ar: "مرفوض",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
};
