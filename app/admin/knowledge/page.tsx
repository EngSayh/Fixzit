'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/src/providers/RootProviders';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, Filter } from 'lucide-react';
import Link from 'next/link';

interface Article {
  _id: string;
  title: string;
  module: string;
  lang: string;
  status: string;
  tags: string[];
  updatedAt: string;
  version: number;
}

/**
 * Client-side admin page for managing knowledge-base articles.
 *
 * Renders a searchable, filterable table of articles fetched from /api/admin/knowledge and provides actions
 * to create, edit, delete, and toggle an article's published status. Displays localized (EN/AR) UI text and
 * summary statistics (total, published, in-review, draft).
 *
 * Side effects:
 * - Fetches article list on mount.
 * - Sends DELETE requests to /api/admin/knowledge/{id} to remove articles.
 * - Sends PATCH requests to /api/admin/knowledge/{id}/status to toggle publication status.
 *
 * @returns The Knowledge Admin page React element.
 */
export default function KnowledgeAdminPage() {
  const { t, language } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLang, setFilterLang] = useState('all');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقال؟' : 'Are you sure you want to delete this article?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`/api/admin/knowledge/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchArticles();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesModule = filterModule === 'all' || article.module === filterModule;
    const matchesStatus = filterStatus === 'all' || article.status === filterStatus;
    const matchesLang = filterLang === 'all' || article.lang === filterLang;
    
    return matchesSearch && matchesModule && matchesStatus && matchesLang;
  });

  const modules = ['all', ...Array.from(new Set(articles.map(a => a.module)))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === 'ar' ? 'إدارة قاعدة المعرفة' : 'Knowledge Base Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 'إدارة المقالات والأدلة' : 'Manage articles and guides'}
          </p>
        </div>
        <Link
          href="/admin/knowledge/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0061A8] text-white rounded-md hover:bg-[#0061A8]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {language === 'ar' ? 'مقال جديد' : 'New Article'}
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث في المقالات...' : 'Search articles...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
            />
          </div>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
          >
            <option value="all">{language === 'ar' ? 'جميع الوحدات' : 'All Modules'}</option>
            {modules.slice(1).map(module => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
          >
            <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
            <option value="DRAFT">{language === 'ar' ? 'مسودة' : 'Draft'}</option>
            <option value="REVIEW">{language === 'ar' ? 'قيد المراجعة' : 'In Review'}</option>
            <option value="PUBLISHED">{language === 'ar' ? 'منشور' : 'Published'}</option>
          </select>
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
          >
            <option value="all">{language === 'ar' ? 'جميع اللغات' : 'All Languages'}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {language === 'ar' ? 'لا توجد مقالات' : 'No articles found'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'العنوان' : 'Title'}
                </th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'الوحدة' : 'Module'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'اللغة' : 'Language'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'الحالة' : 'Status'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'الإصدار' : 'Version'}
                </th>
                <th className="px-4 py-3 text-start text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'آخر تحديث' : 'Last Updated'}
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  {language === 'ar' ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredArticles.map((article) => (
                <tr key={article._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{article.title}</div>
                      <div className="text-sm text-gray-500 flex flex-wrap gap-1 mt-1">
                        {article.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{article.module}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {article.lang.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      article.status === 'PUBLISHED' 
                        ? 'bg-green-100 text-green-800' 
                        : article.status === 'REVIEW'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    v{article.version}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(article.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleStatus(article._id, article.status)}
                        className="p-1.5 text-gray-600 hover:text-[#0061A8] transition-colors"
                        title={article.status === 'PUBLISHED' 
                          ? (language === 'ar' ? 'إلغاء النشر' : 'Unpublish') 
                          : (language === 'ar' ? 'نشر' : 'Publish')}
                      >
                        {article.status === 'PUBLISHED' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Link
                        href={`/admin/knowledge/${article._id}/edit`}
                        className="p-1.5 text-gray-600 hover:text-[#0061A8] transition-colors"
                        title={language === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteArticle(article._id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 transition-colors"
                        title={language === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{articles.length}</div>
          <div className="text-sm text-gray-600">
            {language === 'ar' ? 'إجمالي المقالات' : 'Total Articles'}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {articles.filter(a => a.status === 'PUBLISHED').length}
          </div>
          <div className="text-sm text-gray-600">
            {language === 'ar' ? 'منشور' : 'Published'}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {articles.filter(a => a.status === 'REVIEW').length}
          </div>
          <div className="text-sm text-gray-600">
            {language === 'ar' ? 'قيد المراجعة' : 'In Review'}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-600">
            {articles.filter(a => a.status === 'DRAFT').length}
          </div>
          <div className="text-sm text-gray-600">
            {language === 'ar' ? 'مسودة' : 'Draft'}
          </div>
        </div>
      </div>
    </div>
  );
}
