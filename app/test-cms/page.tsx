'use client';

import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';

export default function TestCMS() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        {t('testCms.title', 'CMS Test Links')}
      </h1>
      <div className="space-y-2">
        <Link href="/cms/privacy" className="block text-primary hover:underline">
          {t('testCms.links.privacy', 'Privacy Policy')}
        </Link>
        <Link href="/cms/terms" className="block text-primary hover:underline">
          {t('testCms.links.terms', 'Terms of Service')}
        </Link>
        <Link href="/cms/about" className="block text-primary hover:underline">
          {t('testCms.links.about', 'About Us')}
        </Link>
      </div>
    </div>
  );
}
