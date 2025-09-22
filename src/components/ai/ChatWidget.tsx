// src/components/ai/ChatWidget.tsx - Always-on corner AI assistant with strict privacy
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Bot, Shield, AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: any[];
}

interface UserSession {
  userId: string;
  orgId: string;
  role: string;
  name: string;
  email: string;
  locale: 'en' | 'ar';
  dir: 'ltr' | 'rtl';
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session from local storage or API
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('/api/session/me');
        if (response.ok) {
          const sessionData = await response.json();
          setSession(sessionData);
        } else {
          // Fallback for guest users
          setSession({
            userId: 'guest',
            orgId: 'guest',
            role: 'GUEST',
            name: 'Guest User',
            email: '',
            locale: 'en',
            dir: 'ltr'
          });
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Failed to initialize chat session');
      }
    };

    initializeSession();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && session) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: session.locale === 'ar'
          ? `مرحباً ${session.name}! أنا مساعد Fixzit الذكي. يمكنني مساعدتك في:`
          : `Hello ${session.name}! I'm your Fixzit AI assistant. I can help you with:`,
        timestamp: new Date()
      };

      const helpOptions: Message = {
        id: 'help-options',
        role: 'assistant',
        content: session.locale === 'ar'
          ? '• إنشاء تذاكر صيانة\n• عرض تذاكري النشطة\n• معلومات عن العقارات\n• أسئلة عامة عن النظام'
          : '• Create maintenance tickets\n• View my active tickets\n• Property information\n• General system questions',
        timestamp: new Date()
      };

      setMessages([welcomeMessage, helpOptions]);
    }
  }, [isOpen, messages.length, session]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !session) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          session,
          locale: session.locale
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        actions: data.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute any actions if present
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await executeAction(action, session);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: session.locale === 'ar'
          ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
          : 'Sorry, there was an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action: any, session: UserSession) => {
    try {
      switch (action.type) {
        case 'create_ticket':
          await fetch('/api/work-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.data)
          });
          break;
        case 'list_tickets':
          const response = await fetch('/api/work-orders?userId=' + session.userId);
          const tickets = await response.json();
          return tickets;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('Action execution error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!session) {
    return null; // Don't render until session is loaded
  }

  return (
    <div className={`fixed bottom-20 ${session.dir === 'rtl' ? 'left-4' : 'right-4'} z-50`}>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white font-semibold ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0061A8] hover:bg-[#0061A8]/90'
        }`}
        aria-label={session.locale === 'ar' ? 'مساعد Fixzit' : 'Fixzit Assistant'}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`absolute bottom-16 ${session.dir === 'rtl' ? 'right-0' : 'left-0'} w-80 sm:w-96 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b border-gray-200 ${session.dir === 'rtl' ? 'text-right' : 'text-left'}`} style={{ backgroundColor: '#0061A8', color: 'white' }}>
            <div className="font-semibold">
              {session.locale === 'ar' ? 'مساعد Fixzit' : 'Fixzit Assistant'}
            </div>
            <div className="text-xs opacity-90 mt-1">
              {session.locale === 'ar'
                ? `${session.name} • ${session.role} • ${session.orgId}`
                : `${session.name} • ${session.role} • ${session.orgId}`
              }
            </div>
          </div>

          {/* Privacy Notice */}
          <div className={`px-4 py-2 text-xs text-gray-600 bg-yellow-50 border-b ${session.dir === 'rtl' ? 'text-right' : 'text-left'}`}>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-600" />
              <span>
                {session.locale === 'ar'
                  ? 'خصوصية مضمونة: بيانات المستأجر فقط'
                  : 'Privacy secured: Tenant data only'
                }
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2 ${message.role === 'user' ? (session.dir === 'rtl' ? 'flex-row-reverse' : 'flex-row') : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' ? 'bg-[#0061A8] text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`flex-1 ${message.role === 'user' ? (session.dir === 'rtl' ? 'text-right' : 'text-left') : ''}`}>
                  <div className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-[#0061A8] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString(session.locale === 'ar' ? 'ar-SA' : 'en-US')}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="p-3 rounded-lg bg-gray-100 text-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#0061A8] border-t-transparent"></div>
                      <span>
                        {session.locale === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={session.locale === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message...'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0061A8] focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 bg-[#0061A8] text-white rounded-lg hover:bg-[#0061A8]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setInputValue(session.locale === 'ar' ? 'إنشاء تذكرة صيانة' : 'Create maintenance ticket')}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {session.locale === 'ar' ? 'تذكرة جديدة' : 'New Ticket'}
              </button>
              <button
                onClick={() => setInputValue(session.locale === 'ar' ? 'عرض تذاكري' : 'Show my tickets')}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {session.locale === 'ar' ? 'تذاكري' : 'My Tickets'}
              </button>
              <button
                onClick={() => setInputValue(session.locale === 'ar' ? 'مساعدة' : 'Help')}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              >
                {session.locale === 'ar' ? 'مساعدة' : 'Help'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute bottom-20 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
