'use client';

import { useState, useEffect } from &apos;react&apos;;
import Link from &apos;next/link&apos;;
import { MessageSquare, Plus, Bot, BookOpen, Play, ChevronRight, Star, Users, Building2, DollarSign, Wrench, FileText, Headphones } from &apos;lucide-react&apos;;
import HelpWidget from &apos;@/src/components/HelpWidget&apos;;

interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: &apos;Beginner&apos; | &apos;Intermediate&apos; | &apos;Advanced&apos;;
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

export default function HelpHome() {
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSupportTicket, setShowSupportTicket] = useState(false);

  // Interactive tutorials
  const tutorials: Tutorial[] = [
    {
      id: &apos;1',
      title: &apos;Getting Started with Fixzit FM&apos;,
      description: &apos;Learn the basics of facility management in Fixzit&apos;,
      category: &apos;Facility Management&apos;,
      duration: &apos;15 min&apos;,
      difficulty: &apos;Beginner&apos;,
      featured: true,
      completed: false
    },
    {
      id: &apos;2',
      title: 'Creating Your First Work Order&apos;,
      description: &apos;Step-by-step guide to create and assign work orders&apos;,
      category: &apos;Work Orders&apos;,
      duration: &apos;10 min&apos;,
      difficulty: &apos;Beginner&apos;,
      completed: false
    },
    {
      id: &apos;3',
      title: &apos;Vendor Management Best Practices&apos;,
      description: &apos;Learn how to manage vendors and procurement processes&apos;,
      category: &apos;Procurement&apos;,
      duration: &apos;20 min&apos;,
      difficulty: &apos;Intermediate&apos;,
      completed: false
    },
    {
      id: &apos;4',
      title: 'Tenant Relations & Communication&apos;,
      description: &apos;Master tenant communication and relationship management&apos;,
      category: &apos;Customer Service&apos;,
      duration: &apos;12 min&apos;,
      difficulty: &apos;Beginner&apos;,
      completed: false
    },
    {
      id: &apos;5',
      title: &apos;Financial Reporting & Invoicing&apos;,
      description: &apos;Complete guide to financial management in Fixzit&apos;,
      category: &apos;Finance&apos;,
      duration: &apos;25 min&apos;,
      difficulty: &apos;Intermediate&apos;,
      completed: false
    }
  ];

  // Help articles
  const helpArticles: HelpArticle[] = [
    {
      id: &apos;1',
      title: 'How to Create Properties&apos;,
      category: &apos;Properties&apos;,
      description: &apos;Learn how to add and manage properties in the system&apos;,
      readTime: &apos;5 min&apos;,
      lastUpdated: &apos;2025-01-15&apos;
    },
    {
      id: &apos;2',
      title: &apos;Work Order Lifecycle&apos;,
      category: &apos;Work Orders&apos;,
      description: &apos;Understanding the complete work order process&apos;,
      readTime: &apos;8 min&apos;,
      lastUpdated: &apos;2025-01-14&apos;
    },
    {
      id: &apos;3',
      title: 'Vendor Onboarding Process&apos;,
      category: &apos;Vendors&apos;,
      description: &apos;How to add new vendors to your system&apos;,
      readTime: &apos;6 min&apos;,
      lastUpdated: &apos;2025-01-13&apos;
    },
    {
      id: &apos;4',
      title: &apos;Invoice Generation & Payment&apos;,
      category: &apos;Finance&apos;,
      description: &apos;Complete guide to invoicing and payment processing&apos;,
      readTime: &apos;10 min&apos;,
      lastUpdated: &apos;2025-01-12&apos;
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case &apos;facility management&apos;:
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'work orders&apos;:
        return <Wrench className="w-5 h-5 text-green-600" />;
      case 'procurement&apos;:
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'customer service&apos;:
        return <Users className="w-5 h-5 text-yellow-600" />;
      case 'finance&apos;:
        return <DollarSign className="w-5 h-5 text-green-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-gray-600" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner&apos;: return &apos;bg-green-100 text-green-800&apos;;
      case &apos;Intermediate&apos;: return &apos;bg-yellow-100 text-yellow-800&apos;;
      case &apos;Advanced&apos;: return &apos;bg-red-100 text-red-800&apos;;
      default: return &apos;bg-gray-100 text-gray-800&apos;;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
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
              onClick={() => setShowAIChat(true)}
              className="bg-white text-[#0061A8] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Bot className="w-5 h-5" />
              Ask AI Assistant
            </button>
            <button
              onClick={() => setShowSupportTicket(true)}
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
                    style={{ width: tutorial.completed ? '100%&apos; : &apos;0%&apos; }}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {helpArticles.map((article) => (
              <div key={article.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getCategoryIcon(article.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{article.category}</span>
                        <span>•</span>
                        <span>{article.readTime} read</span>
                      </div>
                      <Link
                        href={`/help/article/${article.id}`}
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

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Fixzit AI Assistant</h3>
                    <p className="text-sm text-gray-500">Ask me anything about Fixzit!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIChat(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 p-6">
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">AI Assistant Coming Soon!</h4>
                <p className="text-gray-600">
                  Our intelligent assistant will help you with questions about Fixzit features and provide personalized guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {showSupportTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">Create Support Ticket</h3>
                <p className="text-gray-600">
                  Fill out the form below and our support team will get back to you within 24 hours.
                </p>
              </div>
              <button
                onClick={() => setShowSupportTicket(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option>Facility Management</option>
                    <option>Marketplace</option>
                    <option>Real Estate</option>
                    <option>Account</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                  placeholder="Please provide detailed information about your issue or request..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupportTicket(false)}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <HelpWidget />
    </div>
  );
}
