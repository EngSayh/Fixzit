import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Bot,
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Send,
  Paperclip,
  Loader2,
  Brain,
  Zap,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  Building,
  User,
  Calendar,
  MessageCircle,
  Lightbulb,
  Target,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
  attachments?: FileAttachment[];
}

interface AIAction {
  type: string;
  label: string;
  parameters: Record<string, any>;
  confidence: number;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  processed: boolean;
  result?: any;
}

interface BankStatementResult {
  id: string;
  filename: string;
  bankInfo: {
    code: string;
    name: string;
    detected: boolean;
  };
  transactions: Array<{
    date: string;
    description: string;
    debit: number;
    credit: number;
    category: string;
    confidence: number;
  }>;
  summary: {
    totalTransactions: number;
    totalDebit: number;
    totalCredit: number;
    averageTransactionSize: number;
  };
  requiresReview: boolean;
  workflowId?: string;
}

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileAttachment[]>([]);
  const [processingResults, setProcessingResults] = useState<BankStatementResult[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load initial greeting
    if (messages.length === 0) {
      addMessage({
        type: 'assistant',
        content: "Hello! I'm FIXZIT AI, your intelligent facility management assistant. I can help you with:\n\n• Processing bank statements and financial documents\n• Creating work orders and service requests\n• Analyzing property data and generating insights\n• Navigating the Fixzit platform\n• Answering questions about facility management\n\nHow can I assist you today?",
        timestamp: new Date()
      });
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            currentModule: window.location.pathname.split('/')[1],
            userRole: 'admin', // Would come from auth context
            organizationName: 'Demo Organization'
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        addMessage({
          type: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actions: data.actions || []
        });
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage({
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const attachment: FileAttachment = {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        processed: false
      };

      setUploadedFiles(prev => [...prev, attachment]);

      // Add system message about file upload
      addMessage({
        type: 'system',
        content: `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        timestamp: new Date(),
        attachments: [attachment]
      });

      // Process file
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'auto');

        const response = await fetch('/api/ai/process-document', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          
          // Update attachment
          attachment.processed = true;
          attachment.result = result;
          
          setUploadedFiles(prev => prev.map(f => f.id === attachment.id ? attachment : f));

          // Add AI response about processed file
          if (result.documentType === 'bank_statement') {
            addMessage({
              type: 'assistant',
              content: `I've successfully processed your bank statement! Here's what I found:\n\n• Bank: ${result.bankInfo.name}\n• Transactions: ${result.summary.totalTransactions}\n• Total Debits: SAR ${result.summary.totalDebit.toLocaleString()}\n• Total Credits: SAR ${result.summary.totalCredit.toLocaleString()}\n\nWould you like me to submit these transactions for approval and posting to your Finance module?`,
              timestamp: new Date(),
              actions: [
                {
                  type: 'submit_for_approval',
                  label: 'Submit for DoA Approval',
                  parameters: { resultId: result.id },
                  confidence: 0.9
                },
                {
                  type: 'review_transactions',
                  label: 'Review Transactions',
                  parameters: { resultId: result.id },
                  confidence: 0.9
                }
              ]
            });

            setProcessingResults(prev => [...prev, result]);
          } else {
            addMessage({
              type: 'assistant',
              content: `I've processed your ${result.documentType.replace('_', ' ')} document. ${result.keyInformation ? 'Key information has been extracted and is ready for review.' : 'The document has been analyzed.'} What would you like to do next?`,
              timestamp: new Date(),
              actions: result.suggestedActions || []
            });
          }
        } else {
          throw new Error('File processing failed');
        }
      } catch (error) {
        console.error('File processing error:', error);
        attachment.processed = true;
        attachment.result = { error: error.message };
        
        addMessage({
          type: 'assistant',
          content: `I encountered an error processing ${file.name}. Please ensure the file is a valid bank statement, invoice, or other supported document format.`,
          timestamp: new Date()
        });
      }
    }
  };

  const executeAction = async (action: AIAction) => {
    try {
      const response = await fetch('/api/ai/execute-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      });

      if (response.ok) {
        const result = await response.json();
        
        addMessage({
          type: 'assistant',
          content: `✅ Action completed successfully: ${action.label}`,
          timestamp: new Date()
        });

        // Handle specific action results
        if (action.type === 'submit_for_approval') {
          addMessage({
            type: 'assistant',
            content: `Your bank statement transactions have been submitted for approval through the DoA (Delegation of Authority) workflow. The approval process will route through:\n\n1. Finance Clerk - Review and validation\n2. Property Manager - Operational approval\n3. Finance Officer - Financial approval\n4. Owner - Executive approval (if required)\n\nYou'll receive notifications as the approval progresses.`,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Action execution error:', error);
      addMessage({
        type: 'assistant',
        content: `❌ Failed to execute action: ${action.label}. Please try again or contact support.`,
        timestamp: new Date()
      });
    }
  };

  const BankStatementProcessor = () => (
    <Card>
      <CardHeader>
        <CardTitle>Bank Statement Processing</CardTitle>
        <CardDescription>
          Upload bank statements for automatic transaction parsing and DoA approval workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Bank Statement</h3>
          <p className="text-gray-600 mb-4">
            Supports PDF, Excel, and CSV formats from major Saudi banks
          </p>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Choose File
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* Processing Results */}
        {processingResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold">Recent Processing Results</h4>
            {processingResults.map((result) => (
              <Card key={result.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold">{result.filename}</h5>
                      <p className="text-sm text-gray-600">{result.bankInfo.name}</p>
                    </div>
                    <Badge variant={result.requiresReview ? 'destructive' : 'default'}>
                      {result.requiresReview ? 'Needs Review' : 'Ready'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-600">Transactions:</span>
                      <span className="ml-1 font-medium">{result.summary.totalTransactions}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Debits:</span>
                      <span className="ml-1 font-medium text-red-600">
                        SAR {result.summary.totalDebit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Credits:</span>
                      <span className="ml-1 font-medium text-green-600">
                        SAR {result.summary.totalCredit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Net:</span>
                      <span className={`ml-1 font-medium ${
                        (result.summary.totalCredit - result.summary.totalDebit) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        SAR {(result.summary.totalCredit - result.summary.totalDebit).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Review Transactions
                    </Button>
                    {result.workflowId ? (
                      <Button variant="outline" size="sm">
                        <CheckSquare className="h-4 w-4 mr-1" />
                        View Approval Status
                      </Button>
                    ) : (
                      <Button size="sm">
                        <Target className="h-4 w-4 mr-1" />
                        Submit for Approval
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ChatInterface = () => (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <Bot className="h-5 w-5 mr-2 text-blue-600" />
          FIXZIT AI Assistant
        </CardTitle>
        <CardDescription>
          Ask questions, upload documents, or get help with facility management tasks
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-700 border'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="flex items-center mb-2">
                    <Bot className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm font-medium">FIXZIT AI</span>
                  </div>
                )}
                
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                
                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="mr-2 mb-2"
                        onClick={() => executeAction(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                        <Paperclip className="h-3 w-3" />
                        <span>{attachment.name}</span>
                        {attachment.processed ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about facility management..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1"
            />
            
            <Button onClick={sendMessage} disabled={!inputMessage.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActions = () => (
    <Card>
      <CardHeader>
        <CardTitle>AI Quick Actions</CardTitle>
        <CardDescription>
          Common tasks that AI can help you with
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: 'Process Bank Statement',
              description: 'Upload and parse bank statements for approval',
              icon: <CreditCard className="h-6 w-6" />,
              action: () => setShowUploadDialog(true)
            },
            {
              title: 'Analyze Property Performance',
              description: 'Get insights on property financial performance',
              icon: <TrendingUp className="h-6 w-6" />,
              action: () => setInputMessage('Analyze the performance of my properties this month')
            },
            {
              title: 'Create Work Order',
              description: 'Generate work orders from descriptions',
              icon: <Zap className="h-6 w-6" />,
              action: () => setInputMessage('Help me create a work order for HVAC maintenance')
            },
            {
              title: 'Generate Reports',
              description: 'Create custom reports and analytics',
              icon: <FileSpreadsheet className="h-6 w-6" />,
              action: () => setInputMessage('Generate a financial report for this quarter')
            },
            {
              title: 'Compliance Check',
              description: 'Verify ZATCA and regulatory compliance',
              icon: <CheckSquare className="h-6 w-6" />,
              action: () => setInputMessage('Check my ZATCA compliance status')
            },
            {
              title: 'Tenant Communication',
              description: 'Draft professional tenant communications',
              icon: <MessageCircle className="h-6 w-6" />,
              action: () => setInputMessage('Help me write a rent increase notice')
            }
          ].map((quickAction, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={quickAction.action}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {quickAction.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{quickAction.title}</h4>
                    <p className="text-sm text-gray-600">{quickAction.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center">
            <Brain className="h-8 w-8 mr-3 text-blue-600" />
            AI Assistant
          </h2>
          <p className="text-muted-foreground">
            Intelligent document processing and facility management assistance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="bg-blue-600">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="outline">
            <Shield className="h-3 w-3 mr-1" />
            Secure Processing
          </Badge>
        </div>
      </div>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Document Processing</h3>
                <p className="text-sm text-gray-600">Automatic parsing and categorization</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Bank Statements</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex justify-between">
                <span>Invoices</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex justify-between">
                <span>Lease Agreements</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">DoA Workflow</h3>
                <p className="text-sm text-gray-600">Automated approval routing</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Finance Clerk</span>
                <span className="text-blue-600">Review</span>
              </div>
              <div className="flex justify-between">
                <span>Manager</span>
                <span className="text-orange-600">Approve</span>
              </div>
              <div className="flex justify-between">
                <span>Finance Officer</span>
                <span className="text-green-600">Final</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Insights</h3>
                <p className="text-sm text-gray-600">AI-powered analytics</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pattern Recognition</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex justify-between">
                <span>Anomaly Detection</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex justify-between">
                <span>Predictive Analysis</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        <div>
          <ChatInterface />
        </div>

        {/* Bank Statement Processor */}
        <div>
          <BankStatementProcessor />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Bank Statement</DialogTitle>
            <DialogDescription>
              Upload your bank statement for automatic processing and DoA approval workflow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Supported Banks</AlertTitle>
              <AlertDescription>
                Saudi American Bank, NCB, Al Rajhi Bank, Riyad Bank, Alinma Bank, Banque Saudi Fransi
              </AlertDescription>
            </Alert>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">PDF, Excel, or CSV files up to 10MB</p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(e.target.files);
            setShowUploadDialog(false);
          }
        }}
        className="hidden"
      />
    </div>
  );
};

export default AIAssistant;