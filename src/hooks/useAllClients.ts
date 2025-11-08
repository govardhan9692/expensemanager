import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client } from '@/types/client';

export const useAllClients = (userId: string | undefined, businessIds: string[]) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || businessIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadClients = async () => {
      try {
        const allClients: Client[] = [];
        
        for (const businessId of businessIds) {
          const clientsRef = collection(db, 'businesses', businessId, 'clients');
          const snapshot = await getDocs(clientsRef);
          
          const businessClients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Client[];
          
          allClients.push(...businessClients);
        }
        
        setClients(allClients);
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [userId, businessIds]);

  return { clients, loading };
};
