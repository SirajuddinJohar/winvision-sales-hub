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

const Targets = () => {
  const { profile } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargetForm, setShowTargetForm] = useState(false);

  useEffect(() => {
    fetchTargets();
    fetchDoctors();
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
            achieved_value: achievedValue || 0
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
                          {target.doctor?.name || 'General Target'}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(target.achieved_value, target.target_value)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {achievementPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={achievementPercentage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Target</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(target.target_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Achieved</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(target.achieved_value)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Remaining: {formatCurrency(Math.max(0, target.target_value - target.achieved_value))}
                    </span>
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
        onSuccess={fetchTargets}
      />
    </div>
  );
};

export default Targets;