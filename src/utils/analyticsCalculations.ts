import dayjs from 'dayjs';
import { Client, PaymentScheduleItem } from '@/types/client';
import { ClientTransaction } from '@/hooks/useClientTransactions';

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  netProfit: number;
}

export interface ExpenseCategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export interface PaymentStatusData {
  status: 'paid' | 'pending' | 'overdue';
  amount: number;
  percentage: number;
  count: number;
}

export interface ProfitMarginData {
  month: string;
  margin: number;
  netProfit: number;
}

export interface ClientPerformanceData {
  id: string;
  name: string;
  type: string;
  status: string;
  expectedIncome: number;
  receivedIncome: number;
  percentPaid: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export const calculateMonthlyData = (
  transactions: ClientTransaction[],
  months: number = 6
): MonthlyData[] => {
  const result: MonthlyData[] = [];
  const now = dayjs();

  for (let i = months - 1; i >= 0; i--) {
    const month = now.subtract(i, 'month');
    const monthKey = month.format('MMM YY');
    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');

    const monthTransactions = transactions.filter(txn => {
      const txnDate = dayjs(txn.date);
      return txnDate.isAfter(monthStart) && txnDate.isBefore(monthEnd);
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({
      month: monthKey,
      income,
      expenses,
      netProfit: income - expenses
    });
  }

  return result;
};

export const calculateExpenseBreakdown = (
  transactions: ClientTransaction[]
): ExpenseCategoryData[] => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const total = expenses.reduce((sum, t) => sum + t.amount, 0);

  const categoryMap = new Map<string, number>();
  expenses.forEach(txn => {
    const category = txn.clientExpenseCategory || txn.category;
    categoryMap.set(category, (categoryMap.get(category) || 0) + txn.amount);
  });

  const result: ExpenseCategoryData[] = [];
  categoryMap.forEach((amount, category) => {
    result.push({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    });
  });

  return result.sort((a, b) => b.amount - a.amount);
};

export const calculatePaymentStatus = (
  client: Client
): PaymentStatusData[] => {
  let totalPaid = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;

  client.services.forEach(service => {
    if (service.paymentSchedule) {
      service.paymentSchedule.forEach(item => {
        if (item.status === 'paid') {
          totalPaid += item.amount;
          paidCount++;
        } else if (item.status === 'overdue') {
          totalOverdue += item.amount;
          overdueCount++;
        } else {
          totalPending += item.amount;
          pendingCount++;
        }
      });
    }
  });

  const total = totalPaid + totalPending + totalOverdue;

  return [
    {
      status: 'paid',
      amount: totalPaid,
      percentage: total > 0 ? (totalPaid / total) * 100 : 0,
      count: paidCount
    },
    {
      status: 'pending',
      amount: totalPending,
      percentage: total > 0 ? (totalPending / total) * 100 : 0,
      count: pendingCount
    },
    {
      status: 'overdue',
      amount: totalOverdue,
      percentage: total > 0 ? (totalOverdue / total) * 100 : 0,
      count: overdueCount
    }
  ];
};

export const calculateProfitMargin = (
  transactions: ClientTransaction[],
  months: number = 6
): ProfitMarginData[] => {
  const result: ProfitMarginData[] = [];
  const now = dayjs();

  for (let i = months - 1; i >= 0; i--) {
    const month = now.subtract(i, 'month');
    const monthKey = month.format('MMM YY');
    const monthStart = month.startOf('month');
    const monthEnd = month.endOf('month');

    const monthTransactions = transactions.filter(txn => {
      const txnDate = dayjs(txn.date);
      return txnDate.isAfter(monthStart) && txnDate.isBefore(monthEnd);
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = income - expenses;
    const margin = income > 0 ? (netProfit / income) * 100 : 0;

    result.push({
      month: monthKey,
      margin,
      netProfit
    });
  }

  return result;
};

export const calculateClientPerformance = (
  clients: Client[]
): ClientPerformanceData[] => {
  return clients.map(client => {
    const { id, basicInfo, financialSummary } = client;
    const percentPaid = financialSummary.totalExpectedIncome > 0
      ? (financialSummary.totalReceivedIncome / financialSummary.totalExpectedIncome) * 100
      : 0;

    const profitMargin = financialSummary.totalReceivedIncome > 0
      ? (financialSummary.netProfit / financialSummary.totalReceivedIncome) * 100
      : 0;

    return {
      id,
      name: basicInfo.name,
      type: basicInfo.type,
      status: basicInfo.status,
      expectedIncome: financialSummary.totalExpectedIncome,
      receivedIncome: financialSummary.totalReceivedIncome,
      percentPaid,
      totalExpenses: financialSummary.totalExpenses,
      netProfit: financialSummary.netProfit,
      profitMargin
    };
  });
};

export const getTopPerformers = (
  performanceData: ClientPerformanceData[],
  limit: number = 3
): ClientPerformanceData[] => {
  return [...performanceData]
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, limit);
};

export const getClientsNeedingAttention = (
  clients: Client[]
): { client: Client; reason: string }[] => {
  const attention: { client: Client; reason: string }[] = [];

  clients.forEach(client => {
    // Check for overdue payments
    let overdueAmount = 0;
    let overdueDays = 0;
    client.services.forEach(service => {
      if (service.paymentSchedule) {
        service.paymentSchedule.forEach(item => {
          if (item.status === 'overdue') {
            overdueAmount += item.amount;
            const daysDiff = dayjs().diff(dayjs(item.dueDate), 'days');
            if (daysDiff > overdueDays) overdueDays = daysDiff;
          }
        });
      }
    });

    if (overdueAmount > 0) {
      attention.push({
        client,
        reason: `${overdueDays} days overdue ($${overdueAmount.toLocaleString()})`
      });
    }

    // Check for low margin
    const margin = client.financialSummary.totalReceivedIncome > 0
      ? (client.financialSummary.netProfit / client.financialSummary.totalReceivedIncome) * 100
      : 0;

    if (margin < 50 && margin > 0) {
      attention.push({
        client,
        reason: `Low margin (${margin.toFixed(0)}%)`
      });
    }

    if (client.financialSummary.netProfit < 0) {
      attention.push({
        client,
        reason: 'Negative profit'
      });
    }
  });

  return attention;
};
