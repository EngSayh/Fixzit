'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, X, Send, Loader2, BookOpen, MessageSquare } from 'lucide-react';

type Props = { 
  orgId: string; 
  lang: 'ar'|'en'; 
  role: string; 
  route?: string;
};

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: Array<{ articleId: string; score: number }>;
}

export default function KnowledgeWidget({ orgId, lang, role, route }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

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

  const ask = async () => {
    if (!q.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: q.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQ('');
    setLoading(true);

    try {
      const res = await fetch('/api/kb/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: q.trim(), 
          orgId, 
          lang, 
          role, 
          route 
        })
      });
      
      const data = await res.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        sources: data.sources
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('AI query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: lang === 'ar' 
          ? 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.'
          : 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const quickActions = useMemo(() => {
    const actions = [
      {
        icon: <BookOpen className="w-4 h-4" />,
        title: lang === 'ar' ? 'مركز المساعدة' : 'Help Center',
        action: () => window.open('/help', '_blank')
      },
      {
        icon: <MessageSquare className="w-4 h-4" />,
        title: lang === 'ar' ? 'إنشاء تذكرة دعم' : 'Create Support Ticket',
        action: () => window.open('/help/support-ticket', '_blank')
      }
    ];
    return actions;
  }, [lang]);

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setOpen(true)}
          className="bg-[#0061A8] hover:bg-[#005a9f] text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 flex items-center gap-2"
          aria-label={lang === 'ar' ? 'فتح المساعدة' : 'Open Help'}
        >
          <Bot className="w-6 h-6" />
          {lang === 'ar' && <span className="text-sm font-medium">مساعدة</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" dir={dir}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg shadow-2xl flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0061A8] rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {lang === 'ar' ? 'مركز المعرفة' : 'Knowledge Center'}
              </h3>
              <p className="text-sm text-gray-500">
                {lang === 'ar' ? 'اسأل أي سؤال حول Fixzit' : 'Ask anything about Fixzit'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              title={lang === 'ar' ? 'خيارات المساعدة' : 'Help Options'}
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Help Options */}
        {showHelp && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                >
                  {action.icon}
                  <span className="text-sm font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-[#0061A8] mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">
                {lang === 'ar' ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?'}
              </h4>
              <p className="text-gray-500 text-sm">
                {lang === 'ar' 
                  ? 'اسأل أي سؤال حول Fixzit وسأحاول مساعدتك'
                  : 'Ask any question about Fixzit and I\'ll try to help you'
                }
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' ? 'bg-[#00A859]' : 'bg-[#0061A8]'
              }`}>
                {message.type === 'user' ? (
                  <span className="text-white text-sm font-bold">U</span>
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-[#00A859] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs opacity-70">
                      {lang === 'ar' ? 'المصادر:' : 'Sources:'} {message.sources.length}
                    </p>
                  </div>
                )}
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#0061A8] rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {lang === 'ar' ? 'جارٍ التفكير...' : 'Thinking...'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={lang === 'ar' ? 'اسأل سؤالك...' : 'Ask a question...'}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8] dark:bg-gray-800 dark:text-white"
              disabled={loading}
            />
            <button
              onClick={ask}
              disabled={!q.trim() || loading}
              className="px-4 py-2 rounded-lg bg-[#00A859] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00994d] transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            {lang === 'ar' 
              ? 'اختصار: ⌘/ أو Ctrl/ • يحترم الدور والسياق'
              : 'Shortcut: ⌘/ or Ctrl/ • Respects role & context'
            }
          </div>
        </div>
      </div>
    </div>
  );
}