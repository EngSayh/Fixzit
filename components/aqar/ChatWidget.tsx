"use client";

import { useState } from "react";
import { logger } from "@/lib/logger";

// Helper to generate unique IDs using modern crypto API
const generateId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

interface ChatMessage {
  id: string;
  from: "user" | "bot";
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMessageId = `user-${generateId()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, from: "user", text: trimmed },
    ]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/aqar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      // Check HTTP status before parsing
      if (!res.ok) {
        logger.error("[ChatWidget] API error", {
          status: res.status,
          statusText: res.statusText,
        });
        let errorMsg = "حدث خطأ، يرجى المحاولة لاحقًا.";
        try {
          const errorData = await res.json();
          logger.error("[ChatWidget] Error details", errorData);
          errorMsg = errorData.error || errorMsg;
        } catch {
          // Failed to parse error JSON, use default message
        }
        const botErrorId = `bot-${generateId()}`;
        setMessages((prev) => [
          ...prev,
          { id: botErrorId, from: "bot", text: errorMsg },
        ]);
        return;
      }

      const json = await res.json();
      const reply = json?.reply || "مرحبًا! كيف أستطيع مساعدتك اليوم؟";
      const botReplyId = `bot-${generateId()}`;
      setMessages((prev) => [
        ...prev,
        { id: botReplyId, from: "bot", text: reply },
      ]);
    } catch (error) {
      logger.error("[ChatWidget] Network error", error);
      const botNetworkErrorId = `bot-${generateId()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botNetworkErrorId,
          from: "bot",
          text: "تعذر إرسال الرسالة، حاول مرة أخرى.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 start-4 z-50">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg"
        >
          مساعدة
        </button>
      )}
      {open && (
        <div className="w-72 h-96 bg-white border rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">مساعد Fixzit</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              إغلاق
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs bg-slate-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500">
                اسأل عن الأسعار، رخص فال، أو خدمة ادفع الإيجار شهريًا.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[90%] rounded-md px-2 py-1 ${
                  m.from === "user"
                    ? "ms-auto bg-primary text-primary-foreground"
                    : "me-auto bg-white text-slate-800 shadow"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t p-2 flex gap-1">
            <input
              className="flex-1 border rounded px-2 py-1 text-xs"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !sending) send();
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs disabled:opacity-60"
            >
              إرسال
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
