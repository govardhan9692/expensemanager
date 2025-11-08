import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentScheduleItem, ClientService } from '@/types/client';
import dayjs from 'dayjs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickMarkAsPaidModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentData) => Promise<void>;
  item: PaymentScheduleItem;
  service: ClientService;
  clientName: string;
  clientId: string;
}

export interface PaymentData {
  amount: number;
  date: Date;
  paymentMethod: string;
  notes: string;
  scheduleId: string;
  serviceId: string;
  serviceName: string;
}

const paymentMethods = [
  'Bank Transfer',
  'Cash',
  'Check',
  'Credit Card',
  'PayPal',
  'Stripe',
  'Other',
];

export const QuickMarkAsPaidModal = ({
  open,
  onClose,
  onSubmit,
  item,
  service,
  clientName,
  clientId,
}: QuickMarkAsPaidModalProps) => {
  const [amount, setAmount] = useState(item.amount.toString());
  const [date, setDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        amount: parseFloat(amount),
        date,
        paymentMethod,
        notes,
        scheduleId: item.scheduleId,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
      });
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark Payment as Received</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Client:</span> {clientName}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Service:</span> {service.serviceName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount Received *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              ℹ️ Expected: ${item.amount.toLocaleString()} - Pre-filled, you can adjust if needed
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? dayjs(date).format('MMM D, YYYY') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">✅ This will:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create income transaction (${parseFloat(amount || '0').toLocaleString()})</li>
              <li>Mark payment as paid</li>
              <li>Update client's received income</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
