import { useState, useMemo } from 'react';
import { Client, ClientStatus, ClientType } from '@/types/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, DollarSign, TrendingUp, Clock, Wallet, Search } from 'lucide-react';
import ClientCard from './ClientCard';

interface ClientsListProps {
  clients: Client[];
  onAddClient: () => void;
  onViewClient: (clientId: string) => void;
  canEdit: boolean;
}

const ClientsList = ({ clients, onAddClient, onViewClient, canEdit }: ClientsListProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate summary stats
  const summary = useMemo(() => {
    const activeClients = clients.filter(c => c.basicInfo.status === 'Active').length;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let expectedThisMonth = 0;
    let receivedThisMonth = 0;
    
    clients.forEach(client => {
      // Expected this month from payment schedules
      client.services.forEach(service => {
        service.paymentSchedule?.forEach(payment => {
          const paymentDate = new Date(payment.dueDate);
          if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
            expectedThisMonth += payment.amount;
            if (payment.status === 'paid') {
              receivedThisMonth += payment.amount;
            }
          }
        });
      });
    });

    const pendingThisMonth = expectedThisMonth - receivedThisMonth;
    const totalNetProfit = clients.reduce((sum, c) => sum + c.financialSummary.netProfit, 0);

    return {
      activeClients,
      expectedThisMonth,
      receivedThisMonth,
      pendingThisMonth,
      totalNetProfit
    };
  }, [clients]);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      if (statusFilter !== 'all' && client.basicInfo.status !== statusFilter) return false;
      if (typeFilter !== 'all' && client.basicInfo.type !== typeFilter) return false;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          client.basicInfo.name.toLowerCase().includes(query) ||
          client.basicInfo.type.toLowerCase().includes(query) ||
          client.basicInfo.description.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [clients, statusFilter, typeFilter, searchQuery]);

  // Get unique types
  const clientTypes = useMemo(() => {
    const types = new Set(clients.map(c => c.basicInfo.type));
    return Array.from(types);
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Clients & Projects</h2>
          <p className="text-sm text-muted-foreground">Manage your clients and track project finances</p>
        </div>
        {canEdit && (
          <Button onClick={onAddClient}>
            <Plus className="w-4 h-4 mr-2" />
            Add Client/Project
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expected This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.expectedThisMonth.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-success" />
              Received This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ${summary.receivedThisMonth.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4 text-warning" />
              Pending This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              ${summary.pendingThisMonth.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-4 h-4 text-primary" />
              Total Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
              ${summary.totalNetProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Pending Payment">Pending Payment</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="all">All Types</SelectItem>
            {clientTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Cards */}
      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {clients.length === 0 
                ? 'Start by adding your first client or project to track finances'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {canEdit && clients.length === 0 && (
              <Button onClick={onAddClient}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onViewDetails={onViewClient}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientsList;
