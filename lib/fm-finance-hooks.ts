/**
 * FM Finance Auto-Posting Hooks
 * Automatically creates financial transactions when work orders are closed
 */

import { WOStatus } from '@/domain/fm/fm.behavior';

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
    id: `TXN-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // TODO: Save to FMFinancialTxn collection
  console.log('[Finance] Created expense transaction:', expenseTransaction.id);
  results.expenseTransaction = expenseTransaction;

  // 2. Create invoice if chargeable
  if (financialData.chargeable) {
    const invoiceTransaction: FinancialTransaction = {
      id: `TXN-INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    // TODO: Save to FMFinancialTxn collection
    console.log('[Finance] Created invoice:', invoiceTransaction.id);
    results.invoiceTransaction = invoiceTransaction;
  }

  // 3. Update owner statement
  try {
    await updateOwnerStatement(financialData.ownerId, financialData.propertyId, [
      expenseTransaction,
      ...(results.invoiceTransaction ? [results.invoiceTransaction] : [])
    ]);
    results.statementUpdated = true;
  } catch (error) {
    console.error('[Finance] Failed to update owner statement:', error);
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
  // TODO: Query existing statement or create new one
  // For now, just log
  console.log('[Finance] Updating statement for owner', ownerId, 'property', propertyId);
  console.log('[Finance] Adding', transactions.length, 'transactions');
  
  // Calculate totals
  const expenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const revenue = transactions
    .filter(t => t.type === 'INVOICE' && t.status === 'PAID')
    .reduce((sum, t) => sum + t.amount, 0);

  console.log('[Finance] Total expenses:', expenses, 'SAR');
  console.log('[Finance] Total revenue:', revenue, 'SAR');
  console.log('[Finance] Net balance:', revenue - expenses, 'SAR');
}

/**
 * Generate owner statement for a period
 */
export async function generateOwnerStatement(
  ownerId: string,
  propertyId: string,
  period: { from: Date; to: Date }
): Promise<OwnerStatement> {
  // TODO: Query FMFinancialTxn collection for transactions in period
  const transactions: FinancialTransaction[] = [];

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
  // TODO: Query FMFinancialTxn collection
  return [];
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
  // TODO: Create payment transaction and update invoice status
  const payment: FinancialTransaction = {
    id: `TXN-PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'PAYMENT',
    workOrderId: '',
    propertyId: '',
    ownerId: '',
    amount,
    currency: 'SAR',
    category: 'PAYMENT',
    description: `Payment for invoice #${invoiceId} via ${paymentMethod}`,
    date: new Date(),
    status: 'POSTED',
    postingRef: reference,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('[Finance] Recorded payment:', payment.id);
  return payment;
}
