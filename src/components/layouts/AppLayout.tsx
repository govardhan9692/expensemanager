import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Wallet, 
  Building2, 
  Bell, 
  LogOut, 
  User,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const inboxRef = collection(db, 'users', user.uid, 'inbox');
    const unsubscribe = onSnapshot(inboxRef, (snapshot) => {
      const unread = snapshot.docs.filter(doc => !doc.data().read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    {
      title: 'Main',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Wallet, label: 'Personal Profile', path: '/personal' },
        { icon: Building2, label: 'Business Profile', path: '/businesses' },
        { icon: Bell, label: 'Inbox', path: '/inbox', badge: unreadCount > 0 ? unreadCount : undefined },
      ]
    }
  ];

  const isActive = (path: string) => location.pathname === path || 
    (path === '/businesses' && location.pathname.startsWith('/business/'));

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="font-semibold">Expense Manager</span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.displayName || user?.email}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {navItems.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={isActive(item.path)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge className="ml-auto h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-6 w-px bg-border" />
            <span className="font-semibold truncate">
              {location.pathname === '/dashboard' && 'Dashboard'}
              {location.pathname === '/personal' && 'Personal Profile'}
              {location.pathname === '/businesses' && 'Business Profile'}
              {location.pathname === '/inbox' && 'Inbox'}
              {location.pathname.startsWith('/business/') && 'Business Details'}
            </span>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
