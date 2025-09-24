import { config } from '@/src/config/environment';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export class OpenAIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = config.openai.apiKey;
    this.model = config.openai.model;
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const payload = {
      model: this.model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const payload = {
      model: 'text-embedding-ada-002',
      input: text
    };

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      return data.data[0]?.embedding || [];
    } catch (error) {
      console.error('OpenAI Embedding error:', error);
      throw error;
    }
  }

  /**
   * Create a Fixzit-specific assistant
   */
  async createFixzitAssistant(
    userQuery: string,
    context: {
      role?: string;
      module?: string;
      language?: string;
      previousMessages?: ChatMessage[];
    } = {}
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(context.previousMessages || []),
      { role: 'user', content: userQuery }
    ];

    return this.createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 1500
    });
  }

  /**
   * Build system prompt for Fixzit assistant
   */
  private buildSystemPrompt(context: any): string {
    const language = context.language || 'en';
    const isArabic = language === 'ar';

    const basePrompt = isArabic ? 
      `أنت مساعد Fixzit الذكي، نظام إدارة المرافق والسوق الإلكتروني الرائد في المملكة العربية السعودية.` :
      `You are Fixzit AI Assistant, a helpful assistant for the Fixzit Enterprise Facility Management and Marketplace platform in Saudi Arabia.`;

    const roleContext = context.role ? 
      (isArabic ? `\nالمستخدم الحالي لديه دور: ${context.role}` : `\nThe current user has role: ${context.role}`) : '';

    const moduleContext = context.module ?
      (isArabic ? `\nالمستخدم يعمل في وحدة: ${context.module}` : `\nThe user is working in module: ${context.module}`) : '';

    const guidelines = isArabic ? `
أرشادات:
1. قدم إجابات مفيدة ودقيقة حول نظام Fixzit
2. ساعد في إدارة المرافق وطلبات الصيانة
3. اشرح ميزات السوق الإلكتروني والمشتريات
4. كن مهذباً ومحترفاً دائماً
5. إذا لم تكن متأكداً، اطلب توضيحاً
    ` : `
Guidelines:
1. Provide helpful and accurate information about Fixzit system
2. Assist with facility management and maintenance requests
3. Explain marketplace features and procurement processes
4. Be polite and professional at all times
5. If unsure, ask for clarification
    `;

    const capabilities = isArabic ? `
قدراتي تشمل:
- شرح كيفية إنشاء أوامر العمل
- مساعدة في إدارة العقارات والمستأجرين
- توجيه في عمليات الشراء والمناقصات
- شرح التقارير والتحليلات
- حل المشاكل التقنية الأساسية
    ` : `
My capabilities include:
- Explaining how to create work orders
- Helping with property and tenant management
- Guiding through procurement and RFQ processes
- Explaining reports and analytics
- Troubleshooting basic technical issues
    `;

    return `${basePrompt}${roleContext}${moduleContext}\n${guidelines}\n${capabilities}`;
  }

  /**
   * Generate contextual help based on current page/module
   */
  async generateContextualHelp(
    module: string,
    action: string,
    language: string = 'en'
  ): Promise<string> {
    const query = language === 'ar' 
      ? `كيف أقوم بـ ${action} في ${module}؟`
      : `How do I ${action} in ${module}?`;

    return this.createFixzitAssistant(query, { module, language });
  }

  /**
   * Analyze sentiment of user feedback
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }> {
    const prompt = `Analyze the sentiment of this text and respond with only a JSON object containing "sentiment" (positive/negative/neutral) and "score" (0-1): "${text}"`;

    const response = await this.createChatCompletion([
      { role: 'system', content: 'You are a sentiment analysis assistant. Respond only with valid JSON.' },
      { role: 'user', content: prompt }
    ], { temperature: 0 });

    try {
      return JSON.parse(response);
    } catch {
      return { sentiment: 'neutral', score: 0.5 };
    }
  }
}

// Export singleton instance
export const openai = new OpenAIService();
