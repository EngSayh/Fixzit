import { ProblemDetails } from './types';

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public problem?: ProblemDetails
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchWithErrorHandling(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    
    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      
      // Try to parse as Problem Details (RFC 9457)
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/problem+json')) {
        try {
          problem = await response.json();
        } catch {
          // Fallback if JSON parsing fails
        }
      }
      
      // Create a standard Problem Details object if none provided
      if (!problem) {
        problem = {
          type: `https://docs.fixzit.com/errors/${response.status}`,
          title: getDefaultTitle(response.status),
          status: response.status,
          detail: await response.text().catch(() => response.statusText),
          instance: typeof input === 'string' ? input : input.toString()
        };
      }
      
      throw new FetchError(
        problem.title || response.statusText,
        response.status,
        problem
      );
    }
    
    return response;
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FetchError(
        'Network request failed',
        0,
        {
          type: 'https://docs.fixzit.com/errors/network',
          title: 'Network Error',
          status: 0,
          detail: 'Unable to connect to the server. Please check your internet connection.',
          instance: typeof input === 'string' ? input : input.toString()
        }
      );
    }
    
    throw error;
  }
}

function getDefaultTitle(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    case 502: return 'Bad Gateway';
    case 503: return 'Service Unavailable';
    case 504: return 'Gateway Timeout';
    default: return 'Request Failed';
  }
}

// Hook for using fetch with error handling in React components
export function useFetchWithErrorHandling() {
  return {
    fetch: fetchWithErrorHandling,
    isFetchError: (error: any): error is FetchError => error instanceof FetchError
  };
}