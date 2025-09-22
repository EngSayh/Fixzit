/**
 * Deprecation Utilities
 *
 * This module provides utilities for handling deprecated components and functions
 * with proper warnings and migration guidance.
 */

export interface DeprecationOptions {
  componentName: string;
  replacement: string;
  removalVersion?: string;
  additionalInfo?: string;
}

/**
 * Console warning for deprecated components
 */
export function deprecationWarning(options: DeprecationOptions) {
  const { componentName, replacement, removalVersion, additionalInfo } = options;

  const message = [
    `⚠️  DEPRECATED: ${componentName} is deprecated`,
    `→ Use ${replacement} instead`,
    removalVersion ? `→ Will be removed in ${removalVersion}` : '',
    additionalInfo ? `→ ${additionalInfo}` : ''
  ].filter(Boolean).join('\n');

  console.warn(message);
}

/**
 * Decorator for deprecated functions
 */
export function deprecated<T extends (...args: any[]) => any>(
  options: DeprecationOptions
) {
  return function (target: T): T {
    const originalMethod = target;

    return ((...args: Parameters<T>) => {
      deprecationWarning(options);
      return originalMethod(...args);
    }) as T;
  };
}

/**
 * React Hook for deprecated components
 */
export function useDeprecationWarning(options: DeprecationOptions) {
  if (typeof window !== 'undefined') {
    deprecationWarning(options);
  }
}

/**
 * Migration guide generator
 */
export function generateMigrationGuide(oldComponent: string, newComponent: string): string {
  return `
🔄 MIGRATION GUIDE: ${oldComponent} → ${newComponent}

1. Replace import:
   - OLD: import ${oldComponent} from '@/components/${oldComponent}'
   - NEW: import ${newComponent} from '@/components/${newComponent}'

2. Update component usage:
   - OLD: <${oldComponent} {...props} />
   - NEW: <${newComponent} {...props} />

3. Check API changes:
   - Review the new component's props and methods
   - Update any custom implementations accordingly

4. Test thoroughly:
   - Verify all functionality works as expected
   - Check responsive design and accessibility
   - Test in different browsers and devices

📚 For more information, see the component documentation.
`;
}
