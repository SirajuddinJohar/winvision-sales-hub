import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Target, Calendar, Users, Building2, Truck, Package, ShoppingCart, BarChart3 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  const navigationItems = [
    { icon: Target, label: 'Targets', path: '/dashboard/targets' },
    { icon: Calendar, label: 'Daily Working', path: '/dashboard/daily-working' },
    { icon: Users, label: 'Doctors', path: '/dashboard/doctors' },
    { icon: Building2, label: 'Pharmacies', path: '/dashboard/pharmacies' },
    { icon: Truck, label: 'Distributors', path: '/dashboard/distributors' },
    { icon: Package, label: 'Products', path: '/dashboard/products' },
    { icon: ShoppingCart, label: 'Orders', path: '/dashboard/orders' },
    { icon: BarChart3, label: 'Reporting', path: '/dashboard/reporting' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/5 to-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Urdu Greeting */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" dir="rtl">
            مرحبا، {profile?.name || 'User'}
          </h1>
          <p className="text-muted-foreground">Welcome to Winvision</p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-4">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="h-32 flex flex-col items-center justify-center gap-3 bg-card hover:bg-card/80 text-foreground border border-border shadow-lg rounded-2xl transition-all hover:shadow-xl hover:scale-105"
              variant="outline"
            >
              <item.icon className="h-8 w-8 text-success" />
              <span className="text-base font-semibold">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
