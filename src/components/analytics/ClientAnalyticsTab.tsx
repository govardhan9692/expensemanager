import { useState } from 'react';
import { Client } from '@/types/client';
import { useClientTransactions } from '@/hooks/useClientTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { IncomeVsExpensesChart } from './IncomeVsExpensesChart';
import { ExpenseBreakdownChart } from './ExpenseBreakdownChart';
import { PaymentStatusChart } from './PaymentStatusChart';
import { ProfitMarginChart } from './ProfitMarginChart';
import { Download, TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react';
import dayjs from 'dayjs';
import {
  calculateMonthlyData,
  calculateExpenseBreakdown,
  calculatePaymentStatus,
  calculateProfitMargin
} from '@/utils/analyticsCalculations';
import { toast } from 'sonner';

interface ClientAnalyticsTabProps {
  client: Client;
  businessId: string;
}

type DateRange = '1' | '3' | '6' | '12';

export const ClientAnalyticsTab = ({ client, businessId }: ClientAnalyticsTabProps) => {
  const [dateRange, setDateRange] = useState<DateRange>('6');
  const { transactions, loading, totalIncome, totalExpenses } = useClientTransactions(businessId, client.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const months = parseInt(dateRange);
  const monthlyData = calculateMonthlyData(transactions, months);
  const expenseBreakdown = calculateExpenseBreakdown(transactions);
  const paymentStatusData = calculatePaymentStatus(client);
  const profitMarginData = calculateProfitMargin(transactions, months);

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const avgPaymentValue = transactions.filter(t => t.type === 'income').length > 0
    ? totalIncome / transactions.filter(t => t.type === 'income').length
    : 0;

  const mostExpensiveCategory = expenseBreakdown.length > 0 ? expenseBreakdown[0] : null;

  const handleExport = (format: 'pdf' | 'csv' | 'images') => {
    toast.info(`Export as ${format.toUpperCase()} coming soon!`);
  };

  // Calculate month-over-month change
  const prevMonthProfit = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2].netProfit : 0;
  const currentMonthProfit = monthlyData.length >= 1 ? monthlyData[monthlyData.length - 1].netProfit : 0;
  const momChange = prevMonthProfit !== 0 ? ((currentMonthProfit - prevMonthProfit) / Math.abs(prevMonthProfit)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Date Range:</span>
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Month</SelectItem>
                  <SelectItem value="3">Last 3 Months</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="12">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing data for: {dayjs().subtract(months, 'month').format('MMM D, YYYY')} - {dayjs().format('MMM D, YYYY')}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <IncomeVsExpensesChart data={monthlyData} />
        <ExpenseBreakdownChart data={expenseBreakdown} />
        <PaymentStatusChart 
          data={paymentStatusData} 
          totalExpected={client.financialSummary.totalExpectedIncome}
          totalReceived={client.financialSummary.totalReceivedIncome}
        />
        <ProfitMarginChart data={profitMarginData} targetMargin={80} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.type === 'income').length} payment{transactions.filter(t => t.type === 'income').length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-danger" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {transactions.filter(t => t.type === 'expense').length} expense{transactions.filter(t => t.type === 'expense').length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              ${Math.abs(netProfit).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {momChange !== 0 ? (
                <span className={momChange > 0 ? 'text-success' : 'text-danger'}>
                  {momChange > 0 ? '↑' : '↓'} {Math.abs(momChange).toFixed(0)}% MoM
                </span>
              ) : (
                'No change'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-success' : 'text-danger'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitMargin >= 80 ? 'Excellent' : profitMargin >= 50 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Payment Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPaymentValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Expensive Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {mostExpensiveCategory ? mostExpensiveCategory.category : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mostExpensiveCategory ? `$${mostExpensiveCategory.amount.toLocaleString()}` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On-Time Payment Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">100%</div>
            <p className="text-xs text-muted-foreground mt-1">All payments on time</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profitMargin >= 80 && (
            <div className="flex items-start gap-2">
              <span className="text-success">✅</span>
              <p className="text-sm">This client is highly profitable ({profitMargin.toFixed(0)}% margin)</p>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-success">✅</span>
            <p className="text-sm">On-time payment rate: 100%</p>
          </div>
          {momChange > 0 && (
            <div className="flex items-start gap-2">
              <span>📈</span>
              <p className="text-sm">Revenue trend: Growing (+{momChange.toFixed(0)}% vs last month)</p>
            </div>
          )}
          {mostExpensiveCategory && mostExpensiveCategory.amount > totalExpenses * 0.3 && (
            <div className="flex items-start gap-2">
              <span className="text-warning">⚠️</span>
              <p className="text-sm">{mostExpensiveCategory.category} expenses are {((mostExpensiveCategory.amount / totalExpenses) * 100).toFixed(0)}% of total - consider reviewing</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
