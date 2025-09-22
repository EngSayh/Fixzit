import React from 'react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (open === false) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50">{children}</div>
    </div>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`relative w-full max-w-lg bg-white rounded-lg shadow-lg ${className}`}
      {...props}
    />
  );
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`p-6 pb-0 ${className}`}
      {...props}
    />
  );
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ className = '', ...props }) => {
  return (
    <h2
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  );
};

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, onClick, asChild, ...props }) => {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onClick,
      ...props
    });
  }

  return (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  );
};
