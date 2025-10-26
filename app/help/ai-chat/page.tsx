'use client';

import React, { useState } from 'react';
import { Bot, User, X, Send } from 'lucide-react';

export default function AIChatPage() {
  const [messages, setMessages] = useState([
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
        // Handle HTTP errors
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // JSON parse failed, try reading as text
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Fallback to status message
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
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

      // If there are citations, add them as additional messages
      if (data.citations && data.citations.length > 0) {
        interface Citation { title: string; slug: string; }
        const citationMessage = {
          id: crypto.randomUUID(),
          type: 'bot' as const,
          content: `📚 **Related Help Articles:**\n${(data.citations as Citation[]).map((c, i: number) => `${i + 1}. [${c.title}](/help/${c.slug})`).join('\n')}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, citationMessage]);
      }
    } catch (error) {
      console.error('AI Chat error:', error);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-4xl mx-auto p-4 flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-xl h-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--fixzit-primary)] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Fixzit AI Assistant</h1>
                <p className="text-sm text-gray-500">Ask me anything about Fixzit!</p>
              </div>
            </div>
            <button
              onClick={() => window.close()}
              aria-label="Close chat"
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
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
                  message.type === 'user' ? 'bg-green-600' : 'bg-blue-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[var(--fixzit-primary)] rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <label htmlFor="chat-input" className="sr-only">Chat message</label>
              <input
                id="chat-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about Fixzit..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="px-4 py-3 bg-[var(--fixzit-primary)] text-white rounded-lg hover:bg-[var(--fixzit-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
