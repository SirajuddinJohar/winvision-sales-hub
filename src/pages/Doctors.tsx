import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, MapPin, Target, Edit, Trash2, AlertTriangle, Phone, Calendar, Heart, TrendingUp, Clock, Tag, Search, ChevronLeft, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import DoctorForm from '@/components/doctors/DoctorForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | 'ophthalmologist' | 'optometrist'>('all');

  // Categorize a doctor by specialty tokens.
  // Ophthalmologist: MBBS, MD, DO, DNB
  // Optometrist: B Optom, D Optom, M Optom (any "optom" token)
  const categorizeSpecialty = (specialty?: string): 'ophthalmologist' | 'optometrist' | 'other' => {
    if (!specialty) return 'other';
    const norm = specialty.toLowerCase().replace(/[.,/\\-]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = norm.split(' ');
    if (tokens.some((t) => t.includes('optom'))) return 'optometrist';
    if (tokens.some((t) => ['mbbs', 'md', 'do', 'dnb'].includes(t))) return 'ophthalmologist';
    return 'other';
  };


  const areaGroups = useMemo(() => {
    // Normalize area names (trim + collapse whitespace + case-insensitive key)
    // to prevent duplicate area cards from minor typing differences.
    const map = new Map<string, { display: string; docs: Doctor[] }>();
    doctors.forEach((d) => {
      const raw = (d.area || 'Unassigned').replace(/\s+/g, ' ').trim() || 'Unassigned';
      const key = raw.toLowerCase();
      if (!map.has(key)) {
        // Title-case display so "abc", "ABC", "Abc" all show as "Abc"
        const display = raw.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        map.set(key, { display, docs: [] });
      }
      map.get(key)!.docs.push(d);
    });
    return Array.from(map.values())
      .map(({ display, docs }) => ({ area: display, docs }))
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [doctors]);

  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areaGroups;
    const q = searchQuery.toLowerCase();
    return areaGroups.filter((g) => g.area.toLowerCase().includes(q));
  }, [areaGroups, searchQuery]);

  const areaDoctorsAll = useMemo(() => {
    if (!selectedArea) return [];
    const list = areaGroups.find((g) => g.area === selectedArea)?.docs || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((d) => d.name.toLowerCase().includes(q));
  }, [selectedArea, areaGroups, searchQuery]);

  const categoryCounts = useMemo(() => {
    const c = { ophthalmologist: 0, optometrist: 0 };
    areaDoctorsAll.forEach((d) => {
      const cat = categorizeSpecialty(d.specialty);
      if (cat === 'ophthalmologist') c.ophthalmologist++;
      else if (cat === 'optometrist') c.optometrist++;
    });
    return c;
  }, [areaDoctorsAll]);

  const areaDoctors = useMemo(() => {
    if (category === 'all') return areaDoctorsAll;
    return areaDoctorsAll.filter((d) => categorizeSpecialty(d.specialty) === category);
  }, [areaDoctorsAll, category]);

  useEffect(() => {
    fetchDoctors();
  }, [profile]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase.from('doctors').select('*').order('name');
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const getDaysSinceLastVisit = (lastVisitDate?: string): number | null => {
    if (!lastVisitDate) return null;
    const diffTime = Math.abs(Date.now() - new Date(lastVisitDate).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  const isUpcoming = (date?: string): boolean => {
    if (!date) return false;
    const today = new Date();
    const d = new Date(date);
    d.setFullYear(today.getFullYear());
    const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
      const { error } = await supabase.from('doctors').delete().eq('id', doctorId);
      if (error) throw error;
      toast({ title: 'Doctor deleted successfully' });
      fetchDoctors();
    } catch (error) {
      console.error('Error deleting doctor:', error);
      toast({ title: 'Error', description: 'Failed to delete doctor', variant: 'destructive' });
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
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={selectedArea ? selectedArea : 'Doctors'}
        description={selectedArea ? `${areaDoctors.length} doctor(s) in this area` : 'Browse doctors by area'}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 justify-between">
          <div className="flex items-center gap-2 flex-1">
            {selectedArea && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedArea(null); setSearchQuery(''); }}
                className="h-9 md:h-10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Areas
              </Button>
            )}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              <Input
                placeholder={selectedArea ? 'Search doctor by name...' : 'Search area by name...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 md:pl-10 h-9 md:h-10 text-sm"
              />
            </div>
          </div>
          <Button onClick={handleAddDoctor} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
            <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
            Add Doctor
          </Button>
        </div>

        {!selectedArea ? (
          filteredAreas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No areas found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2.5 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAreas.map(({ area, docs }) => (
                <Card
                  key={area}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedArea(area); setSearchQuery(''); }}
                >
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 md:p-2.5 rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">{area}</CardTitle>
                        <CardDescription className="text-xs md:text-sm flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3" />
                          {docs.length} doctor{docs.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )
        ) : areaDoctors.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No doctors found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {areaDoctors.map((doctor) => (
              <Card key={doctor.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/doctors/${doctor.id}`)}>
                <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                        <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <CardTitle className="text-sm md:text-lg truncate">{doctor.name}</CardTitle>
                          {(isUpcoming(doctor.birthday) || isUpcoming(doctor.anniversary)) && (
                            <Heart className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500 animate-pulse flex-shrink-0" />
                          )}
                        </div>
                        <CardDescription className="text-xs md:text-sm">{doctor.specialty}</CardDescription>
                        <div className="flex gap-1 mt-1.5 md:mt-2 flex-wrap">
                          {getUrgencyBadge(getDaysSinceLastVisit(doctor.last_visit_date))}
                          {getScoreBadge(doctor.relationship_score)}
                        </div>
                      </div>
                    </div>
                    {!doctor.location && (
                      <Badge variant="destructive" className="flex items-center gap-0.5 text-[10px] md:text-xs px-1.5 py-0.5">
                        <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        No Loc
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3 md:p-6 pt-0 md:pt-0 space-y-2 md:space-y-3">
                  {doctor.phone && (
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">{doctor.phone}</span>
                    </div>
                  )}

                  {doctor.last_visit_date && (
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">
                        Last: {new Date(doctor.last_visit_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {(doctor.birthday || doctor.anniversary) && (
                    <div className="flex flex-col gap-0.5 md:gap-1">
                      {doctor.birthday && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-[10px] md:text-xs">
                            BD: {new Date(doctor.birthday).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {isUpcoming(doctor.birthday) && ' 🎂'}
                          </span>
                        </div>
                      )}
                      {doctor.anniversary && (
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <Heart className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-[10px] md:text-xs">
                            Anniv: {new Date(doctor.anniversary).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {isUpcoming(doctor.anniversary) && ' 💝'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {doctor.tags && doctor.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                      <Tag className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      {doctor.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] md:text-xs px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {doctor.monthly_target && (
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs md:text-sm">
                        Target: {formatCurrency(doctor.monthly_target)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t flex justify-between items-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Added: {new Date(doctor.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-1.5 md:gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => handleEditDoctor(doctor)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                        <Edit className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
                      {profile?.role === 'admin' && (
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteDoctor(doctor.id)} className="h-7 w-7 md:h-8 md:w-8 p-0">
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
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
            <DoctorForm doctor={editingDoctor} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Doctors;
