'use client';
import { useEffect, useState, useRef } from 'react';
import { Search, X, ChevronRight, MessageSquare, FileText, HelpCircle, Clock, BookOpen, Sparkles, Phone } from 'lucide-react';
import { useI18n } from '@/src/providers/RootProviders';

type Props = { 
  orgId: string; 
  lang: 'ar'|'en'; 
  role: string; 
  route?: string;
  userName?: string;
};

type Tab = 'ai' | 'guides' | 'new' | 'contact';

interface Article {
  _id: string;
  title: string;
  module: string;
  slug: string;
}

export default function EnhancedKnowledgeWidget({ orgId, lang, role, route, userName }: Props) {
  const { t, language, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('ai');
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('kb_search_history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, activeTab]);

  // Fetch guides
  const fetchGuides = async (search?: string) => {
    try {
      const params = new URLSearchParams({
        orgId,
        lang: language,
        role,
        ...(search && { search })
      });
      const res = await fetch(`/api/kb/guides?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (error) {
      console.error('Failed to fetch guides:', error);
    }
  };

  // Fetch recent/new articles
  const fetchRecent = async () => {
    try {
      const params = new URLSearchParams({
        orgId,
        lang: language,
        role,
        recent: 'true'
      });
      const res = await fetch(`/api/kb/guides?${params}`);
      const data = await res.json();
      setRecentArticles(data.articles || []);
    } catch (error) {
      console.error('Failed to fetch recent articles:', error);
    }
  };

  // Load content based on active tab
  useEffect(() => {
    if (open) {
      if (activeTab === 'guides') {
        fetchGuides();
      } else if (activeTab === 'new') {
        fetchRecent();
      }
    }
  }, [open, activeTab]);

  // Ask AI
  const askAI = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('kb_search_history', JSON.stringify(newHistory));
    
    try {
      // Track analytics
      await fetch('/api/kb/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          action: 'search',
          searchQuery: query,
          userId: userName,
          userRole: role,
          metadata: { locale: language }
        })
      });

      // Get AI answer
      const res = await fetch('/api/kb/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, orgId, lang: language, role, route })
      });
      const data = await res.json();
      setAiAnswer(data.answer);
    } catch (error) {
      console.error('Failed to get AI answer:', error);
      setAiAnswer(language === 'ar' ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' : 'Sorry, an error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle search in guides
  const handleGuidesSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length > 2) {
      fetchGuides(value);
    } else if (value.length === 0) {
      fetchGuides();
    }
  };

  const tabs = [
    { id: 'ai' as Tab, icon: Sparkles, label: language === 'ar' ? 'مساعد AI' : 'AI Assistant' },
    { id: 'guides' as Tab, icon: BookOpen, label: language === 'ar' ? 'الأدلة' : 'Guides' },
    { id: 'new' as Tab, icon: Clock, label: language === 'ar' ? 'الجديد' : "What's New" },
    { id: 'contact' as Tab, icon: Phone, label: language === 'ar' ? 'الدعم' : 'Contact Support' }
  ];

  return (
    <>
      {/* Help Button */}
      <button 
        aria-label={t('common.help')}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-40 group"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-[#00A859] rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
          <div className="relative flex items-center gap-2 px-4 py-3 bg-[#0061A8] text-white rounded-full shadow-lg hover:bg-[#00A859] transition-all transform hover:scale-105">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">{language === 'ar' ? 'مساعدة' : 'Help'}</span>
          </div>
        </div>
      </button>

      {/* Knowledge Center Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div 
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {language === 'ar' ? 'مركز المعرفة' : 'Knowledge Center'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'ar' ? 'ابحث عن الإجابات والأدلة والمساعدة' : 'Find answers, guides, and get help'}
                </p>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-slate-800">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#0061A8] dark:text-[#00A859] border-b-2 border-[#0061A8] dark:border-[#00A859]'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* AI Assistant Tab */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && askAI()}
                      placeholder={language === 'ar' ? 'اسأل أي سؤال...' : 'Ask anything...'}
                      className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8] dark:bg-slate-800 dark:border-slate-700"
                    />
                    <button
                      onClick={askAI}
                      disabled={loading || !query.trim()}
                      className="px-6 py-3 bg-[#00A859] text-white rounded-lg hover:bg-[#0061A8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Recent searches */}
                  {searchHistory.length > 0 && !aiAnswer && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {language === 'ar' ? 'البحث الأخير' : 'Recent searches'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.slice(0, 5).map((h, i) => (
                          <button
                            key={i}
                            onClick={() => { setQuery(h); askAI(); }}
                            className="px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Answer */}
                  {aiAnswer && (
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: aiAnswer.replace(/\n/g, '<br/>') }} />
                      </div>
                      <div className="flex items-center gap-4 pt-4 border-t dark:border-slate-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {language === 'ar' ? 'هل كان هذا مفيدًا؟' : 'Was this helpful?'}
                        </p>
                        <button className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm">
                          {language === 'ar' ? 'نعم' : 'Yes'}
                        </button>
                        <button className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm">
                          {language === 'ar' ? 'لا' : 'No'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Guides Tab */}
              {activeTab === 'guides' && (
                <div className="space-y-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleGuidesSearch}
                    placeholder={language === 'ar' ? 'البحث في الأدلة...' : 'Search guides...'}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8] dark:bg-slate-800 dark:border-slate-700"
                  />

                  <div className="grid gap-3">
                    {articles.map(article => (
                      <a
                        key={article._id}
                        href={`/help/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{article.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{article.module}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </a>
                    ))}
                    {articles.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        {language === 'ar' ? 'لم يتم العثور على أدلة' : 'No guides found'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* What's New Tab */}
              {activeTab === 'new' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {language === 'ar' ? 'التحديثات الأخيرة' : 'Recent Updates'}
                  </h3>
                  <div className="grid gap-3">
                    {recentArticles.map(article => (
                      <a
                        key={article._id}
                        href={`/help/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-[#FFB400]" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{article.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{article.module}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </a>
                    ))}
                    {recentArticles.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        {language === 'ar' ? 'لا توجد تحديثات جديدة' : 'No new updates'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Support Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div className="bg-[#0061A8]/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {language === 'ar' ? 'هل تحتاج إلى مساعدة إضافية؟' : 'Need more help?'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {language === 'ar' 
                        ? 'فريق الدعم لدينا متاح للمساعدة في أي أسئلة أو مشاكل.'
                        : 'Our support team is available to help with any questions or issues.'}
                    </p>
                    <div className="grid gap-3">
                      <a
                        href="/support/ticket/new"
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-[#00A859]" />
                          <span className="font-medium">{language === 'ar' ? 'إنشاء تذكرة دعم' : 'Create Support Ticket'}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </a>
                      <a
                        href="/support"
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <HelpCircle className="w-5 h-5 text-[#0061A8]" />
                          <span className="font-medium">{language === 'ar' ? 'عرض التذاكر المفتوحة' : 'View Open Tickets'}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800 border-t dark:border-slate-700 text-center text-sm text-gray-600 dark:text-gray-400">
              {language === 'ar' ? 'اختصار: ⌘/ أو Ctrl/' : 'Shortcut: ⌘/ or Ctrl/'} · 
              {language === 'ar' ? ' مخصص لدورك ومؤسستك' : ' Personalized for your role and organization'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
