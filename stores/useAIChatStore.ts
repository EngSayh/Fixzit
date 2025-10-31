/**
 * AI Chat Store - Zustand Store with sessionStorage Persistence
 * Provides persistent chat history, API integration, and correlation tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/config/constants';

/**
 * Maximum number of messages to send as context window to the AI API.
 * Limits token usage while providing sufficient conversation history.
 */
const MESSAGE_HISTORY_LIMIT = 10;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  correlationId?: string;
}

interface AIChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  currentCorrelationId: string | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  toggleChat: () => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  generateCorrelationId: () => string;
}

/**
 * Generate a unique correlation ID for request tracking
 */
const generateCorrelationId = (): string => {
  return `ai-chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * AI Chat Store with sessionStorage Persistence
 * Persists messages and state across page reloads within the same session
 */
export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      currentCorrelationId: null,

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      sendMessage: async (content: string) => {
        const correlationId = generateCorrelationId();
        
        // Add user message
        get().addMessage({
          role: 'user',
          content,
          correlationId,
        });

        set({ isLoading: true, currentCorrelationId: correlationId });

        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Correlation-Id': correlationId,
            },
            body: JSON.stringify({
              message: content,
              history: get().messages.slice(-MESSAGE_HISTORY_LIMIT), // Send last N messages for context
            }),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          // Add assistant response
          get().addMessage({
            role: 'assistant',
            content: data.response || data.message || 'No response received',
            correlationId,
          });
        } catch (error) {
          console.error('[AI Chat] Error sending message:', error);
          
          // Add error message
          get().addMessage({
            role: 'system',
            content: 'Sorry, I encountered an error. Please try again.',
            correlationId,
          });
        } finally {
          set({ isLoading: false, currentCorrelationId: null });
        }
      },

      clearMessages: () => {
        set({ messages: [], currentCorrelationId: null });
      },

      toggleChat: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      setOpen: (open: boolean) => {
        set({ isOpen: open });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      generateCorrelationId,
    }),
    {
      name: STORAGE_KEYS.aiChatHistory,
      // Use sessionStorage for persistence within the same session
      storage: {
        getItem: (name: string) => {
          if (typeof window === 'undefined') return null;
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name: string, value: unknown) => {
          if (typeof window === 'undefined') return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string) => {
          if (typeof window === 'undefined') return;
          sessionStorage.removeItem(name);
        },
      },
      // Only persist messages and isOpen state, not loading states
      partialize: (state) => ({
        messages: state.messages,
        isOpen: state.isOpen,
        isLoading: false,
        currentCorrelationId: null,
      }),
    }
  )
);
