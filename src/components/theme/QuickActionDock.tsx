'use client';

import { useState } from 'react';
import { cn } from '../../../lib/utils';
import GlassButton from './GlassButton';
import { Plus, X } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: 'primary' | 'accent' | 'warning' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

interface QuickActionDockProps {
  actions: QuickAction[];
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  size?: 'sm' | 'md' | 'lg';
}

const QuickActionDock: React.FC<QuickActionDockProps> = ({
  actions,
  className,
  position = 'bottom-right',
  size = 'md'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positions = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'bottom-center': 'fixed bottom-6 left-1/2 -translate-x-1/2'
  };

  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14', 
    lg: 'w-16 h-16'
  };

  const actionSizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn(positions[position], 'z-50', className)}>
      {/* Quick actions */}
      <div className={cn(
        'flex flex-col-reverse gap-3 items-center transition-all duration-300 mb-3',
        isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, index) => (
          <div
            key={action.id}
            className={cn(
              'transform transition-all duration-300 animate-float',
              isExpanded ? 'scale-100' : 'scale-0'
            )}
            style={{ 
              transitionDelay: `${index * 50}ms`,
              animationDelay: `${index * 200}ms`
            }}
          >
            <GlassButton
              size="icon"
              variant={action.color || 'secondary'}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                actionSizes[size],
                'rounded-full shadow-lg hover:shadow-2xl'
              )}
              title={action.label}
            >
              {action.icon}
            </GlassButton>
            
            {/* Tooltip */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {action.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main toggle button */}
      <GlassButton
        size="icon"
        variant="primary"
        onClick={handleToggle}
        className={cn(
          sizes[size],
          'rounded-full shadow-xl hover:shadow-2xl transform transition-all duration-300',
          isExpanded && 'rotate-45'
        )}
      >
        {isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </GlassButton>

      {/* Background blur when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-sm -z-10 transition-opacity duration-300"
          onClick={handleToggle}
        />
      )}
    </div>
  );
};

export default QuickActionDock;