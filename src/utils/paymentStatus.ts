import dayjs from 'dayjs';
import { PaymentScheduleItem, PaymentStatus } from '@/types/client';

export interface PaymentStatusInfo {
  status: PaymentStatus;
  statusLabel: string;
  statusIcon: string;
  daysInfo: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  isOverdue: boolean;
  isPaid: boolean;
  isPending: boolean;
}

export const getPaymentStatusInfo = (item: PaymentScheduleItem): PaymentStatusInfo => {
  const now = dayjs();
  const dueDate = dayjs(item.dueDate);
  const isPaid = item.status === 'paid';
  
  if (isPaid && item.paidDate) {
    const paidDate = dayjs(item.paidDate);
    const daysDiff = dueDate.diff(paidDate, 'days');
    
    let timeliness = 'On time';
    if (daysDiff > 0) {
      timeliness = `${daysDiff} day${daysDiff > 1 ? 's' : ''} early`;
    } else if (daysDiff < 0) {
      timeliness = `${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''} late`;
    }
    
    return {
      status: 'paid',
      statusLabel: 'PAID',
      statusIcon: '✅',
      daysInfo: `Paid on: ${paidDate.format('MMM D, YYYY')} (${timeliness})`,
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      isOverdue: false,
      isPaid: true,
      isPending: false,
    };
  }
  
  const isOverdue = now.isAfter(dueDate, 'day');
  
  if (isOverdue) {
    const daysOverdue = now.diff(dueDate, 'days');
    return {
      status: 'overdue',
      statusLabel: 'OVERDUE',
      statusIcon: '🔴',
      daysInfo: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      isOverdue: true,
      isPaid: false,
      isPending: false,
    };
  }
  
  const daysRemaining = dueDate.diff(now, 'days');
  return {
    status: 'pending',
    statusLabel: 'PENDING',
    statusIcon: '⏳',
    daysInfo: daysRemaining === 0 ? 'Due today' : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`,
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    isOverdue: false,
    isPaid: false,
    isPending: true,
  };
};

export const calculatePaymentProgress = (items: PaymentScheduleItem[]) => {
  const total = items.length;
  const paid = items.filter(item => item.status === 'paid').length;
  const pending = items.filter(item => item.status === 'pending').length;
  const overdue = items.filter(item => {
    if (item.status === 'paid') return false;
    return dayjs().isAfter(dayjs(item.dueDate), 'day');
  }).length;
  
  return {
    total,
    paid,
    pending,
    overdue,
    percentage: total > 0 ? Math.round((paid / total) * 100) : 0,
  };
};
