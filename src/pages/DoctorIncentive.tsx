import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import IncentiveStats from '@/components/doctors/IncentiveStats';
import IncentiveList from '@/components/doctors/IncentiveList';
import IncentiveSettings from '@/components/doctors/IncentiveSettings';

interface Doctor {
  id: string;
  name: string;
  incentive_percentage: number;
}

const DoctorIncentive = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, incentive_percentage')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDoctor(data);
    } catch (error) {
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = () => {
    fetchDoctor();
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Incentive" />
        <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
          <Skeleton className="h-20 md:h-24 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 md:h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 md:h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Incentive" />
        <div className="px-3 py-2 md:p-6">
          <p className="text-muted-foreground text-center py-8 text-sm">Doctor not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={`${doctor.name} - Incentive`} />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/dashboard/doctors/${id}`)}
          className="h-9 md:h-10 text-xs md:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
          Back to Doctor
        </Button>

        {/* Stats Overview */}
        <IncentiveStats doctorId={doctor.id} refreshTrigger={refreshTrigger} />

        {/* Settings (Admin Only) */}
        <IncentiveSettings
          doctorId={doctor.id}
          currentPercentage={doctor.incentive_percentage || 30}
          onUpdate={handleSettingsUpdate}
        />

        {/* Incentive List */}
        <IncentiveList doctorId={doctor.id} refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
};

export default DoctorIncentive;
