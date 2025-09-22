export default function TestCMS() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CMS Test Links</h1>
      <div className="space-y-2">
        <a href="/cms/privacy" className="block text-blue-600 hover:underline">Privacy Policy</a>
        <a href="/cms/terms" className="block text-blue-600 hover:underline">Terms of Service</a>
        <a href="/cms/about" className="block text-blue-600 hover:underline">About Us</a>
      </div>
    </div>
  );
}

