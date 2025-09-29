'use client&apos;;

import { useEffect } from &apos;react&apos;;
import { useRouter } from &apos;next/navigation&apos;;

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call logout API to clear server-side session
        await fetch(&apos;/api/auth/logout&apos;, {
          method: &apos;POST&apos;,
          credentials: &apos;include&apos;
        });

        // Clear client-side storage
        localStorage.removeItem(&apos;fixzit-role&apos;);
        localStorage.removeItem(&apos;fxz.lang&apos;);
        localStorage.removeItem(&apos;fixzit-currency&apos;);
        localStorage.removeItem(&apos;fixzit-theme&apos;);

        // Clear any other localStorage items related to the app
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(&apos;fixzit-&apos;) || key.startsWith(&apos;fxz-&apos;)) {
            localStorage.removeItem(key);
          }
        });

        // Small delay to ensure API call completes
        setTimeout(() => {
          router.push(&apos;/login&apos;);
        }, 100);
      } catch (error) {
        console.error(&apos;Logout error:&apos;, error);
        // Still redirect even if API call fails
        router.push(&apos;/login&apos;);
      }
    };

    handleLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Signing you out...</h1>
        <p className="text-gray-600">Please wait while we log you out securely.</p>
      </div>
    </div>
  );
}
