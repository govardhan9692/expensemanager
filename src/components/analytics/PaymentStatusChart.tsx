import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PaymentStatusData } from '@/utils/analyticsCalculations';

interface PaymentStatusChartProps {
  data: PaymentStatusData[];
  totalExpected: number;
  totalReceived: number;
}

const STATUS_COLORS = {
  paid: 'hsl(var(--success))',
  pending: 'hsl(var(--warning))',
  overdue: 'hsl(var(--danger))'
};

export const PaymentStatusChart = ({ data, totalExpected, totalReceived }: PaymentStatusChartProps) => {
  const chartData = data
    .filter(item => item.amount > 0)
    .map(item => ({
      name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
      value: item.amount,
      count: item.count
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.name.toLowerCase() as keyof typeof STATUS_COLORS]} 
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number, name, props: any) => [
                `$${value.toLocaleString()} (${props.payload.count} payment${props.payload.count !== 1 ? 's' : ''})`,
                name
              ]}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center mt-4 text-sm">
          <p className="font-semibold text-lg">
            ${totalReceived.toLocaleString()} received of ${totalExpected.toLocaleString()} expected
          </p>
          <p className="text-muted-foreground">
            {totalExpected > 0 ? ((totalReceived / totalExpected) * 100).toFixed(0) : 0}% collected
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
