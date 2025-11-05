import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Receipt, 
  TrendingUp, 
  Target,
  DollarSign,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  totalDoctors: number;
  totalProducts: number;
  totalOrders: number;
  pendingExpenses: number;
  monthlyRevenue: number;
  targetAchievement: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalDoctors: 0,
    totalProducts: 0,
    totalOrders: 0,
    pendingExpenses: 0,
    monthlyRevenue: 0,
    targetAchievement: 0,
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch doctors count - now properly filtered by RLS (assigned doctors only for MRs)
        const { count: doctorsCount } = await supabase
          .from('doctors')
          .select('*', { count: 'exact', head: true });

        // Fetch products count (admin only)
        let productsCount = 0;
        if (isAdmin) {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
          productsCount = count || 0;
        }

        // Fetch orders count - now properly filtered by RLS (own orders for MRs)
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        // Fetch pending expenses count - now properly filtered by RLS
        const { count: pendingExpensesCount } = await supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Calculate monthly revenue - now properly filtered by RLS
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: revenueData } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('order_date', `${currentMonth}-01`)
          .lt('order_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);
        
        const monthlyRevenue = revenueData?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;

        // Calculate target achievement based on actual targets - now properly filtered by RLS
        const { data: targetsData } = await supabase
          .from('targets')
          .select('target_value, achieved_value')
          .gte('target_month', `${currentMonth}-01`)
          .lt('target_month', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);

        const totalTarget = targetsData?.reduce((sum, target) => sum + (Number(target.target_value) || 0), 0) || 0;
        const totalAchieved = targetsData?.reduce((sum, target) => sum + (Number(target.achieved_value) || 0), 0) || 0;
        const targetAchievement = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

        setStats({
          totalDoctors: doctorsCount || 0,
          totalProducts: productsCount,
          totalOrders: ordersCount || 0,
          pendingExpenses: pendingExpensesCount || 0,
          monthlyRevenue,
          targetAchievement,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchStats();
    }
  }, [isAdmin, profile]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Doctors',
      value: stats.totalDoctors,
      icon: Users,
      description: 'Registered doctors',
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    ...(isAdmin ? [{
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      description: 'Available products',
      color: 'text-success',
      bgColor: 'bg-success-light',
    }] : []),
    {
      title: 'Orders',
      value: stats.totalOrders,
      icon: ShoppingCart,
      description: isAdmin ? 'Total orders' : 'My orders',
      color: 'text-accent',
      bgColor: 'bg-accent-light',
    },
    {
      title: 'Pending Expenses',
      value: stats.pendingExpenses,
      icon: Receipt,
      description: 'Awaiting approval',
      color: 'text-warning',
      bgColor: 'bg-warning-light',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      description: 'This month',
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
    {
      title: 'Target Achievement',
      value: `${stats.targetAchievement}%`,
      icon: Target,
      description: 'This month',
      color: 'text-info',
      bgColor: 'bg-info-light',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Dashboard" 
        description={isAdmin ? 'Overview of all pharmaceutical operations' : 'Your performance and activities overview'}
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {card.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${card.bgColor} shadow-sm`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-1">{card.value}</div>
              <p className="text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-card border border-border/50 hover:shadow-md transition-all">
                <div className="p-2.5 rounded-xl bg-success-light">
                  <ShoppingCart className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">New order placed</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-card border border-border/50 hover:shadow-md transition-all">
                <div className="p-2.5 rounded-xl bg-primary-light">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Doctor updated</p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-card border border-border/50 hover:shadow-md transition-all">
                <div className="p-2.5 rounded-xl bg-warning-light">
                  <Receipt className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">Expense submitted</p>
                  <p className="text-xs text-muted-foreground">6 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-card border-l-4 border-l-primary" onClick={() => navigate('/dashboard/doctors')}>
                <div className="text-center">
                  <div className="p-3 rounded-xl bg-primary-light inline-block mb-3">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">
                    {isAdmin ? 'Manage Doctors' : 'Doctor Activity'}
                  </p>
                </div>
              </Card>
              {isAdmin && (
                <Card className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-card border-l-4 border-l-success" onClick={() => navigate('/dashboard/products')}>
                  <div className="text-center">
                    <div className="p-3 rounded-xl bg-success-light inline-block mb-3">
                      <Package className="h-7 w-7 text-success" />
                    </div>
                    <p className="font-semibold text-sm text-foreground">Add Product</p>
                  </div>
                </Card>
              )}
              <Card className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-card border-l-4 border-l-accent" onClick={() => navigate('/dashboard/orders')}>
                <div className="text-center">
                  <div className="p-3 rounded-xl bg-accent-light inline-block mb-3">
                    <ShoppingCart className="h-7 w-7 text-accent" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">Place Order</p>
                </div>
              </Card>
              <Card className="p-5 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 bg-gradient-card border-l-4 border-l-warning" onClick={() => navigate('/dashboard/expenses')}>
                <div className="text-center">
                  <div className="p-3 rounded-xl bg-warning-light inline-block mb-3">
                    <Receipt className="h-7 w-7 text-warning" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">
                    {isAdmin ? 'Review Expenses' : 'Add Expense'}
                  </p>
                </div>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;