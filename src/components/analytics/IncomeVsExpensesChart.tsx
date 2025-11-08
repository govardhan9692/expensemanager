import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { MonthlyData } from '@/utils/analyticsCalculations';

interface IncomeVsExpensesChartProps {
  data: MonthlyData[];
}

export const IncomeVsExpensesChart = ({ data }: IncomeVsExpensesChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-muted-foreground text-xs"
            />
            <YAxis 
              className="text-muted-foreground text-xs"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => `$${value.toLocaleString()}`}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="netProfit"
              fill="hsl(var(--success))"
              fillOpacity={0.2}
              stroke="none"
              name="Net Profit"
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Income"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="hsl(var(--danger))"
              strokeWidth={2}
              name="Expenses"
              dot={{ fill: 'hsl(var(--danger))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
