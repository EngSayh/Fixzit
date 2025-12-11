export const asUserHeader = () => ({
  "x-user": localStorage.getItem("x-user") || "",
});

export async function api<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      ...asUserHeader(),
      "content-type": "application/json",
    },
  });
  const text = await res.text();
  let body: T | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      // Server returned non-JSON response
      if (!res.ok) throw new Error(`HTTP ${res.status}: Invalid response`);
      throw new Error("Invalid JSON response from server");
    }
  }
  if (!res.ok) throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
  return body as T;
}
