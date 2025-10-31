'use client';

import { useState} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MessageSquare, Plus, Bot, BookOpen, Play, ChevronRight, Star, Users, Building2, DollarSign, Wrench, FileText} from 'lucide-react';

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

  // Help articles
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'How to Create Properties',
      category: 'Properties',
      description: 'Learn how to add and manage properties in the system',
      readTime: '5 min',
      lastUpdated: '2025-01-15'
    },
    {
      id: '2',
      title: 'Work Order Lifecycle',
      category: 'Work Orders',
      description: 'Understanding the complete work order process',
      readTime: '8 min',
      lastUpdated: '2025-01-14'
    },
    {
      id: '3',
      title: 'Vendor Onboarding Process',
      category: 'Vendors',
      description: 'How to add new vendors to your system',
      readTime: '6 min',
      lastUpdated: '2025-01-13'
    },
    {
      id: '4',
      title: 'Invoice Generation & Payment',
      category: 'Finance',
      description: 'Complete guide to invoicing and payment processing',
      readTime: '10 min',
      lastUpdated: '2025-01-12'
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'facility management':
        return <Building2 className="w-5 h-5 text-[var(--fixzit-primary)]" />;
      case 'work orders':
        return <Wrench className="w-5 h-5 text-[var(--fixzit-success)]" />;
      case 'procurement':
        return <FileText className="w-5 h-5 text-[var(--fixzit-secondary)]" />;
      case 'customer service':
        return <Users className="w-5 h-5 text-[var(--fixzit-accent)]" />;
      case 'finance':
        return <DollarSign className="w-5 h-5 text-[var(--fixzit-success)]" />;
      default:
        return <BookOpen className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-brand-500 via-brand-500 to-success text-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <h1 className="text-4xl font-bold mb-4">Fixzit Knowledge Center</h1>
          <p className="text-xl opacity-90 mb-8">
            Interactive tutorials, guides, and resources to master Fixzit Enterprise
          </p>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAIChat(true)}
              className="bg-card text-primary px-6 py-3 rounded-2xl font-semibold hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              Ask AI Assistant
            </button>
            <Link
              href="/help/support-ticket"
              className="bg-accent text-foreground px-6 py-3 rounded-2xl font-semibold hover:bg-accent-dark transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Support Ticket
            </Link>
            <Link
              href="/support/my-tickets"
              className="bg-white/10 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2 border border-white/20"
            >
              <MessageSquare className="w-5 h-5" />
              View My Tickets
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Tutorials Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Interactive Tutorials</h2>
            <p className="text-xl text-muted-foreground">
              Learn Fixzit step-by-step with our guided tutorials
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
                      {tutorial.featured && <Star className="w-4 h-4 text-[var(--fixzit-accent-light)]" />}
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
                    className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)] font-medium text-sm flex items-center gap-1"
                  >
                    Start Tutorial
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-[var(--fixzit-primary)] h-2 rounded-full"
                    style={{ width: tutorial.completed ? '100%' : '0%' }}
                  ></div>
                </div>
                {tutorial.completed && (
                  <div className="mt-2 text-[var(--fixzit-success)] text-sm font-medium">
                    ✓ Completed
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
              View All Tutorials →
            </Link>
          </div>
        </div>
      </section>

      {/* Help Articles Section */}
      <section className="py-16 bg-muted">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Help Articles</h2>
            <p className="text-xl text-muted-foreground">
              Quick answers to common questions and detailed guides
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
                        className="text-[var(--fixzit-primary)] hover:text-[var(--fixzit-primary-darker)] font-medium text-sm flex items-center gap-1"
                      >
                        Read More
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
              View All Articles →
            </Link>
          </div>
        </div>
      </section>

      {/* System Overview Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">System Overview</h2>
            <p className="text-xl text-muted-foreground">
              Understand how Fixzit Enterprise works
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--fixzit-primary-lighter)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-[var(--fixzit-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Properties</h3>
              <p className="text-muted-foreground text-sm">
                Manage residential and commercial properties with comprehensive tools
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--fixzit-success-lighter)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-[var(--fixzit-success)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Work Orders</h3>
              <p className="text-muted-foreground text-sm">
                Create, assign, and track maintenance requests with SLA management
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--fixzit-secondary-lighter)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[var(--fixzit-secondary)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Vendors</h3>
              <p className="text-muted-foreground text-sm">
                Source materials, manage vendors, and streamline procurement
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[var(--fixzit-accent-lighter)] rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-[var(--fixzit-accent)]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Finance</h3>
              <p className="text-muted-foreground text-sm">
                Handle invoicing, payments, and financial reporting
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

