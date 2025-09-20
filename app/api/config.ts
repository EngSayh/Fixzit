// Centralized API configuration to avoid duplication
export const API_URL = process.env.API_URL || 'http://localhost:5000';

export const getAuthHeaders = (token: string | null) => {
  if (!token) return {};
  return { 'Authorization': token };
};

export const handleApiResponse = async (response: Response) => {
  const data = await response.json();
  return { data, status: response.status };
};

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  token: string | null = null
) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(token),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return handleApiResponse(response);
};