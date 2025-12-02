import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, Phone, Calendar, Heart, TrendingUp, Target, Edit, ArrowLeft, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import PrescriptionTracking from '@/components/doctors/PrescriptionTracking';
import VisitNotes from '@/components/doctors/VisitNotes';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
  territory?: string;
  monthly_target?: number;
  phone?: string;
  birthday?: string;
  anniversary?: string;
  last_visit_date?: string;
  relationship_score?: number;
  tags?: string[];
  notes?: string;
  location?: { latitude: number; longitude: number };
}

const DoctorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id]);

  const fetchDoctor = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      const doctorWithTypedLocation = {
        ...data,
        location: data.location as { latitude: number; longitude: number } | undefined
      };
      
      setDoctor(doctorWithTypedLocation);
    } catch (error) {
      console.error('Error fetching doctor:', error);
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

  const getDaysSinceLastVisit = (lastVisitDate?: string): number | null => {
    if (!lastVisitDate) return null;
    const today = new Date();
    const lastVisit = new Date(lastVisitDate);
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Doctor Details" />
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Doctor Details" />
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">Doctor not found</p>
              <Button onClick={() => navigate('/dashboard/doctors')} className="mt-4">
                Back to Doctors
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={doctor.name} />
      <div className="p-4 md:p-6 space-y-6">
        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{doctor.name}</CardTitle>
                  <p className="text-muted-foreground">{doctor.specialty}</p>
                </div>
              </div>
              <Button onClick={() => navigate('/dashboard/doctors')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Area</p>
                  <p className="text-sm text-muted-foreground">{doctor.area}</p>
                </div>
              </div>

              {doctor.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{doctor.phone}</p>
                  </div>
                </div>
              )}

              {doctor.birthday && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Birthday</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doctor.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {doctor.anniversary && (
                <div className="flex items-center gap-3">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Anniversary</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doctor.anniversary).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {doctor.last_visit_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Visit</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(doctor.last_visit_date).toLocaleDateString()} 
                      <span className="ml-2">({getDaysSinceLastVisit(doctor.last_visit_date)} days ago)</span>
                    </p>
                  </div>
                </div>
              )}

              {doctor.relationship_score !== undefined && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Relationship Score</p>
                    <p className="text-sm text-muted-foreground">{doctor.relationship_score.toFixed(1)}</p>
                  </div>
                </div>
              )}

              {doctor.monthly_target && (
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Monthly Target</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(doctor.monthly_target)}</p>
                  </div>
                </div>
              )}
            </div>

            {doctor.tags && doctor.tags.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Tags</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {doctor.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {doctor.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Notes</p>
                <p className="text-sm text-muted-foreground">{doctor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescription Tracking and Visit Notes */}
        <div className="grid gap-6 md:grid-cols-2">
          <PrescriptionTracking doctorId={doctor.id} />
          <VisitNotes doctorId={doctor.id} />
        </div>
      </div>
    </div>
  );
};

export default DoctorDetails;