import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = { vus: 1, iterations: 5 };

export default function () {
  const base = __ENV.FIXZIT_API_BASE;

  if (!base) {
    throw new Error('FIXZIT_API_BASE must be set before running the smoke test.');
  }

  const res = http.get(base);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
