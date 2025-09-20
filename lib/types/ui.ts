/**
 * UI Component Types for Production-Ready Interface
 * Glass morphism theme with accessibility and performance optimizations
 */

// Loading and State Management
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
  stage?: string;
  error?: ErrorState;
}

export interface ErrorState {
  message: string;
  code?: string;
  details?: string;
  timestamp: string;
  retryable: boolean;
  retryAction?: () => void;
}

// Confirmation Dialog System
export interface ConfirmationConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  requireReason?: boolean;
  requireComments?: boolean;
  destructive?: boolean;
  loading?: boolean;
}

export interface ConfirmationResult {
  confirmed: boolean;
  reason?: string;
  comments?: string;
  timestamp: string;
}

export interface ConfirmationDialogProps {
  isOpen: boolean;
  config: ConfirmationConfig;
  onConfirm: (result: ConfirmationResult) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Glass Morphism Theme Components
export type GlassVariant = 'weak' | 'medium' | 'strong' | 'aurora';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface GlassComponentProps {
  variant?: GlassVariant;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  interactive?: boolean;
}

export interface GlassButtonProps extends GlassComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

export interface GlassCardProps extends GlassComponentProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  border?: boolean;
  hover?: boolean;
}

// Animation and Motion
export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing?: string;
  staggerChildren?: number;
}

export interface TransitionConfig {
  type: 'fade' | 'slide' | 'scale' | 'bounce';
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

// Accessibility
export interface AccessibilityProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  role?: string;
  tabIndex?: number;
  focusable?: boolean;
  keyboardShortcut?: string;
}

export interface KeyboardNavigationProps {
  onKeyDown?: (e: KeyboardEvent) => void;
  onKeyUp?: (e: KeyboardEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

// Performance Optimization Types
export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollOffset?: number;
  estimatedItemSize?: number;
}

export interface DebouncedSearchConfig {
  delay: number;
  minLength: number;
  maxResults?: number;
  placeholder?: string;
  noResultsText?: string;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  showPageNumbers?: boolean;
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
}

// Real-time Data Types
export interface RealtimeConfig {
  endpoint: string;
  interval: number; // milliseconds
  maxRetries: number;
  retryDelay: number;
  pauseOnBlur: boolean;
  resumeOnFocus: boolean;
  dependencies?: string[];
}

export interface RealtimeState<T> {
  data: T | null;
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate: string;
  error: ErrorState | null;
  retryCount: number;
}

// Toast Notification System
export interface ToastConfig {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 for persistent
  action?: ToastAction;
  dismissible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export interface ToastAction {
  label: string;
  onClick: () => void;
  style?: 'primary' | 'secondary';
}

// Form and Input Types
export interface FormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
  validating: boolean;
}

export interface FormState {
  fields: Record<string, FormFieldState>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
  errors: Record<string, string>;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
  async?: (value: any) => Promise<string | undefined>;
}

// Layout and Navigation
export interface LayoutConfig {
  sidebar: {
    collapsible: boolean;
    defaultCollapsed: boolean;
    breakpoint: number;
    width: number;
    collapsedWidth: number;
  };
  header: {
    fixed: boolean;
    height: number;
    transparent: boolean;
  };
  footer: {
    visible: boolean;
    height: number;
  };
}

export interface BreadcrumbItem {
  name: string;
  href?: string;
  current?: boolean;
  icon?: React.ReactNode;
}

export interface PageInfo {
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
  icon?: React.ReactNode;
  color?: string;
  actions?: PageAction[];
}

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  permission?: string;
  loading?: boolean;
}

// Data Table Types
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  rowKey: string;
  pagination?: PaginationConfig;
  selection?: {
    enabled: boolean;
    type: 'checkbox' | 'radio';
    onSelectionChange: (selectedRows: T[]) => void;
  };
  sorting?: {
    enabled: boolean;
    defaultSort?: { field: string; direction: 'asc' | 'desc' };
    onSortChange: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  };
  filtering?: {
    enabled: boolean;
    filters: Record<string, any>;
    onFilterChange: (filters: Record<string, any>) => void;
  };
}

// Search and Filter Types
export interface SearchConfig {
  placeholder: string;
  debounceMs: number;
  minLength: number;
  searchableFields: string[];
  suggestions?: boolean;
  recentSearches?: boolean;
}

export interface FilterConfig {
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text';
  label: string;
  key: string;
  options?: { label: string; value: any }[];
  placeholder?: string;
  multiple?: boolean;
}

// Audit and Activity Logging
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  changes?: FieldChange[];
  metadata?: Record<string, any>;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'create' | 'update' | 'delete';
}

// Responsive Design
export interface ResponsiveConfig {
  breakpoints: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  container: {
    maxWidth: Record<string, string>;
    padding: Record<string, string>;
  };
}

// Theme Configuration
export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  glassMorphism: {
    backdrop: string;
    border: string;
    shadow: string;
    blur: string;
  };
  animation: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
}