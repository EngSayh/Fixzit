import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  return (
    <input
      className={`flex h-11 w-full rounded-[4px] border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-[13px] text-foreground ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};
