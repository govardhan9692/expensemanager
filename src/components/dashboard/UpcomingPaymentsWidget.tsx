import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Client, PaymentScheduleItem } from '@/types/client';
import { getPaymentStatusInfo } from '@/utils/paymentStatus';
import dayjs from 'dayjs';

interface UpcomingPayment {
  businessId: string;
  businessName: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  payment: PaymentScheduleItem;
  daysUntilDue: number;
}

export const UpcomingPaymentsWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUpcomingPayments = async () => {
      try {
        // Get all businesses (owned and partnered)
        const businessesRef = collection(db, 'businesses');
        const ownedQuery = query(businessesRef, where('ownerId', '==', user.uid));
        const ownedSnapshot = await getDocs(ownedQuery);

        const businessIds = ownedSnapshot.docs.map(doc => doc.id);
        const businessNames = new Map(
          ownedSnapshot.docs.map(doc => [doc.id, doc.data().name])
        );

        // Get partnered businesses
        const allBusinessesSnapshot = await getDocs(businessesRef);
        for (const businessDoc of allBusinessesSnapshot.docs) {
          const partnersRef = collection(db, 'businesses', businessDoc.id, 'partners');
          const partnerQuery = query(partnersRef, where('__name__', '==', user.uid));
          const partnerSnapshot = await getDocs(partnerQuery);

          if (!partnerSnapshot.empty) {
            businessIds.push(businessDoc.id);
            businessNames.set(businessDoc.id, businessDoc.data().name);
          }
        }

        // Fetch all clients from all businesses
        const payments: UpcomingPayment[] = [];
        const now = dayjs();
        const sevenDaysFromNow = now.add(7, 'days');

        for (const businessId of businessIds) {
          const clientsRef = collection(db, 'businesses', businessId, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);

          clientsSnapshot.docs.forEach(clientDoc => {
            const client = { id: clientDoc.id, ...clientDoc.data() } as Client;

            client.services?.forEach(service => {
              service.paymentSchedule?.forEach(payment => {
                if (payment.status !== 'paid') {
                  const dueDate = dayjs(payment.dueDate);
                  const daysUntilDue = dueDate.diff(now, 'days');

                  // Include payments due in the next 7 days
                  if (dueDate.isBefore(sevenDaysFromNow) || dueDate.isSame(sevenDaysFromNow, 'day')) {
                    payments.push({
                      businessId,
                      businessName: businessNames.get(businessId) || 'Unknown',
                      clientId: client.id,
                      clientName: client.basicInfo.name,
                      serviceId: service.serviceId,
                      serviceName: service.serviceName,
                      payment,
                      daysUntilDue,
                    });
                  }
                }
              });
            });
          });
        }

        // Sort by days until due (most urgent first)
        payments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

        setUpcomingPayments(payments);
      } catch (error) {
        console.error('Error fetching upcoming payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingPayments();
  }, [user]);

  const handleViewClient = (businessId: string, clientId: string) => {
    navigate(`/business/${businessId}?client=${clientId}&tab=payments`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Payments (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading payments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (upcomingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Payments (Next 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No payments due in the next 7 days</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = upcomingPayments.reduce((sum, p) => sum + p.payment.amount, 0);
  const overdueCount = upcomingPayments.filter(p => p.daysUntilDue < 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Payments (Next 7 Days)
          </div>
          <Badge variant="secondary" className="text-xs">
            {upcomingPayments.length} payment{upcomingPayments.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">${totalAmount.toLocaleString()}</span>
            <span className="text-muted-foreground">total expected</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold">{overdueCount} overdue</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
          {upcomingPayments.map((item, index) => {
            const statusInfo = getPaymentStatusInfo(item.payment);
            
            return (
              <div
                key={`${item.clientId}-${item.payment.scheduleId}`}
                className={`p-4 rounded-lg border-l-4 ${statusInfo.borderColor} bg-card hover:shadow-md transition-shadow cursor-pointer`}
                onClick={() => handleViewClient(item.businessId, item.clientId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {item.businessName}
                      </Badge>
                      <span className={`text-xs font-semibold ${statusInfo.textColor}`}>
                        {statusInfo.statusIcon} {statusInfo.statusLabel}
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1 truncate">
                      {item.clientName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.serviceName}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg">
                      ${item.payment.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs ${statusInfo.textColor}`}>
                      {statusInfo.daysInfo}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Due: {dayjs(item.payment.dueDate).format('MMM D, YYYY')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
