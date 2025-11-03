'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MessageSquare, Plus, Bot, BookOpen, Play, ChevronRight, Star, Users, Building2, DollarSign, Wrench, FileText } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

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
  description: string;
  readTime: string;
  lastUpdated: string;
}

const AIChat = dynamic(() => import('@/components/AIChat'), { ssr: false });

export default function HelpHome() {
  const [showAIChat, setShowAIChat] = useState(false);
  const { t } = useTranslation();

  // Interactive tutorials
  const tutorials: Tutorial[] = [
    {
      id: '1',
      title: t('helpCenter.tutorials.gettingStarted.title'),
      description: t('helpCenter.tutorials.gettingStarted.description'),
      category: t('helpCenter.categories.facilityManagement'),
      duration: `15 ${t('helpCenter.min')}`,
      difficulty: 'Beginner',
      featured: true,
      completed: false
    },
    {
      id: '2',
      title: t('helpCenter.tutorials.firstWorkOrder.title'),
      description: t('helpCenter.tutorials.firstWorkOrder.description'),
      category: t('helpCenter.categories.workOrders'),
      duration: `10 ${t('helpCenter.min')}`,
      difficulty: 'Beginner',
      completed: false
    },
    {
      id: '3',
      title: t('helpCenter.tutorials.vendorManagement.title'),
      description: t('helpCenter.tutorials.vendorManagement.description'),
      category: t('helpCenter.categories.procurement'),
      duration: `20 ${t('helpCenter.min')}`,
      difficulty: 'Intermediate',
      completed: false
    },
    {
      id: '4',
      title: t('helpCenter.tutorials.tenantRelations.title'),
      description: t('helpCenter.tutorials.tenantRelations.description'),
      category: t('helpCenter.categories.customerService'),
      duration: `12 ${t('helpCenter.min')}`,
      difficulty: 'Beginner',
      completed: false
    },
    {
      id: '5',
      title: t('helpCenter.tutorials.financialReporting.title'),
      description: t('helpCenter.tutorials.financialReporting.description'),
      category: t('helpCenter.categories.finance'),
      duration: `25 ${t('helpCenter.min')}`,
      difficulty: 'Intermediate',
      completed: false
    }
  ];

  // Help articles
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: t('helpCenter.articles.createProperties.title'),
      category: t('helpCenter.categories.properties'),
      description: t('helpCenter.articles.createProperties.description'),
      readTime: `5 ${t('helpCenter.min')} ${t('helpCenter.read')}`,
      lastUpdated: '2025-01-15'
    },
    {
      id: '2',
      title: t('helpCenter.articles.workOrderLifecycle.title'),
      category: t('helpCenter.categories.workOrders'),
      description: t('helpCenter.articles.workOrderLifecycle.description'),
      readTime: `8 ${t('helpCenter.min')} ${t('helpCenter.read')}`,
      lastUpdated: '2025-01-14'
    },
    {
      id: '3',
      title: t('helpCenter.articles.vendorOnboarding.title'),
      category: t('helpCenter.categories.vendors'),
      description: t('helpCenter.articles.vendorOnboarding.description'),
      readTime: `6 ${t('helpCenter.min')} ${t('helpCenter.read')}`,
      lastUpdated: '2025-01-13'
    },
    {
      id: '4',
      title: t('helpCenter.articles.invoiceGeneration.title'),
      category: t('helpCenter.categories.finance'),
      description: t('helpCenter.articles.invoiceGeneration.description'),
      readTime: `10 ${t('helpCenter.min')} ${t('helpCenter.read')}`,
      lastUpdated: '2025-01-12'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'facility management':
        return <Building2 className="w-5 h-5 text-primary" />;
      case 'work orders':
        return <Wrench className="w-5 h-5 text-success" />;
      case 'procurement':
        return <FileText className="w-5 h-5 text-secondary-foreground" />;
      case 'customer service':
        return <Users className="w-5 h-5 text-accent-foreground" />;
      case 'finance':
        return <DollarSign className="w-5 h-5 text-success" />;
      default:
        return <BookOpen className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': 
      case t('helpCenter.difficulty.beginner'): 
        return 'bg-success/10 text-success-foreground';
      case 'Intermediate':
      case t('helpCenter.difficulty.intermediate'):
        return 'bg-warning/10 text-warning-foreground';
      case 'Advanced':
      case t('helpCenter.difficulty.advanced'):
        return 'bg-destructive/10 text-destructive-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary via-primary to-success text-primary-foreground py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <h1 className="text-4xl font-bold mb-4">{t('helpCenter.title')}</h1>
          <p className="text-xl opacity-90 mb-8">
            {t('helpCenter.subtitle')}
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAIChat(true)}
              className="bg-card text-primary px-6 py-3 rounded-2xl font-semibold hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              {t('helpCenter.askAI')}
            </button>
            <Link
              href="/help/support-ticket"
              className="bg-accent text-foreground px-6 py-3 rounded-2xl font-semibold hover:bg-accent-dark transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('helpCenter.createTicket')}
            </Link>
            <Link
              href="/support/my-tickets"
              className="bg-white/10 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
            >
              <MessageSquare className="w-5 h-5" />
              {t('helpCenter.viewTickets')}
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Tutorials Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('helpCenter.interactiveTutorials')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('helpCenter.tutorialsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tutorials.map((tutorial) => (
              <div key={tutorial.id} className="bg-card rounded-2xl shadow-md border border-border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(tutorial.category)}
                      <span className="text-sm text-muted-foreground">{tutorial.category}</span>
                      {tutorial.featured && <Star className="w-4 h-4 text-accent" />}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{tutorial.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{tutorial.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(tutorial.difficulty)}`}>
                      {tutorial.difficulty}
                    </span>
                  </div>
                  <Link
                    href={`/help/tutorial/${tutorial.id}`}
                    className="text-primary hover:text-primary font-medium text-sm flex items-center gap-1"
                  >
                    {t('helpCenter.startTutorial')}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: tutorial.completed ? '100%' : '0%' }}
                  ></div>
                </div>
                {tutorial.completed && (
                  <div className="mt-2 text-success text-sm font-medium">
                    ✓ {t('helpCenter.completed')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/help/tutorials"
              className="inline-block bg-muted text-foreground px-6 py-3 rounded-2xl font-medium hover:bg-muted transition-colors"
            >
              {t('helpCenter.viewAllTutorials')}
            </Link>
          </div>
        </div>
      </section>

      {/* Help Articles Section */}
      <section className="py-16 bg-muted">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('helpCenter.helpArticles')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('helpCenter.articlesSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpArticles.map((article) => (
              <div key={article.id} className="bg-card rounded-2xl shadow-md border border-border p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getCategoryIcon(article.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {article.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{article.category}</span>
                        <span>•</span>
                        <span>{article.readTime} read</span>
                      </div>
                      <Link
                        href={`/help/article/${article.id}`}
                        className="text-primary hover:text-primary font-medium text-sm flex items-center gap-1"
                      >
                        {t('helpCenter.readMore')}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/help/articles"
              className="inline-block bg-card text-foreground px-6 py-3 rounded-2xl font-medium hover:bg-muted transition-colors border border-border"
            >
              {t('helpCenter.viewAllArticles')}
            </Link>
          </div>
        </div>
      </section>

      {/* System Overview Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('helpCenter.systemOverview')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('helpCenter.overviewSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('helpCenter.systemModules.properties.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('helpCenter.systemModules.properties.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('helpCenter.systemModules.workOrders.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('helpCenter.systemModules.workOrders.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('helpCenter.systemModules.vendors.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('helpCenter.systemModules.vendors.description')}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('helpCenter.systemModules.finance.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('helpCenter.systemModules.finance.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Modal */}
      {showAIChat && <AIChat onClose={() => setShowAIChat(false)} />}
      
    </div>
  );
}

