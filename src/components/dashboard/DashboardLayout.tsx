import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import NotificationBell from '@/components/layout/NotificationBell';
import GlobalSearch from '@/components/layout/GlobalSearch';
import QuickAddFab from '@/components/layout/QuickAddFab';
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
  Calendar,
  FileText,
  Map,
  Briefcase,
  IndianRupee,
  Gift,
  Bell,
  ChevronDown,
  Home,
  ClipboardList,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type Role = 'admin' | 'mr';

interface NavItem {
  icon: any;
  label: string;
  path: string;
  roles: Role[];
}

interface NavGroup {
  key: string;
  label: string;
  icon: any;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'home',
    label: 'Home',
    icon: Home,
    items: [
      { icon: BarChart3, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'mr'] },
    ],
  },
  {
    key: 'today',
    label: 'Today',
    icon: Calendar,
    items: [
      { icon: ClipboardList, label: 'Daily Working', path: '/dashboard/daily-working', roles: ['admin', 'mr'] },
      { icon: Bell, label: 'Reminders', path: '/dashboard/reminders', roles: ['admin', 'mr'] },
      { icon: Map, label: 'Tour Plan', path: '/dashboard/tour-plan', roles: ['admin', 'mr'] },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { icon: Users, label: 'Doctors', path: '/dashboard/doctors', roles: ['admin', 'mr'] },
      { icon: Building, label: 'Pharmacies', path: '/dashboard/pharmacies', roles: ['admin', 'mr'] },
      { icon: Truck, label: 'Distributors', path: '/dashboard/distributors', roles: ['admin', 'mr'] },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    items: [
      { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders', roles: ['admin', 'mr'] },
      { icon: Package, label: 'Products', path: '/dashboard/products', roles: ['admin', 'mr'] },
      { icon: Receipt, label: 'Expenses', path: '/dashboard/expenses', roles: ['admin', 'mr'] },
      { icon: Gift, label: 'Rewards', path: '/dashboard/rewards', roles: ['admin', 'mr'] },
      { icon: IndianRupee, label: 'Incentives', path: '/dashboard/incentives', roles: ['admin', 'mr'] },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: PieChart,
    items: [
      { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting', roles: ['admin', 'mr'] },
      { icon: Package, label: 'Product Analytics', path: '/dashboard/product-analytics', roles: ['admin', 'mr'] },
      { icon: IndianRupee, label: 'Financial Year', path: '/dashboard/financial-year', roles: ['admin', 'mr'] },
      { icon: Target, label: 'Targets', path: '/dashboard/targets', roles: ['admin', 'mr'] },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    items: [
      { icon: Briefcase, label: 'Master Hub', path: '/dashboard/master', roles: ['admin', 'mr'] },
      { icon: ShoppingCart, label: 'Purchases', path: '/dashboard/purchases', roles: ['admin'] },
      { icon: FileText, label: 'Tour Requests', path: '/dashboard/tour-plan-requests', roles: ['admin'] },
    ],
  },
];

const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const visibleGroups = useMemo(() => {
    if (!profile) return [];
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(profile.role)) }))
      .filter((g) => g.items.length > 0);
  }, [profile]);

  const initialOpen = useMemo(() => {
    const set = new Set<string>(['home', 'today']);
    for (const g of visibleGroups) {
      if (g.items.some((i) => isActive(i.path))) set.add(g.key);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleGroups, location.pathname]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(initialOpen);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (!profile) return null;
  const isAdmin = profile.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed left-0 top-0 h-full w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 z-50 md:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-border bg-gradient-card shrink-0">
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

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.key);
            const hasActive = group.items.some((i) => isActive(i.path));

            // Home group with a single item — render flat, no toggle.
            if (group.key === 'home') {
              const item = group.items[0];
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'default' : 'ghost'}
                  className={`w-full justify-start gap-3 h-10 font-medium ${
                    isActive(item.path)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm">{item.label}</span>
                </Button>
              );
            }

            return (
              <div key={group.key} className="pt-1">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    hasActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <group.icon className="h-3.5 w-3.5" />
                    {group.label}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                  />
                </button>
                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-1">
                    {group.items.map((item) => (
                      <Button
                        key={item.path}
                        variant={isActive(item.path) ? 'default' : 'ghost'}
                        className={`w-full justify-start gap-3 h-9 font-medium ${
                          isActive(item.path)
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-primary/10 hover:text-primary'
                        }`}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border bg-card shrink-0">
          <Card className="p-3 mb-3 bg-muted/50 border-l-4 border-l-primary shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate text-foreground">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
                <p className="text-[10px] text-primary font-semibold">
                  {isAdmin ? 'Administrator' : 'Medical Rep'}
                </p>
              </div>
            </div>
          </Card>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-3 font-medium"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="md:ml-64">
        <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Welcome, {profile.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Manage your pharmaceutical operations' : 'Track your targets and activities'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearch />
              <NotificationBell />
            </div>
          </div>
        </div>

        <main className="p-3 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      <QuickAddFab />
    </div>
  );
};

export default DashboardLayout;
