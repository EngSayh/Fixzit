/**
 * CRM-specific types for customer relationship management
 */

import { AuditableEntity, User, Address, FileUpload } from './api';

export interface Contact extends AuditableEntity {
  // Basic Information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  
  // Company Information
  company?: string;
  jobTitle?: string;
  department?: string;
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  
  // Contact Details
  type: 'prospect' | 'lead' | 'customer' | 'partner' | 'vendor';
  status: 'active' | 'inactive' | 'blocked' | 'unsubscribed';
  source: 'website' | 'referral' | 'social' | 'event' | 'cold_call' | 'advertisement' | 'other';
  
  // Address Information
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  
  // Preferences
  preferredContact: 'email' | 'phone' | 'sms' | 'whatsapp';
  timezone?: string;
  language: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  
  // Social & Web
  website?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  
  // Business Information
  annualRevenue?: number;
  employeeCount?: number;
  
  // CRM Specific
  assignedTo?: string;
  assignee?: User;
  lastContactDate?: string;
  nextContactDate?: string;
  lifetimeValue?: number;
  acquisitionCost?: number;
  conversionDate?: string;
  customerSince?: string;
  
  // Additional Data
  notes?: string;
  tags: string[];
  customFields?: Record<string, any>;
  
  // Relationships
  originalLead?: Lead;
  deals?: Deal[];
  interactions?: Interaction[];
  tasks?: CrmTask[];
}

export interface Lead extends AuditableEntity {
  // Basic Information
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  
  // Lead Specific
  source: 'website' | 'referral' | 'social' | 'event' | 'cold_call' | 'advertisement' | 'other';
  medium?: string; // Specific channel within source
  campaign?: string; // Marketing campaign identifier
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost';
  score: number; // 0-100 lead scoring
  temperature: 'cold' | 'warm' | 'hot';
  
  // Qualification
  budget?: number;
  authority?: 'decision_maker' | 'influencer' | 'end_user' | 'unknown';
  need?: string;
  timeline?: 'immediate' | 'within_month' | 'within_quarter' | 'beyond_quarter';
  
  // Assignment
  assignedTo?: string;
  assignee?: User;
  
  // Conversion
  convertedAt?: string;
  convertedBy?: string;
  convertedToContactId?: string;
  conversionNotes?: string;
  
  // Additional Data
  interests: string[];
  painPoints: string[];
  notes?: string;
  tags: string[];
  customFields?: Record<string, any>;
  
  // Relationships
  interactions?: Interaction[];
  tasks?: CrmTask[];
}

export interface Deal extends AuditableEntity {
  title: string;
  description?: string;
  
  // Financial
  value: number;
  currency: string;
  probability: number; // 0-100%
  
  // Stages and Status
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  status: 'active' | 'won' | 'lost' | 'on_hold';
  
  // Timeline
  expectedCloseDate: string;
  actualCloseDate?: string;
  
  // Assignment
  ownerId: string;
  owner?: User;
  
  // Relationships
  contactId: string;
  contact?: Contact;
  accountId?: string; // If dealing with accounts/companies
  
  // Deal Specific
  type: 'new_business' | 'existing_business' | 'renewal' | 'upsell' | 'cross_sell';
  source: 'inbound' | 'outbound' | 'referral' | 'partner' | 'marketing';
  
  // Loss Analysis (if applicable)
  lostReason?: 'price' | 'competitor' | 'no_budget' | 'no_need' | 'timeline' | 'other';
  lostDescription?: string;
  competitorName?: string;
  
  // Additional Data
  products?: string[]; // Product/service IDs
  tags: string[];
  customFields?: Record<string, any>;
  
  // Relationships
  interactions?: Interaction[];
  tasks?: CrmTask[];
  documents?: FileUpload[];
}

export interface Interaction extends AuditableEntity {
  // Basic Information
  type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal' | 'quote' | 'visit' | 'other';
  subject: string;
  description?: string;
  
  // Timing
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // minutes
  
  // Participants
  contactId?: string;
  contact?: Contact;
  leadId?: string;
  lead?: Lead;
  dealId?: string;
  deal?: Deal;
  
  // Staff
  performedBy: string;
  performer?: User;
  attendees?: string[];
  
  // Outcome
  outcome: 'successful' | 'unsuccessful' | 'no_answer' | 'rescheduled' | 'cancelled';
  nextAction?: string;
  followUpDate?: string;
  
  // Communication Details
  direction: 'inbound' | 'outbound';
  channel?: string; // phone, email, teams, zoom, etc.
  
  // Additional Data
  attachments?: FileUpload[];
  tags: string[];
  customFields?: Record<string, any>;
}

export interface CrmTask extends AuditableEntity {
  title: string;
  description?: string;
  
  // Type and Category
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'proposal' | 'demo' | 'other';
  category: 'sales' | 'marketing' | 'support' | 'admin';
  
  // Status and Priority
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Assignment
  assignedTo: string;
  assignee?: User;
  
  // Timing
  dueDate: string;
  dueTime?: string;
  reminderDate?: string;
  completedAt?: string;
  
  // Relationships
  contactId?: string;
  contact?: Contact;
  leadId?: string;
  lead?: Lead;
  dealId?: string;
  deal?: Deal;
  
  // Additional Data
  notes?: string;
  attachments?: FileUpload[];
  tags: string[];
}

export interface CrmPipeline extends AuditableEntity {
  name: string;
  description?: string;
  
  // Configuration
  isDefault: boolean;
  isActive: boolean;
  currency: string;
  
  // Stages
  stages: PipelineStage[];
  
  // Permissions
  visibleTo: string[]; // User IDs or roles
  editableBy: string[]; // User IDs or roles
  
  // Usage
  dealCount: number;
  totalValue: number;
  averageDealSize: number;
  averageSalescycle: number; // days
  winRate: number; // percentage
}

export interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  probability: number; // 0-100%
  isClosedWon: boolean;
  isClosedLost: boolean;
  color: string;
  
  // Automation
  automations?: {
    onEnter?: string[]; // Action IDs
    onExit?: string[]; // Action IDs
    afterDays?: number;
  };
  
  // Requirements
  requiredFields?: string[];
  
  // Analytics
  dealCount: number;
  totalValue: number;
  averageTimeInStage: number; // days
}

export interface CrmAccount extends AuditableEntity {
  // Basic Information
  name: string;
  description?: string;
  website?: string;
  
  // Business Information
  industry?: string;
  type: 'prospect' | 'customer' | 'partner' | 'vendor' | 'competitor';
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  employeeCount?: number;
  annualRevenue?: number;
  
  // Contact Information
  phone?: string;
  email?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // Relationship
  parentAccountId?: string;
  childAccounts?: CrmAccount[];
  ownerId: string;
  owner?: User;
  
  // Business Details
  customerSince?: string;
  contractValue?: number;
  lifetimeValue?: number;
  
  // Status
  status: 'active' | 'inactive' | 'prospect';
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'standard';
  
  // Additional Data
  tags: string[];
  customFields?: Record<string, any>;
  
  // Relationships
  contacts?: Contact[];
  deals?: Deal[];
  interactions?: Interaction[];
}

export interface CrmCampaign extends AuditableEntity {
  name: string;
  description?: string;
  
  // Campaign Details
  type: 'email' | 'social' | 'event' | 'webinar' | 'advertisement' | 'content' | 'other';
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  
  // Targeting
  targetAudience: string;
  segments: string[];
  
  // Budget and Goals
  budget?: number;
  expectedLeads?: number;
  expectedRevenue?: number;
  
  // Timeline
  startDate: string;
  endDate?: string;
  
  // Results
  actualCost?: number;
  leadsGenerated: number;
  contactsCreated: number;
  dealsCreated: number;
  revenue: number;
  
  // ROI Metrics
  costPerLead?: number;
  conversionRate: number;
  roi?: number; // Return on Investment percentage
  
  // Assignment
  managerId: string;
  manager?: User;
  teamMembers?: string[];
  
  // Additional Data
  tags: string[];
  customFields?: Record<string, any>;
}

export interface CrmReport extends AuditableEntity {
  name: string;
  description?: string;
  category: 'sales' | 'marketing' | 'performance' | 'forecasting' | 'pipeline';
  
  // Configuration
  metrics: string[]; // Which metrics to include
  filters: Record<string, any>;
  dateRange: {
    from: string;
    to: string;
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  // Grouping and Sorting
  groupBy?: string[];
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  
  // Visualization
  chartType?: 'bar' | 'line' | 'pie' | 'table' | 'funnel';
  
  // Scheduling
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    recipients: string[];
  };
  
  // Permissions
  isPublic: boolean;
  sharedWith?: string[]; // User IDs
  
  // Data
  lastGenerated?: string;
  data?: any;
}