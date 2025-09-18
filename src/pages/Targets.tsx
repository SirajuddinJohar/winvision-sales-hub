import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target as TargetIcon, TrendingUp, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import TargetFormModal from '@/components/modals/TargetFormModal';

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

const Targets = () => {
  const { profile } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mrs, setMrs] = useState<MR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargetForm, setShowTargetForm] = useState(false);

  useEffect(() => {
    fetchTargets();
    fetchDoctors();
    if (profile?.role === 'admin') {
      fetchMRs();
    }
  }, [profile]);

  const fetchTargets = async () => {
    try {
      // First fetch targets with doctor info
      const { data: targetsData, error: targetsError } = await supabase
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
        .order('target_month', { ascending: false });

      if (targetsError) throw targetsError;

      // Calculate achieved values for each target
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
      let query = supabase
        .from('doctors')
        .select('id, name, specialty');

      // If user is not admin, only fetch doctors assigned to them
      if (profile?.role !== 'admin') {
        query = query.eq('assigned_mr_id', profile?.id);
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
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'mr')
        .order('name');

      if (error) throw error;
      setMrs(data || []);
    } catch (error) {
      console.error('Error fetching MRs:', error);
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
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Targets</h1>
          <p className="text-muted-foreground">
            Track your sales targets and achievements
          </p>
        </div>
        <Button onClick={() => setShowTargetForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Set Target
        </Button>
      </div>

      {targets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <TargetIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No targets set</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((target) => {
            const achievementPercentage = getAchievementPercentage(target.achieved_value, target.target_value);
            
            return (
              <Card key={target.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <TargetIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {new Date(target.target_month).toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </CardTitle>
                        <CardDescription>
                          {target.target_type === 'mr' 
                            ? 'Monthly MR Target' 
                            : target.doctor?.name || 'General Doctor Target'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(target.achieved_value, target.target_value)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Monthly Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          {achievementPercentage.toFixed(1)}%
                        </span>
                        <span className="text-xs text-muted-foreground">completed</span>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="relative">
                      <Progress value={achievementPercentage} className="h-3 bg-gradient-to-r from-muted to-muted/50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white drop-shadow-sm">
                          {achievementPercentage >= 10 ? `₹${(target.achieved_value / 1000).toFixed(0)}K` : ''}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Labels */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>₹0</span>
                      <span className="font-medium">Target: {formatCurrency(target.target_value)}</span>
                    </div>
                  </div>

                  {/* Achievement Stats */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Target</p>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(target.target_value)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Achieved</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(target.achieved_value)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                      <p className="text-sm font-semibold text-orange-600">
                        {formatCurrency(Math.max(0, target.target_value - target.achieved_value))}
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${
                        achievementPercentage >= 75 ? 'text-green-500' : 
                        achievementPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {achievementPercentage >= 100 ? '🎉 Target Achieved!' : 
                         achievementPercentage >= 75 ? '🚀 Almost There!' :
                         achievementPercentage >= 50 ? '💪 Good Progress' : 
                         '📈 Keep Going!'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {achievementPercentage < 100 && 
                        `${((target.target_value - target.achieved_value) / target.target_value * 100).toFixed(0)}% to go`
                      }
                    </div>
                  </div>

                  {target.doctor && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {target.doctor.specialty}
                      </span>
                    </div>
                  )}
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
  );
};

export default Targets;