/**
 * FM Finance Auto-Posting Hooks
 * Automatically creates financial transactions when work orders are closed
 */

import { FMFinancialTransaction } from '@/server/models/FMFinancialTransaction';
import { logger } from '@/lib/logger';

export interface WorkOrderFinancialData {
  workOrderId: string;
  propertyId: string;
  unitId?: string;
  ownerId: string;
  tenantId?: string;
  totalCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  otherCosts: number;
  chargeable: boolean;
  chargeToTenant: boolean;
  category: string;
  description: string;
  completedAt: Date;
  invoiceId?: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'EXPENSE' | 'INVOICE' | 'PAYMENT';
  workOrderId: string;
  propertyId: string;
  ownerId: string;
  tenantId?: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: Date;
  dueDate?: Date;
  status: 'PENDING' | 'POSTED' | 'PAID' | 'CANCELLED';
  postingRef?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnerStatement {
  ownerId: string;
  propertyId: string;
  period: {
    from: Date;
    to: Date;
  };
  transactions: FinancialTransaction[];
  totalExpenses: number;
  totalRevenue: number;
  netBalance: number;
  generatedAt: Date;
}

/**
 * Hook: Auto-post financial transactions when WO transitions to CLOSED
 */
export async function onWorkOrderClosed(
  workOrderId: string,
  financialData: WorkOrderFinancialData
): Promise<{
  expenseTransaction?: FinancialTransaction;
  invoiceTransaction?: FinancialTransaction;
  statementUpdated: boolean;
}> {
  const results: {
    expenseTransaction?: FinancialTransaction;
    invoiceTransaction?: FinancialTransaction;
    statementUpdated: boolean;
  } = {
    statementUpdated: false
  };

  // 1. Create expense transaction (always)
  const expenseTransaction: FinancialTransaction = {
    id: `TXN-EXP-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type: 'EXPENSE',
    workOrderId,
    propertyId: financialData.propertyId,
    ownerId: financialData.ownerId,
    amount: financialData.totalCost,
    currency: 'SAR',
    category: financialData.category,
    description: `Work Order #${workOrderId}: ${financialData.description}`,
    date: financialData.completedAt,
    status: 'POSTED',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Save expense to database
  const savedExpense = await FMFinancialTransaction.create({
    type: 'EXPENSE',
    workOrderId: expenseTransaction.workOrderId,
    propertyId: expenseTransaction.propertyId,
    ownerId: expenseTransaction.ownerId,
    amount: expenseTransaction.amount,
    currency: expenseTransaction.currency,
    category: expenseTransaction.category,
    description: expenseTransaction.description,
    transactionDate: expenseTransaction.date,
    status: 'POSTED'
  });
  logger.info(`[Finance] Created expense transaction: ${savedExpense.transactionNumber}`);
  results.expenseTransaction = {
    ...expenseTransaction,
    id: savedExpense._id.toString()
  };

  // 2. Create invoice if chargeable
  if (financialData.chargeable) {
    const invoiceTransaction: FinancialTransaction = {
      id: `TXN-INV-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'INVOICE',
      workOrderId,
      propertyId: financialData.propertyId,
      ownerId: financialData.ownerId,
      tenantId: financialData.chargeToTenant ? financialData.tenantId : undefined,
      amount: financialData.totalCost,
      currency: 'SAR',
      category: financialData.category,
      description: `Invoice for Work Order #${workOrderId}`,
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save invoice to database
    const savedInvoice = await FMFinancialTransaction.create({
      type: 'INVOICE',
      workOrderId: invoiceTransaction.workOrderId,
      propertyId: invoiceTransaction.propertyId,
      ownerId: invoiceTransaction.ownerId,
      tenantId: invoiceTransaction.tenantId,
      amount: invoiceTransaction.amount,
      currency: invoiceTransaction.currency,
      category: invoiceTransaction.category,
      description: invoiceTransaction.description,
      transactionDate: invoiceTransaction.date,
      dueDate: invoiceTransaction.dueDate,
      status: 'PENDING'
    });
    logger.info(`[Finance] Created invoice: ${savedInvoice.transactionNumber}`);
    results.invoiceTransaction = {
      ...invoiceTransaction,
      id: savedInvoice._id.toString()
    };
  }

  // 3. Update owner statement with SAVED transactions (not pre-save objects)
  try {
    const savedTransactions: FinancialTransaction[] = [];
    
    if (results.expenseTransaction) {
      savedTransactions.push(results.expenseTransaction);
    }
    
    if (results.invoiceTransaction) {
      savedTransactions.push(results.invoiceTransaction);
    }
    
    await updateOwnerStatement(financialData.ownerId, financialData.propertyId, savedTransactions);
    results.statementUpdated = true;
  } catch (error) {
    logger.error('[Finance] Failed to update owner statement:', error);
  }

  return results;
}

/**
 * Update owner financial statement with new transactions
 */
export async function updateOwnerStatement(
  ownerId: string,
  propertyId: string,
  transactions: FinancialTransaction[]
): Promise<void> {
  // Query existing transactions from database to calculate totals
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  const existingTransactions = await FMFinancialTransaction.find({
    ownerId,
    propertyId,
    'statementPeriod.month': currentMonth,
    'statementPeriod.year': currentYear
  });

  logger.info(`[Finance] Updating statement for owner ${ownerId} property ${propertyId}`);
  logger.info(`[Finance] Adding ${transactions.length} new transactions`);
  logger.info(`[Finance] Total transactions in period: ${existingTransactions.length + transactions.length}`);
  
  // Calculate totals from database records
  const expenses = existingTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const revenue = existingTransactions
    .filter(t => t.type === 'INVOICE' && t.status === 'PAID')
    .reduce((sum, t) => sum + t.amount, 0);

  logger.info(`[Finance] Total expenses: ${expenses} SAR`);
  logger.info(`[Finance] Total revenue: ${revenue} SAR`);
  logger.info(`[Finance] Net balance: ${revenue - expenses} SAR`);
}

/**
 * Generate owner statement for a period
 */
export async function generateOwnerStatement(
  ownerId: string,
  propertyId: string,
  period: { from: Date; to: Date }
): Promise<OwnerStatement> {
  // Query FMFinancialTransaction collection for transactions in period
  const dbTransactions = await FMFinancialTransaction.find({
    ownerId,
    propertyId,
    transactionDate: {
      $gte: period.from,
      $lte: period.to
    }
  }).sort({ transactionDate: 1 });

  // Convert to interface format
  const transactions: FinancialTransaction[] = dbTransactions.map((t) => {
    const doc = t as unknown as { _id: { toString(): string } };
    return {
      id: doc._id.toString(),
      type: t.type as 'EXPENSE' | 'INVOICE' | 'PAYMENT',
      workOrderId: t.workOrderId?.toString() || '',
      propertyId: t.propertyId,
      ownerId: t.ownerId,
      tenantId: t.tenantId || undefined,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      description: t.description,
      date: t.transactionDate,
      dueDate: t.dueDate,
      status: t.status as 'PENDING' | 'POSTED' | 'PAID' | 'CANCELLED',
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    };
  });

  const totalExpenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = transactions
    .filter(t => t.type === 'INVOICE' && t.status === 'PAID')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    ownerId,
    propertyId,
    period,
    transactions,
    totalExpenses,
    totalRevenue,
    netBalance: totalRevenue - totalExpenses,
    generatedAt: new Date()
  };
}

/**
 * Get pending invoices for tenant
 */
export async function getTenantPendingInvoices(
  tenantId: string
): Promise<FinancialTransaction[]> {
  // Query FMFinancialTransaction collection for pending invoices
  const dbInvoices = await FMFinancialTransaction.find({
    tenantId,
    type: 'INVOICE',
    status: 'PENDING'
  }).sort({ dueDate: 1 });

  // Convert to interface format
  return dbInvoices.map((t) => {
    const doc = t as unknown as { _id: { toString(): string } };
    return {
      id: doc._id.toString(),
      type: 'INVOICE' as const,
      workOrderId: t.workOrderId?.toString() || '',
      propertyId: t.propertyId,
      ownerId: t.ownerId,
      tenantId: t.tenantId || undefined,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      description: t.description,
      date: t.transactionDate,
      dueDate: t.dueDate,
      status: 'PENDING' as const,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    };
  });
}

/**
 * Record payment against invoice
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  reference: string
): Promise<FinancialTransaction> {
  // Find and update the invoice
  const invoice = await FMFinancialTransaction.findById(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  // Mark invoice as paid
  await invoice.markAsPaid({
    paymentMethod,
    paymentRef: reference,
    receivedFrom: invoice.tenantId || 'Unknown',
    receivedBy: 'System'
  });

  // Create payment transaction
  const savedPayment = await FMFinancialTransaction.create({
    type: 'PAYMENT',
    workOrderId: invoice.workOrderId,
    propertyId: invoice.propertyId,
    ownerId: invoice.ownerId,
    tenantId: invoice.tenantId,
    amount,
    currency: 'SAR',
    category: 'PAYMENT',
    description: `Payment for invoice #${invoice.transactionNumber} via ${paymentMethod}`,
    transactionDate: new Date(),
    status: 'POSTED',
    paymentDetails: {
      paymentMethod,
      paymentRef: reference,
      receivedFrom: invoice.tenantId || 'Unknown',
      receivedBy: 'System',
      receivedDate: new Date()
    }
  });

  // Convert to interface format
  const payment: FinancialTransaction = {
    id: savedPayment._id.toString(),
    type: 'PAYMENT',
    workOrderId: savedPayment.workOrderId?.toString() || '',
    propertyId: savedPayment.propertyId,
    ownerId: savedPayment.ownerId,
    tenantId: savedPayment.tenantId,
    amount: savedPayment.amount,
    currency: savedPayment.currency,
    category: savedPayment.category,
    description: savedPayment.description,
    date: savedPayment.transactionDate,
    status: 'POSTED',
    postingRef: reference,
    createdAt: savedPayment.createdAt,
    updatedAt: savedPayment.updatedAt
  };

  logger.info(`[Finance] Recorded payment: ${payment.id}`);
  return payment;
}
