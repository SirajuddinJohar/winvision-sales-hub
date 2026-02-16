import { useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import NotificationBell from '@/components/layout/NotificationBell';
import {
  Building2, 
  Users, 
  Truck,
  Building,
  Package, 
  ShoppingCart, 
  Receipt, 
  Target, 
  BarChart3,
  LogOut,
  Menu,
  User,
  Calendar
} from 'lucide-react';
import { useState } from 'react';

const DashboardLayout = () => {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const isAdmin = profile.role === 'admin';

  const navigationItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'mr'] },
    { icon: Users, label: 'Doctors', path: '/dashboard/doctors', roles: ['admin', 'mr'] },
    { icon: Truck, label: 'Distributors', path: '/dashboard/distributors', roles: ['admin', 'mr'] },
    { icon: Building, label: 'Pharmacies', path: '/dashboard/pharmacies', roles: ['admin', 'mr'] },
    { icon: Package, label: 'Products', path: '/dashboard/products', roles: ['admin', 'mr'] },
    { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders', roles: ['admin', 'mr'] },
    { icon: Receipt, label: 'Expenses', path: '/dashboard/expenses', roles: ['admin', 'mr'] },
    { icon: Target, label: 'Targets', path: '/dashboard/targets', roles: ['admin', 'mr'] },
    { icon: Calendar, label: 'Daily Working', path: '/dashboard/daily-working', roles: ['admin', 'mr'] },
    { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting', roles: ['admin', 'mr'] },
  ];

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 z-50 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-border bg-gradient-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-primary shadow-primary">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Winvision</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isAdmin ? 'Admin Panel' : 'MR Dashboard'}
              </p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {filteredNavigation.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start gap-3 h-11 font-medium hover:bg-primary/10 hover:text-primary transition-all duration-200"
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-gradient-card">
          <Card className="p-4 mb-4 bg-gradient-card border-l-4 border-l-primary shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary-light shadow-sm">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">{profile.name}</p>
                <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                <p className="text-xs text-primary font-semibold mt-0.5">
                  {profile.role === 'admin' ? 'Administrator' : 'Medical Rep'}
                </p>
              </div>
            </div>
          </Card>
          
          <Button
            variant="outline"
            className="w-full justify-start gap-3 font-medium"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  Welcome back, {profile.name}
                </h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {isAdmin ? 'Manage your pharmaceutical operations' : 'Track your targets and activities'}
                </p>
              </div>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;