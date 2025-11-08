import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, TrendingDown, Wallet, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Business {
  name: string;
  ownerId: string;
  ownerName: string;
  publicShareEnabled: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PublicBusiness = () => {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return;

      try {
        const businessRef = doc(db, 'businesses', businessId);
        const businessSnap = await getDoc(businessRef);

        if (!businessSnap.exists() || !businessSnap.data().publicShareEnabled) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setBusiness(businessSnap.data() as Business);

        const transactionsRef = collection(db, 'businesses', businessId, 'transactions');
        const q = query(transactionsRef, orderBy('date', 'desc'));
        const transactionsSnap = await getDocs(q);

        const txns = transactionsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
          .filter(txn => txn.type !== 'profit_distribution') // Hide profit distributions
          .slice(0, 20); // Show only recent 20

        setTransactions(txns);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching public business:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">Business Not Found</h2>
            <p className="text-muted-foreground">
              This business either doesn't exist or public sharing is disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => ['expense', 'transfer_to_personal'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  const categoryData = Object.entries(
    transactions.reduce((acc, txn) => {
      acc[txn.category] = (acc[txn.category] || 0) + txn.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).slice(0, 6);

  const monthlyData = Object.entries(
    transactions.reduce((acc, txn) => {
      const month = new Date(txn.date).toLocaleString('default', { month: 'short' });
      if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
      if (txn.type === 'income') {
        acc[month].income += txn.amount;
      } else {
        acc[month].expenses += txn.amount;
      }
      return acc;
    }, {} as Record<string, any>)
  ).map(([_, data]) => data).slice(-6);

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              Public View - Read Only
            </Badge>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Building2 className="w-12 h-12" />
              <h1 className="text-4xl font-bold">{business.name}</h1>
            </div>
            <p className="text-white/80 text-lg">
              Financial overview and analytics
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
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
                  Net Profit
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

          {categoryData.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="income" fill="#10B981" name="Income" />
                      <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 10).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        txn.type === 'income' ? 'bg-success/10' : 'bg-danger/10'
                      }`}>
                        {txn.type === 'income' ? (
                          <TrendingUp className="w-5 h-5 text-success" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-danger" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{txn.category}</p>
                        <p className="text-sm text-muted-foreground truncate">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${
                      txn.type === 'income' ? 'text-success' : 'text-danger'
                    }`}>
                      {txn.type === 'income' ? '+' : '-'}${txn.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8 bg-muted/50">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                This is a read-only public view. Partner information and profit distributions are not displayed.
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                Create your own Expense Manager
                <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PublicBusiness;
