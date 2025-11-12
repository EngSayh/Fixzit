"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

/**
 * Footer CMS Admin Page
 * Super Admin only - Manage footer content for About Us, Privacy Policy, Terms of Service
 * Features:
 * - Tab selector for page (About, Privacy, Terms)
 * - Dual textboxes (EN left, AR right) for bilingual content
 * - Save button with validation
 * - Auto-load on tab switch
 */
export default function FooterCMS() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [page, setPage] = useState<'about' | 'privacy' | 'terms'>('about');
  const [contentEn, setContentEn] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Authorization check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login?callbackUrl=/admin/cms/footer');
      return;
    }

    if (session.user?.role !== 'SUPER_ADMIN') {
      toast.error(t('admin.footer.accessDenied', 'Access Denied: SUPER_ADMIN role required'));
      router.push('/dashboard');
      return;
    }
  }, [session, status, router, t]);

  // Load footer content when page changes
  useEffect(() => {
    if (session?.user?.role !== 'SUPER_ADMIN') return;

    const loadContent = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/footer?page=${page}`);
        
        if (response.ok) {
          const data = await response.json();
          setContentEn(data.contentEn || '');
          setContentAr(data.contentAr || '');
        } else {
          const error = await response.text();
          toast.error(t('admin.footer.loadFailed', 'Failed to load content') + `: ${error}`);
        }
      } catch (error) {
        logger.error('Footer CMS load error', { error, page });
        toast.error(t('admin.footer.networkError', 'Network error while loading content'));
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [page, session, t]);

  // Save footer content
  const handleSave = async () => {
    if (!contentEn.trim() || !contentAr.trim()) {
      toast.error(t('admin.footer.validation.bothRequired', 'Both English and Arabic content are required'));
      return;
    }

    setSaving(true);
    const toastId = toast.loading(t('admin.footer.saving', 'Saving footer content...'));

    try {
      const response = await fetch('/api/admin/footer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page,
          contentEn,
          contentAr
        })
      });

      if (response.ok) {
        toast.success(t('admin.footer.saveSuccess', 'Footer content saved successfully'), { id: toastId });
      } else {
        const error = await response.text();
        toast.error(`${t('admin.footer.saveFailed', 'Save failed')}: ${error}`, { id: toastId });
      }
    } catch (error) {
      logger.error('Footer CMS save error', { error, page });
      toast.error(t('admin.footer.saveNetworkError', 'Network error while saving'), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Don't render if not authorized
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  const pages: Array<{ key: 'about' | 'privacy' | 'terms'; label: string }> = [
    { key: 'about', label: t('admin.footer.pages.about', 'About Us') },
    { key: 'privacy', label: t('admin.footer.pages.privacy', 'Privacy Policy') },
    { key: 'terms', label: t('admin.footer.pages.terms', 'Terms of Service') }
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('admin.footer.title', 'Footer Content Management')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.footer.subtitle', 'Manage bilingual content for footer pages (Super Admin only)')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
        </button>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-2 border-b border-border">
        {pages.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              page === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dual Textbox Editor */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">{t('common.loading', 'Loading...')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* English Content (Left) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t('admin.footer.contentEn', 'English Content')}
              <span className="text-destructive ms-1">*</span>
            </label>
            <textarea
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              placeholder={t('admin.footer.contentEnPlaceholder', 'Enter English content here...')}
              className="w-full h-[500px] px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary resize-none font-mono text-sm"
              dir="ltr"
            />
            <div className="text-xs text-muted-foreground">
              {contentEn.length} {t('common.characters', 'characters')}
            </div>
          </div>

          {/* Arabic Content (Right) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t('admin.footer.contentAr', 'Arabic Content')}
              <span className="text-destructive ms-1">*</span>
            </label>
            <textarea
              value={contentAr}
              onChange={(e) => setContentAr(e.target.value)}
              placeholder={t('admin.footer.contentArPlaceholder', 'أدخل المحتوى العربي هنا...')}
              className="w-full h-[500px] px-4 py-3 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary resize-none font-mono text-sm"
              dir="rtl"
            />
            <div className="text-xs text-muted-foreground">
              {contentAr.length} {t('common.characters', 'characters')}
            </div>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
        <h3 className="font-medium text-sm text-foreground">
          {t('admin.footer.helpTitle', 'Usage Guidelines')}
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t('admin.footer.help.both', 'Both English and Arabic content are required')}</li>
          <li>{t('admin.footer.help.markdown', 'Supports plain text and Markdown formatting')}</li>
          <li>{t('admin.footer.help.auto', 'Content is automatically published after saving')}</li>
          <li>{t('admin.footer.help.public', 'Public users will see this content in footer links')}</li>
        </ul>
      </div>
    </div>
  );
}
