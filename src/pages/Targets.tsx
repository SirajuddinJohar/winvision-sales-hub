import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target as TargetIcon, TrendingUp, Calendar, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TargetFormModal from '@/components/modals/TargetFormModal';
import PageHeader from '@/components/layout/PageHeader';

interface Target {
  id: string;
  target_value: number;
  achieved_value: number;
  target_month: string;
  created_at: string;
  target_type: 'mr' | 'doctor';
  mr_id: string;
  doctor: {
    name: string;
    specialty: string;
  } | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface MR {
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

const Targets = () => {
  const { profile } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mrs, setMrs] = useState<MR[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly-target');
  const [mrMonthlyTarget, setMrMonthlyTarget] = useState<Target | null>(null);

  useEffect(() => {
    fetchTargets();
    fetchDoctors();
    if (profile?.role === 'admin') {
      fetchMRs();
    }
    if (profile?.role === 'mr') {
      fetchCurrentMonthOrders();
      fetchMrMonthlyTarget();
    }
  }, [profile]);

  const fetchTargets = async () => {
    try {
      const { data: targetsData, error: targetsError } = await supabase
        .from('targets')
        .select(`
          id,
          target_value,
          target_month,
          created_at,
          target_type,
          mr_id,
          doctors:doctor_id (
            name,
            specialty
          )
        `)
        .order('target_month', { ascending: false });

      if (targetsError) throw targetsError;

      const targetsWithAchievement = await Promise.all(
        (targetsData || []).map(async (target) => {
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

      setTargets(targetsWithAchievement);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      if (!profile) return;
      
      let query = supabase
        .from('doctors')
        .select('id, name, specialty');

      if (profile.role !== 'admin') {
        query = query.eq('assigned_mr_id', profile.id);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchMRs = async () => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mr');

      if (roleError) throw roleError;
      
      if (!roleData || roleData.length === 0) {
        setMrs([]);
        return;
      }

      const mrUserIds = roleData.map(r => r.user_id);

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', mrUserIds)
        .order('name');

      if (error) throw error;
      setMrs(data || []);
    } catch (error) {
      console.error('Error fetching MRs:', error);
    }
  };

  const fetchCurrentMonthOrders = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      
      const { data, error } = await supabase
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
        .eq('mr_id', profile?.id)
        .gte('order_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('order_date', `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
        .order('order_date', { ascending: false });

      if (error) throw error;
      
      const formattedOrders = (data || []).map(order => ({
        ...order,
        doctor: order.doctors,
        product: order.products
      }));
      
      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching current month orders:', error);
    }
  };

  const fetchMrMonthlyTarget = async () => {
    try {
      const currentDate = new Date();
      const targetMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
      
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('mr_id', profile?.id)
        .eq('target_type', 'mr')
        .eq('target_month', targetMonth)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        const { data: achievedValue, error: rpcError } = await supabase
          .rpc('calculate_target_achievement', { target_id_param: data.id });
        
        if (rpcError) {
          console.error('Error calculating achievement:', rpcError);
        }

        setMrMonthlyTarget({
          ...data,
          achieved_value: achievedValue || 0,
          target_type: data.target_type as 'mr' | 'doctor',
          doctor: null
        });
      }
    } catch (error) {
      console.error('Error fetching MR monthly target:', error);
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
    if (percentage >= 100) return <Badge className="bg-green-500 text-[10px] md:text-xs">Achieved</Badge>;
    if (percentage >= 75) return <Badge className="bg-yellow-500 text-[10px] md:text-xs">Near Target</Badge>;
    if (percentage >= 50) return <Badge variant="secondary" className="text-[10px] md:text-xs">In Progress</Badge>;
    return <Badge variant="destructive" className="text-[10px] md:text-xs">Behind Target</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-6 md:h-8 w-24 md:w-32 mb-2" />
            <Skeleton className="h-4 md:h-5 w-48 md:w-64" />
          </div>
          <Skeleton className="h-9 md:h-10 w-24 md:w-32" />
        </div>
        <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 md:h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // MR View
  if (profile?.role === 'mr') {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Targets" 
          description="Track your sales targets and achievements"
        />
        <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly-target" className="text-xs md:text-sm">Your Monthly Target</TabsTrigger>
            <TabsTrigger value="doctor-target" className="text-xs md:text-sm">Doctor Target</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly-target" className="space-y-3 md:space-y-6">
            {/* Monthly Target Card */}
            {mrMonthlyTarget ? (
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <TargetIcon className="h-4 w-4 md:h-5 md:w-5" />
                    Monthly Target - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0 space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Monthly Target</p>
                      <p className="text-lg md:text-2xl font-bold text-primary">
                        {formatCurrency(mrMonthlyTarget.target_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">Achieved</p>
                      <p className="text-lg md:text-2xl font-bold text-green-600">
                        {formatCurrency(mrMonthlyTarget.achieved_value)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span>Progress</span>
                      <span className="font-medium">
                        {getAchievementPercentage(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={getAchievementPercentage(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value)} 
                      className="h-2 md:h-3" 
                    />
                  </div>

                  {getStatusBadge(mrMonthlyTarget.achieved_value, mrMonthlyTarget.target_value)}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-6 md:py-8">
                  <TargetIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                  <p className="text-xs md:text-sm text-muted-foreground">No monthly target set for this month</p>
                </CardContent>
              </Card>
            )}

            {/* Orders Table */}
            <Card>
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Package className="h-4 w-4 md:h-5 md:w-5" />
                  Current Month Orders
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  All orders placed this month across all doctors
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                {orders.length > 0 ? (
                  <div className="overflow-x-auto -mx-3 md:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs md:text-sm">Date</TableHead>
                          <TableHead className="text-xs md:text-sm">Doctor Name</TableHead>
                          <TableHead className="text-xs md:text-sm">Product</TableHead>
                          <TableHead className="text-right text-xs md:text-sm">Order Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs md:text-sm py-2 md:py-4">
                              {new Date(order.order_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">{order.doctor?.name}</TableCell>
                            <TableCell className="text-xs md:text-sm py-2 md:py-4">{order.product?.name}</TableCell>
                            <TableCell className="text-right font-medium text-xs md:text-sm py-2 md:py-4">
                              {formatCurrency(order.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <Package className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                    <p className="text-xs md:text-sm text-muted-foreground">No orders placed this month</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="doctor-target" className="space-y-3 md:space-y-6">
            {/* Doctor Targets */}
            <div className="flex justify-between items-center">
              <h2 className="text-base md:text-xl font-semibold">Doctor Targets</h2>
              <Button size="sm" className="h-9 md:h-10 text-xs md:text-sm" onClick={() => setShowTargetForm(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
                Add Doctor Target
              </Button>
            </div>

            {targets.filter(t => t.target_type === 'doctor').length === 0 ? (
              <Card>
                <CardContent className="text-center py-6 md:py-8">
                  <TargetIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                  <p className="text-xs md:text-sm text-muted-foreground">No doctor targets set</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {targets
                  .filter(target => target.target_type === 'doctor')
                  .map((target) => {
                    const achievementPercentage = getAchievementPercentage(target.achieved_value, target.target_value);
                    
                    return (
                      <Card key={target.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                                <TargetIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-sm md:text-lg">
                                  {target.doctor?.name || 'Doctor Target'}
                                </CardTitle>
                                <CardDescription className="text-xs md:text-sm">
                                  {new Date(target.target_month).toLocaleDateString('en-US', { 
                                    month: 'long', 
                                    year: 'numeric' 
                                  })}
                                </CardDescription>
                              </div>
                            </div>
                            {getStatusBadge(target.achieved_value, target.target_value)}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 md:p-6 pt-0 space-y-3 md:space-y-4">
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Progress</span>
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="text-base md:text-lg font-bold text-primary">
                                  {achievementPercentage.toFixed(1)}%
                                </span>
                                <span className="text-[10px] md:text-xs text-muted-foreground">completed</span>
                              </div>
                            </div>
                            
                            <Progress value={achievementPercentage} className="h-2 md:h-3" />
                            
                            <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
                              <span>₹0</span>
                              <span className="font-medium">Target: {formatCurrency(target.target_value)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 md:gap-3 p-2 md:p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                            <div className="text-center">
                              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Target</p>
                              <p className="text-xs md:text-sm font-semibold text-primary">
                                {formatCurrency(target.target_value)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Achieved</p>
                              <p className="text-xs md:text-sm font-semibold text-green-600">
                                {formatCurrency(target.achieved_value)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Remaining</p>
                              <p className="text-xs md:text-sm font-semibold text-orange-600">
                                {formatCurrency(Math.max(0, target.target_value - target.achieved_value))}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Target Form Modal */}
        <TargetFormModal
          open={showTargetForm}
          onOpenChange={setShowTargetForm}
          doctors={doctors}
          mrs={mrs}
          onSuccess={() => {
            fetchTargets();
            fetchMrMonthlyTarget();
          }}
        />
        </div>
      </div>
    );
  }

  // Admin interface - MR List View
  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Targets Management" 
        description="Monitor MR performance and manage targets"
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-base md:text-xl font-semibold">Medical Representatives</h2>
          <Button size="sm" className="h-9 md:h-10 text-xs md:text-sm" onClick={() => setShowTargetForm(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            Set Target
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Card>
            <CardContent className="p-3 md:pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">Total MRs</p>
                <p className="text-xl md:text-3xl font-bold text-primary">{mrs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">Targets Set</p>
                <p className="text-xl md:text-3xl font-bold text-primary">{targets.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">Achieved</p>
                <p className="text-xl md:text-3xl font-bold text-green-600">
                  {targets.filter(t => getAchievementPercentage(t.achieved_value, t.target_value) >= 100).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:pt-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-0.5 md:mb-1">Avg Progress</p>
                <p className="text-xl md:text-3xl font-bold text-primary">
                  {targets.length > 0 
                    ? (targets.reduce((sum, t) => sum + getAchievementPercentage(t.achieved_value, t.target_value), 0) / targets.length).toFixed(0)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MR List */}
        {mrs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 md:py-8">
              <TargetIcon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
              <p className="text-xs md:text-sm text-muted-foreground">No MRs found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mrs.map((mr) => {
              const currentDate = new Date();
              const currentMonthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
              
              const mrTarget = targets.find(
                t => t.target_type === 'mr' && 
                t.mr_id === mr.id &&
                t.target_month.startsWith(currentMonthStr)
              );
              
              const mrDoctorTargets = targets.filter(
                t => t.target_type === 'doctor' && 
                t.mr_id === mr.id
              );
              const achievementPercentage = mrTarget 
                ? getAchievementPercentage(mrTarget.achieved_value, mrTarget.target_value)
                : 0;
              
              const getCardColor = () => {
                if (!mrTarget) return 'border-muted';
                if (achievementPercentage >= 100) return 'border-green-500 bg-green-50/50 dark:bg-green-950/20';
                if (achievementPercentage >= 75) return 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20';
                if (achievementPercentage >= 50) return 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
                return 'border-red-500 bg-red-50/50 dark:bg-red-950/20';
              };

              return (
                <Card 
                  key={mr.id} 
                  className={`cursor-pointer hover:shadow-lg transition-all ${getCardColor()}`}
                  onClick={() => window.location.href = `/dashboard/targets/mr/${mr.id}`}
                >
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm md:text-lg">{mr.name}</CardTitle>
                        <CardDescription className="text-[10px] md:text-xs">{mr.email}</CardDescription>
                      </div>
                      {mrTarget && getStatusBadge(mrTarget.achieved_value, mrTarget.target_value)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0 space-y-3 md:space-y-4">
                    {mrTarget ? (
                      <>
                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex justify-between text-xs md:text-sm">
                            <span>Monthly Target</span>
                            <span className="font-medium">{formatCurrency(mrTarget.target_value)}</span>
                          </div>
                          <div className="flex justify-between text-xs md:text-sm">
                            <span>Achieved</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(mrTarget.achieved_value)}
                            </span>
                          </div>
                          <Progress value={achievementPercentage} className="h-1.5 md:h-2" />
                          <div className="text-center">
                            <span className="text-base md:text-lg font-bold text-primary">
                              {achievementPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-3 md:py-4">
                        <p className="text-xs md:text-sm text-muted-foreground">No monthly target set</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs md:text-sm text-muted-foreground">
                        <TargetIcon className="inline h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
                        Doctor Targets
                      </div>
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {mrDoctorTargets.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Target Form Modal */}
        <TargetFormModal
          open={showTargetForm}
          onOpenChange={setShowTargetForm}
          doctors={doctors}
          mrs={mrs}
          onSuccess={fetchTargets}
        />
      </div>
    </div>
  );
};

export default Targets;
