import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Settings, Share2, Users, Send, DollarSign, Image as ImageIcon, UserCircle, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Client } from '@/types/client';
import ClientsList from '@/components/clients/ClientsList';
import AddEditClientModal from '@/components/clients/AddEditClientModal';
import ClientDetailView from '@/components/clients/ClientDetailView';
import AddEditTransactionModal, { TransactionFormData } from '@/components/transactions/AddEditTransactionModal';
import TransactionCard from '@/components/transactions/TransactionCard';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { useRecurringPayments } from '@/hooks/useRecurringPayments';
import { ClientPerformanceTable } from '@/components/analytics/ClientPerformanceTable';
import { BusinessComparisonCharts } from '@/components/analytics/BusinessComparisonCharts';
import { InsightsPanel } from '@/components/analytics/InsightsPanel';
import { calculateClientPerformance } from '@/utils/analyticsCalculations';
import { generateBusinessInsights } from '@/utils/insightsEngine';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer_to_personal' | 'profit_distribution';
  amount: number;
  category: string;
  description: string;
  date: string;
  imageUrl?: string;
  createdBy: { userId: string; name: string };
  transferReason?: string;
  recipientId?: string;
  recipientName?: string;
  clientId?: string | null;
  clientName?: string | null;
  clientType?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  clientExpenseCategory?: string | null;
  paymentScheduleId?: string | null;
  linkedToSchedule?: boolean;
}

interface Partner {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'partner';
  permission: 'view' | 'edit';
  joinedAt: string;
}

interface Business {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  publicShareEnabled?: boolean;
  publicShareLink?: string;
}

const categories = [
  'Sales', 'Services', 'Investment', 'Other Income',
  'Salaries', 'Rent', 'Utilities', 'Marketing', 'Supplies', 'Travel', 'Other Expense'
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const BusinessDetail = () => {
  const { businessId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Initialize recurring payments check
  useRecurringPayments(businessId, user?.uid);
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [userPermission, setUserPermission] = useState<'owner' | 'view' | 'edit' | null>(null);
  
  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [transferData, setTransferData] = useState({
    amount: '',
    reason: ''
  });

  const [distributeData, setDistributeData] = useState({
    partnerId: '',
    amount: '',
    note: ''
  });

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;
    
    if (!user || !businessId) {
      navigate('/auth');
      return;
    }

    const businessRef = doc(db, 'businesses', businessId);
    getDoc(businessRef).then((docSnap) => {
      if (docSnap.exists()) {
        setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
      } else {
        toast.error('Business not found');
        navigate('/businesses');
      }
    });

    const partnersRef = collection(db, 'businesses', businessId, 'partners');
    const unsubscribePartners = onSnapshot(partnersRef, (snapshot) => {
      const partnersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Partner[];
      setPartners(partnersList);
      
      const currentUserPartner = partnersList.find(p => p.id === user.uid);
      if (currentUserPartner) {
        if (currentUserPartner.role === 'owner') {
          setUserPermission('owner');
        } else {
          setUserPermission(currentUserPartner.permission);
        }
      }
    });

    const transactionsRef = collection(db, 'businesses', businessId, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txns);
    });

    // Subscribe to clients
    const clientsRef = collection(db, 'businesses', businessId, 'clients');
    const unsubscribeClients = onSnapshot(clientsRef, (snapshot) => {
      const clientsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsList);
    });

    return () => {
      unsubscribePartners();
      unsubscribeTransactions();
      unsubscribeClients();
    };
  }, [user, businessId, navigate, authLoading]);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const usersRef = collection(db, 'users');
      const nameQuery = query(usersRef, where('name', '>=', searchQuery), where('name', '<=', searchQuery + '\uf8ff'));
      const usernameQuery = query(usersRef, where('username', '>=', searchQuery.toLowerCase()), where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'));

      const [nameSnapshot, usernameSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(usernameQuery)
      ]);

      const results = new Map();
      nameSnapshot.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));
      usernameSnapshot.docs.forEach(doc => results.set(doc.id, { id: doc.id, ...doc.data() }));

      setSearchResults(Array.from(results.values()).filter(u => u.id !== user?.uid));
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user]);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'expenses');

    const response = await fetch('https://api.cloudinary.com/v1_1/duq15xsse/image/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmitTransaction = async (transactionData: TransactionFormData) => {
    if (!user || !businessId) return;

    const isEditing = !!transactionData.id;

    try {
      let imageUrl = '';
      if (transactionData.imageFile) {
        imageUrl = await uploadToCloudinary(transactionData.imageFile);
      }

      const batch = writeBatch(db);
      const transactionsRef = collection(db, 'businesses', businessId, 'transactions');
      
      // For editing, get the existing transaction
      const transactionRef = isEditing 
        ? doc(db, 'businesses', businessId, 'transactions', transactionData.id!)
        : doc(transactionsRef);

      // Get old transaction data if editing (to reverse changes)
      let oldTransaction: Transaction | undefined;
      if (isEditing) {
        oldTransaction = transactions.find(t => t.id === transactionData.id);
      }

      // Create/Update transaction document
      const transactionDoc = {
        type: transactionData.type,
        amount: parseFloat(transactionData.amount),
        category: transactionData.category,
        description: transactionData.description,
        date: transactionData.date,
        ...(imageUrl && { imageUrl }),
        createdBy: isEditing 
          ? oldTransaction?.createdBy || { userId: user.uid, name: user.displayName || 'Unknown' }
          : { userId: user.uid, name: user.displayName || 'Unknown' },
        clientId: transactionData.clientId,
        clientName: transactionData.clientName,
        clientType: transactionData.clientType,
        serviceId: transactionData.serviceId,
        serviceName: transactionData.serviceName,
        clientExpenseCategory: transactionData.clientExpenseCategory,
        paymentScheduleId: transactionData.paymentScheduleId,
        linkedToSchedule: transactionData.linkedToSchedule,
        ...(isEditing 
          ? { updatedAt: new Date().toISOString() }
          : { createdAt: new Date().toISOString() }
        )
      };

      if (isEditing) {
        batch.update(transactionRef, transactionDoc);
      } else {
        batch.set(transactionRef, transactionDoc);
      }

      // Update client financial summary if linked
      // First, reverse old client changes if editing
      if (isEditing && oldTransaction?.clientId) {
        const oldClient = clients.find(c => c.id === oldTransaction.clientId);
        if (oldClient) {
          const oldClientRef = doc(db, 'businesses', businessId, 'clients', oldTransaction.clientId);
          const oldAmount = oldTransaction.amount;
          
          if (oldTransaction.type === 'income') {
            batch.update(oldClientRef, {
              'financialSummary.totalReceivedIncome': increment(-oldAmount),
              'financialSummary.totalPendingIncome': increment(oldAmount),
              'financialSummary.netProfit': increment(-oldAmount)
            });
          } else if (oldTransaction.type === 'expense') {
            batch.update(oldClientRef, {
              'financialSummary.totalExpenses': increment(-oldAmount),
              'financialSummary.netProfit': increment(oldAmount)
            });
          }
        }
      }

      // Now apply new client changes
      if (transactionData.clientId) {
        const client = clients.find(c => c.id === transactionData.clientId);
        if (client) {
          const clientRef = doc(db, 'businesses', businessId, 'clients', transactionData.clientId);
          
          const amount = parseFloat(transactionData.amount);
          if (transactionData.type === 'income') {
            batch.update(clientRef, {
              'financialSummary.totalReceivedIncome': increment(amount),
              'financialSummary.totalPendingIncome': increment(-amount),
              'financialSummary.netProfit': increment(amount)
            });
          } else if (transactionData.type === 'expense') {
            batch.update(clientRef, {
              'financialSummary.totalExpenses': increment(amount),
              'financialSummary.netProfit': increment(-amount)
            });
          }

          // Update payment schedule if linked
          if (transactionData.paymentScheduleId && transactionData.serviceId) {
            const service = client.services.find(s => s.serviceId === transactionData.serviceId);
            if (service?.paymentSchedule) {
              const updatedSchedule = service.paymentSchedule.map(item => 
                item.scheduleId === transactionData.paymentScheduleId
                  ? { ...item, status: 'paid' as const, paidDate: new Date().toISOString(), transactionId: transactionRef.id }
                  : item
              );
              
              const updatedServices = client.services.map(s => 
                s.serviceId === transactionData.serviceId
                  ? { ...s, paymentSchedule: updatedSchedule }
                  : s
              );
              
              batch.update(clientRef, { services: updatedServices });
            }
          }
        }
      }

      await batch.commit();
      toast.success(isEditing ? 'Transaction updated successfully!' : 'Transaction added successfully!');
    } catch (error) {
      toast.error('Failed to add transaction');
      console.error(error);
    }
  };

  const handleInvitePartner = async (partnerId: string, partnerName: string, partnerUsername: string) => {
    if (!user || !businessId || !business) return;

    try {
      const notificationsRef = collection(db, 'users', partnerId, 'inbox');
      await addDoc(notificationsRef, {
        type: 'business_invitation',
        from: {
          userId: user.uid,
          name: user.displayName || 'Unknown',
          username: '' // Add username from user profile if needed
        },
        businessId,
        businessName: business.name,
        message: `invited you to join "${business.name}"`,
        permission: selectedPermission,
        status: 'pending',
        createdAt: new Date().toISOString(),
        read: false
      });

      toast.success(`Invitation sent to ${partnerName}`);
      setIsInviteOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('Failed to send invitation');
      console.error(error);
    }
  };

  const handleTransferToPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessId || !business) return;

    try {
      const amount = parseFloat(transferData.amount);
      
      const businessTransactionsRef = collection(db, 'businesses', businessId, 'transactions');
      await addDoc(businessTransactionsRef, {
        type: 'transfer_to_personal',
        amount,
        category: 'Transfer',
        description: `Transfer to personal: ${transferData.reason}`,
        date: new Date().toISOString(),
        transferReason: transferData.reason,
        createdBy: {
          userId: user.uid,
          name: user.displayName || 'Unknown'
        },
        createdAt: new Date().toISOString()
      });

      const personalTransactionsRef = collection(db, 'users', user.uid, 'personalTransactions');
      await addDoc(personalTransactionsRef, {
        type: 'income',
        amount,
        category: 'Business Transfer',
        description: `From ${business.name}: ${transferData.reason}`,
        date: new Date().toISOString(),
        source: 'business_transfer',
        sourceBusinessId: businessId,
        sourceBusinessName: business.name,
        createdAt: new Date().toISOString()
      });

      toast.success(`Transferred $${amount} to personal`);
      setIsTransferOpen(false);
      setTransferData({ amount: '', reason: '' });
    } catch (error) {
      toast.error('Failed to transfer');
      console.error(error);
    }
  };

  const handleDistributeProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessId || !business) return;

    try {
      const amount = parseFloat(distributeData.amount);
      const partner = partners.find(p => p.id === distributeData.partnerId);
      if (!partner) return;

      const businessTransactionsRef = collection(db, 'businesses', businessId, 'transactions');
      await addDoc(businessTransactionsRef, {
        type: 'profit_distribution',
        amount,
        category: 'Profit Distribution',
        description: `Profit distributed to ${partner.name}: ${distributeData.note}`,
        date: new Date().toISOString(),
        recipientId: partner.id,
        recipientName: partner.name,
        createdBy: {
          userId: user.uid,
          name: user.displayName || 'Unknown'
        },
        createdAt: new Date().toISOString()
      });

      const personalTransactionsRef = collection(db, 'users', partner.id, 'personalTransactions');
      await addDoc(personalTransactionsRef, {
        type: 'income',
        amount,
        category: 'Profit Distribution',
        description: `Profit from ${business.name}: ${distributeData.note}`,
        date: new Date().toISOString(),
        source: 'profit_distribution',
        sourceBusinessId: businessId,
        sourceBusinessName: business.name,
        createdAt: new Date().toISOString()
      });

      const notificationsRef = collection(db, 'users', partner.id, 'inbox');
      await addDoc(notificationsRef, {
        type: 'profit_received',
        from: {
          userId: user.uid,
          name: user.displayName || 'Unknown',
          username: ''
        },
        businessId,
        businessName: business.name,
        message: `You received $${amount} profit from "${business.name}"`,
        amount,
        status: 'accepted',
        createdAt: new Date().toISOString(),
        read: false
      });

      toast.success(`Distributed $${amount} to ${partner.name}`);
      setIsDistributeOpen(false);
      setDistributeData({ partnerId: '', amount: '', note: '' });
    } catch (error) {
      toast.error('Failed to distribute profit');
      console.error(error);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!businessId) return;
    
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    let undoTimerId: NodeJS.Timeout;
    let isUndone = false;

    const deletePromise = new Promise<void>((resolve, reject) => {
      undoTimerId = setTimeout(async () => {
        if (!isUndone) {
          try {
            const batch = writeBatch(db);
            
            // Delete transaction
            batch.delete(doc(db, 'businesses', businessId, 'transactions', transactionId));

            // Reverse client financial summary if linked
            if (transaction.clientId) {
              const client = clients.find(c => c.id === transaction.clientId);
              if (client) {
                const clientRef = doc(db, 'businesses', businessId, 'clients', transaction.clientId);
                
                if (transaction.type === 'income') {
                  batch.update(clientRef, {
                    'financialSummary.totalReceivedIncome': increment(-transaction.amount),
                    'financialSummary.totalPendingIncome': increment(transaction.amount),
                    'financialSummary.netProfit': increment(-transaction.amount)
                  });
                } else if (transaction.type === 'expense') {
                  batch.update(clientRef, {
                    'financialSummary.totalExpenses': increment(-transaction.amount),
                    'financialSummary.netProfit': increment(transaction.amount)
                  });
                }

                // Reverse payment schedule if linked
                if (transaction.paymentScheduleId && transaction.serviceId) {
                  const service = client.services.find(s => s.serviceId === transaction.serviceId);
                  if (service?.paymentSchedule) {
                    const updatedSchedule = service.paymentSchedule.map(item => 
                      item.scheduleId === transaction.paymentScheduleId
                        ? { ...item, status: 'pending' as const, paidDate: undefined, transactionId: undefined }
                        : item
                    );
                    
                    const updatedServices = client.services.map(s => 
                      s.serviceId === transaction.serviceId
                        ? { ...s, paymentSchedule: updatedSchedule }
                        : s
                    );
                    
                    batch.update(clientRef, { services: updatedServices });
                  }
                }
              }
            }

            await batch.commit();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      }, 5000);
    });

    toast.promise(deletePromise, {
      loading: 'Transaction will be deleted in 5 seconds...',
      success: 'Transaction deleted successfully',
      error: 'Failed to delete transaction',
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          clearTimeout(undoTimerId);
        }
      }
    });
  };

  const handleTogglePublicShare = async () => {
    if (!businessId || !business) return;

    try {
      const newState = !business.publicShareEnabled;
      const publicLink = newState ? `${window.location.origin}/public/${businessId}` : '';

      await updateDoc(doc(db, 'businesses', businessId), {
        publicShareEnabled: newState,
        publicShareLink: publicLink
      });

      toast.success(newState ? 'Public sharing enabled' : 'Public sharing disabled');
    } catch (error) {
      toast.error('Failed to update sharing settings');
    }
  };

  const handleCopyPublicLink = () => {
    if (business?.publicShareLink) {
      navigator.clipboard.writeText(business.publicShareLink);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleRemovePartner = async (partnerId: string) => {
    if (!businessId) return;

    let undoTimerId: NodeJS.Timeout;
    let isUndone = false;

    const deletePromise = new Promise<void>((resolve, reject) => {
      undoTimerId = setTimeout(async () => {
        if (!isUndone) {
          try {
            await deleteDoc(doc(db, 'businesses', businessId, 'partners', partnerId));
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      }, 5000);
    });

    toast.promise(deletePromise, {
      loading: 'Partner will be removed in 5 seconds...',
      success: 'Partner removed successfully',
      error: 'Failed to remove partner',
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          clearTimeout(undoTimerId);
        }
      }
    });
  };

  const handleUpdatePermission = async (partnerId: string, newPermission: 'view' | 'edit') => {
    if (!businessId) return;

    try {
      await updateDoc(doc(db, 'businesses', businessId, 'partners', partnerId), {
        permission: newPermission
      });
      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
    }
  };

  // Client handlers
  const handleSaveClient = async (clientData: Partial<Client>) => {
    if (!businessId) return;

    try {
      // Recursively remove undefined values from the object
      const removeUndefined = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => removeUndefined(item));
        }
        if (obj !== null && typeof obj === 'object') {
          return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key] = removeUndefined(value);
            }
            return acc;
          }, {} as any);
        }
        return obj;
      };
      
      const cleanData = removeUndefined(clientData);
      const clientsRef = collection(db, 'businesses', businessId, 'clients');
      
      if (editingClient) {
        // Update existing client
        await updateDoc(doc(db, 'businesses', businessId, 'clients', editingClient.id), cleanData);
        toast.success('Client updated successfully');
      } else {
        // Create new client
        await addDoc(clientsRef, cleanData);
        toast.success('Client created successfully');
      }
      
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  };

  const handleViewClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClient(client);
      setViewMode('detail');
    }
  };

  const handleEditClient = () => {
    if (selectedClient) {
      setEditingClient(selectedClient);
      setIsAddClientOpen(true);
      setViewMode('list');
    }
  };

  const handleDeleteClient = async () => {
    if (!businessId || !selectedClient) return;

    const clientToDelete = selectedClient;
    let undoTimerId: NodeJS.Timeout;
    let isUndone = false;

    const deletePromise = new Promise<void>((resolve, reject) => {
      undoTimerId = setTimeout(async () => {
        if (!isUndone) {
          try {
            await deleteDoc(doc(db, 'businesses', businessId, 'clients', clientToDelete.id));
            setViewMode('list');
            setSelectedClient(null);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      }, 5000);
    });

    toast.promise(deletePromise, {
      loading: 'Client will be deleted in 5 seconds...',
      success: 'Client deleted successfully',
      error: 'Failed to delete client',
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          clearTimeout(undoTimerId);
        }
      }
    });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedClient(null);
  };

  const handleAddIncomeFromClient = () => {
    if (selectedClient) {
      setPreSelectedClientId(selectedClient.id);
      setTransactionType('income');
      setIsAddTransactionOpen(true);
    }
  };

  const handleAddExpenseFromClient = () => {
    if (selectedClient) {
      setPreSelectedClientId(selectedClient.id);
      setTransactionType('expense');
      setIsAddTransactionOpen(true);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type as 'income' | 'expense');
    setIsAddTransactionOpen(true);
  };

  // Calculate totals
  const filteredTransactions = transactions.filter(txn => {
    if (filterCategory !== 'all' && txn.category !== filterCategory) return false;
    if (filterDateFrom && txn.date < filterDateFrom) return false;
    if (filterDateTo && txn.date > filterDateTo) return false;
    if (filterClient !== 'all') {
      if (filterClient === 'general') {
        if (txn.clientId) return false;
      } else {
        if (txn.clientId !== filterClient) return false;
      }
    }
    return true;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => ['expense', 'transfer_to_personal', 'profit_distribution'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  // Chart data
  const categoryData = Object.entries(
    filteredTransactions.reduce((acc, txn) => {
      acc[txn.category] = (acc[txn.category] || 0) + txn.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = Object.entries(
    filteredTransactions.reduce((acc, txn) => {
      const month = new Date(txn.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
      if (txn.type === 'income') {
        acc[month].income += txn.amount;
      } else {
        acc[month].expenses += txn.amount;
      }
      return acc;
    }, {} as Record<string, any>)
  ).map(([_, data]) => data).slice(-6);

  if (!business || userPermission === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canEdit = userPermission === 'owner' || userPermission === 'edit';
  const isOwner = userPermission === 'owner';

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">{business.name}</h1>
            <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs mt-1 w-fit">
              {isOwner ? 'Owner' : `Partner - ${userPermission === 'edit' ? 'Edit' : 'View'}`}
            </Badge>
          </div>
          <div className="flex gap-2 shrink-0">
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {/* Mobile: Row 1: Income | Expenses (2 cols), Row 2: Net Profit (full width) */}
        {/* Desktop: All 3 in one row */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 mb-4 md:mb-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success shrink-0" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg md:text-2xl font-bold text-success truncate">
                ${totalIncome.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Expenses
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-danger shrink-0" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-lg md:text-2xl font-bold text-danger truncate">
                ${totalExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
              <Wallet className="w-4 h-4 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className={`text-lg md:text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'} truncate`}>
                {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4 md:mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="whitespace-nowrap">Add Transaction</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => {
                  setTransactionType('income');
                  setIsAddTransactionOpen(true);
                }}>
                  <TrendingUp className="w-4 h-4 mr-2 text-success" />
                  Add Income
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setTransactionType('expense');
                  setIsAddTransactionOpen(true);
                }}>
                  <TrendingDown className="w-4 h-4 mr-2 text-danger" />
                  Add Expense
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isOwner && (
              <>
                <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Send className="w-4 h-4 mr-2" />
                      <span className="whitespace-nowrap">Transfer to Personal</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Transfer to Personal</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransferToPersonal} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="transferAmount">Amount ($)</Label>
                        <Input
                          id="transferAmount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={transferData.amount}
                          onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                          id="reason"
                          placeholder="Why are you transferring this money?"
                          value={transferData.reason}
                          onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Transfer
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isDistributeOpen} onOpenChange={setIsDistributeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <DollarSign className="w-4 h-4 mr-2" />
                      <span className="whitespace-nowrap">Distribute Profit</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Distribute Profit</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleDistributeProfit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Partner</Label>
                        <Select
                          value={distributeData.partnerId}
                          onValueChange={(value) => setDistributeData({ ...distributeData, partnerId: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose partner" />
                          </SelectTrigger>
                          <SelectContent>
                            {partners.filter(p => p.role === 'partner').map(partner => (
                              <SelectItem key={partner.id} value={partner.id}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="distributeAmount">Amount ($)</Label>
                        <Input
                          id="distributeAmount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={distributeData.amount}
                          onChange={(e) => setDistributeData({ ...distributeData, amount: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="note">Note</Label>
                        <Textarea
                          id="note"
                          placeholder="Add a note about this profit distribution"
                          value={distributeData.note}
                          onChange={(e) => setDistributeData({ ...distributeData, note: e.target.value })}
                        />
                      </div>

                      <Button type="submit" className="w-full">
                        Distribute
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        )}

        <Tabs defaultValue="transactions" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="transactions" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans.</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="text-xs sm:text-sm px-2 py-2">Clients</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="partners" className="text-xs sm:text-sm px-2 py-2">
              <span className="hidden sm:inline">Partners</span>
              <span className="sm:hidden">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm">Category</Label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm">Client/Project</Label>
                    <Select value={filterClient} onValueChange={setFilterClient}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="all">All Transactions</SelectItem>
                        <SelectItem value="general">General Business Only</SelectItem>
                        {clients.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              --- Clients ---
                            </div>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.basicInfo.name} • {client.basicInfo.type}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm">From Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs md:text-sm">To Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                  </div>
                </div>
                {(filterCategory !== 'all' || filterClient !== 'all' || filterDateFrom || filterDateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterCategory('all');
                      setFilterClient('all');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
                {filterClient !== 'all' && filterClient !== 'general' && (
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} for {clients.find(c => c.id === filterClient)?.basicInfo.name}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((txn) => (
                      <TransactionCard
                        key={txn.id}
                        transaction={txn}
                        onDelete={() => handleDeleteTransaction(txn.id)}
                        onEdit={() => handleEditTransaction(txn)}
                        onViewClient={txn.clientId ? () => handleViewClient(txn.clientId!) : undefined}
                        canEdit={canEdit}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            {viewMode === 'list' ? (
              <ClientsList
                clients={clients}
                transactions={transactions}
                onAddClient={() => {
                  setEditingClient(null);
                  setIsAddClientOpen(true);
                }}
                onViewClient={handleViewClient}
                canEdit={canEdit}
              />
            ) : (
              selectedClient && (
                <ClientDetailView
                  client={selectedClient}
                  businessId={businessId || ''}
                  onBack={handleBackToList}
                  onEdit={handleEditClient}
                  onDelete={handleDeleteClient}
                  onDeleteTransaction={handleDeleteTransaction}
                  onEditTransaction={(txnId) => {
                    const txn = transactions.find(t => t.id === txnId);
                    if (txn) handleEditTransaction(txn);
                  }}
                  onAddIncome={handleAddIncomeFromClient}
                  onAddExpense={handleAddExpenseFromClient}
                  canEdit={canEdit}
                  isOwner={isOwner}
                />
              )
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {categoryData.length > 0 ? (
              <>
                {/* Client Performance Section */}
                {clients.length > 0 && (
                  <>
                    <ClientPerformanceTable
                      data={calculateClientPerformance(clients)}
                      onClientClick={(clientId) => {
                        const client = clients.find(c => c.id === clientId);
                        if (client) {
                          setSelectedClient(client);
                          setViewMode('detail');
                          // Switch to clients tab to show detail
                          const tabs = document.querySelector('[value="clients"]') as HTMLElement;
                          tabs?.click();
                        }
                      }}
                    />
                    
                    <BusinessComparisonCharts 
                      performanceData={calculateClientPerformance(clients)}
                    />
                    
                    <InsightsPanel 
                      {...generateBusinessInsights(clients, calculateClientPerformance(clients))}
                    />
                  </>
                )}
                
                {/* Original Analytics */}
                <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
                  <Card className="lg:col-span-1 overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 md:px-6">
                      <div className="w-full h-[250px] md:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg">Monthly Comparison</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 md:px-6">
                      <div className="w-full h-[250px] md:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="income" fill="#10B981" name="Income" />
                            <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg">Trend Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 md:px-6">
                    <div className="w-full h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" strokeWidth={2} />
                          <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Expenses" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No data available for analytics</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="partners" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members ({partners.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-muted-foreground">@{partner.username || 'unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(partner.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={partner.role === 'owner' ? 'default' : 'secondary'}>
                          {partner.role === 'owner' ? 'Owner' : partner.permission === 'edit' ? 'Edit' : 'View'}
                        </Badge>
                        {isOwner && partner.role === 'partner' && (
                          <>
                            <Select
                              value={partner.permission}
                              onValueChange={(value: 'view' | 'edit') => 
                                handleUpdatePermission(partner.id, value)
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="view">View</SelectItem>
                                <SelectItem value="edit">Edit</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePartner(partner.id)}
                            >
                              <Trash2 className="w-4 h-4 text-danger" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Partner
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Partner</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Search by name or username</Label>
                      <Input
                        placeholder="Type to search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Permission Level</Label>
                      <Select value={selectedPermission} onValueChange={(value: 'view' | 'edit') => setSelectedPermission(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View Only</SelectItem>
                          <SelectItem value="edit">View + Edit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {searchQuery.length >= 2 && (
                      <div className="space-y-2">
                        {searchResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No users found
                          </p>
                        ) : (
                          searchResults.map((result) => {
                            const alreadyPartner = partners.some(p => p.id === result.id);
                            return (
                              <div
                                key={result.id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div>
                                  <p className="font-medium">{result.name}</p>
                                  <p className="text-sm text-muted-foreground">@{result.username}</p>
                                </div>
                                <Button
                                  size="sm"
                                  disabled={alreadyPartner}
                                  onClick={() => handleInvitePartner(result.id, result.name, result.username)}
                                >
                                  {alreadyPartner ? 'Already Partner' : 'Invite'}
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Client Modal */}
        <AddEditClientModal
        open={isAddClientOpen}
        onOpenChange={(open) => {
          setIsAddClientOpen(open);
          if (!open) setEditingClient(null);
        }}
        onSave={handleSaveClient}
        client={editingClient}
        userId={user?.uid || ''}
        userName={user?.displayName || 'Unknown'}
      />

      {/* Add/Edit Transaction Modal */}
      <AddEditTransactionModal
        open={isAddTransactionOpen}
        onOpenChange={(open) => {
          setIsAddTransactionOpen(open);
          if (!open) {
            setPreSelectedClientId(null);
            setEditingTransaction(null);
          }
        }}
        onSubmit={handleSubmitTransaction}
        type={transactionType}
        clients={clients}
        categories={categories}
        preSelectedClientId={preSelectedClientId}
        editingTransaction={editingTransaction ? {
          id: editingTransaction.id,
          amount: editingTransaction.amount,
          category: editingTransaction.category,
          description: editingTransaction.description,
          date: editingTransaction.date,
          clientId: editingTransaction.clientId,
          serviceId: editingTransaction.serviceId,
          clientExpenseCategory: editingTransaction.clientExpenseCategory,
          paymentScheduleId: editingTransaction.paymentScheduleId
        } : null}
      />

      {isOwner && (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Business Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Public Sharing</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable public link</p>
                    <p className="text-xs text-muted-foreground">Anyone with the link can view (read-only)</p>
                  </div>
                  <Button
                    variant={business.publicShareEnabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleTogglePublicShare}
                  >
                    {business.publicShareEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                {business.publicShareEnabled && business.publicShareLink && (
                  <div className="space-y-2">
                    <Label>Public Link</Label>
                    <div className="flex gap-2">
                      <Input value={business.publicShareLink} readOnly />
                      <Button size="sm" onClick={handleCopyPublicLink}>
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </AppLayout>
  );
};

export default BusinessDetail;
