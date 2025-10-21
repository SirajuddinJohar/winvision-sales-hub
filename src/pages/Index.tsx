import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Users, Truck, Building2, Package, ShoppingCart, DollarSign, Target, BarChart3, ClipboardList, CalendarDays } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: ClipboardList, label: 'Daily Working', path: '/dashboard/daily-working' },
    { icon: CalendarDays, label: 'Monthly Tour Plan', path: '/dashboard/tour-plan' },
    { icon: Users, label: 'Doctors', path: '/dashboard/doctors' },
    { icon: Truck, label: 'Distributors', path: '/dashboard/distributors' },
    { icon: Building2, label: 'Pharmacies', path: '/dashboard/pharmacies' },
    { icon: Package, label: 'Products', path: '/dashboard/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders' },
    { icon: DollarSign, label: 'Expenses', path: '/dashboard/expenses' },
    { icon: Target, label: 'Targets', path: '/dashboard/targets' },
    { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting' }
  ];

  // Admin-only items
  const adminItems = profile?.role === 'admin' ? [
    { icon: CalendarDays, label: 'Tour Plan Requests', path: '/dashboard/tour-plan-requests' }
  ] : [];

  const allItems = [...navigationItems, ...adminItems];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <div className="w-full max-w-5xl">
        {/* Top: Logo and Heading */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card shadow-xl mb-4">
              <Package className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Winvision
          </h1>
          <p className="text-xl text-white/90 font-medium">MR Dashboard</p>
        </div>

        {/* Center: User Info Card */}
        <div className="bg-card rounded-3xl shadow-2xl p-8 mb-8 text-center">
          <div className="mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              {profile?.name || 'User'}
            </h2>
          </div>
          <p className="text-muted-foreground font-medium">
            {profile?.role === 'admin' ? 'Administrator' : 'Medical Representative'}
          </p>
        </div>

        {/* Navigation Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {allItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="h-28 md:h-32 flex flex-col items-center justify-center gap-3 bg-card hover:bg-primary hover:text-primary-foreground text-foreground border-0 shadow-lg rounded-2xl transition-all duration-300 hover:shadow-xl hover:scale-105 hover:-translate-y-1 group"
              variant="outline"
            >
              <item.icon className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:text-primary-foreground transition-colors" />
              <span className="text-sm md:text-base font-semibold">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
