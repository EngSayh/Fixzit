const OpenAI = require('openai');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs').promises;
const path = require('path');

class FixzitAIAssistant {
  constructor(options = {}) {
    this.config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: options.model || 'gpt-4',
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.1
      },
      azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT
      },
      fileProcessing: {
        maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
        supportedFormats: ['pdf', 'xlsx', 'xls', 'csv', 'txt'],
        tempDir: options.tempDir || './temp/ai-processing'
      },
      bankStatementParsing: {
        supportedBanks: ['sab', 'ncb', 'rajhi', 'riyadbank', 'alinma', 'banque_saudi_fransi'],
        dateFormats: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        currencies: ['SAR', 'USD', 'EUR'],
        confidenceThreshold: 0.8
      },
      ...options
    };

    this.openai = null;
    this.conversationHistory = new Map();
    this.processingQueue = [];
    this.isProcessing = false;

    this.initialize();
  }

  async initialize() {
    try {
      if (this.config.openai.apiKey) {
        this.openai = new OpenAI({
          apiKey: this.config.openai.apiKey
        });
        console.log('✅ OpenAI client initialized');
      } else if (this.config.azure.endpoint && this.config.azure.apiKey) {
        this.openai = new OpenAI({
          apiKey: this.config.azure.apiKey,
          baseURL: `${this.config.azure.endpoint}/openai/deployments/${this.config.azure.deploymentName}`,
          defaultQuery: { 'api-version': '2024-02-15-preview' },
          defaultHeaders: {
            'api-key': this.config.azure.apiKey
          }
        });
        console.log('✅ Azure OpenAI client initialized');
      } else {
        console.warn('⚠️ No AI service configured, using fallback responses');
      }

      // Ensure temp directory exists
      await fs.mkdir(this.config.fileProcessing.tempDir, { recursive: true });

      console.log('✅ AI Assistant initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Assistant:', error);
    }
  }

  // Bank Statement Processing
  async processBankStatement(fileBuffer, filename, metadata = {}) {
    try {
      console.log(`📊 Processing bank statement: ${filename}`);
      
      // Extract text from file
      const extractedText = await this.extractTextFromFile(fileBuffer, filename);
      
      // Identify bank and format
      const bankInfo = this.identifyBank(extractedText);
      
      // Parse transactions using AI
      const transactions = await this.parseTransactionsWithAI(extractedText, bankInfo);
      
      // Validate and clean data
      const cleanedTransactions = this.validateTransactions(transactions);
      
      // Categorize transactions
      const categorizedTransactions = await this.categorizeTransactions(cleanedTransactions);
      
      // Generate summary
      const summary = this.generateTransactionSummary(categorizedTransactions);
      
      const result = {
        id: this.generateId(),
        filename,
        bankInfo,
        transactions: categorizedTransactions,
        summary,
        confidence: this.calculateConfidence(categorizedTransactions),
        processedAt: new Date(),
        metadata,
        status: 'processed',
        requiresReview: categorizedTransactions.some(t => t.confidence < this.config.bankStatementParsing.confidenceThreshold)
      };

      // Save processing result
      await this.saveProcessingResult(result);
      
      return result;
    } catch (error) {
      console.error('Bank statement processing error:', error);
      throw new Error(`Failed to process bank statement: ${error.message}`);
    }
  }

  async extractTextFromFile(fileBuffer, filename) {
    const extension = path.extname(filename).toLowerCase();
    
    switch (extension) {
      case '.pdf':
        const pdfData = await pdf(fileBuffer);
        return pdfData.text;
        
      case '.xlsx':
      case '.xls':
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_csv(worksheet);
        
      case '.csv':
        return fileBuffer.toString('utf8');
        
      case '.txt':
        return fileBuffer.toString('utf8');
        
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  identifyBank(text) {
    const bankPatterns = {
      sab: /saudi american bank|sab|ساب/i,
      ncb: /national commercial bank|ncb|البنك الأهلي/i,
      rajhi: /al rajhi bank|rajhi|مصرف الراجحي/i,
      riyadbank: /riyad bank|riyadbank|بنك الرياض/i,
      alinma: /alinma bank|الإنماء/i,
      banque_saudi_fransi: /banque saudi fransi|bsf|البنك السعودي الفرنسي/i
    };

    for (const [bankCode, pattern] of Object.entries(bankPatterns)) {
      if (pattern.test(text)) {
        return {
          code: bankCode,
          name: this.getBankName(bankCode),
          detected: true
        };
      }
    }

    return {
      code: 'unknown',
      name: 'Unknown Bank',
      detected: false
    };
  }

  async parseTransactionsWithAI(text, bankInfo) {
    if (!this.openai) {
      return this.parseFallback(text);
    }

    const prompt = this.buildBankStatementPrompt(text, bankInfo);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial data analyst specializing in parsing bank statements and financial documents for facility management companies in Saudi Arabia.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.openai.maxTokens,
        temperature: this.config.openai.temperature
      });

      const aiResponse = response.choices[0]?.message?.content;
      
      if (aiResponse) {
        // Parse JSON response from AI
        const parsedData = JSON.parse(aiResponse);
        return parsedData.transactions || [];
      }
      
      throw new Error('Invalid AI response');
    } catch (error) {
      console.error('AI parsing failed, using fallback:', error);
      return this.parseFallback(text);
    }
  }

  buildBankStatementPrompt(text, bankInfo) {
    return `
Please parse this ${bankInfo.name} bank statement and extract all transactions in JSON format.

Bank Statement Text:
${text}

Please return a JSON object with the following structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Transaction description",
      "reference": "Reference number if available",
      "debit": 0.00,
      "credit": 0.00,
      "balance": 0.00,
      "category": "suggested category",
      "counterparty": "other party in transaction",
      "type": "deposit|withdrawal|transfer|fee|interest",
      "confidence": 0.95
    }
  ]
}

Guidelines:
1. Extract ALL transactions, including fees and interest
2. Use Saudi Riyal (SAR) as currency
3. Categorize transactions appropriately (rent, maintenance, utilities, fees, etc.)
4. Include confidence score (0-1) for each transaction
5. Handle Arabic text if present
6. Identify recurring transactions
7. Flag suspicious or unusual transactions
8. Maintain chronological order

Return only valid JSON, no additional text.
    `;
  }

  parseFallback(text) {
    // Simple regex-based parsing as fallback
    const transactions = [];
    const lines = text.split('\n');
    
    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;
    const amountRegex = /([\d,]+\.?\d*)/;
    
    for (const line of lines) {
      const dateMatch = line.match(dateRegex);
      const amountMatches = line.match(new RegExp(amountRegex, 'g'));
      
      if (dateMatch && amountMatches && amountMatches.length >= 1) {
        const transaction = {
          date: this.parseDate(dateMatch[1]),
          description: line.replace(dateRegex, '').replace(amountRegex, '').trim(),
          reference: '',
          debit: 0,
          credit: 0,
          balance: 0,
          category: 'uncategorized',
          counterparty: '',
          type: 'unknown',
          confidence: 0.6
        };
        
        // Simple amount parsing
        if (amountMatches.length >= 1) {
          const amount = parseFloat(amountMatches[0].replace(/,/g, ''));
          if (line.includes('-') || line.toLowerCase().includes('debit')) {
            transaction.debit = amount;
          } else {
            transaction.credit = amount;
          }
        }
        
        transactions.push(transaction);
      }
    }
    
    return transactions;
  }

  async categorizeTransactions(transactions) {
    if (!this.openai) {
      return transactions.map(t => ({ ...t, category: 'uncategorized' }));
    }

    const categorizationPrompt = `
Categorize these financial transactions for a facility management company in Saudi Arabia.

Transactions:
${JSON.stringify(transactions, null, 2)}

Categories to use:
- rent_income: Rental income from tenants
- maintenance_expense: Property maintenance and repairs
- utilities_expense: Electricity, water, gas bills
- management_fees: Property management fees
- insurance_expense: Insurance premiums
- tax_expense: Government taxes and fees
- bank_fees: Bank charges and fees
- vendor_payments: Payments to service providers
- tenant_deposits: Security deposits from tenants
- refunds: Refunds to tenants or vendors
- other_income: Other sources of income
- other_expense: Other expenses
- uncategorized: Cannot determine category

Return the same JSON structure but with updated "category" fields and improved "counterparty" identification.
Include a "subcategory" field for more specific classification.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial categorization expert for property management companies.'
          },
          {
            role: 'user',
            content: categorizationPrompt
          }
        ],
        max_tokens: this.config.openai.maxTokens,
        temperature: 0.1
      });

      const categorizedData = JSON.parse(response.choices[0]?.message?.content || '[]');
      return categorizedData;
    } catch (error) {
      console.error('AI categorization failed:', error);
      return transactions;
    }
  }

  // DoA (Delegation of Authority) Integration
  async createDoAApprovalWorkflow(transactions, metadata) {
    const approvalWorkflow = {
      id: this.generateId(),
      type: 'bank_statement_posting',
      title: `Bank Statement Processing - ${metadata.filename}`,
      description: `Review and approve ${transactions.length} transactions for posting to Finance module`,
      requestedBy: metadata.userId,
      requestedAt: new Date(),
      
      // Categorize by approval requirements
      items: this.categorizeForApproval(transactions),
      
      // Approval routing based on amounts and types
      approvalRoute: this.determineApprovalRoute(transactions),
      
      metadata: {
        sourceFile: metadata.filename,
        bankInfo: metadata.bankInfo,
        totalDebit: transactions.reduce((sum, t) => sum + t.debit, 0),
        totalCredit: transactions.reduce((sum, t) => sum + t.credit, 0),
        processingDate: new Date()
      }
    };

    // Create workflow instance
    const workflowEngine = require('./workflow-engine');
    const instance = await workflowEngine.startWorkflow('doa_approval_workflow', approvalWorkflow);
    
    return {
      workflowId: instance.id,
      approvalRoute: approvalWorkflow.approvalRoute,
      summary: approvalWorkflow.metadata
    };
  }

  categorizeForApproval(transactions) {
    const categories = {
      auto_approve: [], // Small amounts, routine transactions
      manager_approval: [], // Medium amounts, operational expenses
      finance_approval: [], // Large amounts, significant expenses
      owner_approval: [] // Very large amounts, capital expenses
    };

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.debit || transaction.credit);
      
      if (amount < 1000 && this.isRoutineTransaction(transaction)) {
        categories.auto_approve.push(transaction);
      } else if (amount < 10000) {
        categories.manager_approval.push(transaction);
      } else if (amount < 50000) {
        categories.finance_approval.push(transaction);
      } else {
        categories.owner_approval.push(transaction);
      }
    });

    return categories;
  }

  determineApprovalRoute(transactions) {
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.debit || t.credit), 0);
    const hasLargeTransactions = transactions.some(t => Math.abs(t.debit || t.credit) > 50000);
    const hasUnusualTransactions = transactions.some(t => t.confidence < 0.7);

    const route = [];

    // Always start with Finance Clerk review
    route.push({
      role: 'finance_clerk',
      action: 'review_and_validate',
      required: true,
      order: 1
    });

    // Add Property Manager for operational items
    if (transactions.some(t => ['maintenance_expense', 'utilities_expense'].includes(t.category))) {
      route.push({
        role: 'property_manager',
        action: 'operational_approval',
        required: true,
        order: 2
      });
    }

    // Add Finance Officer for significant amounts
    if (totalAmount > 25000 || hasUnusualTransactions) {
      route.push({
        role: 'finance_officer',
        action: 'financial_approval',
        required: true,
        order: 3
      });
    }

    // Add Owner approval for large transactions
    if (hasLargeTransactions) {
      route.push({
        role: 'owner',
        action: 'executive_approval',
        required: true,
        order: 4
      });
    }

    return route;
  }

  // General AI Chat Interface
  async processUserQuery(userId, message, context = {}) {
    if (!this.openai) {
      return this.getFallbackResponse(message);
    }

    // Get conversation history
    const history = this.conversationHistory.get(userId) || [];
    
    // Build context-aware prompt
    const systemPrompt = this.buildSystemPrompt(context);
    
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages,
        max_tokens: this.config.openai.maxTokens,
        temperature: this.config.openai.temperature
      });

      const aiResponse = response.choices[0]?.message?.content || 'I apologize, but I could not process your request.';
      
      // Update conversation history
      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      );
      
      // Keep only last 10 exchanges
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }
      
      this.conversationHistory.set(userId, history);
      
      // Analyze if response requires action
      const actionRequired = await this.analyzeForActions(message, aiResponse, context);
      
      return {
        response: aiResponse,
        actions: actionRequired,
        confidence: response.choices[0]?.finish_reason === 'stop' ? 0.9 : 0.7,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('AI query processing error:', error);
      return this.getFallbackResponse(message);
    }
  }

  buildSystemPrompt(context) {
    const userRole = context.userRole || 'user';
    const modules = context.availableModules || [];
    
    return `
You are FIXZIT AI, an intelligent assistant for the Fixzit Enterprise facility management platform.

User Context:
- Role: ${userRole}
- Available Modules: ${modules.join(', ')}
- Organization: ${context.organizationName || 'Unknown'}
- Current Module: ${context.currentModule || 'Dashboard'}

Your capabilities:
1. Answer questions about facility management, property operations, and maintenance
2. Help navigate the Fixzit platform and its features
3. Assist with data entry and form completion
4. Provide insights on financial data and reports
5. Guide users through workflows and processes
6. Parse and analyze uploaded documents (bank statements, invoices, etc.)
7. Create work orders, service requests, and other records
8. Generate reports and summaries

Guidelines:
- Be helpful, professional, and concise
- Provide specific, actionable advice
- Reference Fixzit platform features when relevant
- Use Saudi Arabian context for dates, currency, and regulations
- Suggest appropriate next steps or actions
- If you need more information, ask specific questions
- For complex tasks, break them down into steps
- Always prioritize data security and privacy

Special Functions:
- Bank Statement Analysis: Parse financial data and suggest categorization
- Document Processing: Extract and structure data from uploaded files
- Workflow Automation: Suggest and create automated processes
- Compliance Checking: Verify adherence to Saudi regulations (ZATCA, labor law, etc.)
- Predictive Insights: Analyze trends and provide forecasts

Respond in a helpful, professional manner appropriate for facility management professionals.
    `;
  }

  async analyzeForActions(userMessage, aiResponse, context) {
    const actionPatterns = {
      create_work_order: /create.*work order|new.*maintenance|schedule.*repair/i,
      create_invoice: /create.*invoice|bill.*customer|generate.*invoice/i,
      schedule_meeting: /schedule.*meeting|book.*appointment|set.*reminder/i,
      generate_report: /generate.*report|create.*report|export.*data/i,
      update_property: /update.*property|modify.*unit|change.*tenant/i,
      process_payment: /process.*payment|record.*payment|payment.*received/i
    };

    const actions = [];
    
    for (const [actionType, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(userMessage) || pattern.test(aiResponse)) {
        actions.push({
          type: actionType,
          suggested: true,
          confidence: 0.8,
          parameters: this.extractActionParameters(userMessage, actionType)
        });
      }
    }

    return actions;
  }

  extractActionParameters(message, actionType) {
    // Extract relevant parameters based on action type
    const parameters = {};
    
    switch (actionType) {
      case 'create_work_order':
        const priorityMatch = message.match(/(urgent|high|medium|low)\s*priority/i);
        if (priorityMatch) parameters.priority = priorityMatch[1].toLowerCase();
        
        const propertyMatch = message.match(/property\s*:?\s*([^,\n]+)/i);
        if (propertyMatch) parameters.property = propertyMatch[1].trim();
        break;
        
      case 'generate_report':
        const reportTypeMatch = message.match(/(financial|operational|maintenance|tenant)\s*report/i);
        if (reportTypeMatch) parameters.reportType = reportTypeMatch[1].toLowerCase();
        break;
    }
    
    return parameters;
  }

  // Document Intelligence
  async processDocument(fileBuffer, filename, documentType = 'auto') {
    try {
      const text = await this.extractTextFromFile(fileBuffer, filename);
      
      let processingResult;
      
      switch (documentType) {
        case 'bank_statement':
          processingResult = await this.processBankStatement(fileBuffer, filename);
          break;
        case 'invoice':
          processingResult = await this.processInvoice(text, filename);
          break;
        case 'lease_agreement':
          processingResult = await this.processLeaseAgreement(text, filename);
          break;
        case 'maintenance_report':
          processingResult = await this.processMaintenanceReport(text, filename);
          break;
        case 'auto':
        default:
          processingResult = await this.autoDetectAndProcess(text, filename);
          break;
      }
      
      return processingResult;
    } catch (error) {
      console.error('Document processing error:', error);
      throw error;
    }
  }

  async autoDetectAndProcess(text, filename) {
    if (!this.openai) {
      return { type: 'unknown', content: text };
    }

    const detectionPrompt = `
Analyze this document and determine its type and extract key information.

Document Content:
${text.substring(0, 2000)} // First 2000 characters

Possible document types:
- bank_statement
- invoice
- lease_agreement
- maintenance_report
- purchase_order
- receipt
- contract
- other

Return JSON:
{
  "documentType": "detected_type",
  "confidence": 0.95,
  "keyInformation": {
    // Extract relevant fields based on document type
  },
  "suggestedActions": [
    // Suggest what to do with this document
  ]
}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: 'You are a document analysis expert.' },
          { role: 'user', content: detectionPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Auto-detection failed:', error);
      return { type: 'unknown', content: text };
    }
  }

  // Utility Methods
  parseDate(dateString) {
    // Try different date formats
    const formats = this.config.bankStatementParsing.dateFormats;
    
    for (const format of formats) {
      try {
        // Simple date parsing - in production, use a proper date library
        const parts = dateString.split(/[\/\-]/);
        if (parts.length === 3) {
          if (format === 'DD/MM/YYYY') {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else if (format === 'MM/DD/YYYY') {
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          } else if (format === 'YYYY-MM-DD') {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return new Date(); // Fallback to current date
  }

  validateTransactions(transactions) {
    return transactions.filter(transaction => {
      // Basic validation
      if (!transaction.date || isNaN(new Date(transaction.date).getTime())) {
        return false;
      }
      
      if (!transaction.description || transaction.description.trim().length === 0) {
        return false;
      }
      
      if (transaction.debit === 0 && transaction.credit === 0) {
        return false;
      }
      
      return true;
    });
  }

  generateTransactionSummary(transactions) {
    const summary = {
      totalTransactions: transactions.length,
      totalDebit: transactions.reduce((sum, t) => sum + (t.debit || 0), 0),
      totalCredit: transactions.reduce((sum, t) => sum + (t.credit || 0), 0),
      dateRange: {
        from: new Date(Math.min(...transactions.map(t => new Date(t.date).getTime()))),
        to: new Date(Math.max(...transactions.map(t => new Date(t.date).getTime())))
      },
      categories: this.groupBy(transactions, 'category'),
      averageTransactionSize: transactions.length > 0 ? 
        transactions.reduce((sum, t) => sum + Math.abs(t.debit || t.credit), 0) / transactions.length : 0,
      largestTransaction: Math.max(...transactions.map(t => Math.abs(t.debit || t.credit))),
      flags: {
        unusualTransactions: transactions.filter(t => t.confidence < 0.7).length,
        largeTransactions: transactions.filter(t => Math.abs(t.debit || t.credit) > 50000).length,
        duplicateTransactions: this.findDuplicates(transactions).length
      }
    };

    return summary;
  }

  calculateConfidence(transactions) {
    if (transactions.length === 0) return 0;
    
    const avgConfidence = transactions.reduce((sum, t) => sum + (t.confidence || 0), 0) / transactions.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  isRoutineTransaction(transaction) {
    const routinePatterns = [
      /bank.*charge/i,
      /monthly.*fee/i,
      /service.*charge/i,
      /atm.*fee/i,
      /maintenance.*fee/i
    ];

    return routinePatterns.some(pattern => pattern.test(transaction.description));
  }

  findDuplicates(transactions) {
    const seen = new Map();
    const duplicates = [];
    
    transactions.forEach(transaction => {
      const key = `${transaction.date}_${transaction.description}_${transaction.debit || transaction.credit}`;
      if (seen.has(key)) {
        duplicates.push(transaction);
      } else {
        seen.set(key, transaction);
      }
    });
    
    return duplicates;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getBankName(bankCode) {
    const bankNames = {
      sab: 'Saudi American Bank',
      ncb: 'National Commercial Bank',
      rajhi: 'Al Rajhi Bank',
      riyadbank: 'Riyad Bank',
      alinma: 'Alinma Bank',
      banque_saudi_fransi: 'Banque Saudi Fransi'
    };
    
    return bankNames[bankCode] || 'Unknown Bank';
  }

  generateId() {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getFallbackResponse(message) {
    const fallbackResponses = {
      greeting: "Hello! I'm FIXZIT AI, your facility management assistant. How can I help you today?",
      help: "I can help you with property management, work orders, financial analysis, and document processing. What would you like to know?",
      default: "I understand you're asking about facility management. While I'm currently learning, I recommend checking our help documentation or contacting support for detailed assistance."
    };

    if (/hello|hi|hey/i.test(message)) {
      return { response: fallbackResponses.greeting, actions: [], confidence: 0.9 };
    } else if (/help|assist/i.test(message)) {
      return { response: fallbackResponses.help, actions: [], confidence: 0.9 };
    } else {
      return { response: fallbackResponses.default, actions: [], confidence: 0.5 };
    }
  }

  // Abstract methods for database integration
  async saveProcessingResult(result) { /* Implement database save */ }
  async getProcessingHistory(userId) { /* Implement history retrieval */ }

  // Health check
  getHealthStatus() {
    return {
      aiServiceConnected: !!this.openai,
      processingQueueSize: this.processingQueue.length,
      activeConversations: this.conversationHistory.size,
      supportedFormats: this.config.fileProcessing.supportedFormats,
      supportedBanks: this.config.bankStatementParsing.supportedBanks
    };
  }
}

module.exports = FixzitAIAssistant;