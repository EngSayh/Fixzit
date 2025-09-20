'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import GlassCard from './GlassCard';

interface AnimatedKPIProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'accent' | 'warning' | 'danger' | 'success';
  className?: string;
  delay?: number;
  animate?: boolean;
}

const AnimatedKPI: React.FC<AnimatedKPIProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  trend = 'neutral',
  trendValue,
  icon,
  color = 'primary',
  className,
  delay = 0,
  animate = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (!animate || hasAnimated) {
      setDisplayValue(value);
      return;
    }

    const timer = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let currentValue = 0;
      let step = 0;

      const counter = setInterval(() => {
        step++;
        currentValue += increment;
        
        if (step >= steps) {
          setDisplayValue(value);
          clearInterval(counter);
          setHasAnimated(true);
        } else {
          setDisplayValue(Math.floor(currentValue));
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, animate, hasAnimated]);

  const colorStyles = {
    primary: 'text-brand-600 bg-brand-500/10',
    accent: 'text-accent-600 bg-accent-500/10',
    warning: 'text-yellow-600 bg-yellow-500/10',
    danger: 'text-red-600 bg-red-500/10',
    success: 'text-green-600 bg-green-500/10'
  };

  const trendStyles = {
    up: 'text-green-600 bg-green-500/10',
    down: 'text-red-600 bg-red-500/10',
    neutral: 'text-gray-600 bg-gray-500/10'
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️'
  };

  return (
    <GlassCard
      className={cn(
        'p-6 kpi-card animate-slide-up',
        className
      )}
      hover
      glow={color === 'primary'}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn(
              'p-2.5 rounded-xl',
              colorStyles[color]
            )}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white animate-counter">
                {prefix}{displayValue.toLocaleString()}{suffix}
              </span>
            </div>
          </div>
        </div>
        
        {trendValue && (
          <div className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1',
            trendStyles[trend]
          )}>
            <span>{trendIcons[trend]}</span>
            {trendValue}
          </div>
        )}
      </div>
      
      {/* Progress bar or additional visual indicator */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>vs last month</span>
        <div className="flex items-center gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            colorStyles[color]
          )} />
          <span>Active</span>
        </div>
      </div>
      
      {/* Floating animation dot */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-brand-500 rounded-full animate-float opacity-60" />
    </GlassCard>
  );
};

export default AnimatedKPI;