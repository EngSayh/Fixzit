/**
 * AIChatWidget - Floating AI chat support widget
 * 
 * @description A floating chat widget that provides AI-powered support
 * with quick actions, escalation to human agents, and satisfaction rating.
 * 
 * @features
 * - Floating FAB button
 * - Expandable chat interface
 * - Quick action buttons
 * - AI responses with typing indicator
 * - Human escalation
 * - Satisfaction rating
 * - RTL-first layout
 */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  User,
  Bot,
  Loader2,
  ChevronDown,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Minimize2,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "agent" | "system";
  content: string;
  timestamp: Date;
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
  }>;
  quickActions?: QuickAction[];
  isTyping?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  label_ar: string;
  action: string;
}

export interface AIChatWidgetProps {
  /** Current session ID */
  sessionId?: string;
  /** Initial messages */
  initialMessages?: ChatMessage[];
  /** Quick actions to display */
  quickActions?: QuickAction[];
  /** Callback when message is sent */
  onSendMessage?: (message: string) => Promise<ChatMessage>;
  /** Callback when quick action is clicked */
  onQuickAction?: (action: QuickAction) => Promise<ChatMessage>;
  /** Callback to escalate to human */
  onEscalate?: () => Promise<void>;
  /** Callback when satisfaction is rated */
  onRate?: (rating: number) => void;
  /** Current locale */
  locale?: "ar" | "en";
  /** Position on screen */
  position?: "bottom-right" | "bottom-left";
  /** Agent info (when escalated) */
  agentInfo?: {
    name: string;
    avatar?: string;
    isOnline: boolean;
  };
  /** Custom class name */
  className?: string;
}

// ============================================================================
// DEFAULT QUICK ACTIONS
// ============================================================================

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "1", label: "List my property", label_ar: "نشر عقار", action: "list_property" },
  { id: "2", label: "Check ad status", label_ar: "حالة الإعلان", action: "check_ad" },
  { id: "3", label: "Billing inquiry", label_ar: "استفسار الفواتير", action: "billing" },
  { id: "4", label: "Talk to human", label_ar: "تحدث مع موظف", action: "escalate" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function AIChatWidget({
  sessionId: _sessionId,
  initialMessages = [],
  quickActions = DEFAULT_QUICK_ACTIONS,
  onSendMessage,
  onQuickAction,
  onEscalate,
  onRate,
  locale = "ar",
  position = "bottom-right",
  agentInfo,
  className,
}: AIChatWidgetProps) {
  const isRTL = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: "typing",
      type: "ai",
      content: "",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      const response = await onSendMessage?.(userMessage.content);
      
      // Remove typing indicator and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "typing");
        return response ? [...filtered, response] : filtered;
      });
    } catch {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== "typing");
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            type: "system",
            content: isRTL
              ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
              : "Sorry, an error occurred. Please try again.",
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, onSendMessage, isRTL]);

  const handleQuickAction = useCallback(async (action: QuickAction) => {
    if (action.action === "escalate") {
      setIsLoading(true);
      try {
        await onEscalate?.();
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            type: "system",
            content: isRTL
              ? "جاري تحويلك لموظف الدعم..."
              : "Connecting you to a support agent...",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Display the action as a user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: isRTL ? action.label_ar : action.label,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await onQuickAction?.(action);
      if (response) {
        setMessages((prev) => [...prev, response]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onQuickAction, onEscalate, isRTL]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-4 end-4",
    "bottom-left": "bottom-4 start-4",
  };

  // FAB button only
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-105",
          "bg-primary-500 text-white hover:bg-primary-600",
          positionClasses[position],
          className
        )}
        aria-label={isRTL ? "فتح الدردشة" : "Open chat"}
      >
        <MessageCircle className="w-6 h-6" />
        {/* Notification dot */}
        {initialMessages.length > 0 && (
          <span className="absolute top-0 end-0 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden transition-all",
        isMinimized ? "w-72 h-14" : "w-96 h-[500px] max-h-[80vh]",
        positionClasses[position],
        className
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-primary-600 text-white">
        <div className="flex items-center gap-2">
          {agentInfo ? (
            <>
              {agentInfo.avatar ? (
                <img src={agentInfo.avatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <User className="w-8 h-8 p-1 bg-white/20 rounded-full" />
              )}
              <div>
                <p className="font-medium text-sm">{agentInfo.name}</p>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                  {agentInfo.isOnline
                    ? (isRTL ? "متصل" : "Online")
                    : (isRTL ? "غير متصل" : "Offline")}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <Bot className="w-8 h-8 p-1 bg-white/20 rounded-full" />
              <div>
                <p className="font-medium text-sm">
                  {isRTL ? "مساعد فكسيت" : "Fixzit Assistant"}
                </p>
                <p className="text-xs text-white/70">
                  {isRTL ? "نحن هنا للمساعدة" : "We're here to help"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setShowRating(true);
              setTimeout(() => setIsOpen(false), 3000);
            }}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content (hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome message if no messages */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-primary-500" />
                <p className="font-medium text-neutral-800 mb-1">
                  {isRTL ? "مرحباً! كيف يمكنني مساعدتك؟" : "Hello! How can I help you?"}
                </p>
                <p className="text-sm text-neutral-500">
                  {isRTL
                    ? "اختر موضوعاً أو اكتب سؤالك"
                    : "Choose a topic or type your question"}
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                locale={locale}
              />
            ))}

            {/* Rating prompt */}
            {showRating && (
              <div className="text-center py-4 bg-neutral-50 rounded-lg">
                <p className="text-sm text-neutral-600 mb-3">
                  {isRTL ? "كيف كانت تجربتك؟" : "How was your experience?"}
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => onRate?.(5)}
                    className="p-2 hover:bg-green-100 rounded-full transition-colors"
                  >
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  </button>
                  <button
                    onClick={() => onRate?.(1)}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors"
                  >
                    <ThumbsDown className="w-6 h-6 text-red-600" />
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm rounded-full border border-primary-200 text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    {isRTL ? action.label_ar : action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <button
                className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={isRTL ? "إرفاق ملف" : "Attach file"}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRTL ? "اكتب رسالتك..." : "Type your message..."}
                disabled={isLoading}
                className="flex-1"
              />

              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className={cn("w-4 h-4", isRTL && "rotate-180")} />
                )}
              </Button>
            </div>

            {/* Escalate to human */}
            {onEscalate && !agentInfo && (
              <button
                onClick={() => handleQuickAction({ id: "escalate", label: "", label_ar: "", action: "escalate" })}
                className="mt-2 flex items-center justify-center gap-2 w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {isRTL ? "تحدث مع موظف" : "Talk to a human"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// CHAT BUBBLE SUB-COMPONENT
// ============================================================================

interface ChatBubbleProps {
  message: ChatMessage;
  locale: "ar" | "en";
}

function ChatBubble({ message, locale }: ChatBubbleProps) {
  const isRTL = locale === "ar";
  const isUser = message.type === "user";
  const isSystem = message.type === "system";

  if (message.isTyping) {
    return (
      <div className="flex items-start gap-2">
        <Bot className="w-6 h-6 p-1 bg-primary-100 text-primary-600 rounded-full flex-shrink-0" />
        <div className="px-4 py-2 rounded-2xl bg-neutral-100">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="text-center">
        <span className="inline-block px-3 py-1 text-xs text-neutral-500 bg-neutral-100 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start gap-2", isUser && "flex-row-reverse")}>
      {isUser ? (
        <User className="w-6 h-6 p-1 bg-primary-500 text-white rounded-full flex-shrink-0" />
      ) : (
        <Bot className="w-6 h-6 p-1 bg-primary-100 text-primary-600 rounded-full flex-shrink-0" />
      )}
      <div
        className={cn(
          "max-w-[80%] px-4 py-2 rounded-2xl",
          isUser
            ? "bg-primary-500 text-white rounded-te-none"
            : "bg-neutral-100 text-neutral-800 rounded-ts-none"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={cn(
          "text-xs mt-1",
          isUser ? "text-primary-200" : "text-neutral-400"
        )}>
          {message.timestamp.toLocaleTimeString(isRTL ? "ar-SA" : "en-SA", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export default AIChatWidget;
