import { PaymentScheduleItem } from '@/types/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPaymentStatusInfo } from '@/utils/paymentStatus';
import dayjs from 'dayjs';
import { ExternalLink } from 'lucide-react';

interface PaymentScheduleCardProps {
  item: PaymentScheduleItem;
  index: number;
  total: number;
  canEdit: boolean;
  onMarkAsPaid: (item: PaymentScheduleItem) => void;
  onViewTransaction?: (transactionId: string) => void;
}

export const PaymentScheduleCard = ({
  item,
  index,
  total,
  canEdit,
  onMarkAsPaid,
  onViewTransaction,
}: PaymentScheduleCardProps) => {
  const statusInfo = getPaymentStatusInfo(item);
  
  return (
    <Card className={`${statusInfo.borderColor} border-2 ${statusInfo.bgColor}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-foreground">
              Payment {index + 1} of {total}
            </h4>
            <p className="text-2xl font-bold text-foreground mt-1">
              ${item.amount.toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className={`${statusInfo.textColor} ${statusInfo.bgColor} border-current`}>
            {statusInfo.statusIcon} {statusInfo.statusLabel}
          </Badge>
        </div>
        
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium">Due Date:</span> {dayjs(item.dueDate).format('MMM D, YYYY')}
          </p>
          <p className={statusInfo.textColor}>
            {statusInfo.daysInfo}
          </p>
        </div>
        
        {statusInfo.isPaid && item.transactionId && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewTransaction?.(item.transactionId!)}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Transaction Details
            </Button>
          </div>
        )}
        
        {!statusInfo.isPaid && canEdit && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => onMarkAsPaid(item)}
              className="flex-1"
            >
              Quick Mark as Paid
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Send Reminder
            </Button>
          </div>
        )}
        
        {statusInfo.isOverdue && !statusInfo.isPaid && (
          <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-700">
            ⚠️ This payment is late
          </div>
        )}
      </CardContent>
    </Card>
  );
};
