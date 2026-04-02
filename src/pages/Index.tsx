import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Home, Users, Truck, Building2, Package, ShoppingCart, DollarSign, Target, BarChart3, ClipboardList, CalendarDays, Database, IndianRupee } from 'lucide-react';

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
    { icon: CalendarDays, label: 'Monthly Tour Plan', path: '/dashboard/tour-plan', mrOnly: true },
    { icon: Users, label: 'Doctors', path: '/dashboard/doctors' },
    { icon: Truck, label: 'Distributors', path: '/dashboard/distributors' },
    { icon: Building2, label: 'Pharmacies', path: '/dashboard/pharmacies' },
    { icon: Package, label: 'Products', path: '/dashboard/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders' },
    { icon: DollarSign, label: 'Expenses', path: '/dashboard/expenses' },
    { icon: Target, label: 'Targets', path: '/dashboard/targets' },
    { icon: BarChart3, label: 'My Performance', path: '/dashboard/my-performance' },
    { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting' },
    { icon: IndianRupee, label: 'Financial Year', path: '/dashboard/financial-year' },
    { icon: Database, label: 'Master', path: '/dashboard/master' }
  ];

  // Filter out MR-only items for admin users
  const filteredNavItems = navigationItems.filter(item => 
    !(item.mrOnly && profile?.role === 'admin')
  );

  // Admin-only items
  const adminItems = profile?.role === 'admin' ? [
    { icon: CalendarDays, label: 'Tour Plan Requests', path: '/dashboard/tour-plan-requests' }
  ] : [];

  const allItems = [...filteredNavItems, ...adminItems];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-5xl">
        {/* Top: Logo and Heading */}
        <div className="text-center mb-8 md:mb-12 animate-slide-up">
          <div className="mb-4 md:mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-card shadow-2xl mb-4 md:mb-6 animate-scale-in">
              <Package className="h-8 w-8 md:h-12 md:w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-3 drop-shadow-2xl tracking-tight">
            Winvision
          </h1>
          <p className="text-base md:text-2xl text-white/95 font-semibold">Pharmaceutical Management System</p>
        </div>

        {/* Center: User Info Card */}
        <div className="bg-card rounded-2xl md:rounded-3xl shadow-2xl p-5 md:p-8 mb-6 md:mb-10 text-center backdrop-blur-sm bg-opacity-95 border-2 border-white/20 animate-scale-in">
          <div className="mb-2 md:mb-3">
            <h2 className="text-xl md:text-4xl font-bold text-foreground tracking-tight">
              {profile?.name || 'User'}
            </h2>
          </div>
          <div className="inline-block px-4 md:px-6 py-1.5 md:py-2 rounded-full bg-gradient-primary shadow-lg">
            <p className="text-white font-bold text-xs md:text-sm tracking-wide">
              {profile?.role === 'admin' ? 'ADMINISTRATOR' : 'MEDICAL REPRESENTATIVE'}
            </p>
          </div>
        </div>

        {/* Navigation Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {allItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="h-20 md:h-32 flex flex-col items-center justify-center gap-2 md:gap-3 bg-card hover:bg-gradient-primary hover:text-white text-foreground border-0 shadow-xl rounded-xl md:rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 group"
              variant="outline"
            >
              <item.icon className="h-5 w-5 md:h-8 md:w-8 text-primary group-hover:text-white transition-colors" />
              <span className="text-xs md:text-base font-semibold md:font-bold">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
