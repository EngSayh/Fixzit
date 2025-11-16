'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { HelpCircle, MessageSquare, BookOpen, X, ChevronUp, ChevronDown } from 'lucide-react';

const AIChat = dynamic(() => import('@/components/AIChat'), { ssr: false });

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const helpOptions = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      title: 'Help Center',
      description: 'Browse tutorials and guides',
      action: () => window.open('/help', '_blank')
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: 'AI Assistant',
      description: 'Ask questions and get help',
      action: () => setShowAI(true)
    }
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Open Help"
        >
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showAI && (
        <AIChat onClose={() => setShowAI(false)} />
      )}
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-500">Choose how we can assist you</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Help Options */}
        <div className="p-4 space-y-2">
          {helpOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                option.action();
                setIsOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="text-blue-600 group-hover:text-blue-700">
                  {option.icon}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{option.title}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </div>
            </button>
          ))}

          {/* Quick Actions */}
          <div className="pt-2 border-t border-gray-200 mt-4">
            <button
              onClick={() => window.open('/help/support-ticket', '_blank')}
              className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Create Support Ticket
            </button>
          </div>
        </div>

        {/* Expand/Collapse */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" />
                Show More
              </>
            )}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-200 pt-4">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Popular Topics</h4>
                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href="/help/work-orders"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-left text-blue-600 hover:text-blue-700"
                    aria-label="View Work Orders documentation (opens in a new tab)"
                  >
                    Work Orders
                  </a>
                  <a 
                    href="/help/properties"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-left text-blue-600 hover:text-blue-700"
                    aria-label="View Properties documentation (opens in a new tab)"
                  >
                    Properties
                  </a>
                  <a 
                    href="/help/vendors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-left text-blue-600 hover:text-blue-700"
                    aria-label="View Vendors documentation (opens in a new tab)"
                  >
                    Vendors
                  </a>
                  <a 
                    href="/help/invoices"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-left text-blue-600 hover:text-blue-700"
                    aria-label="View Invoices documentation (opens in a new tab)"
                  >
                    Invoices
                  </a>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Quick Links</h4>
                <div className="space-y-1">
                  <a 
                    href="/help/getting-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700"
                    aria-label="View Getting Started guide (opens in a new tab)"
                  >
                    Getting Started
                  </a>
                  <a 
                    href="/help/video-tutorials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700"
                    aria-label="View Video Tutorials (opens in a new tab)"
                  >
                    Video Tutorials
                  </a>
                  <a 
                    href="/help/best-practices"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 hover:text-blue-700"
                    aria-label="View Best Practices guide (opens in a new tab)"
                  >
                    Best Practices
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

