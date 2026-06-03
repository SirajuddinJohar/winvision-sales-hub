import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, Phone, Calendar, Heart, TrendingUp, Target, Edit, ArrowLeft, Tag, IndianRupee, ChevronRight, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/layout/PageHeader';
import PrescriptionTracking from '@/components/doctors/PrescriptionTracking';
import VisitNotes from '@/components/doctors/VisitNotes';
import NextCallPicker from '@/components/reminders/NextCallPicker';

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
  incentive_percentage?: number;
}

interface AssignedPharmacy {
  id: string;
  name: string;
  city: string;
  contact_person: string;
}

interface IncentiveSummary {
  totalIncentive: number;
  pendingAmount: number;
}

const DoctorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [assignedPharmacies, setAssignedPharmacies] = useState<AssignedPharmacy[]>([]);
  const [incentiveSummary, setIncentiveSummary] = useState<IncentiveSummary>({ totalIncentive: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDoctor();
      fetchAssignedPharmacies();
      fetchIncentiveSummary();
    }
  }, [id]);

  const fetchAssignedPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_pharmacy_assignments')
        .select(`
          pharmacy_id,
          pharmacies:pharmacy_id (
            id,
            name,
            city,
            contact_person
          )
        `)
        .eq('doctor_id', id);

      if (error) throw error;
      
      const pharmacies = data
        ?.map(item => item.pharmacies as unknown as AssignedPharmacy)
        .filter(Boolean) || [];
      
      setAssignedPharmacies(pharmacies);
    } catch (error) {
      console.error('Error fetching assigned pharmacies:', error);
    }
  };

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

  const fetchIncentiveSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('doctor_incentives')
        .select('incentive_amount, status')
        .eq('doctor_id', id);

      if (error) throw error;

      const summary = (data || []).reduce((acc, item) => {
        acc.totalIncentive += item.incentive_amount;
        if (item.status !== 'paid') {
          acc.pendingAmount += item.incentive_amount;
        }
        return acc;
      }, { totalIncentive: 0, pendingAmount: 0 });

      setIncentiveSummary(summary);
    } catch (error) {
      console.error('Error fetching incentive summary:', error);
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
        <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
          <Skeleton className="h-48 md:h-64 w-full" />
          <div className="grid gap-3 md:gap-6 md:grid-cols-2">
            <Skeleton className="h-72 md:h-96 w-full" />
            <Skeleton className="h-72 md:h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Doctor Details" />
        <div className="px-3 py-2 md:p-6">
          <Card>
            <CardContent className="text-center py-6 md:py-8">
              <p className="text-muted-foreground text-xs md:text-sm">Doctor not found</p>
              <Button onClick={() => navigate('/dashboard/doctors')} className="mt-4 h-9 md:h-10 text-xs md:text-sm">
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
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {/* Main Info Card */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="p-2 md:p-3 rounded-lg bg-primary/10">
                  <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl">{doctor.name}</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">{doctor.specialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NextCallPicker doctorId={doctor.id} entityName={doctor.name} link={`/dashboard/doctors/${doctor.id}`} />
                <Button onClick={() => navigate('/dashboard/doctors')} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
                  <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-4 md:space-y-6">
            <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 md:gap-3">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs md:text-sm font-medium">Area</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{doctor.area}</p>
                </div>
              </div>

              {doctor.phone && (
                <div className="flex items-center gap-2 md:gap-3">
                  <Phone className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Phone</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{doctor.phone}</p>
                  </div>
                </div>
              )}

              {doctor.birthday && (
                <div className="flex items-center gap-2 md:gap-3">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Birthday</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {new Date(doctor.birthday).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {doctor.anniversary && (
                <div className="flex items-center gap-2 md:gap-3">
                  <Heart className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Anniversary</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {new Date(doctor.anniversary).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {doctor.last_visit_date && (
                <div className="flex items-center gap-2 md:gap-3">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Last Visit</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {new Date(doctor.last_visit_date).toLocaleDateString()} 
                      <span className="ml-1 md:ml-2">({getDaysSinceLastVisit(doctor.last_visit_date)} days ago)</span>
                    </p>
                  </div>
                </div>
              )}

              {doctor.relationship_score !== undefined && (
                <div className="flex items-center gap-2 md:gap-3">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Relationship Score</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{doctor.relationship_score.toFixed(1)}</p>
                  </div>
                </div>
              )}

              {doctor.monthly_target && (
                <div className="flex items-center gap-2 md:gap-3">
                  <Target className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs md:text-sm font-medium">Monthly Target</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{formatCurrency(doctor.monthly_target)}</p>
                  </div>
                </div>
              )}
            </div>

            {doctor.tags && doctor.tags.length > 0 && (
              <div className="pt-3 md:pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                  <p className="text-xs md:text-sm font-medium">Tags</p>
                </div>
                <div className="flex gap-1.5 md:gap-2 flex-wrap">
                  {doctor.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-[10px] md:text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {doctor.notes && (
              <div className="pt-3 md:pt-4 border-t">
                <p className="text-xs md:text-sm font-medium mb-1 md:mb-2">Notes</p>
                <p className="text-xs md:text-sm text-muted-foreground">{doctor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescription Tracking, Visit Notes, and Incentive */}
        <div className="grid gap-3 md:gap-6 md:grid-cols-2">
          <PrescriptionTracking doctorId={doctor.id} />
          <VisitNotes doctorId={doctor.id} />
        </div>

        {/* Incentive Block */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(`/dashboard/doctors/${doctor.id}/incentive`)}
        >
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg bg-accent">
                  <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <CardTitle className="text-sm md:text-lg">Incentive</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {incentiveSummary.totalIncentive > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                  <p className="text-lg md:text-xl font-bold text-primary">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(incentiveSummary.totalIncentive)}
                  </p>
                </div>
                {incentiveSummary.pendingAmount > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-sm md:text-base font-medium text-muted-foreground">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(incentiveSummary.pendingAmount)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground">
                No incentives recorded yet. Place orders to generate incentives.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Pharmacies */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg bg-accent">
                <Store className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <CardTitle className="text-sm md:text-lg">Assigned Pharmacies</CardTitle>
              <Badge variant="secondary" className="ml-auto text-[10px] md:text-xs">
                {assignedPharmacies.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {assignedPharmacies.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-3 md:py-4">
                No pharmacies assigned to this doctor
              </p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {assignedPharmacies.map((pharmacy) => (
                  <div
                    key={pharmacy.id}
                    className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/50 border"
                  >
                    <div>
                      <p className="font-medium text-sm md:text-base">{pharmacy.name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {pharmacy.city} • {pharmacy.contact_person}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoctorDetails;