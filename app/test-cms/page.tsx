import Link from 'next/link';

export default function TestCMS() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CMS Test Links</h1>
      <div className="space-y-2">
        <Link href="/cms/privacy" className="block text-blue-600 hover:underline">Privacy Policy</Link>
        <Link href="/cms/terms" className="block text-blue-600 hover:underline">Terms of Service</Link>
        <Link href="/cms/about" className="block text-blue-600 hover:underline">About Us</Link>
      </div>
    </div>
  );
}

