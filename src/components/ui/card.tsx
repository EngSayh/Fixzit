import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const Card: React.FC<CardProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    />
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({ className = '', ...props }) => {
  return (
    <h3
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({ className = '', ...props }) => {
  return (
    <p
      className={`text-sm text-gray-600 ${className}`}
      {...props}
    />
  );
};

export const CardContent: React.FC<CardContentProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`p-6 pt-0 ${className}`}
      {...props}
    />
  );
};

