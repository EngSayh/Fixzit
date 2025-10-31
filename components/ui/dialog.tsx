import React from 'react';
import { X } from 'lucide-react';

// Helper function for class merging
function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

// --- Dialog (Overlay Wrapper) ---

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  // FIX: Check for falsy `open`, not just `open === false`
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay with backdrop blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0" 
        onClick={() => onOpenChange?.(false)} 
      />
      {/* Content wrapper */}
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
};

// --- DialogTrigger (Button Wrapper) ---

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ 
  children, 
  asChild = false, 
  ...props 
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ...children.props,
    });
  }

  return (
    <button {...props}>
      {children}
    </button>
  );
};

// --- DialogContent (The Modal Window) ---

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      // FIX: Use semantic tokens and correct 16px radius (rounded-2xl)
      className={cn(
        "w-full max-w-lg bg-popover text-popover-foreground border border-border shadow-lg",
        "rounded-2xl animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    />
  );
});
DialogContent.displayName = 'DialogContent';

// --- DialogHeader ---

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = React.forwardRef<
  HTMLDivElement,
  DialogHeaderProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6 pb-4 text-left", 
      className
    )}
    {...props}
  />
));
DialogHeader.displayName = 'DialogHeader';

// --- DialogTitle ---

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  DialogTitleProps
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    // FIX: Use semantic text color
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

// --- DialogDescription (NEW) ---

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    // FIX: Use semantic muted color
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

// --- DialogFooter (NEW) ---

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = React.forwardRef<
  HTMLDivElement,
  DialogFooterProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4",
      className
    )}
    {...props}
  />
));
DialogFooter.displayName = 'DialogFooter';

// --- DialogClose (NEW) ---

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  DialogCloseProps
>(({ className, onClose, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClose}
    className={cn(
      "absolute top-4 right-4 rounded-sm opacity-70 transition-opacity",
      "hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary",
      "disabled:pointer-events-none",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4 text-muted-foreground" />
    <span className="sr-only">Close</span>
  </button>
));
DialogClose.displayName = 'DialogClose';
