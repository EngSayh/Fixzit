'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, MessageSquare, BookOpen, X, ChevronUp, ChevronDown } from 'lucide-react';

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        setIsOpen(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      action: () => window.open('/help/ai-chat', '_blank')
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
                  <button className="text-left text-blue-600 hover:text-blue-700">Work Orders</button>
                  <button className="text-left text-blue-600 hover:text-blue-700">Properties</button>
                  <button className="text-left text-blue-600 hover:text-blue-700">Vendors</button>
                  <button className="text-left text-blue-600 hover:text-blue-700">Invoices</button>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Quick Links</h4>
                <div className="space-y-1">
                  <button className="block text-blue-600 hover:text-blue-700">Getting Started</button>
                  <button className="block text-blue-600 hover:text-blue-700">Video Tutorials</button>
                  <button className="block text-blue-600 hover:text-blue-700">Best Practices</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
