import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';

// Mock Next.js API functions that are not available during testing
vi.mock('next/headers', () => ({
  headers: vi.fn().mockImplementation(() => {
    throw new Error('`headers` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context');
  }),
  cookies: vi.fn().mockImplementation(() => {
    throw new Error('`cookies` was called outside a request scope. Read more: https://nextjs.org/docs/messages/next-dynamic-api-wrong-context');
  })
}));

// Global fetch mock
global.fetch = vi.fn().mockImplementation(() => 
  Promise.reject(new Error('fetch should be mocked in individual tests'))
);

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    return React.createElement('img', props);
  },
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));