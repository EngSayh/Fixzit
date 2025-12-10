import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  return (
    <input
      className={`flex h-11 w-full rounded-[4px] border border-[#CED4DA] bg-white px-3 py-2 text-[13px] text-[#495057] ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#ADB5BD] focus-visible:outline-none focus-visible:border-[#118158] focus-visible:ring-2 focus-visible:ring-[#118158]/25 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
};
