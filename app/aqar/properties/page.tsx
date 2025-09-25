import { redirect } from 'next/navigation';

/**
 * Redirects to the unified marketplace properties page.
 *
 * This Next.js page performs an immediate server-side navigation to `/marketplace/properties`
 * and does not render any UI. It exists to unify the Aqar properties route with the central
 * marketplace properties route.
 */
export default function AqarPropertiesPage() {
  // توحيد المسار: تحويل صفحة Aqar properties إلى سوق العقارات الموحد
  redirect('/marketplace/properties');
}

