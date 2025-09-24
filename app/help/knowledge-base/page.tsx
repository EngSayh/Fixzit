'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, BookOpen, Globe, Users, Clock, Tag } from 'lucide-react';
import KnowledgeWidget from '@/src/components/KnowledgeWidget';

interface KnowledgeArticle {
  _id: string;
  title: string;
  slug: string;
  category: string;
  lang: 'ar' | 'en';
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED';
  updatedAt: string;
  tags: string[];
  roleScopes: string[];
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLang, setSelectedLang] = useState<'all' | 'ar' | 'en'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = [
    'Work Orders',
    'Properties', 
    'Vendors',
    'Finance',
    'Support',
    'General'
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/help/articles');
      const data = await response.json();
      setArticles(data.items || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesLang = selectedLang === 'all' || article.lang === selectedLang;
    
    return matchesSearch && matchesCategory && matchesLang;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-100 text-green-800';
      case 'REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLangFlag = (lang: string) => {
    return lang === 'ar' ? '🇸🇦' : '🇺🇸';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
              <p className="mt-2 text-gray-600">
                Manage help articles, tutorials, and documentation
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005a9f] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Article
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* Language Filter */}
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as 'all' | 'ar' | 'en')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
            >
              <option value="all">All Languages</option>
              <option value="en">🇺🇸 English</option>
              <option value="ar">🇸🇦 Arabic</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-500">
              <Filter className="w-4 h-4 mr-2" />
              {filteredArticles.length} articles found
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0061A8]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <div key={article._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4 text-[#0061A8]" />
                      <span className="text-sm text-gray-500">{article.category}</span>
                      <span className="text-lg">{getLangFlag(article.lang)}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                        {article.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(article.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {article.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{article.tags.length - 3} more</span>
                    )}
                  </div>
                )}

                {/* Role Scopes */}
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {article.roleScopes.slice(0, 2).map((role, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {role}
                      </span>
                    ))}
                    {article.roleScopes.length > 2 && (
                      <span className="text-xs text-gray-500">+{article.roleScopes.length - 2}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <a
                    href={`/help/article/${article.slug}`}
                    className="text-[#0061A8] hover:text-[#005a9f] font-medium text-sm flex items-center gap-1"
                  >
                    Read Article
                    <BookOpen className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      <Globe className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 p-1">
                      <Clock className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory !== 'all' || selectedLang !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Get started by creating your first article'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0061A8] text-white px-4 py-2 rounded-lg hover:bg-[#005a9f] transition-colors"
            >
              Create Article
            </button>
          </div>
        )}
      </div>

      {/* Create Article Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Create New Article</h3>
              <p className="text-gray-600 mt-1">This feature will be available in the next update</p>
            </div>
            <div className="p-6">
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Article creation interface coming soon</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Widget */}
      <KnowledgeWidget 
        orgId="default-org" 
        lang="en" 
        role="ADMIN" 
        route="/help/knowledge-base" 
      />
    </div>
  );
}