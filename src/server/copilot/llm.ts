import { CopilotSession } from "./session";
import { redactSensitiveText } from "./policy";
import { RetrievedDoc } from "./retrieval";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.COPILOT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  session: CopilotSession;
  prompt: string;
  history?: Message[];
  docs?: RetrievedDoc[];
}

function buildSystemPrompt(session: CopilotSession): string {
  return [
    "You are Fixzit Copilot, an enterprise assistant.",
    "Answer in the user's language (Arabic if locale is ar).",
    "Never reveal data for other tenants or owners.",
    "Cite modules and steps briefly and focus on actionable guidance.",
    "If unsure or if the request violates policy, explain the limitation and point to self-service options."
  ].join(" ");
}

export async function generateCopilotResponse(options: ChatCompletionOptions): Promise<string> {
  const context = options.docs?.slice(0, 5).map(doc => `Title: ${doc.title}\nSource: ${doc.source || 'internal'}\nContent:\n${doc.content}`).join("\n---\n");
  const messages: Message[] = [
    { role: "system", content: buildSystemPrompt(options.session) },
    ...(options.history || []),
    {
      role: "user",
      content: options.session.locale === "ar"
        ? `اللغة: العربية\nالسياق:\n${context || 'لا يوجد'}\nالسؤال: ${options.prompt}`
        : `Locale: ${options.session.locale}\nContext:\n${context || 'none'}\nQuestion: ${options.prompt}`
    }
  ];

  if (!OPENAI_API_KEY) {
    const fallback = context
      ? `${options.session.locale === 'ar' ? 'استناداً إلى الوثائق المتاحة' : 'Based on available documents'}: ${context.split('\n')[0]}`
      : (options.session.locale === 'ar'
        ? 'عذراً، لا تتوفر معلومات كافية حالياً. يرجى مراجعة مركز المساعدة أو إنشاء تذكرة.'
        : 'I could not locate the requested detail in the current knowledge base. Please review the help center or raise a ticket.');
    return fallback;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.3,
      messages
    })
  });

  if (!response.ok) {
    throw new Error(`Chat completion failed: ${response.status}`);
  }

  const json = await response.json();
  const reply = json.choices?.[0]?.message?.content || "";
  return redactSensitiveText(reply.trim());
}

