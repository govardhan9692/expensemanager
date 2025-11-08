import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RecurringSettings, RecurringFrequency } from '@/types/client';
import { Info, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

interface RecurringServiceFormProps {
  amount: number;
  onChange: (settings: Partial<RecurringSettings>) => void;
  initialSettings?: Partial<RecurringSettings>;
}

export const RecurringServiceForm = ({ 
  amount, 
  onChange, 
  initialSettings 
}: RecurringServiceFormProps) => {
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initialSettings?.frequency || 'monthly'
  );
  const [dayOfPayment, setDayOfPayment] = useState(initialSettings?.dayOfPayment || 1);
  const [customDays, setCustomDays] = useState(initialSettings?.customDays || 30);
  const [startDate, setStartDate] = useState(
    initialSettings?.startDate ? dayjs(initialSettings.startDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  );
  const [hasEndDate, setHasEndDate] = useState(!!initialSettings?.endDate);
  const [endDate, setEndDate] = useState(
    initialSettings?.endDate ? dayjs(initialSettings.endDate).format('YYYY-MM-DD') : ''
  );
  const [autoGenerate, setAutoGenerate] = useState(initialSettings?.autoGenerate ?? true);
  const [generateAheadCount, setGenerateAheadCount] = useState(initialSettings?.generateAheadCount || 3);

  useEffect(() => {
    const settings: Partial<RecurringSettings> = {
      frequency,
      dayOfPayment: frequency === 'custom' ? 1 : dayOfPayment,
      customDays: frequency === 'custom' ? customDays : undefined,
      startDate: dayjs(startDate).toISOString(),
      endDate: hasEndDate && endDate ? dayjs(endDate).toISOString() : null,
      autoGenerate,
      generateAheadCount,
    };
    onChange(settings);
  }, [frequency, dayOfPayment, customDays, startDate, hasEndDate, endDate, autoGenerate, generateAheadCount]);

  const getNextPayments = () => {
    const payments: string[] = [];
    let currentDate = dayjs(startDate);
    
    for (let i = 0; i < 3; i++) {
      currentDate = calculateNextDate(currentDate, frequency, dayOfPayment, customDays);
      payments.push(currentDate.format('MMM D, YYYY'));
    }
    
    return payments;
  };

  const calculateNextDate = (
    fromDate: dayjs.Dayjs,
    freq: RecurringFrequency,
    day: number,
    custom?: number
  ): dayjs.Dayjs => {
    switch (freq) {
      case 'monthly':
        const nextMonth = fromDate.add(1, 'month');
        const maxDay = nextMonth.daysInMonth();
        return nextMonth.date(Math.min(day, maxDay));
      case 'weekly':
        return fromDate.add(1, 'week');
      case 'quarterly':
        return fromDate.add(3, 'months').date(Math.min(day, fromDate.add(3, 'months').daysInMonth()));
      case 'yearly':
        return fromDate.add(1, 'year');
      case 'custom':
        return fromDate.add(custom || 30, 'days');
      default:
        return fromDate.add(1, 'month');
    }
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">Recurring Payment Setup</h4>
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Payment Frequency *</Label>
        <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurringFrequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="monthly">Monthly (every month)</SelectItem>
            <SelectItem value="weekly">Weekly (every week)</SelectItem>
            <SelectItem value="quarterly">Quarterly (every 3 months)</SelectItem>
            <SelectItem value="yearly">Yearly (once per year)</SelectItem>
            <SelectItem value="custom">Custom (specify days)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {frequency === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="dayOfMonth">Payment Day *</Label>
          <Input
            id="dayOfMonth"
            type="number"
            min="1"
            max="31"
            value={dayOfPayment}
            onChange={(e) => setDayOfPayment(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            {dayOfPayment === 1 ? '1st' : dayOfPayment === 2 ? '2nd' : dayOfPayment === 3 ? '3rd' : `${dayOfPayment}th`} of every month
          </p>
          {dayOfPayment > 28 && (
            <Alert>
              <AlertDescription className="text-xs">
                ⚠️ For months with fewer days, payment will be on the last day of the month
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {frequency === 'weekly' && (
        <div className="space-y-2">
          <Label htmlFor="dayOfWeek">Payment Day *</Label>
          <Select value={dayOfPayment.toString()} onValueChange={(value) => setDayOfPayment(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {weekDays.map((day, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {frequency === 'quarterly' && (
        <div className="space-y-2">
          <Label htmlFor="dayOfQuarter">Payment Day of Quarter *</Label>
          <Input
            id="dayOfQuarter"
            type="number"
            min="1"
            max="31"
            value={dayOfPayment}
            onChange={(e) => setDayOfPayment(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">Day of the first month in each quarter</p>
        </div>
      )}

      {frequency === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="customDays">Every (days) *</Label>
          <Input
            id="customDays"
            type="number"
            min="1"
            value={customDays}
            onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
          />
          <p className="text-xs text-muted-foreground">Payment every {customDays} days</p>
        </div>
      )}

      <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            First payment will be generated from this date
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasEndDate"
              checked={hasEndDate}
              onCheckedChange={(checked) => setHasEndDate(checked as boolean)}
            />
            <Label htmlFor="hasEndDate" className="font-normal cursor-pointer">
              Set an end date
            </Label>
          </div>
          
          {hasEndDate && (
            <div className="space-y-2 ml-6">
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Recurring will automatically stop after this date
              </p>
            </div>
          )}
          
          {!hasEndDate && (
            <p className="text-xs text-muted-foreground ml-6">Ongoing (no end date)</p>
          )}
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="autoGenerate">Auto-Generate Future Payments</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{autoGenerate ? 'ON' : 'OFF'}</span>
              <Checkbox
                id="autoGenerate"
                checked={autoGenerate}
                onCheckedChange={(checked) => setAutoGenerate(checked as boolean)}
              />
            </div>
          </div>
          
          {autoGenerate && (
            <div className="bg-primary/5 p-3 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground">✓ System automatically creates expected payment entries</p>
              <p className="text-xs text-muted-foreground">✓ You'll receive notifications for new payments</p>
              <p className="text-xs text-muted-foreground">✓ No manual work required!</p>
              <p className="text-xs text-muted-foreground">✓ Can pause anytime if needed</p>
            </div>
          )}
        </div>

        {autoGenerate && (
          <div className="space-y-2">
            <Label htmlFor="generateAhead">Generate How Many Payments Ahead?</Label>
            <Input
              id="generateAhead"
              type="number"
              min="1"
              max="12"
              value={generateAheadCount}
              onChange={(e) => setGenerateAheadCount(parseInt(e.target.value) || 3)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              System will keep this many future payments in the schedule
            </p>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <Label className="mb-2 block">Preview Next 3 Payments:</Label>
        <div className="space-y-1 bg-muted/50 p-3 rounded-lg">
          {getNextPayments().map((date, index) => (
            <p key={index} className="text-sm">
              {index + 1}. {date} - ${amount.toLocaleString()}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
