import { redirect } from 'next/navigation';

/**
 * Immediately redirects the current request to `/admin`.
 *
 * This server-side page component performs a navigation redirect as a side effect and does not return JSX or a value.
 */
export default function AdministrationRedirect() {
  redirect('/admin');
}


