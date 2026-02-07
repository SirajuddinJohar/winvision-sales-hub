import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface IncentiveStatsProps {
  doctorId: string;
  refreshTrigger: number;
}

interface Stats {
  totalIncentive: number;
  pendingAmount: number;
  paidAmount: number;
  totalOrders: number;
}

const IncentiveStats = ({ doctorId, refreshTrigger }: IncentiveStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalIncentive: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [doctorId, refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('doctor_incentives')
        .select('incentive_amount, status')
        .eq('doctor_id', doctorId);

      if (error) throw error;

      const calculatedStats = (data || []).reduce((acc, item) => {
        acc.totalIncentive += item.incentive_amount;
        acc.totalOrders += 1;
        if (item.status === 'paid') {
          acc.paidAmount += item.incentive_amount;
        } else {
          acc.pendingAmount += item.incentive_amount;
        }
        return acc;
      }, {
        totalIncentive: 0,
        pendingAmount: 0,
        paidAmount: 0,
        totalOrders: 0
      });

      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching incentive stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-24 w-full" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Incentive',
      value: formatCurrency(stats.totalIncentive),
      icon: IndianRupee,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      label: 'Pending',
      value: formatCurrency(stats.pendingAmount),
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      label: 'Paid',
      value: formatCurrency(stats.paidAmount),
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className={`text-sm md:text-lg font-bold ${stat.color} truncate`}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default IncentiveStats;
