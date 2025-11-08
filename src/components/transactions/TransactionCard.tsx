import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Eye, FileText, Building2, Edit, X } from 'lucide-react';

interface TransactionCardProps {
  transaction: {
    id: string;
    type: 'income' | 'expense' | 'transfer_to_personal' | 'profit_distribution';
    amount: number;
    category: string;
    description: string;
    date: string;
    imageUrl?: string;
    createdBy: { userId: string; name: string };
    clientId?: string | null;
    clientName?: string | null;
    clientType?: string | null;
    clientExpenseCategory?: string | null;
  };
  onDelete: () => void;
  onEdit?: () => void;
  onViewClient?: () => void;
  canEdit: boolean;
}

const TransactionCard = ({ transaction, onDelete, onEdit, onViewClient, canEdit }: TransactionCardProps) => {
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const getTypeIcon = () => {
    if (transaction.type === 'income') return '✅';
    if (transaction.type === 'expense') return '💸';
    if (transaction.type === 'transfer_to_personal') return '📤';
    if (transaction.type === 'profit_distribution') return '💰';
    return '💵';
  };

  const getTypeLabel = () => {
    if (transaction.type === 'income') return 'Income';
    if (transaction.type === 'expense') return 'Expense';
    if (transaction.type === 'transfer_to_personal') return 'Transfer';
    if (transaction.type === 'profit_distribution') return 'Distribution';
    return 'Transaction';
  };

  const getAmountColor = () => {
    if (transaction.type === 'income') return 'text-success';
    if (transaction.type === 'expense') return 'text-danger';
    return 'text-foreground';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getTypeIcon()}</span>
                <span className={`font-semibold ${getAmountColor()}`}>
                  {getTypeLabel()}: ${transaction.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{transaction.description}</p>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onEdit}
                    title="Edit transaction"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onDelete}
                  title="Delete transaction"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Client Badge */}
          {transaction.clientId && transaction.clientName && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                variant="secondary" 
                className="bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                onClick={onViewClient}
              >
                <Building2 className="w-3 h-3 mr-1" />
                {transaction.clientName} • {transaction.clientType}
              </Badge>
              {transaction.clientExpenseCategory && (
                <Badge variant="outline" className="text-xs">
                  {transaction.clientExpenseCategory}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{new Date(transaction.date).toLocaleDateString()}</span>
              <span>•</span>
              <span>Added by: {transaction.createdBy.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {transaction.clientId && onViewClient && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onViewClient}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View Client
                </Button>
              )}
              {transaction.imageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setReceiptDialogOpen(true)}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Receipt
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Receipt Image Dialog */}
      {transaction.imageUrl && (
        <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle>Receipt - {transaction.description}</DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setReceiptDialogOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString()} • ${transaction.amount.toLocaleString()}
              </p>
            </DialogHeader>
            <div className="overflow-auto max-h-[calc(90vh-120px)] p-6 pt-0">
              <img
                src={transaction.imageUrl}
                alt="Receipt"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default TransactionCard;
