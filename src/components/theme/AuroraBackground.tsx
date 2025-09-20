'use client';

import { cn } from '../../../lib/utils';

interface AuroraBackgroundProps {
  variant?: 'subtle' | 'medium' | 'strong' | 'dramatic';
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  animate?: boolean;
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  variant = 'dramatic',
  className,
  children,
  overlay = false,
  animate = true
}) => {
  return (
    <div className={cn('relative w-full h-full', className)}>
      {/* Layer 1 - Primary Aurora Layer with dramatic colors */}
      <div 
        className={cn(
          'absolute inset-0 pointer-events-none',
          animate && 'animate-aurora-flow'
        )}
        style={{
          background: `
            radial-gradient(
              ellipse at 20% 80%,
              rgba(0, 97, 168, 0.5) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse at 80% 20%,
              rgba(0, 168, 89, 0.4) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse at 40% 40%,
              rgba(47, 120, 255, 0.45) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse at 90% 70%,
              rgba(96, 165, 250, 0.35) 0%,
              transparent 60%
            )
          `,
          filter: 'blur(60px) saturate(150%)',
          opacity: variant === 'dramatic' ? 0.9 : variant === 'strong' ? 0.75 : variant === 'medium' ? 0.6 : 0.4,
        }}
      />

      {/* Layer 2 - Secondary Aurora with wave animation */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          animate && 'animate-aurora-wave'
        )}
        style={{
          background: `
            linear-gradient(
              125deg,
              rgba(0, 97, 168, 0.35) 0%,
              rgba(0, 168, 89, 0.3) 25%,
              rgba(255, 180, 0, 0.2) 50%,
              rgba(47, 120, 255, 0.35) 75%,
              rgba(0, 97, 168, 0.3) 100%
            )
          `,
          filter: 'blur(80px)',
          opacity: variant === 'dramatic' ? 0.8 : variant === 'strong' ? 0.65 : variant === 'medium' ? 0.5 : 0.3,
          mixBlendMode: 'screen',
        }}
      />

      {/* Layer 3 - Accent highlights for depth */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          animate && 'animate-aurora-shift'
        )}
        style={{
          background: `
            conic-gradient(
              from 180deg at 50% 50%,
              rgba(0, 168, 89, 0.3) 0deg,
              rgba(47, 120, 255, 0.35) 90deg,
              rgba(255, 180, 0, 0.25) 180deg,
              rgba(96, 165, 250, 0.3) 270deg,
              rgba(0, 168, 89, 0.3) 360deg
            )
          `,
          filter: 'blur(100px)',
          opacity: variant === 'dramatic' ? 0.7 : variant === 'strong' ? 0.55 : variant === 'medium' ? 0.4 : 0.25,
        }}
      />

      {/* Layer 4 - Floating orb effects */}
      {variant === 'dramatic' && (
        <>
          <div 
            className="absolute top-1/4 left-1/4 w-96 h-96 pointer-events-none animate-aurora-float"
            style={{
              background: 'radial-gradient(circle, rgba(0, 97, 168, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <div 
            className="absolute bottom-1/4 right-1/4 w-80 h-80 pointer-events-none animate-aurora-float-reverse"
            style={{
              background: 'radial-gradient(circle, rgba(0, 168, 89, 0.35) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none animate-aurora-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(47, 120, 255, 0.25) 0%, transparent 60%)',
              filter: 'blur(80px)',
            }}
          />
        </>
      )}

      {/* Optional dark overlay for better text readability */}
      {overlay && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.15))',
          }}
        />
      )}
      
      {/* Content */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default AuroraBackground;