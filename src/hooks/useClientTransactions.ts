import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ClientTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  imageUrl?: string;
  createdBy: { userId: string; name: string };
  clientId: string;
  clientName: string;
  clientType: string;
  serviceId?: string | null;
  serviceName?: string | null;
  clientExpenseCategory?: string | null;
  paymentScheduleId?: string | null;
  linkedToSchedule: boolean;
}

export const useClientTransactions = (businessId: string, clientId: string) => {
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId || !clientId) {
      setLoading(false);
      return;
    }

    const transactionsRef = collection(db, 'businesses', businessId, 'transactions');
    const q = query(
      transactionsRef,
      where('clientId', '==', clientId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientTransaction[];
      setTransactions(txns);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId, clientId]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    transactions,
    loading,
    totalIncome,
    totalExpenses,
    count: transactions.length
  };
};
