import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

const categories = [
  'Salary', 'Freelance', 'Investment', 'Business', 'Other Income',
  'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other Expense'
];

const Personal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const transactionsRef = collection(db, 'users', user.uid, 'personalTransactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txns);
    });

    return () => unsubscribe();
  }, [user, navigate, authLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const transactionsRef = collection(db, 'users', user.uid, 'personalTransactions');
      await addDoc(transactionsRef, {
        ...formData,
        amount: parseFloat(formData.amount),
        source: 'direct',
        createdAt: new Date().toISOString()
      });

      toast.success('Transaction added successfully!');
      setIsAddOpen(false);
      setFormData({
        type: 'income',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      toast.error('Failed to add transaction');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (txn: Transaction) => {
    setEditingTransaction(txn);
    setFormData({
      type: txn.type,
      amount: txn.amount.toString(),
      category: txn.category,
      description: txn.description,
      date: txn.date
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingTransaction) return;

    setLoading(true);
    try {
      const transactionRef = doc(db, 'users', user.uid, 'personalTransactions', editingTransaction.id);
      await updateDoc(transactionRef, {
        ...formData,
        amount: parseFloat(formData.amount),
        updatedAt: new Date().toISOString()
      });

      toast.success('Transaction updated successfully!');
      setIsEditOpen(false);
      setEditingTransaction(null);
      setFormData({
        type: 'income',
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      toast.error('Failed to update transaction');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Create promise for delete with undo
    let undoTimerId: NodeJS.Timeout;
    let isUndone = false;

    const deletePromise = new Promise<void>((resolve, reject) => {
      undoTimerId = setTimeout(async () => {
        if (!isUndone) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'personalTransactions', id));
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

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold truncate">Personal Finances</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Track your income and expenses</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="whitespace-nowrap">Add Transaction</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Add details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Transaction Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Transaction</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">Amount ($)</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Add details..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsEditOpen(false);
                        setEditingTransaction(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Transaction'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-4 md:mb-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Total Income
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-success shrink-0" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl md:text-2xl font-bold text-success truncate">
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
              <div className="text-xl md:text-2xl font-bold text-danger truncate">
                ${totalExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden sm:col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                Net Balance
              </CardTitle>
              <Wallet className="w-4 h-4 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className={`text-xl md:text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'} truncate`}>
                ${Math.abs(netProfit).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No transactions yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsAddOpen(true)}
                >
                  Add your first transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-start sm:items-center gap-3 p-3 md:p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      txn.type === 'income' ? 'bg-success/10' : 'bg-danger/10'
                    }`}>
                      {txn.type === 'income' ? (
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-danger" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{txn.category}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">{txn.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(txn.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <span className={`font-semibold text-sm md:text-base whitespace-nowrap ${
                        txn.type === 'income' ? 'text-success' : 'text-danger'
                      }`}>
                        {txn.type === 'income' ? '+' : '-'}${txn.amount.toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(txn)}
                          title="Edit transaction"
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(txn.id)}
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Personal;
