import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Client } from '@/types/client';
import { Building2, Calendar } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onViewDetails: (clientId: string) => void;
}

const ClientCard = ({ client, onViewDetails }: ClientCardProps) => {
  const { basicInfo, financialSummary } = client;
  
  // Determine border color based on status
  const getBorderColor = () => {
    if (basicInfo.status === 'Completed') return 'border-muted';
    if (financialSummary.totalPendingIncome === 0) return 'border-success';
    
    // Check for overdue payments
    const hasOverdue = client.services.some(service => 
      service.paymentSchedule?.some(payment => 
        payment.status === 'overdue'
      )
    );
    
    if (hasOverdue) return 'border-danger';
    if (financialSummary.totalPendingIncome > 0) return 'border-warning';
    return 'border-border';
  };

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

  // Find next payment
  const getNextPayment = () => {
    const allPayments: Array<{ date: string; amount: number }> = [];
    
    client.services.forEach(service => {
      service.paymentSchedule?.forEach(payment => {
        if (payment.status === 'pending') {
          allPayments.push({
            date: payment.dueDate,
            amount: payment.amount
          });
        }
      });
    });

    if (allPayments.length === 0) return null;

    allPayments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return allPayments[0];
  };

  const nextPayment = getNextPayment();

  return (
    <Card 
      className={`hover:shadow-lg transition-all cursor-pointer border-2 ${getBorderColor()}`}
      onClick={() => onViewDetails(client.id)}
    >
      <CardContent className="pt-4 md:pt-6 pb-4">
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-base md:text-lg truncate">{basicInfo.name}</h3>
          </div>
        </div>

        <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 flex-wrap">
          <Badge variant="outline" className="text-xs">{basicInfo.type}</Badge>
          <Badge variant={getStatusBadgeVariant()} className="text-xs">{basicInfo.status}</Badge>
        </div>

        <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expected:</span>
            <span className="font-semibold truncate ml-2">${financialSummary.totalExpectedIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Received:</span>
            <span className="font-semibold text-success truncate ml-2">${financialSummary.totalReceivedIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending:</span>
            <span className="font-semibold text-warning truncate ml-2">${financialSummary.totalPendingIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expenses:</span>
            <span className="font-semibold text-danger truncate ml-2">${financialSummary.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t pt-1.5 md:pt-2">
            <span className="text-muted-foreground">Net Profit:</span>
            <span className={`font-bold truncate ml-2 ${financialSummary.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              ${financialSummary.netProfit.toLocaleString()}
            </span>
          </div>
        </div>

        {nextPayment && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 bg-muted/50 p-2 rounded">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            <span className="truncate">
              Next: {new Date(nextPayment.date).toLocaleDateString()} - ${nextPayment.amount.toLocaleString()}
            </span>
          </div>
        )}

        <Button className="w-full h-8 md:h-10 text-sm" variant="outline" onClick={(e) => {
          e.stopPropagation();
          onViewDetails(client.id);
        }}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
