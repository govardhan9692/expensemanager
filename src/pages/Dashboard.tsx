import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Building2, TrendingUp, TrendingDown, LogOut, Plus, Bell } from 'lucide-react';
import { UpcomingPaymentsWidget } from '@/components/dashboard/UpcomingPaymentsWidget';
import { RecurringRevenueWidget } from '@/components/dashboard/RecurringRevenueWidget';
import { ClientsOverviewWidget } from '@/components/dashboard/ClientsOverviewWidget';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [personalTransactions, setPersonalTransactions] = useState<Transaction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const inboxRef = collection(db, 'users', user.uid, 'inbox');
    const unsubscribeInbox = onSnapshot(inboxRef, (snapshot) => {
      const unread = snapshot.docs.filter(doc => !doc.data().read).length;
      setUnreadCount(unread);
    });

    // Load businesses
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
      } catch (error) {
        console.error('Error loading businesses:', error);
      }
    };

    loadBusinesses();

    return () => {
      unsubscribeTransactions();
      unsubscribeInbox();
    };
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const totalIncome = personalTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = personalTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  if (loading) {
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Expense Manager</h1>
                <p className="text-sm text-muted-foreground">{user?.displayName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/inbox')} className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.displayName?.split(' ')[0]}!</h2>
          <p className="text-muted-foreground">Here's your financial overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                ${totalIncome.toLocaleString()}
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
                ${totalExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit/Loss
              </CardTitle>
              <Wallet className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                ${Math.abs(netProfit).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <UpcomingPaymentsWidget />
        </div>

        {businesses.length > 0 && (
          <div className="mb-8">
            <RecurringRevenueWidget businesses={businesses} />
          </div>
        )}

        {businesses.length > 0 && (
          <div className="mb-8">
            <ClientsOverviewWidget 
              clients={[]} 
              businessId={businesses[0]?.id || ''} 
            />
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
    </div>
  );
};

export default Dashboard;
