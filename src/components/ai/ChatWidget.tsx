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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<{ wo?: string; file?: File | null } | null>(null);

  // Initialize session from local storage or API (support E2E locale override)
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('/api/session/me');
        if (response.ok) {
          const sessionData = await response.json();
          let finalLocale: 'en' | 'ar' = sessionData.locale === 'ar' ? 'ar' : 'en';
          try {
            const ls = (localStorage.getItem('fxz.lang') || '').toLowerCase();
            if (ls === 'ar' || ls === 'en') finalLocale = ls as 'en' | 'ar';
          } catch {}
          const finalDir: 'ltr' | 'rtl' = finalLocale === 'ar' ? 'rtl' : 'ltr';
          setSession({ ...sessionData, locale: finalLocale, dir: finalDir });
        } else {
          // Fallback for guest users
          const guest: any = {
            userId: 'guest',
            orgId: 'guest',
            role: 'GUEST',
            name: 'Guest User',
            email: '',
            locale: 'en',
            dir: 'ltr'
          };
          try {
            const ls = (localStorage.getItem('fxz.lang') || '').toLowerCase();
            if (ls === 'ar') { guest.locale = 'ar'; guest.dir = 'rtl'; }
          } catch {}
          setSession(guest);
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
          ? '• إنشاء تذاكر صيانة\n• عرض تذاكري النشطة\n• معلومات عن العقارات\n• أسئلة عامة عن النظام\n\n/commands: /new-ticket, /my-tickets, /help'
          : '• Create maintenance tickets\n• View my active tickets\n• Property information\n• General system questions\n\n/commands: /new-ticket, /my-tickets, /help',
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
      // Support client-side /help for tests
      if (userMessage.content.trim().toLowerCase().startsWith('/help')) {
        const helpMsg: Message = {
          id: `assistant-help-${Date.now()}`,
          role: 'assistant',
          content: session.locale === 'ar'
            ? 'الأوامر المتاحة:\n/new-ticket — إنشاء تذكرة جديدة\n/my-tickets — عرض تذاكري'
            : 'Available commands:\n/new-ticket — create a new ticket\n/my-tickets — list my tickets',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, helpMsg]);
        return;
      }

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
      // Unified tool execution contract
      if (action.type === 'tool' && action.endpoint) {
        // Special case: upload-attachment with dataUrl if a file was picked
        if (action.name === 'upload_attachment' && pendingUpload?.file) {
          const file = pendingUpload.file;
          const reader = new FileReader();
          const dataUrl: string = await new Promise((resolve, reject) => {
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          });
          action.payload = { ...(action.payload || {}), dataUrl };
        }

        const res = await fetch(action.endpoint, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: action.method === 'GET' ? undefined : JSON.stringify(action.payload || {})
        });
        // Optionally, we could surface result back into chat
        if (res.ok) {
          const json = await res.json();
          const summary = session.locale === 'ar' ? 'تم تنفيذ الأداة بنجاح.' : 'Tool executed successfully.';
          setMessages(prev => [...prev, { id: `tool-${Date.now()}`, role: 'assistant', content: summary, timestamp: new Date() }]);
          setPendingUpload(null);
        } else {
          const err = await res.json().catch(() => ({} as any));
          const msg = session.locale === 'ar' ? (err.error || 'فشل تنفيذ الأداة') : (err.error || 'Tool execution failed');
          setMessages(prev => [...prev, { id: `toolerr-${Date.now()}`, role: 'assistant', content: msg, timestamp: new Date() }]);
          setPendingUpload(null);
        }
        return;
      }
      if (action.type === 'info' && action.message === 'help') {
        const content = session.locale === 'ar'
          ? 'أوامر سريعة: /new-ticket, /my-tickets, /approve <WO>, /statements, /schedule, /dispatch'
          : 'Quick commands: /new-ticket, /my-tickets, /approve <WO>, /statements, /schedule, /dispatch';
        setMessages(prev => [...prev, { id: `help-${Date.now()}`, role: 'assistant', content, timestamp: new Date() }]);
        return;
      }
      console.log('Unknown action:', action);
    } catch (error) {
      console.error('Action execution error:', error);
    }
  };

  const onPickFile = () => fileInputRef.current?.click();
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingUpload({ file: f });
    const note = session?.locale === 'ar' ? 'تم اختيار ملف. أرسل رسالة: "إرفاق صورة" وحدد WO#.' : 'File selected. Send a message like: "attach photo" and include WO#.';
    setMessages(prev => [...prev, { id: `pick-${Date.now()}`, role: 'assistant', content: note, timestamp: new Date() }]);
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
    <div className={`fixed bottom-4 ${session.dir === 'rtl' ? 'left-4' : 'right-4'} z-[9999]`}>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white font-semibold ${
          isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-[#0061A8] hover:bg-[#0061A8]/90'
        }`}
        aria-label={session.locale === 'ar' ? 'مساعد Fixzit' : 'Fixzit Assistant'}
        data-testid="ai-assistant-button"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`absolute bottom-16 ${session.dir === 'rtl' ? 'left-0' : 'right-0'} w-80 sm:w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col`}>
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
            <div className="text-[11px] opacity-90">
              {session.locale === 'ar' ? 'دعم متاح على مدار الساعة' : 'Here to help 24/7'}
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
                data-testid="ai-input"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={onFileChange}
              />
              <button
                onClick={onPickFile}
                disabled={isLoading}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                title={session.locale === 'ar' ? 'إرفاق ملف' : 'Attach file'}
              >
                {session.locale === 'ar' ? 'مرفق' : 'Attach'}
              </button>
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
