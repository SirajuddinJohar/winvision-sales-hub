import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Save, X, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  area: string;
}

interface Pharmacy {
  id: string;
  name: string;
  city: string;
  contact_person: string;
}

const AttachDoctorPharmacy = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedPharmacies, setSelectedPharmacies] = useState<string[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<string[]>([]);
  const [searchPharmacy, setSearchPharmacy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDoctors();
    fetchPharmacies();
  }, [user, profile]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchExistingAssignments(selectedDoctor);
    } else {
      setExistingAssignments([]);
      setSelectedPharmacies([]);
    }
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    try {
      let query = supabase.from('doctors').select('id, name, specialty, area');
      
      if (profile?.role === 'mr') {
        query = query.eq('assigned_mr_id', user?.id);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to fetch doctors');
    }
  };

  const fetchPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('id, name, city, contact_person')
        .order('name');
      
      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      toast.error('Failed to fetch pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAssignments = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from('doctor_pharmacy_assignments')
        .select('pharmacy_id')
        .eq('doctor_id', doctorId);
      
      if (error) throw error;
      const assignedIds = data?.map(a => a.pharmacy_id) || [];
      setExistingAssignments(assignedIds);
      setSelectedPharmacies(assignedIds);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handlePharmacyToggle = (pharmacyId: string) => {
    setSelectedPharmacies(prev => {
      if (prev.includes(pharmacyId)) {
        return prev.filter(id => id !== pharmacyId);
      } else {
        return [...prev, pharmacyId];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor first');
      return;
    }

    setSaving(true);
    try {
      // Find pharmacies to add and remove
      const toAdd = selectedPharmacies.filter(id => !existingAssignments.includes(id));
      const toRemove = existingAssignments.filter(id => !selectedPharmacies.includes(id));

      // Remove unselected assignments
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('doctor_pharmacy_assignments')
          .delete()
          .eq('doctor_id', selectedDoctor)
          .in('pharmacy_id', toRemove);
        
        if (deleteError) throw deleteError;
      }

      // Add new assignments
      if (toAdd.length > 0) {
        const newAssignments = toAdd.map(pharmacyId => ({
          doctor_id: selectedDoctor,
          pharmacy_id: pharmacyId,
          created_by: user?.id
        }));

        const { error: insertError } = await supabase
          .from('doctor_pharmacy_assignments')
          .insert(newAssignments);
        
        if (insertError) throw insertError;
      }

      toast.success('Assignments saved successfully');
      setExistingAssignments(selectedPharmacies);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(searchPharmacy.toLowerCase()) ||
    pharmacy.city.toLowerCase().includes(searchPharmacy.toLowerCase())
  );

  const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Attach Dr with Ch" description="Link doctors with pharmacies" />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Attach Dr with Ch" description="Link doctors with pharmacies" />
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Doctor Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Doctor</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor..." />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty} ({doctor.area})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Selected Doctor Info */}
        {selectedDoctorData && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{selectedDoctorData.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctorData.specialty} • {selectedDoctorData.area}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pharmacy Selection */}
        {selectedDoctor && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Select Pharmacies</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedPharmacies.length} selected
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pharmacies..."
                  value={searchPharmacy}
                  onChange={(e) => setSearchPharmacy(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Pharmacy List */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredPharmacies.map(pharmacy => (
                  <div
                    key={pharmacy.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPharmacies.includes(pharmacy.id)
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                    onClick={() => handlePharmacyToggle(pharmacy.id)}
                  >
                    <Checkbox
                      checked={selectedPharmacies.includes(pharmacy.id)}
                      onCheckedChange={() => handlePharmacyToggle(pharmacy.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{pharmacy.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pharmacy.city} • {pharmacy.contact_person}
                      </p>
                    </div>
                  </div>
                ))}

                {filteredPharmacies.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No pharmacies found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {selectedDoctor && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Assignments'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AttachDoctorPharmacy;
