import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ClientPerformanceData } from '@/utils/analyticsCalculations';
import { Progress } from '@/components/ui/progress';

interface BusinessComparisonChartsProps {
  performanceData: ClientPerformanceData[];
}

const TYPE_COLORS = {
  'Clients': 'hsl(var(--chart-1))',
  'Projects': 'hsl(var(--chart-2))',
  'Rentals': 'hsl(var(--chart-3))',
  'Products': 'hsl(var(--chart-4))',
};

export const BusinessComparisonCharts = ({ performanceData }: BusinessComparisonChartsProps) => {
  // Top 10 by net profit
  const topClientsData = [...performanceData]
    .sort((a, b) => b.netProfit - a.netProfit)
    .slice(0, 10)
    .map(client => ({
      name: client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name,
      profit: client.netProfit
    }));

  // Revenue by type
  const revenueByType = performanceData.reduce((acc, client) => {
    acc[client.type] = (acc[client.type] || 0) + client.receivedIncome;
    return acc;
  }, {} as Record<string, number>);

  const revenueTypeData = Object.entries(revenueByType).map(([type, revenue]) => ({
    name: type,
    value: revenue
  }));

  const totalRevenue = revenueTypeData.reduce((sum, item) => sum + item.value, 0);

  // Payment collection by client (top 10)
  const collectionData = [...performanceData]
    .sort((a, b) => b.receivedIncome - a.receivedIncome)
    .slice(0, 10);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Net Profit by Client */}
      <Card>
        <CardHeader>
          <CardTitle>Net Profit by Client (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClientsData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                className="text-muted-foreground text-xs"
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                className="text-muted-foreground text-xs"
              />
              <Tooltip 
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="profit" 
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Client Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${((entry.value / totalRevenue) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {revenueTypeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={TYPE_COLORS[entry.name as keyof typeof TYPE_COLORS] || 'hsl(var(--primary))'} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment Collection Rate */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Payment Collection by Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collectionData.map((client) => {
              const collectionRate = client.expectedIncome > 0 
                ? (client.receivedIncome / client.expectedIncome) * 100 
                : 0;
              
              const getColor = () => {
                if (collectionRate >= 90) return 'bg-success';
                if (collectionRate >= 50) return 'bg-warning';
                return 'bg-danger';
              };

              return (
                <div key={client.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-muted-foreground">
                      {collectionRate.toFixed(0)}% (${client.receivedIncome.toLocaleString()} of ${client.expectedIncome.toLocaleString()})
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute top-0 left-0 h-full ${getColor()} transition-all`}
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
