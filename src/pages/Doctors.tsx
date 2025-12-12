import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, MapPin, Target, Edit, Trash2, AlertTriangle, Phone, Calendar, Heart, TrendingUp, Clock, Tag, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import DoctorForm from '@/components/doctors/DoctorForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
  territory?: string;
  monthly_target?: number;
  created_at: string;
  phone?: string;
  location?: { latitude: number; longitude: number };
  birthday?: string;
  anniversary?: string;
  last_visit_date?: string;
  relationship_score?: number;
  tags?: string[];
  notes?: string;
}

const Doctors = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const query = searchQuery.toLowerCase();
    return doctors.filter(doctor => 
      doctor.name.toLowerCase().includes(query)
    );
  }, [doctors, searchQuery]);

  useEffect(() => {
    fetchDoctors();
  }, [profile]);

  const fetchDoctors = async () => {
    try {
      let query = supabase
        .from('doctors')
        .select('*')
        .order('name');

      const { data, error } = await query;

      if (error) throw error;

      const doctorsWithTypedLocation = (data || []).map(doc => ({
        ...doc,
        location: doc.location as { latitude: number; longitude: number } | undefined
      }));

      setDoctors(doctorsWithTypedLocation);
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgencyBadge = (days: number | null) => {
    if (days === null) return <Badge variant="outline">Never visited</Badge>;
    if (days > 30) return <Badge variant="destructive">Urgent: {days}d</Badge>;
    if (days > 14) return <Badge variant="secondary">Follow-up: {days}d</Badge>;
    return <Badge variant="default">Recent: {days}d</Badge>;
  };

  const getScoreBadge = (score?: number) => {
    if (!score && score !== 0) return null;
    if (score >= 50) return <Badge className="bg-green-600">High: {score.toFixed(0)}</Badge>;
    if (score >= 20) return <Badge className="bg-yellow-600">Medium: {score.toFixed(0)}</Badge>;
    return <Badge className="bg-red-600">Low: {score.toFixed(0)}</Badge>;
  };

  const isUpcomingBirthday = (birthday?: string): boolean => {
    if (!birthday) return false;
    const today = new Date();
    const bday = new Date(birthday);
    bday.setFullYear(today.getFullYear());
    const diffTime = bday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const isUpcomingAnniversary = (anniversary?: string): boolean => {
    if (!anniversary) return false;
    const today = new Date();
    const anniv = new Date(anniversary);
    anniv.setFullYear(today.getFullYear());
    const diffTime = anniv.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setShowForm(true);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setShowForm(true);
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;

    try {
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', doctorId);

      if (error) throw error;

      toast({ title: "Doctor deleted successfully" });
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete doctor", 
        variant: "destructive" 
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDoctor(null);
    fetchDoctors();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingDoctor(null);
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
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Doctors" 
        description="Manage your assigned doctors and their information"
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search doctor by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleAddDoctor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Doctor
          </Button>
        </div>

      {filteredDoctors.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No doctors found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/doctors/${doctor.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                        {(isUpcomingBirthday(doctor.birthday) || isUpcomingAnniversary(doctor.anniversary)) && (
                          <Heart className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                      </div>
                      <CardDescription>{doctor.specialty}</CardDescription>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {getUrgencyBadge(getDaysSinceLastVisit(doctor.last_visit_date))}
                        {getScoreBadge(doctor.relationship_score)}
                      </div>
                    </div>
                  </div>
                  {!doctor.location && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      No Location
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{doctor.area}</span>
                  {doctor.territory && (
                    <Badge variant="outline" className="text-xs">
                      {doctor.territory}
                    </Badge>
                  )}
                </div>

                {doctor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doctor.phone}</span>
                  </div>
                )}

                {doctor.last_visit_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Last visit: {new Date(doctor.last_visit_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {(doctor.birthday || doctor.anniversary) && (
                  <div className="flex flex-col gap-1">
                    {doctor.birthday && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">
                          Birthday: {new Date(doctor.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {isUpcomingBirthday(doctor.birthday) && ' 🎂'}
                        </span>
                      </div>
                    )}
                    {doctor.anniversary && (
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">
                          Anniversary: {new Date(doctor.anniversary).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {isUpcomingAnniversary(doctor.anniversary) && ' 💝'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {doctor.tags && doctor.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {doctor.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {doctor.relationship_score !== undefined && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Engagement Score: {doctor.relationship_score.toFixed(1)}
                    </span>
                  </div>
                )}
                
                {doctor.monthly_target && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Target: {formatCurrency(doctor.monthly_target)}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Added: {new Date(doctor.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditDoctor(doctor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {profile?.role === 'admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DoctorForm
            doctor={editingDoctor}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Doctors;