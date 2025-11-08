import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle } from 'lucide-react';
import { Client } from '@/types/client';
import { getTopPerformers, getClientsNeedingAttention, calculateClientPerformance } from '@/utils/analyticsCalculations';
import { useNavigate } from 'react-router-dom';

interface ClientsOverviewWidgetProps {
  clients: Client[];
  businessId: string;
}

export const ClientsOverviewWidget = ({ clients, businessId }: ClientsOverviewWidgetProps) => {
  const navigate = useNavigate();
  
  const activeClients = clients.filter(c => c.basicInfo.status === 'Active');
  
  const totalExpectedThisMonth = clients.reduce((sum, client) => {
    return sum + client.financialSummary.totalExpectedIncome;
  }, 0);

  const totalReceivedThisMonth = clients.reduce((sum, client) => {
    return sum + client.financialSummary.totalReceivedIncome;
  }, 0);

  const totalPendingThisMonth = totalExpectedThisMonth - totalReceivedThisMonth;
  const percentReceived = totalExpectedThisMonth > 0 ? (totalReceivedThisMonth / totalExpectedThisMonth) * 100 : 0;

  const performanceData = calculateClientPerformance(clients);
  const topPerformers = getTopPerformers(performanceData, 3);
  const needsAttention = getClientsNeedingAttention(clients);

  const handleClientClick = (clientId: string) => {
    navigate(`/business/${businessId}?clientId=${clientId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Clients Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Active Clients:</span>
            <span className="text-lg font-bold">{activeClients.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Expected This Month:</span>
            <span className="text-lg font-bold">${totalExpectedThisMonth.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Received This Month:</span>
            <span className="text-lg font-bold text-success">
              ${totalReceivedThisMonth.toLocaleString()} ({percentReceived.toFixed(0)}%)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Pending This Month:</span>
            <span className="text-lg font-bold text-warning">${totalPendingThisMonth.toLocaleString()}</span>
          </div>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Top Performers (by net profit)</h4>
            <div className="space-y-2">
              {topPerformers.map((performer, index) => (
                <button
                  key={performer.id}
                  onClick={() => handleClientClick(performer.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][index]}</span>
                    <span className="font-medium">{performer.name}:</span>
                    <span className="text-success">${performer.netProfit.toLocaleString()}</span>
                    <span className="text-muted-foreground">({performer.profitMargin.toFixed(0)}% margin)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attention Needed */}
        {needsAttention.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              Attention Needed
            </h4>
            <div className="space-y-2">
              {needsAttention.slice(0, 3).map(({ client, reason }) => (
                <button
                  key={client.id}
                  onClick={() => handleClientClick(client.id)}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="text-sm">
                    <span className="font-medium">{client.basicInfo.name}:</span>{' '}
                    <span className="text-warning">{reason}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1" 
            size="sm"
            onClick={() => navigate(`/business/${businessId}`)}
          >
            View All Clients
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
