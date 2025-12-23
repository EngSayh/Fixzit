/**
 * Reusable Form Field Component with Field-Level Error Display
 * Provides consistent styling and error handling across all forms
 * 
 * @module components/ui/form-field
 */

import React from "react";
import { Eye, EyeOff } from "@/components/ui/icons";
import { Input } from "./input";
import { Label } from "./label";
import { getFieldClassName } from "@/lib/errors/field-errors";

export interface FormFieldProps {
  /** Field identifier (used for id, name, and error key) */
  name: string;
  
  /** Field label text */
  label: string;
  
  /** Whether field is required */
  required?: boolean;
  
  /** Input type */
  type?: "text" | "email" | "password" | "tel" | "url";
  
  /** Current field value */
  value: string;
  
  /** Change handler */
  onChange: (value: string) => void;
  
  /** Error message to display */
  error?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Autocomplete attribute */
  autoComplete?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Show toggle for password fields */
  showPasswordToggle?: boolean;
  
  /** Help text displayed below field */
  helpText?: string;
  
  /** Auto focus on mount */
  autoFocus?: boolean;
  
  /** Icon component to display (lucide-react icon) */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Data test ID for testing */
  "data-testid"?: string;
}

/**
 * Standard form field with label, error display, and optional password toggle
 */
export function FormField({
  name,
  label,
  required = false,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  className = "",
  disabled = false,
  showPasswordToggle = false,
  helpText,
  autoFocus = false,
  icon: Icon,
  "data-testid": dataTestId,
}: FormFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  
  // Determine actual input type (handle password toggle)
  const inputType = type === "password" && showPasswordToggle && showPassword ? "text" : type;
  
  // Build input className with error state
  const inputClassName = getFieldClassName(
    Icon ? "ps-10" : (showPasswordToggle ? "pe-10" : ""),
    !!error
  );
  
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      
      <div className="relative">
        {Icon && (
          <Icon className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        )}
        <Input
          id={name}
          name={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          data-testid={dataTestId}
          className={`${inputClassName} ${showPasswordToggle && Icon ? "ps-10 pe-10" : ""} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
        />
        
        {showPasswordToggle && type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? `Hide ${label}` : `Show ${label}`}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      
      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {!error && helpText && (
        <p id={`${name}-help`} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
}

/**
 * Compact inline form field (for tight layouts)
 */
export function CompactFormField({
  name,
  label,
  required = false,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  className = "",
}: Omit<FormFieldProps, "showPasswordToggle" | "helpText">) {
  const inputClassName = getFieldClassName("", !!error);
  
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className={`${inputClassName} ${className} h-9 text-sm`}
        aria-invalid={!!error}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
