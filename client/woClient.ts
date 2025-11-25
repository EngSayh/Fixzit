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
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body;
}
