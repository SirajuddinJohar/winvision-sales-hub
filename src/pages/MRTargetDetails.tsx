import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Target as TargetIcon, Package, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';

interface Target {
  id: string;
  target_value: number;
  achieved_value: number;
  target_month: string;
  created_at: string;
  target_type: 'mr' | 'doctor';
  doctor: {
    name: string;
    specialty: string;
  } | null;
}

interface MRInfo {
  id: string;
  name: string;
  email: string;
}

interface Order {
  id: string;
  order_date: string;
  total_amount: number;
  doctor: {
    name: string;
  };
  product: {
    name: string;
  };
}

const MRTargetDetails = () => {
  const { mrId } = useParams();
  const navigate = useNavigate();
  const [mrInfo, setMrInfo] = useState<MRInfo | null>(null);
  const [mrMonthlyTarget, setMrMonthlyTarget] = useState<Target | null>(null);
  const [doctorTargets, setDoctorTargets] = useState<Target[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mrId) {
      fetchMRData();
    }
  }, [mrId]);

  const fetchMRData = async () => {
    try {
      // Fetch MR information
      const { data: mrData, error: mrError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', mrId)
        .single();

      if (mrError) throw mrError;
      setMrInfo(mrData);

      // Fetch current month's MR target
      const currentDate = new Date();
      const targetMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
      
      const { data: mrTargetData, error: mrTargetError } = await supabase
        .from('targets')
        .select('*')
        .eq('mr_id', mrId)
        .eq('target_type', 'mr')
        .eq('target_month', targetMonth)
        .maybeSingle();

      if (mrTargetError && mrTargetError.code !== 'PGRST116') throw mrTargetError;
      
      if (mrTargetData) {
        // Calculate achieved value
        const { data: achievedValue, error: rpcError } = await supabase
          .rpc('calculate_target_achievement', { target_id_param: mrTargetData.id });
        
        if (rpcError) {
          console.error('Error calculating achievement:', rpcError);
        }

        setMrMonthlyTarget({
          ...mrTargetData,
          achieved_value: achievedValue || 0,
          target_type: mrTargetData.target_type as 'mr' | 'doctor',
          doctor: null
        });
      }

      // Fetch doctor targets for this MR
      const { data: doctorTargetsData, error: doctorTargetsError } = await supabase
        .from('targets')
        .select(`
          id,
          target_value,
          target_month,
          created_at,
          target_type,
          doctors:doctor_id (
            name,
            specialty
          )
        `)
        .eq('mr_id', mrId)
        .eq('target_type', 'doctor')
        .order('target_month', { ascending: false });

      if (doctorTargetsError) throw doctorTargetsError;

      // Calculate achieved values for each doctor target
      const doctorTargetsWithAchievement = await Promise.all(
        (doctorTargetsData || []).map(async (target) => {
          const { data: achievedValue, error } = await supabase
            .rpc('calculate_target_achievement', { target_id_param: target.id });
          
          if (error) {
            console.error('Error calculating achievement for target:', target.id, error);
          }

          return {
            ...target,
            doctor: target.doctors,
            achieved_value: achievedValue || 0,
            target_type: target.target_type as 'mr' | 'doctor'
          };
        })
      );

      setDoctorTargets(doctorTargetsWithAchievement);

      // Fetch current month orders for this MR
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      // Handle year rollover for December
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          doctors:doctor_id (
            name
          ),
          products:product_id (
            name
          )
        `)
        .eq('mr_id', mrId)
        .gte('order_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('order_date', `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;
      
      const formattedOrders = (ordersData || []).map(order => ({
        ...order,
        doctor: order.doctors,
        product: order.products
      }));
      
      setOrders(formattedOrders);

    } catch (error) {
      console.error('Error fetching MR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getAchievementPercentage = (achieved: number, target: number) => {
    return Math.min((achieved / target) * 100, 100);
  };

  const getStatusBadge = (achieved: number, target: number) => {
    const percentage = getAchievementPercentage(achieved, target);
    if (percentage >= 100) return <Badge className="bg-green-500">Achieved</Badge>;
    if (percentage >= 75) return <Badge className="bg-yellow-500">Near Target</Badge>;
    if (percentage >= 50) return <Badge variant="secondary">In Progress</Badge>;
    return <Badge variant="destructive">Behind Target</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!mrInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">MR not found</p>
        <Button onClick={() => navigate('/dashboard/targets')} className="mt-4">
          Back to Targets
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title={mrInfo.name} 
        description={mrInfo.email}
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/dashboard/targets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to MR List
        </Button>

        {/* Monthly Target Card */}
        {mrMonthlyTarget ? (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TargetIcon className="h-5 w-5" />
                Monthly Target - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Target</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(mrMonthlyTarget.target_value)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Achieved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(mrMonthlyTarget.achieved_value)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">
                    {getAchievementPercentage(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={getAchievementPercentage(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value)} 
                  className="h-3" 
                />
              </div>

              <div className="flex items-center justify-between">
                {getStatusBadge(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value)}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Remaining: {formatCurrency(Math.max(0, mrMonthlyTarget.target_value - mrMonthlyTarget.achieved_value))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <TargetIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No monthly target set for this month</p>
            </CardContent>
          </Card>
        )}

        {/* Doctor Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5" />
              Doctor Targets
            </CardTitle>
            <CardDescription>
              All doctor-specific targets assigned to this MR
            </CardDescription>
          </CardHeader>
          <CardContent>
            {doctorTargets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Achieved</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorTargets.map((target) => {
                    const percentage = getAchievementPercentage(target.achieved_value, target.target_value);
                    return (
                      <TableRow key={target.id}>
                        <TableCell className="font-medium">{target.doctor?.name}</TableCell>
                        <TableCell>{target.doctor?.specialty}</TableCell>
                        <TableCell>
                          {new Date(target.target_month).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(target.target_value)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(target.achieved_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Progress value={percentage} className="h-2 w-16" />
                            <span className="text-sm font-medium">{percentage.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(target.achieved_value, target.target_value)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <TargetIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No doctor targets set</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Month Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Current Month Orders
            </CardTitle>
            <CardDescription>
              All orders placed by this MR in {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Doctor Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Order Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="font-medium">{order.doctor?.name}</TableCell>
                      <TableCell>{order.product?.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No orders placed this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MRTargetDetails;
