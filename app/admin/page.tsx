import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'CORP_ADMIN']);

export default function Page() {
  const role = cookies().get('fxz_role')?.value?.toUpperCase() ?? 'GUEST';

  if (!ADMIN_ROLES.has(role)) {
    redirect('/');
  }

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p>Coming online – UI wired, API scaffolded.</p>
    </div>
  );
}

