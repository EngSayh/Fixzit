/**
 * AI Chat Store - Zustand Store with sessionStorage Persistence
 * Provides persistent chat history, API integration, and correlation tracking
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/config/constants";
import { logger } from "@/lib/logger";

/**
 * Maximum number of messages to send as context window to the AI API.
 * Limits token usage while providing sufficient conversation history.
 */
const MESSAGE_HISTORY_LIMIT = 10;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string; // Translation keys for 'system'/'assistant', raw text for 'user'
  timestamp: number;
  correlationId?: string;
}

/**
 * Default welcome message with i18n-compliant translation key
 * Will be rendered by AIChat component using useTranslation hook
 */
const WELCOME_MESSAGE: ChatMessage = {
  id: "msg-welcome",
  role: "assistant",
  content: "chat.welcome", // Translation key, not hardcoded text
  timestamp: Date.now(),
};

interface AIChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  currentCorrelationId: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  toggleChat: () => void;
  setOpen: (open: boolean) => void;
}

/**
 * Generate a unique correlation ID for request tracking
 */
const generateCorrelationId = (): string => {
  return `ai-chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Helper to add a new message to the state (internal function)
 */
const addMessage = (
  set: (fn: (state: AIChatState) => Partial<AIChatState>) => void,
  message: Omit<ChatMessage, "id" | "timestamp">,
) => {
  const newMessage: ChatMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
  };
  set((state) => ({ messages: [...state.messages, newMessage] }));
};

/**
 * AI Chat Store with sessionStorage Persistence
 * Persists messages and state across page reloads within the same session
 */
export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      // Start with welcome message for better UX
      messages: [WELCOME_MESSAGE],
      isOpen: false,
      isLoading: false,
      currentCorrelationId: null,

      sendMessage: async (content: string) => {
        const correlationId = generateCorrelationId();

        // Add user message
        addMessage(set, {
          role: "user",
          content,
          correlationId,
        });

        set({ isLoading: true, currentCorrelationId: correlationId });

        try {
          const response = await fetch("/api/ai/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Correlation-Id": correlationId,
            },
            body: JSON.stringify({
              message: content,
              history: get().messages.slice(-MESSAGE_HISTORY_LIMIT),
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          // Add assistant response (use translation key if no response)
          addMessage(set, {
            role: "assistant",
            content: data.response || data.message || "chat.error.noAnswer",
            correlationId,
          });
        } catch (error) {
          logger.error("[AI Chat] Error sending message:", error, {
            correlationId,
          });

          // Add error message using i18n translation key
          addMessage(set, {
            role: "system",
            content: "chat.error.general", // Translation key, not hardcoded text
            correlationId,
          });
        } finally {
          set({ isLoading: false, currentCorrelationId: null });
        }
      },

      clearMessages: () => {
        // Reset to welcome message instead of empty array (better UX)
        set({ messages: [WELCOME_MESSAGE], currentCorrelationId: null });
      },

      toggleChat: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      setOpen: (open: boolean) => {
        set({ isOpen: open });
      },
    }),
    {
      name: STORAGE_KEYS.aiChatHistory,
      // Use sessionStorage for persistence within the same session
      storage: {
        getItem: (name: string) => {
          if (typeof window === "undefined") return null;
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name: string, value: unknown) => {
          if (typeof window === "undefined") return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string) => {
          if (typeof window === "undefined") return;
          sessionStorage.removeItem(name);
        },
      },
      // Only persist messages and isOpen state (not loading/correlation states)
      partialize: (state) => ({
        messages: state.messages,
        isOpen: state.isOpen,
      }),
    },
  ),
);
