export function makeGetRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: 'GET', headers });
}

export function makePostRequest(url: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
