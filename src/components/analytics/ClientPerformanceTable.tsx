import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClientPerformanceData } from '@/utils/analyticsCalculations';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface ClientPerformanceTableProps {
  data: ClientPerformanceData[];
  onClientClick?: (clientId: string) => void;
}

type SortField = 'name' | 'expectedIncome' | 'receivedIncome' | 'percentPaid' | 'totalExpenses' | 'netProfit' | 'profitMargin';
type SortDirection = 'asc' | 'desc';

export const ClientPerformanceTable = ({ data, onClientClick }: ClientPerformanceTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.type.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(client => client.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchQuery, typeFilter, statusFilter, sortField, sortDirection]);

  const totals = useMemo(() => {
    return filteredAndSortedData.reduce(
      (acc, client) => ({
        expectedIncome: acc.expectedIncome + client.expectedIncome,
        receivedIncome: acc.receivedIncome + client.receivedIncome,
        totalExpenses: acc.totalExpenses + client.totalExpenses,
        netProfit: acc.netProfit + client.netProfit
      }),
      { expectedIncome: 0, receivedIncome: 0, totalExpenses: 0, netProfit: 0 }
    );
  }, [filteredAndSortedData]);

  const getRowColor = (margin: number) => {
    if (margin >= 80) return 'bg-success/5 hover:bg-success/10';
    if (margin >= 50) return 'bg-warning/5 hover:bg-warning/10';
    if (margin < 0) return 'bg-danger/5 hover:bg-danger/10';
    return 'hover:bg-muted/50';
  };

  const handleExport = () => {
    toast.info('Export as CSV coming soon!');
  };

  const uniqueTypes = Array.from(new Set(data.map(d => d.type)));
  const uniqueStatuses = Array.from(new Set(data.map(d => d.status)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>Client Performance Report</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                    Client
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('expectedIncome')}>
                    Expected
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('receivedIncome')}>
                    Received
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('percentPaid')}>
                    % Paid
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('totalExpenses')}>
                    Expenses
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('netProfit')}>
                    Net Profit
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('profitMargin')}>
                    Margin
                    <ArrowUpDown className="ml-2 w-3 h-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((client) => (
                <TableRow
                  key={client.id}
                  className={`cursor-pointer ${getRowColor(client.profitMargin)}`}
                  onClick={() => onClientClick?.(client.id)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.type}</TableCell>
                  <TableCell className="text-right">${client.expectedIncome.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${client.receivedIncome.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{client.percentPaid.toFixed(0)}%</TableCell>
                  <TableCell className="text-right">${client.totalExpenses.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-medium ${client.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    ${Math.abs(client.netProfit).toLocaleString()}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${client.profitMargin >= 80 ? 'text-success' : client.profitMargin >= 50 ? 'text-warning' : 'text-danger'}`}>
                    {client.profitMargin.toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>TOTAL</TableCell>
                <TableCell className="text-right">${totals.expectedIncome.toLocaleString()}</TableCell>
                <TableCell className="text-right">${totals.receivedIncome.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {totals.expectedIncome > 0 ? ((totals.receivedIncome / totals.expectedIncome) * 100).toFixed(0) : 0}%
                </TableCell>
                <TableCell className="text-right">${totals.totalExpenses.toLocaleString()}</TableCell>
                <TableCell className={`text-right ${totals.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${Math.abs(totals.netProfit).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {totals.receivedIncome > 0 ? ((totals.netProfit / totals.receivedIncome) * 100).toFixed(0) : 0}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedData.length} of {data.length} clients
        </p>
      </CardContent>
    </Card>
  );
};
