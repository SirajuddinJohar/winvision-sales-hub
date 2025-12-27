import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FlaskConical, Link2, Package, TrendingUp, ShoppingCart, MapPin } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

const Master = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate('/auth');
    return null;
  }

  const masterItems = [
    { icon: FlaskConical, label: 'Add Sample', path: '/dashboard/master/add-sample' },
    { icon: Link2, label: 'Attach Dr with Ch', path: '/dashboard/master/attach-doctor-pharmacy' },
    { icon: Package, label: 'Sales And Stocks', path: '/dashboard/master/sales-and-stocks' },
    { icon: TrendingUp, label: 'Secondary Sales', path: '/dashboard/master/secondary-sales' },
    { icon: ShoppingCart, label: 'Primary Sales', path: '/dashboard/master/primary-sales' },
    { icon: MapPin, label: 'Area Wise Doctor Visits', path: '/dashboard/master/area-doctor-visits' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Master" description="Manage master data and samples" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {masterItems.map((item) => (
            <Button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="h-28 md:h-32 flex flex-col items-center justify-center gap-3 bg-card hover:bg-gradient-primary hover:text-white text-foreground border-0 shadow-xl rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 group"
              variant="outline"
            >
              <item.icon className="h-7 w-7 md:h-8 md:w-8 text-primary group-hover:text-white transition-colors" />
              <span className="text-sm md:text-base font-bold">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Master;
