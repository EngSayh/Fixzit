import React from &apos;react&apos;;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const Card: React.FC<CardProps> = ({ className = &apos;', ...props }) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ className = &apos;', ...props }) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    />
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ className = &apos;', ...props }) => {
  return (
    <h3
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
};

export const CardContent: React.FC<CardContentProps> = ({ className = &apos;', ...props }) => {
  return (
    <div
      className={`p-6 pt-0 ${className}`}
      {...props}
    />
  );
};

