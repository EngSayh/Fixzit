import React from &apos;react&apos;;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: &apos;default&apos; | 'secondary&apos; | &apos;outline&apos; | &apos;ghost&apos; | &apos;link&apos;;
  size?: &apos;default&apos; | 'sm&apos; | &apos;lg&apos; | &apos;icon&apos;;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = &apos;',
  variant = &apos;default&apos;,
  size = &apos;default&apos;,
  ...props
}) => {
  const baseClasses = &apos;inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50&apos;;

  const variants = {
    default: &apos;bg-blue-600 text-white hover:bg-blue-700&apos;,
    secondary: &apos;bg-gray-100 text-gray-900 hover:bg-gray-200&apos;,
    outline: &apos;border border-gray-300 bg-white hover:bg-gray-50&apos;,
    ghost: &apos;hover:bg-gray-100&apos;,
    link: &apos;underline-offset-4 hover:underline text-blue-600&apos;
  };

  const sizes = {
    default: &apos;h-10 py-2 px-4&apos;,
    sm: &apos;h-9 px-3 rounded-md&apos;,
    lg: &apos;h-11 px-8 rounded-md&apos;,
    icon: &apos;h-10 w-10&apos;
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
