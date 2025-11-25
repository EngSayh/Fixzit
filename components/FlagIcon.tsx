import * as React from "react";

type FlagCode = "gb" | "sa";

interface FlagIconProps {
  code: FlagCode;
  className?: string;
  title?: string;
}

const FLAG_TITLES: Record<FlagCode, string> = {
  gb: "United Kingdom",
  sa: "Saudi Arabia",
};

export const FlagIcon: React.FC<FlagIconProps> = ({
  code,
  className,
  title,
}) => {
  if (code === "sa") {
    return (
      <svg
        viewBox="0 0 24 16"
        className={className}
        aria-hidden={!title}
        role="img"
        focusable="false"
      >
        <title>{title ?? FLAG_TITLES[code]}</title>
        <rect width="24" height="16" fill="#006C35" />
        <path d="M6 6h12v2H6zM10 10h4v1h-4z" fill="#fff" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      className={className}
      aria-hidden={!title}
      role="img"
      focusable="false"
    >
      <title>{title ?? FLAG_TITLES[code]}</title>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <rect x="10" width="4" height="16" fill="#fff" />
      <rect y="6" width="24" height="4" fill="#fff" />
      <rect x="11" width="2" height="16" fill="#C8102E" />
      <rect y="7" width="24" height="2" fill="#C8102E" />
    </svg>
  );
};
