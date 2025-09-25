import { permanentRedirect } from 'next/navigation';

/**
 * Redirects permanently to the marketplace properties page.
 *
 * When executed, this page handler issues a permanent redirect to `/marketplace/properties`.
 */
export default function Page() {
  permanentRedirect('/marketplace/properties');
}

