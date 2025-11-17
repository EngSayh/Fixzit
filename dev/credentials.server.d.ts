/**
 * Type declarations for dev/credentials.server.ts
 * 
 * This file is NOT committed to the repository.
 * Developers should copy credentials.example.ts to credentials.server.ts
 * 
 * These type declarations allow TypeScript to compile even when
 * credentials.server.ts doesn't exist in the repository.
 */

export interface DemoCredential {
  role: string;
  email?: string;
  employeeNumber?: string;
  password: string;
  loginType: 'personal' | 'corporate';
  orgId?: string;
  preferredPath?: string;
}

export const ENABLED: boolean;

export function findLoginPayloadByRole(_role: string): DemoCredential | null;

export function listSanitized(): {
  demo: Array<Omit<DemoCredential, 'password'>>;
  corporate: Array<Omit<DemoCredential, 'password'>>;
};

export function assertDemoConfig(): void;
