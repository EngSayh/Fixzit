'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/src/contexts/TranslationContext';
import Link from 'next/link';
import { MessageSquare, Plus, Bot, BookOpen, Play, ChevronRight, Star, Users, Building2, DollarSign, Wrench, FileText, Headphones } from 'lucide-react';
import HelpWidget from '@/src/components/HelpWidget';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  featured?: boolean;
  completed?: boolean;
}

  interface HelpArticle {
  id: string;
  title: string;
  category: string;
  description?: string;
  readTime?: string;
  lastUpdated?: string;
}

/**
 * Render the Help home page with tutorials, fetched help articles, and system overview.
 *
 * Displays a hero with quick actions (opens dedicated AI chat and support ticket pages), an
 * interactive tutorials grid, a Help Articles list populated from GET /api/help/articles,
 * and a System Overview. Articles are fetched on mount; while loading the list is treated as
 * empty and failures result in an empty articles list. UI elements link to internal help pages.
 *
 * @returns A React element for the Help center landing page.
 */
export default function HelpHome() {
  const { isRTL } = (() => {
    try { return useTranslation(); } catch { return { isRTL: false } as any; }
  })();
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSupportTicket, setShowSupportTicket] = useState(false);

  // Interactive tutorials
  const tutorials: Tutorial[] = [
    {
      id: '1',
      title: 'Getting Started with Fixzit FM',
      description: 'Learn the basics of facility management in Fixzit',
      category: 'Facility Management',
      duration: '15 min',
      difficulty: 'Beginner',
      featured: true,
      completed: false
    },
    {
      id: '2',
      title: 'Creating Your First Work Order',
      description: 'Step-by-step guide to create and assign work orders',
      category: 'Work Orders',
      duration: '10 min',
      difficulty: 'Beginner',
      completed: false
    },
    {
      id: '3',
      title: 'Vendor Management Best Practices',
      description: 'Learn how to manage vendors and procurement processes',
      category: 'Procurement',
      duration: '20 min',
      difficulty: 'Intermediate',
      completed: false
    },
    {
      id: '4',
      title: 'Tenant Relations & Communication',
      description: 'Master tenant communication and relationship management',
      category: 'Customer Service',
      duration: '12 min',
      difficulty: 'Beginner',
      completed: false
    },
    {
      id: '5',
      title: 'Financial Reporting & Invoicing',
      description: 'Complete guide to financial management in Fixzit',
      category: 'Finance',
      duration: '25 min',
      difficulty: 'Intermediate',
      completed: false
    }
  ];

  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoadingArticles(true);
      try {
        const res = await fetch('/api/help/articles');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load articles');
        const items = (data?.items || []).map((a: any) => ({
          id: a.slug,
          title: a.title,
          category: a.category || 'General',
          description: '',
          readTime: '',
          lastUpdated: a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0,10) : ''
        })) as HelpArticle[];
        setArticles(items);
        setLoadError(null);
      } catch (err: any) {
        setArticles([]);
        setLoadError('There was an error loading help articles. Please try again.');
      } finally {
        setLoadingArticles(false);
      }
    };
    run();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'facility management':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'work orders':
        return <Wrench className="w-5 h-5 text-green-600" />;
      case 'procurement':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'customer service':
        return <Users className="w-5 h-5 text-yellow-600" />;
      case 'finance':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#023047] via-[#0061A8] to-[#00A859] text-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <h1 className="text-4xl font-bold mb-4">Fixzit Knowledge Center</h1>
          <p className="text-xl opacity-90 mb-8">
            Interactive tutorials, guides, and resources to master Fixzit Enterprise
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => { window.open('/help/ai-chat', '_blank'); }}
              className="bg-white text-[#0061A8] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              Ask AI Assistant
            </button>
            <button
              onClick={() => { window.open('/help/support-ticket', '_blank'); }}
              className="bg-[#FFB400] text-[#0061A8] px-6 py-3 rounded-lg font-semibold hover:bg-[#FFB400]/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Support Ticket
            </button>
            <a
              href="/support/my-tickets"
              className="bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
            >
              <MessageSquare className="w-5 h-5" />
              View My Tickets
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Tutorials Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Interactive Tutorials</h2>
            <p className="text-xl text-gray-600">
              Learn Fixzit step-by-step with our guided tutorials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tutorials.map((tutorial) => (
              <div key={tutorial.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(tutorial.category)}
                      <span className="text-sm text-gray-500">{tutorial.category}</span>
                      {tutorial.featured && <Star className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{tutorial.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{tutorial.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                      {tutorial.difficulty}
                    </span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1">
                    Start Tutorial
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: tutorial.completed ? '100%' : '0%' }}
                  ></div>
                </div>
                {tutorial.completed && (
                  <div className="mt-2 text-green-600 text-sm font-medium">
                    ✓ Completed
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              View All Tutorials →
            </button>
          </div>
        </div>
      </section>

      {/* Help Articles Section */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Help Articles</h2>
            <p className="text-xl text-gray-600">
              Quick answers to common questions and detailed guides
            </p>
          </div>

          {loadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(loadingArticles ? [] : articles).map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getCategoryIcon(article.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-gray-600 text-sm mb-3">{article.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{article.category}</span>
                        <span>•</span>
                        {article.readTime && <span>{article.readTime} read</span>}
                        {article.lastUpdated && <span>Updated {article.lastUpdated}</span>}
                      </div>
                      <Link
                        href={`/help/${article.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                      >
                        Read More
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!loadingArticles && !loadError && articles.length === 0) && (
              <div className="text-center text-gray-500">No articles found.</div>
            )}
          </div>

          <div className="text-center mt-8">
            <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300">
              View All Articles →
            </button>
          </div>
        </div>
      </section>

      {/* System Overview Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">System Overview</h2>
            <p className="text-xl text-gray-600">
              Understand how Fixzit Enterprise works
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Properties</h3>
              <p className="text-gray-600 text-sm">
                Manage residential and commercial properties with comprehensive tools
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Work Orders</h3>
              <p className="text-gray-600 text-sm">
                Create, assign, and track maintenance requests with SLA management
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Vendors</h3>
              <p className="text-gray-600 text-sm">
                Source materials, manage vendors, and streamline procurement
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Finance</h3>
              <p className="text-gray-600 text-sm">
                Handle invoicing, payments, and financial reporting
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat and Support Ticket modals removed in favor of dedicated pages */}
      <HelpWidget />
    </div>
  );
}
