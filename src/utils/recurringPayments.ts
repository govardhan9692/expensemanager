import dayjs, { Dayjs } from 'dayjs';
import { RecurringSettings, PaymentScheduleItem, RecurringFrequency } from '@/types/client';
import { v4 as uuidv4 } from 'uuid';

export const shouldGeneratePayment = (
  lastGenerated: string | undefined,
  frequency: RecurringFrequency,
  dayOfPayment: number,
  now: Dayjs = dayjs()
): boolean => {
  if (!lastGenerated) {
    return true; // First generation
  }

  const lastGen = dayjs(lastGenerated);

  switch (frequency) {
    case 'monthly':
      // Check if we're in a new month and past the payment day
      return now.month() > lastGen.month() || (now.year() > lastGen.year() && now.date() >= dayOfPayment);

    case 'weekly':
      // Check if 7 days passed and it's the payment day (1=Mon, 7=Sun)
      return now.diff(lastGen, 'days') >= 7;

    case 'quarterly':
      // Check if 3 months passed
      return now.diff(lastGen, 'months') >= 3;

    case 'yearly':
      // Check if 1 year passed
      return now.diff(lastGen, 'years') >= 1;

    default:
      return false;
  }
};

export const calculateNextDueDate = (
  lastGenerated: string | undefined,
  frequency: RecurringFrequency,
  dayOfPayment: number,
  now: Dayjs = dayjs()
): Dayjs => {
  const lastGen = lastGenerated ? dayjs(lastGenerated) : now;

  switch (frequency) {
    case 'monthly':
      return lastGen.add(1, 'month').date(Math.min(dayOfPayment, lastGen.add(1, 'month').daysInMonth()));

    case 'weekly':
      return lastGen.add(1, 'week');

    case 'quarterly':
      return lastGen.add(3, 'months').date(Math.min(dayOfPayment, lastGen.add(3, 'months').daysInMonth()));

    case 'yearly':
      return lastGen.add(1, 'year');

    default:
      return lastGen;
  }
};

export const generatePaymentScheduleItem = (
  amount: number,
  dueDate: Dayjs
): PaymentScheduleItem => {
  return {
    scheduleId: uuidv4(),
    dueDate: dueDate.toISOString(),
    amount,
    status: 'pending',
  };
};

export const generateMultiplePayments = (
  amount: number,
  frequency: RecurringFrequency,
  dayOfPayment: number,
  months: number,
  startFrom: Dayjs = dayjs()
): PaymentScheduleItem[] => {
  const payments: PaymentScheduleItem[] = [];
  let currentDate = startFrom;

  const iterations = frequency === 'weekly' ? months * 4 : 
                    frequency === 'quarterly' ? Math.ceil(months / 3) : 
                    frequency === 'yearly' ? Math.ceil(months / 12) : 
                    months;

  for (let i = 0; i < iterations; i++) {
    currentDate = calculateNextDueDate(
      currentDate.toISOString(),
      frequency,
      dayOfPayment,
      currentDate
    );
    
    payments.push(generatePaymentScheduleItem(amount, currentDate));
  }

  return payments;
};
