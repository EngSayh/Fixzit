export const rateLimitError = () => ({ status: 429, body: { error: "rate limit" } } as any);
