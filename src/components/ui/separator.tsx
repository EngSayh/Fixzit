import React from &apos;react&apos;;

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: &apos;horizontal&apos; | &apos;vertical&apos;;
}

export const Separator: React.FC<SeparatorProps> = ({
  className = &apos;',
  orientation = &apos;horizontal&apos;,
  ...props
}) => {
  const orientationClasses = {
    horizontal: &apos;h-[1px] w-full&apos;,
    vertical: &apos;h-full w-[1px]&apos;
  };

  return (
    <div
      className={`shrink-0 bg-gray-200 ${orientationClasses[orientation]} ${className}`}
      {...props}
    />
  );
};

