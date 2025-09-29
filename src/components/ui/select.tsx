import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}
interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}
interface SelectTriggerProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}
interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ className = '', children, onValueChange, onChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e);
    }
    if (onValueChange) {
      onValueChange(e.target.value);
    }
  };

  return (
    <select
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onChange={handleChange}
      {...props}
    >
      {children}
    </select>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ className = '', children, ...props }) => {
  return (
    <>
      {children}
    </>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ className = '', children, ...props }) => {
  return (
    <option
      className={`cursor-pointer select-none py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-gray-100 ${className}`}
      {...props}
    >
      {children}
    </option>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ className = '', children, ...props }) => {
  return (
    <>
      {children}
    </>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ className = '', placeholder = '', ...props }) => {
  return (
    <option value="" disabled>
      {placeholder}
    </option>
  );
};
