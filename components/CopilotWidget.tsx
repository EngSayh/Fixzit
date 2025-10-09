'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bot, Calendar, CheckCircle2, ClipboardList, FileText, Loader2, Send, ShieldCheck, Upload, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  data?: any;
  intent?: string;
  sources?: { id: string; title: string; score: number; source?: string }[];
}

interface QuickAction {
  name: string;
  label: string;
  description?: string;
}

interface CopilotProfile {
  session: {
    role: string;
    name?: string;
    tenantId: string;
    locale: 'en' | 'ar';
  };
  tools: string[];
  quickActions: QuickAction[];
}

interface CopilotWidgetProps {
  autoOpen?: boolean;
  embedded?: boolean;
}

const translations = {
  en: {
    title: 'Fixzit Copilot',
    subtitle: (name?: string, role?: string) => name ? `${name} · ${role}` : (role || 'Signed out'),
    placeholder: 'Ask how to do something in Fixzit…',
    send: 'Send',
    open: 'Ask Fixzit',
    close: 'Close',
    quickActions: 'Self-service actions',
    privacy: 'Privacy enforced: tenant & role scoped',
    welcome: 'Need anything? I can create maintenance tickets, share process steps or retrieve finance statements if your role allows it.',
    guestWarning: 'I could not verify your session. Sign in to use Copilot actions.',
    loading: 'Working on it…',
    toolError: 'Unable to complete this action.',
    requiredField: 'Please complete the required fields.',
    chooseFile: 'Choose file',
    cancel: 'Cancel',
    run: 'Run'
  },
  ar: {
    title: 'مساعد فيكزت',
    subtitle: (name?: string, role?: string) => name ? `${name} · ${role}` : (role || 'غير مسجل'),
    placeholder: 'اسأل عن أي إجراء داخل النظام…',
    send: 'إرسال',
    open: 'اسأل فيكزت',
    close: 'إغلاق',
    quickActions: 'إجراءات ذاتية',
    privacy: 'الخصوصية مفعلة: ضمن المستأجر والصلاحيات فقط',
    welcome: 'كيف أستطيع مساعدتك؟ أُنشئ تذاكر صيانة، أوضح الخطوات، وأعرض البيانات المالية إذا كانت صلاحيتك تسمح.',
    guestWarning: 'لم أستطع التحقق من الجلسة. سجّل الدخول لاستخدام إجراءات المساعد.',
    loading: 'جارٍ التنفيذ…',
    toolError: 'تعذر تنفيذ هذا الإجراء.',
    requiredField: 'يرجى إكمال الحقول المطلوبة.',
    chooseFile: 'اختر ملفاً',
    cancel: 'إلغاء',
    run: 'تنفيذ'
  }
};

type ToolFormState = Record<string, any>;

const initialForms: Record<string, ToolFormState> = {
  createWorkOrder: { title: '', description: '', priority: 'MEDIUM' },
  dispatchWorkOrder: { workOrderId: '', assigneeUserId: '' },
  scheduleVisit: { workOrderId: '', scheduledFor: '' },
  uploadWorkOrderPhoto: { workOrderId: '', file: undefined as File | undefined },
  ownerStatements: { ownerId: '', period: 'YTD', year: String(new Date().getFullYear()) }
};

const toolIcons: Record<string, JSX.Element> = {
  createWorkOrder: <ClipboardList className="h-4 w-4" />,
  listMyWorkOrders: <FileText className="h-4 w-4" />,
  dispatchWorkOrder: <CheckCircle2 className="h-4 w-4" />,
  scheduleVisit: <Calendar className="h-4 w-4" />,
  uploadWorkOrderPhoto: <Upload className="h-4 w-4" />,
  ownerStatements: <ShieldCheck className="h-4 w-4" />
};

function renderStructuredData(message: ChatMessage, locale: 'en' | 'ar') {
  if (!message.data) return null;

  if (message.intent === 'listMyWorkOrders' && Array.isArray(message.data)) {
    return (
      <ul className="mt-3 space-y-2 text-xs">
        {message.data.map((item: unknown) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white/70 p-2">
            <div className="font-semibold text-gray-800">{item.code} · {item.title}</div>
            <div className="text-gray-500">{item.status} · {item.priority}</div>
          </li>
        ))}
      </ul>
    );
  }

  if (message.intent === 'ownerStatements' && message.data?.totals) {
    const { totals, currency } = message.data;
    return (
      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between"><span>{locale === 'ar' ? 'الدخل' : 'Income'}</span><span>{totals.income.toLocaleString(undefined, { style: 'currency', currency })}</span></div>
        <div className="flex justify-between"><span>{locale === 'ar' ? 'المصروفات' : 'Expenses'}</span><span>{totals.expenses.toLocaleString(undefined, { style: 'currency', currency })}</span></div>
        <div className="flex justify-between font-semibold text-[#0061A8]"><span>{locale === 'ar' ? 'الصافي' : 'Net'}</span><span>{totals.net.toLocaleString(undefined, { style: 'currency', currency })}</span></div>
      </div>
    );
  }

  if (message.data?.attachment) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-[#0061A8]">
        <CheckCircle2 className="h-4 w-4" />
        <a href={message.data.attachment.url} target="_blank" rel="noreferrer" className="underline">
          {message.data.attachment.name}
        </a>
      </div>
    );
  }

  return null;
}

export default function CopilotWidget({ autoOpen = false, embedded = false }: CopilotWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded || autoOpen);
  const [profile, setProfile] = useState<CopilotProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ToolFormState>>(initialForms);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const locale: 'en' | 'ar' = profile?.session.locale || 'en';
  const t = translations[locale];
  const isRTL = locale === 'ar';

  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await fetch('/api/copilot/profile', { cache: 'no-store' });
        if (!res.ok) throw new Error('Profile request failed');
        const json: CopilotProfile = await res.json();
        setProfile(json);
        setMessages([{ id: 'welcome', role: 'assistant', content: translations[json.session.locale].welcome }]);
      } catch (err) {
        console.error('Copilot profile error', err);
        setProfile({ session: { role: 'GUEST', tenantId: 'public', locale: 'en' }, tools: [], quickActions: [] });
        setMessages([{ id: 'guest', role: 'assistant', content: translations.en.guestWarning }]);
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (!embedded && autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen, embedded]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const quickActions = useMemo(() => profile?.quickActions || [], [profile]);

  const appendAssistantMessage = useCallback((content: string, data?: any, intent?: string, sources?: ChatMessage['sources']) => {
    setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content, data, intent, sources }]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-6).map(({ role, content }) => ({ role, content })),
          locale
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.reply || data?.error || t.toolError);
      }
      appendAssistantMessage(data.reply, data.data, data.intent, data.sources);
    } catch (err: any) {
      console.error('Copilot chat error', err);
      setError(err?.message || t.toolError);
      setMessages(prev => [...prev, { id: `s-${Date.now()}`, role: 'system', content: err?.message || t.toolError }]);
    } finally {
      setLoading(false);
    }
  }, [appendAssistantMessage, input, loading, locale, messages, t.toolError]);

  const updateForm = (tool: string, field: string, value: any) => {
    setForms(prev => ({ ...prev, [tool]: { ...prev[tool], [field]: value } }));
  };

  const resetForm = (tool: string) => {
    setForms(prev => ({ ...prev, [tool]: initialForms[tool] }));
  };

  const runTool = async (tool: string, args: Record<string, any>) => {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (tool === 'uploadWorkOrderPhoto') {
        const fd = new FormData();
        fd.append('tool', tool);
        fd.append('workOrderId', args.workOrderId);
        fd.append('file', args.file);
        res = await fetch('/api/copilot/chat', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/copilot/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: { name: tool, args }, locale })
        });
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.reply || data?.error || t.toolError);
      }
      appendAssistantMessage(data.reply, data.data, data.intent);
      resetForm(tool);
      setActiveTool(null);
    } catch (err: any) {
      console.error('Tool error', err);
      setError(err?.message || t.toolError);
    } finally {
      setLoading(false);
    }
  };

  const submitTool = (tool: string) => {
    const values = forms[tool];
    if (tool === 'uploadWorkOrderPhoto') {
      if (!values.workOrderId || !values.file) {
        setError(t.requiredField);
        return;
      }
      runTool(tool, values);
      return;
    }

    const requiredMissing = Object.entries(values).some(([key, val]) => {
      if (['description', 'assigneeUserId', 'ownerId'].includes(key)) return false;
      return !val;
    });
    if (requiredMissing) {
      setError(t.requiredField);
      return;
    }
    runTool(tool, values);
  };

  const renderForm = (tool: string) => {
    const values = forms[tool];
    switch (tool) {
      case 'createWorkOrder':
        return (
          <div className="space-y-3">
            <input value={values.title} onChange={(e) => updateForm(tool, 'title', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'عنوان المشكلة' : 'Issue title'} />
            <textarea value={values.description} onChange={(e) => updateForm(tool, 'description', e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'تفاصيل إضافية' : 'Additional details'} />
            <select value={values.priority} onChange={(e) => updateForm(tool, 'priority', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]">
              <option value="LOW">{locale === 'ar' ? 'منخفض' : 'Low'}</option>
              <option value="MEDIUM">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
              <option value="HIGH">{locale === 'ar' ? 'مرتفع' : 'High'}</option>
              <option value="URGENT">{locale === 'ar' ? 'عاجل' : 'Urgent'}</option>
            </select>
          </div>
        );
      case 'dispatchWorkOrder':
        return (
          <div className="space-y-3">
            <input value={values.workOrderId} onChange={(e) => updateForm(tool, 'workOrderId', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'معرف أمر العمل' : 'Work order ID'} />
            <input value={values.assigneeUserId} onChange={(e) => updateForm(tool, 'assigneeUserId', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'معرف الفني (اختياري)' : 'Technician ID (optional)'} />
          </div>
        );
      case 'scheduleVisit':
        return (
          <div className="space-y-3">
            <input value={values.workOrderId} onChange={(e) => updateForm(tool, 'workOrderId', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'معرف أمر العمل' : 'Work order ID'} />
            <input type="datetime-local" value={values.scheduledFor} onChange={(e) => updateForm(tool, 'scheduledFor', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" />
          </div>
        );
      case 'uploadWorkOrderPhoto':
        return (
          <div className="space-y-3">
            <input value={values.workOrderId} onChange={(e) => updateForm(tool, 'workOrderId', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'معرف أمر العمل' : 'Work order ID'} />
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 hover:border-[#0061A8]">
              <Upload className="mb-2 h-5 w-5 text-[#0061A8]" />
              <span>{values.file?.name || t.chooseFile}</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => updateForm(tool, 'file', e.target.files?.[0])} />
            </label>
          </div>
        );
      case 'ownerStatements':
        return (
          <div className="space-y-3">
            <input value={values.ownerId} onChange={(e) => updateForm(tool, 'ownerId', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'معرف المالك (اختياري)' : 'Owner ID (optional)'} />
            <select value={values.period} onChange={(e) => updateForm(tool, 'period', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]">
              <option value="YTD">{locale === 'ar' ? 'منذ بداية العام' : 'Year to date'}</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
            <input value={values.year} onChange={(e) => updateForm(tool, 'year', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]" placeholder={locale === 'ar' ? 'السنة' : 'Year'} />
          </div>
        );
      default:
        return null;
    }
  };

  const panel = (
    <motion.div
      initial={embedded ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
      animate={embedded ? undefined : { opacity: 1, scale: 1, y: 0 }}
      exit={embedded ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${embedded ? 'w-full' : 'w-[360px] max-w-[90vw]'}`}
    >
      <div className="flex items-start justify-between bg-[#0061A8] px-4 py-3 text-white">
        <div>
          <div className="flex items-center gap-2 font-semibold"><Bot className="h-5 w-5" />{t.title}</div>
          <p className="text-xs opacity-80">{t.subtitle(profile?.session.name, profile?.session.role)}</p>
        </div>
        {!embedded && (
          <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-white/10" aria-label={t.close}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] text-gray-500">
        <ShieldCheck className="h-4 w-4 text-[#00A859]" />
        {t.privacy}
      </div>

      <div ref={scrollRef} className="max-h-[320px] overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(message => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === 'user' ? 'bg-[#00A859] text-white' : message.role === 'system' ? 'bg-amber-50 text-amber-800' : 'border border-gray-100 bg-white text-gray-800'}`}>
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
              {renderStructuredData(message, locale)}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 border-t border-gray-200 pt-2 text-[11px] text-gray-500">
                  <div className="mb-1 font-semibold text-gray-600">{locale === 'ar' ? 'المراجع' : 'Sources'}</div>
                  <ul className="space-y-1">
                    {message.sources.map(src => (
                      <li key={src.id} className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{src.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.loading}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      {quickActions.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          <div className="mb-2 text-xs font-semibold text-gray-500">{t.quickActions}</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map(action => (
              <button
                key={action.name}
                onClick={() => setActiveTool(prev => prev === action.name ? null : action.name)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${activeTool === action.name ? 'border-[#0061A8] bg-[#0061A8]/10 text-[#0061A8]' : 'border-gray-200 bg-white text-gray-700 hover:border-[#0061A8] hover:text-[#0061A8]'}`}
              >
                {toolIcons[action.name] || <ClipboardList className="h-4 w-4" />}
                {action.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {activeTool && (
              <motion.div
                key={activeTool}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="mb-2 text-xs font-semibold text-gray-600">{quickActions.find(a => a.name === activeTool)?.label}</div>
                {renderForm(activeTool)}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button onClick={() => { resetForm(activeTool); setActiveTool(null); }} className="rounded-full px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                    {t.cancel}
                  </button>
                  <button onClick={() => submitTool(activeTool)} className="rounded-full bg-[#0061A8] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#004f88]">
                    {t.run}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={t.placeholder}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0061A8]"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A859] text-white shadow transition hover:bg-[#008d48] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t.send}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );

  if (embedded) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full">
        {panel}
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen && panel}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(prev => !prev)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0061A8] text-white shadow-xl transition hover:bg-[#004f88]"
          aria-label={isOpen ? t.close : t.open}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
        </motion.button>
      </div>
    </div>
  );
}
