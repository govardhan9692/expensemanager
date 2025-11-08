import { useState } from 'react';
import { Client, ClientService, PaymentScheduleItem } from '@/types/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentScheduleCard } from './PaymentScheduleCard';
import { QuickMarkAsPaidModal, PaymentData } from './QuickMarkAsPaidModal';
import { RecurringControlPanel } from './RecurringControlPanel';
import { calculatePaymentProgress } from '@/utils/paymentStatus';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, increment, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentScheduleTabProps {
  client: Client;
  businessId: string;
  canEdit: boolean;
  onRefresh: () => void;
}

export const PaymentScheduleTab = ({
  client,
  businessId,
  canEdit,
  onRefresh,
}: PaymentScheduleTabProps) => {
  const { user } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<{
    item: PaymentScheduleItem;
    service: ClientService;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMarkAsPaid = async (data: PaymentData) => {
    if (!user) return;

    try {
      setLoading(true);

      // Find service and payment index
      const serviceIndex = client.services.findIndex(s => s.serviceId === data.serviceId);
      const service = client.services[serviceIndex];
      const paymentIndex = service.paymentSchedule?.findIndex(p => p.scheduleId === data.scheduleId) ?? -1;

      // 1. Create income transaction
      const transactionRef = await addDoc(
        collection(db, `businesses/${businessId}/transactions`),
        {
          type: 'income',
          amount: data.amount,
          category: 'Business Revenue',
          date: data.date,
          description: `Payment - ${service.serviceName}`,
          clientId: client.id,
          clientName: client.basicInfo.name,
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          paymentScheduleId: data.scheduleId,
          linkedToSchedule: true,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          createdBy: {
            userId: user.uid,
            name: user.displayName || user.email || 'Unknown',
          },
          createdAt: serverTimestamp(),
        }
      );

      // 2. Update payment schedule item
      const updatedServices = [...client.services];
      if (updatedServices[serviceIndex].paymentSchedule) {
        updatedServices[serviceIndex].paymentSchedule![paymentIndex] = {
          ...updatedServices[serviceIndex].paymentSchedule![paymentIndex],
          status: 'paid',
          paidDate: data.date.toISOString(),
          transactionId: transactionRef.id,
        };
      }

      // 3. Update client document
      await updateDoc(doc(db, `businesses/${businessId}/clients/${client.id}`), {
        services: updatedServices,
        'financialSummary.totalReceivedIncome': increment(data.amount),
        'financialSummary.totalPendingIncome': increment(-data.amount),
      });

      toast({
        title: 'Payment recorded!',
        description: `${client.basicInfo.name} updated successfully.`,
      });

      onRefresh();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseRecurring = async (serviceId: string, reason: string) => {
    try {
      setLoading(true);
      const serviceIndex = client.services.findIndex(s => s.serviceId === serviceId);
      const updatedServices = [...client.services];
      
      updatedServices[serviceIndex] = {
        ...updatedServices[serviceIndex],
        recurring: {
          ...updatedServices[serviceIndex].recurring!,
          autoGenerate: false,
          isPaused: true,
          pausedAt: new Date().toISOString(),
          pausedReason: reason,
        },
      };

      await updateDoc(doc(db, `businesses/${businessId}/clients/${client.id}`), {
        services: updatedServices,
      });

      toast({
        title: 'Recurring paused',
        description: 'Payment generation has been paused for this service.',
      });

      onRefresh();
    } catch (error) {
      console.error('Error pausing recurring:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause recurring payments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeRecurring = async (serviceId: string) => {
    try {
      setLoading(true);
      const serviceIndex = client.services.findIndex(s => s.serviceId === serviceId);
      const updatedServices = [...client.services];
      
      updatedServices[serviceIndex] = {
        ...updatedServices[serviceIndex],
        recurring: {
          ...updatedServices[serviceIndex].recurring!,
          autoGenerate: true,
          isPaused: false,
          pausedAt: null,
          pausedReason: null,
        },
      };

      await updateDoc(doc(db, `businesses/${businessId}/clients/${client.id}`), {
        services: updatedServices,
      });

      toast({
        title: 'Recurring resumed',
        description: 'Payment generation has been resumed for this service.',
      });

      onRefresh();
    } catch (error) {
      console.error('Error resuming recurring:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume recurring payments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayments = async (serviceId: string) => {
    try {
      setLoading(true);
      toast({
        title: 'Generating payments...',
        description: 'This may take a moment.',
      });
      
      // Trigger a refresh which will cause useRecurringPayments to run
      onRefresh();
      
      setTimeout(() => {
        toast({
          title: 'Check complete',
          description: 'Recurring payments have been checked and generated if needed.',
        });
      }, 2000);
    } catch (error) {
      console.error('Error generating payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate payments.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const servicesWithSchedules = client.services.filter(
    service => service.paymentSchedule && service.paymentSchedule.length > 0
  );

  if (servicesWithSchedules.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No payment schedules configured for this client.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Services with partial or recurring payment terms will show their schedules here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {servicesWithSchedules.map(service => {
          const progress = calculatePaymentProgress(service.paymentSchedule || []);
          const totalAmount = service.paymentSchedule?.reduce((sum, item) => sum + item.amount, 0) || 0;
          const paidAmount = service.paymentSchedule?.filter(item => item.status === 'paid')
            .reduce((sum, item) => sum + item.amount, 0) || 0;
          const pendingAmount = totalAmount - paidAmount;

          return (
            <Card key={service.serviceId}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Due</p>
                  <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{progress.total} payments</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Schedules by Service */}
      {servicesWithSchedules.map((service) => {
        const progress = calculatePaymentProgress(service.paymentSchedule || []);
        const totalAmount = service.paymentSchedule?.reduce((sum, item) => sum + item.amount, 0) || 0;

        return (
          <div key={service.serviceId} className="space-y-4">
            {service.recurring && (
              <RecurringControlPanel
                service={service}
                onGenerate={() => handleGeneratePayments(service.serviceId)}
                onPause={(reason) => handlePauseRecurring(service.serviceId, reason)}
                onResume={() => handleResumeRecurring(service.serviceId)}
                onEditSettings={() => {
                  toast({
                    title: 'Edit Settings',
                    description: 'Edit the client to modify recurring settings.',
                  });
                }}
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <p className="text-lg">📋 {service.serviceName}</p>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      ${totalAmount.toLocaleString()} • {service.paymentTerms === 'partial' ? `Partial Payments (${progress.total} installments)` : 'Recurring'}
                    </p>
                    <p className="text-sm font-normal text-muted-foreground">
                      Status: {progress.paid} of {progress.total} payments received ({progress.percentage}%)
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.paymentSchedule?.map((item, index) => (
                  <PaymentScheduleCard
                    key={item.scheduleId}
                    item={item}
                    index={index}
                    total={service.paymentSchedule?.length || 0}
                    canEdit={canEdit}
                    onMarkAsPaid={(item) => setSelectedPayment({ item, service })}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Quick Mark as Paid Modal */}
      {selectedPayment && (
        <QuickMarkAsPaidModal
          open={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onSubmit={handleMarkAsPaid}
          item={selectedPayment.item}
          service={selectedPayment.service}
          clientName={client.basicInfo.name}
          clientId={client.id}
        />
      )}
    </div>
  );
};
