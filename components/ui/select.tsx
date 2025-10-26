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

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ className = '', children, ...props }) => {
  // Helper: recursively extract text from React nodes so we never render block elements
  // inside an <option> (which causes hydration/runtime errors).
  const extractText = (node: React.ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map((n) => extractText(n)).filter(Boolean).join(' ');
    if (React.isValidElement(node)) return extractText(node.props?.children);
    return '';
  };

  // If children is a composite (e.g. an element with label and description),
  // pull top-level child texts and render them as inline spans (no divs).
  const topChildren = React.Children.toArray(children);
  const texts = topChildren.map((c) => extractText(c)).filter(Boolean);
  const label = texts[0] ?? '';
  const description = texts.slice(1).join(' ');

  return (
    <option
      className={`cursor-pointer select-none py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-gray-100 ${className}`}
      {...props}
    >
      <span aria-hidden={false}>
        {label}
        {description ? (
          <span className="text-xs text-muted-foreground ml-2">{description}</span>
        ) : null}
      </span>
    </option>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children }) => {
  return (
    <>
      {children}
    </>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder = '' }) => {
  return (
    <option value="" disabled>
      {placeholder}
    </option>
  );
};
