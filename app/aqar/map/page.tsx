import { permanentRedirect } from 'next/navigation';

/**
 * Server page that issues a permanent redirect to `/marketplace/properties`.
 *
 * This page does not render UI; when invoked on the server it immediately triggers a permanent redirect to the marketplace properties route.
 */
export default function Page() {
  permanentRedirect('/marketplace/properties');
}

