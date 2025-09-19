'use client';

import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'weak' | 'strong' | 'dramatic' | 'bordered';
  hover?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
  gradient?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', hover = true, glow = false, gradient = false, children, ...props }, ref) => {
    const baseStyles = 'backdrop-blur-md border transition-all duration-300 relative overflow-hidden';

    const variants = {
      default: 'bg-white/10 dark:bg-black/10 backdrop-blur-md border-white/20 dark:border-white/10 rounded-2xl shadow-xl',
      weak: 'bg-white/5 dark:bg-black/5 backdrop-blur-sm border-white/10 dark:border-white/5 rounded-xl shadow-lg',
      strong: 'bg-white/20 dark:bg-black/20 backdrop-blur-xl border-white/30 dark:border-white/20 rounded-2xl shadow-2xl',
      dramatic: 'bg-gradient-to-br from-white/25 via-white/15 to-white/10 dark:from-black/25 dark:via-black/15 dark:to-black/10 backdrop-blur-xl border-white/40 dark:border-white/30 rounded-3xl shadow-2xl',
      bordered: 'bg-white/8 dark:bg-black/8 backdrop-blur-md rounded-xl border-2 border-white/25 dark:border-white/15 shadow-xl'
    };

    const hoverEffects = hover ? 'hover:-translate-y-1 hover:shadow-3xl hover:shadow-brand-500/20 hover:border-white/40 dark:hover:border-white/30' : '';
    const glowEffect = glow ? 'shadow-[0_0_60px_rgba(47,120,255,0.3),0_0_120px_rgba(0,168,89,0.2)]' : '';

    return (
      <div
        className={cn(
          baseStyles,
          variants[variant],
          hoverEffects,
          glowEffect,
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Aurora gradient overlay for special cards */}
        {(glow || gradient) && (
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at top left, rgba(47,120,255,0.3) 0%, transparent 40%), radial-gradient(ellipse at bottom right, rgba(0,168,89,0.25) 0%, transparent 50%)',
            }}
          />
        )}
        
        {/* Top border highlight - more dramatic */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(47,120,255,0.8), rgba(0,168,89,0.6), transparent)',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;