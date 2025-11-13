'use client';

import React, { useState } from 'react';
import { Bot, User, X, Send } from 'lucide-react';
import ClientDate from '@/components/ClientDate';

import { logger } from '@/lib/logger';
interface Citation {
  title: string;
  slug: string;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m Fixzit AI Assistant. I can help you with questions about Fixzit Enterprise, guide you through features, and provide support. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      type: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const questionText = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText })
      });

      if (!response.ok) {
        // Handle HTTP errors - read response body once
        const responseText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // JSON parse failed, use text if available
          if (responseText) {
            errorMessage = responseText;
          }
        }
        
        const botMessage = {
          id: crypto.randomUUID(),
          type: 'bot' as const,
          content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }

      const data = await response.json();

      const botMessage = {
        id: crypto.randomUUID(),
        type: 'bot' as const,
        content: data.answer || "I'm here to help! However, I encountered an issue processing your request. Please try again.",
        citations: data.citations as Array<{ title: string; slug: string }> | undefined,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      logger.error('AI Chat error:', error);
      const errorMessage = {
        id: crypto.randomUUID(),
        type: 'bot' as const,
        content: 'I apologize, but I encountered an error. Please try again or contact support if the problem persists.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <div className="max-w-4xl mx-auto p-4 flex-1 flex flex-col">
        <div className="bg-card rounded-2xl shadow-xl h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Fixzit AI Assistant</h1>
                <p className="text-sm text-muted-foreground">Ask me anything about Fixzit!</p>
              </div>
            </div>
            <button
              onClick={() => window.close()}
              aria-label="Close chat"
              className="text-muted-foreground hover:text-muted-foreground p-2 rounded-2xl hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' ? 'bg-success' : 'bg-primary'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-success text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.type === 'bot' && message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm font-medium mb-2">📚 Related Help Articles:</p>
                      <ul className="space-y-1">
                        {message.citations.map((citation, i) => (
                          <li key={i}>
                            <a
                              href={`/help/${citation.slug}`}
                              className="text-sm text-primary hover:underline block"
                            >
                              {i + 1}. {citation.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs mt-2 opacity-70">
                    <ClientDate date={message.timestamp} format="time-only" />
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-muted p-4 rounded-2xl">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-border">
            <div className="flex gap-3">
              <label htmlFor="chat-input" className="sr-only">Chat message</label>
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Fixzit..."
                className="flex-1 px-4 py-3 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="px-4 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
