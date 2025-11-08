import { useState } from 'react';
import { Client } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useClientTransactions } from '@/hooks/useClientTransactions';
import TransactionCard from '@/components/transactions/TransactionCard';
import { toast } from 'sonner';
import { PaymentScheduleTab } from '@/components/payments/PaymentScheduleTab';
import { ClientAnalyticsTab } from '@/components/analytics/ClientAnalyticsTab';

interface ClientDetailViewProps {
  client: Client;
  businessId: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteTransaction: (transactionId: string) => void;
  onEditTransaction?: (transactionId: string) => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  canEdit: boolean;
  isOwner: boolean;
}

const ClientDetailView = ({
  client,
  businessId,
  onBack,
  onEdit,
  onDelete,
  onDeleteTransaction,
  onEditTransaction,
  onAddIncome,
  onAddExpense,
  canEdit,
  isOwner
}: ClientDetailViewProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const { basicInfo, services, financialSummary, customExpenseCategories } = client;
  
  // Fetch client transactions
  const { transactions, loading, totalIncome, totalExpenses, count } = useClientTransactions(businessId, client.id);

  const getStatusBadgeVariant = () => {
    switch (basicInfo.status) {
      case 'Active':
        return 'default';
      case 'Pending Payment':
        return 'secondary';
      case 'Completed':
        return 'outline';
      case 'On Hold':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const handleDelete = () => {
    onDelete();
    setDeleteDialogOpen(false);
  };

  const profitMargin = financialSummary.totalReceivedIncome > 0
    ? ((financialSummary.netProfit / financialSummary.totalReceivedIncome) * 100).toFixed(1)
    : '0.0';

  const paymentPercentage = financialSummary.totalExpectedIncome > 0
    ? ((financialSummary.totalReceivedIncome / financialSummary.totalExpectedIncome) * 100).toFixed(0)
    : '0';

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    if (filterType !== 'all' && txn.type !== filterType) return false;
    if (filterService !== 'all' && txn.serviceId !== filterService) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{basicInfo.name}</h1>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{basicInfo.type}</Badge>
              <Badge variant={getStatusBadgeVariant()}>{basicInfo.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Expected Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financialSummary.totalExpectedIncome.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-success" />
                  Received Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  ${financialSummary.totalReceivedIncome.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentPercentage}% paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  ${financialSummary.totalPendingIncome.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {100 - parseInt(paymentPercentage)}% pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-danger" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">
                  ${financialSummary.totalExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Wallet className="w-4 h-4 text-primary" />
                  Net Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${financialSummary.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${financialSummary.netProfit.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profitMargin}% margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Services List */}
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {services.map((service) => (
                <div key={service.serviceId} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{service.serviceName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Expected: ${service.expectedAmount.toLocaleString()} | Terms: {
                          service.paymentTerms === 'full' ? 'Full Payment' :
                          service.paymentTerms === 'partial' ? 'Partial Payments' :
                          'Recurring'
                        }
                      </p>
                    </div>
                    <Badge variant="outline">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${service.expectedAmount.toLocaleString()}
                    </Badge>
                  </div>
                  
                  {service.paymentSchedule && service.paymentSchedule.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Status: {service.paymentSchedule.filter(p => p.status === 'paid').length} of {service.paymentSchedule.length} payments received
                    </div>
                  )}

                  {service.recurring && (
                    <div className="text-sm text-muted-foreground">
                      Recurring: {service.recurring.frequency} on day {service.recurring.dayOfPayment}
                      {service.recurring.autoGenerate && ' (Auto-generate enabled)'}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {basicInfo.contactEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{basicInfo.contactEmail}</span>
                </div>
              )}
              {basicInfo.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{basicInfo.contactPhone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>
                  Start: {new Date(basicInfo.startDate).toLocaleDateString()}
                  {basicInfo.endDate ? ` - End: ${new Date(basicInfo.endDate).toLocaleDateString()}` : ' (Ongoing)'}
                </span>
              </div>
              {basicInfo.description && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{basicInfo.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          {customExpenseCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {customExpenseCategories.map(category => (
                    <Badge key={category} variant="secondary">{category}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" className="flex-1" onClick={onAddIncome}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Add Income
                </Button>
                <Button variant="outline" className="flex-1" onClick={onAddExpense}>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {services.length > 1 && (
                  <div className="space-y-2">
                    <Label>Service</Label>
                    <Select value={filterService} onValueChange={setFilterService}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="all">All Services</SelectItem>
                        {services.map(service => (
                          <SelectItem key={service.serviceId} value={service.serviceId}>
                            {service.serviceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {(filterType !== 'all' || filterService !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType('all');
                    setFilterService('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardContent className="py-4">
              <div className="text-sm space-y-1">
                <p className="font-semibold">
                  Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} for {basicInfo.name}
                </p>
                <div className="flex gap-4 text-muted-foreground">
                  <span>Total Income: <span className="text-success font-medium">${totalIncome.toLocaleString()}</span></span>
                  <span>Total Expenses: <span className="text-danger font-medium">${totalExpenses.toLocaleString()}</span></span>
                  <span>Net: <span className={`font-medium ${(totalIncome - totalExpenses) >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${Math.abs(totalIncome - totalExpenses).toLocaleString()}
                  </span></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">No transactions yet for {basicInfo.name}</p>
                  {canEdit && (
                    <div className="flex justify-center gap-3">
                      <Button variant="outline" size="sm" onClick={onAddIncome}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Add Income
                      </Button>
                      <Button variant="outline" size="sm" onClick={onAddExpense}>
                        <TrendingDown className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((txn) => (
                    <TransactionCard
                      key={txn.id}
                      transaction={txn}
                      onDelete={() => onDeleteTransaction(txn.id)}
                      onEdit={onEditTransaction ? () => onEditTransaction(txn.id) : undefined}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedule Tab */}
        <TabsContent value="schedule">
          <PaymentScheduleTab
            client={client}
            businessId={businessId}
            canEdit={canEdit}
            onRefresh={() => window.location.reload()}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <ClientAnalyticsTab client={client} businessId={businessId} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{basicInfo.name}"? This action cannot be undone.
            All associated data will be removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetailView;
