'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { logger } from '@/lib/logger';

// --- Main Select Component ---

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  /** Provides the native `onChange` event. */
  // eslint-disable-next-line no-unused-vars
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** (Optional) A simpler callback for just the new value. */
  // eslint-disable-next-line no-unused-vars
  onValueChange?: (value: string) => void;
  /** (Optional) A placeholder to display. Renders a disabled first option. */
  placeholder?: string;
  /** (Optional) Class name for the wrapper div. */
  wrapperClassName?: string;
}

/**
 * A styled, native HTML <select> component.
 * It provides basic styling and handles placeholder logic.
 *
 * It does NOT support rich content or custom popovers. For that,
 * use a dedicated Combobox component built with Radix UI.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className = '', 
    wrapperClassName = '', 
    children, 
    placeholder, 
    onValueChange, 
    onChange,
    value,
    defaultValue,
    ...props 
  }, ref) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // Propagate the original event
      if (onChange) {
        onChange(e);
      }
      // Propagate the simple value change
      if (onValueChange) {
        onValueChange(e.target.value);
      }
    };

    // Determine the select props to avoid controlled/uncontrolled conflict
    const selectProps: React.SelectHTMLAttributes<HTMLSelectElement> = {
      ...props,
    };

    if (value !== undefined) {
      selectProps.value = value;
    } else {
      selectProps.defaultValue = defaultValue ?? (placeholder ? '' : undefined);
    }

    return (
      <div className={`relative w-full ${wrapperClassName}`}>
        <select
          ref={ref}
          className={`
            flex h-10 w-full items-center justify-between rounded-2xl border border-border
            bg-card px-3 py-2 text-sm appearance-none
            ring-offset-white 
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50
            ${className}
          `}
          onChange={handleChange}
          {...selectProps}
        >
          {/* If a placeholder is provided, render it as the first,
            disabled, and hidden-from-list option.
            The 'value=""' is crucial for the placeholder to work
            with 'required' and form validation.
          */}
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          
          {children}
        </select>
        <ChevronDown
          className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = 'Select';


// --- Select Item Component ---

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

/**
 * A native HTML <option> component.
 * It MUST only be used as a child of <Select> or <SelectGroup>.
 * It does NOT support rich HTML children (divs, paragraphs, etc.).
 */
export const SelectItem: React.FC<SelectItemProps> = ({ className = '', children, ...props }) => {
  // We no longer need complex text extraction.
  // The native <option> element will render React children (like strings, numbers, or simple spans).
  // If a developer passes invalid HTML (like a <div>), React will correctly warn them.
  return (
    <option
      className={`
        cursor-pointer select-none py-1.5 text-sm outline-none
        bg-card text-foreground
        disabled:text-gray-400
        ${className}
      `}
      {...props}
    >
      {children}
    </option>
  );
};
SelectItem.displayName = 'SelectItem';


// --- Select Group Component ---

interface SelectGroupProps extends React.OptgroupHTMLAttributes<HTMLOptGroupElement> {
  children: React.ReactNode;
  label: string;
}

/**
 * A native HTML <optgroup> component for grouping <SelectItem>s.
 */
export const SelectGroup: React.FC<SelectGroupProps> = ({ className = '', children, label, ...props }) => {
  return (
    <optgroup
      className={`font-semibold py-1.5 ${className}`}
      label={label}
      {...props}
    >
      {children}
    </optgroup>
  );
};
SelectGroup.displayName = 'SelectGroup';

// --- BACKWARD COMPATIBILITY EXPORTS ---
// These components are provided for backward compatibility with the old API.
// They are thin wrappers that work with the new native select implementation.
// New code should use the `placeholder` prop on <Select> instead.

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * @deprecated This component is provided for backward compatibility only.
 * With the new native select implementation, you don't need SelectTrigger.
 * Just use <Select> with the placeholder prop.
 */
export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children }) => {
  // This component does nothing - it's just a passthrough for compatibility
  return <>{children}</>;
};
SelectTrigger.displayName = 'SelectTrigger';

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/**
 * @deprecated This component is provided for backward compatibility only.
 * With the new native select implementation, you don't need SelectContent.
 * Just put your SelectItem components directly inside <Select>.
 */
export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  // This component does nothing - it's just a passthrough for compatibility
  return <>{children}</>;
};
SelectContent.displayName = 'SelectContent';

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

/**
 * @deprecated This component is provided for backward compatibility only.
 * With the new native select implementation, you don't need SelectValue.
 * Use the `placeholder` prop on <Select> instead.
 */
export const SelectValue: React.FC<SelectValueProps> = () => {
  // Warn developers during development
  if (process.env.NODE_ENV !== 'production') {
    import('../../lib/logger').then(({ logWarn }) => {
      logWarn(
        'SelectValue is deprecated and non-functional with the new native Select. ' +
        'Use the placeholder prop on <Select> instead: <Select placeholder="...">. ' +
        'See migration guide for details.',
        {
          component: 'SelectValue',
          action: 'deprecationWarning',
          context: 'Use Select placeholder prop instead',
        }
      );
    }).catch(logErr => logger.error('Failed to load logger:', { error: logErr }));
  }
  // This component does nothing - the native select handles its own value display
  return null;
};
SelectValue.displayName = 'SelectValue';
