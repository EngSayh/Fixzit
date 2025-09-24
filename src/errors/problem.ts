// src/errors/problem.ts - RFC 9457 Problem Details implementation
export type ProblemErrorItem = { 
  path?: string; 
  message: string;
  code?: string;
};

export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: ProblemErrorItem[];
  traceId?: string;
  correlationId?: string;
  timestamp?: string;
  module?: string;
  category?: string;
};

export function isProblemDetails(x: any): x is ProblemDetails {
  return x && typeof x === 'object' && typeof x.title === 'string' && typeof x.status === 'number';
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

// Helper to create a properly formatted Problem Details response
export function createProblemDetails(params: Partial<ProblemDetails> & { title: string; status: number }): ProblemDetails {
  return {
    timestamp: new Date().toISOString(),
    ...params
  };
}
