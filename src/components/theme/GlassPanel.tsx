'use client';

import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sidebar' | 'header' | 'dramatic' | 'floating';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
  gradient?: boolean;
  glow?: boolean;
}

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ 
    className, 
    variant = 'default', 
    blur = 'md',
    gradient = false,
    glow = false,
    children, 
    ...props 
  }, ref) => {
    const blurStyles = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-xl'
    };

    const variants = {
      default: 'bg-white/10 dark:bg-black/10 border-white/20 dark:border-white/10',
      sidebar: 'bg-gradient-to-b from-white/15 to-white/5 dark:from-black/15 dark:to-black/5 border-r border-white/20 dark:border-white/10',
      header: 'bg-gradient-to-r from-white/12 via-white/10 to-white/8 dark:from-black/12 dark:via-black/10 dark:to-black/8 border-b border-white/20 dark:border-white/10',
      dramatic: 'bg-gradient-to-br from-white/25 via-white/15 to-transparent dark:from-black/25 dark:via-black/15 dark:to-transparent border border-white/30 dark:border-white/20',
      floating: 'bg-white/15 dark:bg-black/15 border border-white/25 dark:border-white/15 shadow-2xl'
    };

    const glowEffect = glow 
      ? 'shadow-[0_0_40px_rgba(47,120,255,0.25),0_0_80px_rgba(0,168,89,0.15)]' 
      : '';

    return (
      <div
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          blurStyles[blur],
          variants[variant],
          glowEffect,
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Gradient overlay for dramatic effect */}
        {gradient && (
          <>
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(47,120,255,0.2) 0%, transparent 40%, rgba(0,168,89,0.15) 100%)',
              }}
            />
            <div 
              className="absolute -top-20 -right-20 w-40 h-40 opacity-40 pointer-events-none animate-aurora-float"
              style={{
                background: 'radial-gradient(circle, rgba(47,120,255,0.4) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
          </>
        )}
        
        {/* Top gradient line for panels */}
        {(variant === 'header' || variant === 'dramatic') && (
          <div 
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(47,120,255,0.6), rgba(0,168,89,0.5), transparent)',
            }}
          />
        )}

        {/* Left gradient line for sidebar */}
        {variant === 'sidebar' && (
          <div 
            className="absolute top-0 left-0 bottom-0 w-[1px]"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(47,120,255,0.6), rgba(0,168,89,0.5), transparent)',
            }}
          />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

export default GlassPanel;