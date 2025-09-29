&apos;use client&apos;;

import { useState, useRef, useEffect } from &apos;react&apos;;
import { Send, Bot, User, X, Loader2 } from &apos;lucide-react&apos;;

interface Message {
  id: string;
  type: &apos;user&apos; | &apos;bot&apos;;
  content: string;
  timestamp: Date;
}

export default function AIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: &apos;1',
      type: &apos;bot&apos;,
      content: &apos;Hello! I\&apos;m Fixzit AI Assistant. I can help you with questions about Fixzit Enterprise, guide you through features, and provide support. How can I help you today?&apos;,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState(&apos;');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth&apos; });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: &apos;user&apos;,
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput(&apos;');
    setIsLoading(true);

    try {
      const response = await fetch(&apos;/api/assistant/query&apos;, {
        method: &apos;POST&apos;,
        headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
        body: JSON.stringify({ question: input.trim() })
      });

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: &apos;bot&apos;,
        content: data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // If there are citations, add them as additional messages
      if (data.citations && data.citations.length > 0) {
        const citationMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: &apos;bot&apos;,
          content: `📚 **Related Help Articles:**\n${data.citations.map((c: any, i: number) => `${i + 1}. [${c.title}](/help/${c.slug})`).join(&apos;\n&apos;)}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, citationMessage]);
      }

    } catch (error) {
      console.error(&apos;AI Chat error:&apos;, error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: &apos;bot&apos;,
        content: &apos;I apologize, but I encountered an error. Please try again or contact support if the problem persists.&apos;,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === &apos;Enter&apos; && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Fixzit AI Assistant</h3>
              <p className="text-sm text-gray-500">Ask me anything about Fixzit!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${message.type === &apos;user&apos; ? &apos;flex-row-reverse&apos; : &apos;'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === &apos;user&apos;
                  ? &apos;bg-green-600&apos;
                  : &apos;bg-blue-600&apos;
              }`}>
                {message.type === &apos;user&apos; ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === &apos;user&apos;
                  ? &apos;bg-green-600 text-white&apos;
                  : &apos;bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white&apos;
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: &apos;2-digit&apos;, minute: &apos;2-digit&apos; })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 dark:bg-neutral-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about Fixzit..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}



