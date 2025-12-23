"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, X, Loader2 } from "@/components/ui/icons";
import { useAIChatStore } from "@/stores/useAIChatStore";
import ClientDate from "@/components/ClientDate";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function AIChat({ onClose }: { onClose: () => void }) {
  const {
    messages,
    isLoading,
    sendMessage: sendMessageToStore,
  } = useAIChatStore();
  const auto = useAutoTranslator("aiChat");

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Welcome message is already initialized in the store, no need to add it here

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput("");

    // Send message through store (which handles API call)
    await sendMessageToStore(messageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      aria-label={auto("AI assistant overlay", "overlayLabel")}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {auto("Fixzit AI Assistant", "title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {auto("Ask me anything about Fixzit!", "subtitle")}
              </p>
            </div>
          </div>
          <button type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label={auto("Close chat", "closeButton")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(
            (message: {
              id: string;
              role: string;
              content: string;
              timestamp: number;
            }) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user" ? "bg-success" : "bg-primary"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-success-foreground" />
                  ) : (
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    <ClientDate date={message.timestamp} format="time-only" />
                  </p>
                </div>
              </div>
            ),
          )}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {auto("Thinking...", "thinking")}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={auto(
                "Ask me anything about Fixzit...",
                "inputPlaceholder",
              )}
              className="flex-1 px-4 py-3 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button type="button"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={auto("Send message", "sendButton")}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {auto(
              "Press Enter to send • Shift+Enter for new line",
              "inputHint",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
