import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import UpcomingReminders from '@/components/doctors/UpcomingReminders';
import MRDailyWorkingDashboard from '@/components/admin/MRDailyWorkingDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
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

interface SalesTrendData {
  date: string;
  revenue: number;
  orders: number;
}

interface TargetData {
  month: string;
  target: number;
  achieved: number;
  achievement: number;
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
  const [salesTrend, setSalesTrend] = useState<SalesTrendData[]>([]);
  const [targetData, setTargetData] = useState<TargetData[]>([]);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);

        const { count: doctorsCount } = await supabase
          .from('doctors')
          .select('*', { count: 'exact', head: true });

        let productsCount = 0;
        if (isAdmin) {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });
          productsCount = count || 0;
        }

        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        const { count: pendingExpensesCount } = await supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: revenueData } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('order_date', `${currentMonth}-01`)
          .lt('order_date', `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)}`);
        
        const monthlyRevenue = revenueData?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;

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

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().slice(0, 10);
        });

        const salesTrendData = await Promise.all(
          last7Days.map(async (date) => {
            const { data: dayOrders } = await supabase
              .from('orders')
              .select('total_amount')
              .gte('order_date', date)
              .lt('order_date', new Date(new Date(date).getTime() + 86400000).toISOString().slice(0, 10));

            const revenue = dayOrders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
            const orders = dayOrders?.length || 0;

            return {
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              revenue: Math.round(revenue),
              orders
            };
          })
        );
        setSalesTrend(salesTrendData);

        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return {
            start: new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().slice(0, 10),
            label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          };
        });

        const targetChartData = await Promise.all(
          last6Months.map(async (month) => {
            const { data: monthTargets } = await supabase
              .from('targets')
              .select('target_value, achieved_value')
              .gte('target_month', month.start)
              .lt('target_month', month.end);

            const target = monthTargets?.reduce((sum, t) => sum + (Number(t.target_value) || 0), 0) || 0;
            const achieved = monthTargets?.reduce((sum, t) => sum + (Number(t.achieved_value) || 0), 0) || 0;
            const achievement = target > 0 ? Math.round((achieved / target) * 100) : 0;

            return {
              month: month.label,
              target: Math.round(target),
              achieved: Math.round(achieved),
              achievement
            };
          })
        );
        setTargetData(targetChartData);

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
      <div className="space-y-3 md:space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 md:p-6 space-y-1.5 md:space-y-2">
                <div className="h-3 md:h-4 bg-muted rounded w-1/2"></div>
                <div className="h-6 md:h-8 bg-muted rounded w-1/3"></div>
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
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1.5 md:pb-3">
              <CardTitle className="text-[10px] md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {card.title}
              </CardTitle>
              <div className={`p-2 md:p-3 rounded-xl ${card.bgColor} shadow-sm`}>
                <card.icon className={`h-4 w-4 md:h-6 md:w-6 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{card.value}</div>
              <p className="text-[10px] md:text-sm text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Sales Trend Chart */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Sales Trend
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Revenue and orders over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--primary))",
                },
                orders: {
                  label: "Orders",
                  color: "hsl(var(--accent))",
                },
              }}
              className="h-[200px] md:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Target Achievement Chart */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Target className="h-4 w-4 md:h-5 md:w-5 text-success" />
              Target vs Achievement
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ChartContainer
              config={{
                target: {
                  label: "Target",
                  color: "hsl(var(--muted-foreground))",
                },
                achieved: {
                  label: "Achieved",
                  color: "hsl(var(--success))",
                },
              }}
              className="h-[200px] md:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={targetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar 
                    dataKey="target" 
                    fill="hsl(var(--muted))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="achieved" 
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics Chart */}
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-accent" />
              Daily Orders
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Order volume trend over the last week</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ChartContainer
              config={{
                orders: {
                  label: "Orders",
                  color: "hsl(var(--accent))",
                },
              }}
              className="h-[200px] md:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--accent))", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Achievement Percentage Chart */}
        <Card className="border-l-4 border-l-info">
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Target className="h-4 w-4 md:h-5 md:w-5 text-info" />
              Achievement Rate
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Target achievement percentage by month</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <ChartContainer
              config={{
                achievement: {
                  label: "Achievement %",
                  color: "hsl(var(--info))",
                },
              }}
              className="h-[200px] md:h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={targetData}>
                  <defs>
                    <linearGradient id="colorAchievement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    domain={[0, 100]}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="achievement" 
                    stroke="hsl(var(--info))" 
                    fillOpacity={1} 
                    fill="url(#colorAchievement)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* MR Daily Working Dashboard for Admins */}
      {isAdmin && <MRDailyWorkingDashboard />}

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Recent Activity</CardTitle>
            <CardDescription className="text-xs md:text-sm">Latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                <span className="text-xs md:text-sm">Recent orders available in Orders page</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-success" />
                <span className="text-xs md:text-sm">Target tracking available</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/50">
                <Receipt className="h-3.5 w-3.5 md:h-4 md:w-4 text-warning" />
                <span className="text-xs md:text-sm">{stats.pendingExpenses} expenses pending approval</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base">Quick Actions</CardTitle>
            <CardDescription className="text-xs md:text-sm">Frequently used shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <button 
                onClick={() => navigate('/doctors')}
                className="p-2 md:p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-left"
              >
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary mb-1 md:mb-2" />
                <span className="text-xs md:text-sm font-medium">View Doctors</span>
              </button>
              <button 
                onClick={() => navigate('/orders')}
                className="p-2 md:p-3 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors text-left"
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-accent mb-1 md:mb-2" />
                <span className="text-xs md:text-sm font-medium">New Order</span>
              </button>
              <button 
                onClick={() => navigate('/expenses')}
                className="p-2 md:p-3 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors text-left"
              >
                <Receipt className="h-4 w-4 md:h-5 md:w-5 text-warning mb-1 md:mb-2" />
                <span className="text-xs md:text-sm font-medium">Add Expense</span>
              </button>
              <button 
                onClick={() => navigate('/targets')}
                className="p-2 md:p-3 rounded-lg bg-success/10 hover:bg-success/20 transition-colors text-left"
              >
                <Target className="h-4 w-4 md:h-5 md:w-5 text-success mb-1 md:mb-2" />
                <span className="text-xs md:text-sm font-medium">View Targets</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default Dashboard;
