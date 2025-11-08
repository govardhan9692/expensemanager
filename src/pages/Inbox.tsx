import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'business_invitation' | 'profit_received' | 'other';
  from: { userId: string; name: string; username: string };
  businessId?: string;
  businessName?: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  read: boolean;
  amount?: number;
  permission?: 'view' | 'edit';
}

const Inbox = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before redirecting
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const notificationsRef = collection(db, 'users', user.uid, 'inbox');
    const q = query(notificationsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(notifs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate, authLoading]);

  const handleAcceptInvitation = async (notification: Notification) => {
    if (!user || !notification.businessId) return;

    try {
      const businessPartnersRef = collection(db, 'businesses', notification.businessId, 'partners');
      await setDoc(doc(businessPartnersRef, user.uid), {
        name: user.displayName,
        username: '', // Will be fetched from user profile
        role: 'partner',
        permission: notification.permission || 'view',
        joinedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', user.uid, 'inbox', notification.id), {
        status: 'accepted',
        read: true
      });

      toast.success(`You joined ${notification.businessName}!`);
      navigate('/businesses');
    } catch (error) {
      toast.error('Failed to accept invitation');
      console.error(error);
    }
  };

  const handleDeclineInvitation = async (notificationId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'inbox', notificationId), {
        status: 'declined',
        read: true
      });
      toast.success('Invitation declined');
    } catch (error) {
      toast.error('Failed to decline invitation');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'inbox', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user) return;

    let undoTimerId: NodeJS.Timeout;
    let isUndone = false;

    const deletePromise = new Promise<void>((resolve, reject) => {
      undoTimerId = setTimeout(async () => {
        if (!isUndone) {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'inbox', notificationId));
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      }, 5000);
    });

    toast.promise(deletePromise, {
      loading: 'Notification will be deleted in 5 seconds...',
      success: 'Notification deleted successfully',
      error: 'Failed to delete notification',
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          clearTimeout(undoTimerId);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! Notifications will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      notification.type === 'business_invitation' ? 'bg-primary/10' :
                      notification.type === 'profit_received' ? 'bg-success/10' : 'bg-muted'
                    }`}>
                      {notification.type === 'profit_received' ? (
                        <DollarSign className="w-5 h-5 text-success" />
                      ) : (
                        <Mail className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium">
                            {notification.from.name}{' '}
                            <span className="text-muted-foreground">
                              (@{notification.from.username})
                            </span>
                          </p>
                          {notification.businessName && (
                            <p className="text-sm text-muted-foreground">
                              {notification.businessName}
                            </p>
                          )}
                        </div>
                        {!notification.read && (
                          <Badge variant="default" className="ml-2">New</Badge>
                        )}
                      </div>

                      <p className="text-sm mb-3">{notification.message}</p>

                      {notification.amount && (
                        <p className="text-lg font-semibold text-success mb-3">
                          +${notification.amount.toLocaleString()}
                        </p>
                      )}

                      {notification.permission && notification.status === 'pending' && (
                        <Badge variant="outline" className="mb-3">
                          {notification.permission === 'edit' ? 'Edit Access' : 'View Only'}
                        </Badge>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        {notification.type === 'business_invitation' && notification.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvitation(notification)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineInvitation(notification.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}

                        {notification.status === 'accepted' && (
                          <Badge variant="default" className="bg-success">Accepted</Badge>
                        )}

                        {notification.status === 'declined' && (
                          <Badge variant="secondary">Declined</Badge>
                        )}

                        {!notification.read && notification.type !== 'business_invitation' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as Read
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(notification.id)}
                        >
                          Delete
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Inbox;
