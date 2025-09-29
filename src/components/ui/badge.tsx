import React from &apos;react&apos;;

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: &apos;default&apos; | 'secondary&apos; | &apos;destructive&apos; | &apos;outline&apos;;
}

export const Badge: React.FC<BadgeProps> = ({
  className = &apos;',
  variant = &apos;default&apos;,
  ...props
}) => {
  const variants = {
    default: &apos;bg-blue-600 text-white hover:bg-blue-700&apos;,
    secondary: &apos;bg-gray-100 text-gray-900 hover:bg-gray-200&apos;,
    destructive: &apos;bg-red-600 text-white hover:bg-red-700&apos;,
    outline: &apos;border border-gray-300 text-gray-900 hover:bg-gray-50&apos;
  };

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

