import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, onSnapshot, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Business {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

const Businesses = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  const [partneredBusinesses, setPartneredBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Get owned businesses
    const ownedRef = collection(db, 'businesses');
    const ownedQuery = query(ownedRef, where('ownerId', '==', user.uid));

    const unsubscribeOwned = onSnapshot(ownedQuery, (snapshot) => {
      const biz = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Business[];
      setOwnedBusinesses(biz);
    });

    // Get partnered businesses
    const getPartneredBusinesses = async () => {
      const allBusinessesRef = collection(db, 'businesses');
      const allBusinessesSnapshot = await getDocs(allBusinessesRef);
      
      const partneredBiz: Business[] = [];
      
      for (const businessDoc of allBusinessesSnapshot.docs) {
        const partnersRef = collection(db, 'businesses', businessDoc.id, 'partners');
        const partnerQuery = query(partnersRef, where('__name__', '==', user.uid));
        const partnerSnapshot = await getDocs(partnerQuery);
        
        if (!partnerSnapshot.empty) {
          const partnerData = partnerSnapshot.docs[0].data();
          if (partnerData.role === 'partner') {
            partneredBiz.push({
              id: businessDoc.id,
              ...businessDoc.data()
            } as Business);
          }
        }
      }
      
      setPartneredBusinesses(partneredBiz);
    };

    getPartneredBusinesses();

    return () => unsubscribeOwned();
  }, [user, navigate, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !businessName.trim()) return;

    setLoading(true);
    try {
      const businessesRef = collection(db, 'businesses');
      const businessDoc = await addDoc(businessesRef, {
        name: businessName.trim(),
        ownerId: user.uid,
        ownerName: user.displayName,
        createdAt: new Date().toISOString(),
        publicShareEnabled: false,
        publicShareLink: ''
      });

      // Add owner as a partner
      const partnersRef = collection(db, 'businesses', businessDoc.id, 'partners');
      await setDoc(doc(partnersRef, user.uid), {
        name: user.displayName,
        username: '',
        role: 'owner',
        permission: 'edit',
        joinedAt: new Date().toISOString()
      });

      toast.success('Business created successfully!');
      setIsCreateOpen(false);
      setBusinessName('');
    } catch (error) {
      toast.error('Failed to create business');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Businesses</h1>
            <p className="text-sm text-muted-foreground">Manage your business profiles</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Business
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Business</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name</Label>
                    <Input
                      id="name"
                      placeholder="My Business"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Business'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
        </div>

        <Tabs defaultValue="owned" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="owned">My Businesses ({ownedBusinesses.length})</TabsTrigger>
            <TabsTrigger value="partnered">Partnered ({partneredBusinesses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="owned">
            {ownedBusinesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first business to start tracking finances
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Business
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ownedBusinesses.map((business) => (
                  <Card key={business.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/business/${business.id}`)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {business.name}
                      </CardTitle>
                      <Badge variant="default" className="w-fit">Owner</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Created {new Date(business.createdAt).toLocaleDateString()}
                      </p>
                      <Button className="w-full" variant="outline">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="partnered">
            {partneredBusinesses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No partnerships yet</h3>
                  <p className="text-muted-foreground">
                    When someone invites you to their business, it will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {partneredBusinesses.map((business) => (
                  <Card key={business.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/business/${business.id}`)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {business.name}
                      </CardTitle>
                      <Badge variant="secondary" className="w-fit">Partner</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Owner: {business.ownerName}
                      </p>
                      <Button className="w-full" variant="outline">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Businesses;
