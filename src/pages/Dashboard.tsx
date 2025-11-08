import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Building2, TrendingUp, TrendingDown, Plus, Users, Calendar, DollarSign } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer_to_personal' | 'profit_distribution';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface Client {
  id: string;
  basicInfo: {
    status: string;
  };
  financialSummary: {
    totalExpectedIncome: number;
    totalReceivedIncome: number;
    totalPendingIncome: number;
  };
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [personalTransactions, setPersonalTransactions] = useState<Transaction[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [businessTransactions, setBusinessTransactions] = useState<Transaction[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const transactionsRef = collection(db, 'users', user.uid, 'personalTransactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setPersonalTransactions(transactions);
      setLoading(false);
    });

    // Load businesses and their data
    const loadBusinesses = async () => {
      try {
        const businessesRef = collection(db, 'businesses');
        const ownerQuery = query(businessesRef, where('ownerId', '==', user.uid));
        const ownerSnapshot = await getDocs(ownerQuery);
        
        const bizList = ownerSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        
        setBusinesses(bizList);

        // Load all transactions from all businesses
        const allBizTransactions: Transaction[] = [];
        const allBizClients: Client[] = [];

        for (const biz of bizList) {
          // Load business transactions
          const txnsRef = collection(db, 'businesses', biz.id, 'transactions');
          const txnsSnapshot = await getDocs(txnsRef);
          const txns = txnsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Transaction[];
          allBizTransactions.push(...txns);

          // Load business clients
          const clientsRef = collection(db, 'businesses', biz.id, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);
          const clients = clientsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Client[];
          allBizClients.push(...clients);
        }

        setBusinessTransactions(allBizTransactions);
        setAllClients(allBizClients);
      } catch (error) {
        console.error('Error loading businesses:', error);
      }
    };

    loadBusinesses();

    return () => {
      unsubscribeTransactions();
    };
  }, [user, navigate, authLoading]);

  // Personal calculations
  const personalIncome = personalTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const personalExpenses = personalTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const personalNetProfit = personalIncome - personalExpenses;

  // Business calculations (combined)
  const businessIncome = businessTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const businessExpenses = businessTransactions
    .filter(t => ['expense', 'transfer_to_personal', 'profit_distribution'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const businessNetProfit = businessIncome - businessExpenses;

  // Client metrics
  const activeClients = allClients.filter(c => c.basicInfo.status === 'Active').length;
  const totalExpectedThisMonth = allClients.reduce((sum, c) => sum + c.financialSummary.totalExpectedIncome, 0);
  const totalReceivedThisMonth = allClients.reduce((sum, c) => sum + c.financialSummary.totalReceivedIncome, 0);
  const totalPendingThisMonth = allClients.reduce((sum, c) => sum + c.financialSummary.totalPendingIncome, 0);

  // Total net profit (Personal + Business)
  const totalNetProfit = personalNetProfit + businessNetProfit;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.displayName?.split(' ')[0]}!</h2>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        {/* Total Net Profit Banner - Prominent Display */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Total Net Profit (Personal + All Businesses)</p>
              <div className={`text-4xl font-bold ${totalNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                {totalNetProfit >= 0 ? '+' : '-'}${Math.abs(totalNetProfit).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Personal Finances
          </h3>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Income
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  ${personalIncome.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="w-4 h-4 text-danger" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-danger">
                  ${personalExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Profit
                </CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${personalNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {personalNetProfit >= 0 ? '+' : '-'}${Math.abs(personalNetProfit).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Businesses Combined Section */}
        {businesses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              All Businesses Combined
            </h3>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Income
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    ${businessIncome.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Expenses
                  </CardTitle>
                  <TrendingDown className="w-4 h-4 text-danger" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-danger">
                    ${businessExpenses.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Net Profit
                  </CardTitle>
                  <Wallet className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${businessNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {businessNetProfit >= 0 ? '+' : '-'}${Math.abs(businessNetProfit).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Business Metrics - 2 per row on mobile */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Clients
                  </CardTitle>
                  <Users className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activeClients}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Expected This Month
                  </CardTitle>
                  <Calendar className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    ${totalExpectedThisMonth.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Received This Month
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    ${totalReceivedThisMonth.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending This Month
                  </CardTitle>
                  <TrendingUp className="w-4 h-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    ${totalPendingThisMonth.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track your personal income and expenses
              </p>
              <Button className="w-full" onClick={() => navigate('/personal')}>
                <Wallet className="w-4 h-4 mr-2" />
                View Personal Finances
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage your business profiles and partnerships
              </p>
              <Button className="w-full" variant="outline" onClick={() => navigate('/businesses')}>
                <Building2 className="w-4 h-4 mr-2" />
                View Businesses
              </Button>
            </CardContent>
          </Card>
        </div>

        {personalTransactions.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first transaction or creating a business
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/personal')}>
                  Add Transaction
                </Button>
                <Button variant="outline" onClick={() => navigate('/businesses')}>
                  Create Business
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </AppLayout>
  );
};

export default Dashboard;
