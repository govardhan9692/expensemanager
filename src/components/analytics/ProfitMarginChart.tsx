import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ProfitMarginData } from '@/utils/analyticsCalculations';

interface ProfitMarginChartProps {
  data: ProfitMarginData[];
  targetMargin?: number;
}

export const ProfitMarginChart = ({ data, targetMargin = 80 }: ProfitMarginChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Margin Trend</CardTitle>
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
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'Margin') return `${value.toFixed(1)}%`;
                return `$${value.toLocaleString()}`;
              }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <ReferenceLine 
              y={targetMargin} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3" 
              label={{ value: `Target ${targetMargin}%`, position: 'right' }}
            />
            <Area
              type="monotone"
              dataKey="margin"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              name="Margin"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
