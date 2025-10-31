import React from 'react';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  className = '',
  orientation = 'horizontal',
  ...props
}) => {
  const orientationClasses = {
    horizontal: 'h-[1px] w-full',
    vertical: 'h-full w-[1px]'
  };

  return (
    <div
      className={`shrink-0 bg-muted ${orientationClasses[orientation]} ${className}`}
      {...props}
    />
  );
};

