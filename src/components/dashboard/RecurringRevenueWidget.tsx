import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Repeat, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client, RecurringFrequency } from '@/types/client';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

interface RecurringRevenueWidgetProps {
  businesses: { id: string; name: string }[];
}

export const RecurringRevenueWidget = ({ businesses }: RecurringRevenueWidgetProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [activeRecurring, setActiveRecurring] = useState(0);
  const [upcomingThisWeek, setUpcomingThisWeek] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [breakdown, setBreakdown] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadRecurringData();
  }, [businesses]);

  const loadRecurringData = async () => {
    setLoading(true);
    let totalMrr = 0;
    let totalActive = 0;
    let upcoming = 0;
    let overdue = 0;
    const freqBreakdown: { [key: string]: number } = {};

    try {
      for (const business of businesses) {
        const clientsRef = collection(db, `businesses/${business.id}/clients`);
        const clientsSnapshot = await getDocs(query(clientsRef));

        for (const clientDoc of clientsSnapshot.docs) {
          const client = clientDoc.data() as Client;

          for (const service of client.services) {
            if (service.paymentTerms === 'recurring' && service.recurring?.autoGenerate && !service.recurring?.isPaused) {
              totalActive++;
              
              const amount = service.expectedAmount;
              const frequency = service.recurring.frequency;

              // Calculate MRR
              totalMrr += normalizeToMonthly(amount, frequency);

              // Breakdown by frequency
              freqBreakdown[frequency] = (freqBreakdown[frequency] || 0) + amount;

              // Check upcoming and overdue
              if (service.paymentSchedule) {
                const now = dayjs();
                const weekFromNow = now.add(7, 'days');

                for (const payment of service.paymentSchedule) {
                  const dueDate = dayjs(payment.dueDate);
                  
                  if (payment.status !== 'paid') {
                    if (dueDate.isBefore(now)) {
                      overdue++;
                    } else if (dueDate.isBefore(weekFromNow)) {
                      upcoming++;
                    }
                  }
                }
              }
            }
          }
        }
      }

      setMrr(totalMrr);
      setActiveRecurring(totalActive);
      setUpcomingThisWeek(upcoming);
      setOverdueCount(overdue);
      setBreakdown(freqBreakdown);
    } catch (error) {
      console.error('Error loading recurring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizeToMonthly = (amount: number, frequency: RecurringFrequency): number => {
    switch (frequency) {
      case 'monthly':
        return amount;
      case 'weekly':
        return amount * 4.33; // avg weeks per month
      case 'quarterly':
        return amount / 3;
      case 'yearly':
        return amount / 12;
      case 'custom':
        return amount; // simplified
      default:
        return amount;
    }
  };

  const arr = mrr * 12;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeRecurring === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Recurring Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No active recurring services yet. Create clients with recurring payment terms to track MRR.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Recurring Revenue Overview
          </div>
          <Badge variant="secondary">{activeRecurring} Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
            <p className="text-2xl font-bold">${mrr.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Annual Run Rate</p>
            <p className="text-2xl font-bold">${arr.toLocaleString()}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Breakdown by Frequency:</p>
          <div className="space-y-1">
            {Object.entries(breakdown).map(([freq, amount]) => (
              <div key={freq} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{freq}:</span>
                <span className="font-medium">${amount.toLocaleString()}/period</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming and Issues */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Upcoming This Week</span>
            </div>
            <p className="text-xl font-semibold">{upcomingThisWeek} payments</p>
          </div>
          {overdueCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Overdue</span>
              </div>
              <p className="text-xl font-semibold text-destructive">{overdueCount} payments</p>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/businesses')}
        >
          View All Recurring Services
        </Button>
      </CardContent>
    </Card>
  );
};
