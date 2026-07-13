import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PhotoUpload } from '@/components/ui/photo-upload';
import { Loader2, MapPin } from 'lucide-react';
import { getCurrentLocation } from '@/lib/geolocation';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';

interface DoctorFormData {
  name: string;
  specialty: string;
  area: string;
  territory?: string;
  monthly_target?: number;
  photo_url?: string;
  phone?: string;
  location?: { latitude: number; longitude: number };
  birthday?: string;
  anniversary?: string;
  tags?: string;
  notes?: string;
  address?: string;
  prescribing_preferences?: string;
}

interface DoctorFormProps {
  doctor?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const DoctorForm = ({ doctor, onSuccess, onCancel }: DoctorFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(doctor?.photo_url || null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    doctor?.location || null
  );
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [areas, setAreas] = useState<{ id: string; area_name: string }[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  useEffect(() => {
    const loadAreas = async () => {
      const { data } = await supabase.from('areas').select('id, area_name').order('area_name');
      setAreas(data || []);
      if (doctor?.id && profile?.id) {
        const { data: visits } = await supabase
          .from('area_doctor_visits')
          .select('area_id')
          .eq('doctor_id', doctor.id)
          .eq('created_by', profile.id);
        setSelectedAreaIds([...new Set((visits || []).map((v: any) => v.area_id))]);
      }
    };
    loadAreas();
  }, [doctor?.id, profile?.id]);

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds(prev =>
      prev.includes(areaId) ? prev.filter(id => id !== areaId) : [...prev, areaId]
    );
  };

  const { register, handleSubmit, formState: { errors } } = useForm<DoctorFormData>({
    defaultValues: {
      name: doctor?.name || '',
      specialty: doctor?.specialty || '',
      area: doctor?.area || '',
      territory: doctor?.territory || '',
      monthly_target: doctor?.monthly_target || 0,
      photo_url: doctor?.photo_url || '',
      phone: doctor?.phone || '',
      birthday: doctor?.birthday || '',
      anniversary: doctor?.anniversary || '',
      tags: doctor?.tags?.join(', ') || '',
      notes: doctor?.notes || '',
      address: doctor?.address || '',
      prescribing_preferences: doctor?.prescribing_preferences ? JSON.stringify(doctor.prescribing_preferences) : '',
    }
  });

  const handleCaptureLocation = async () => {
    try {
      setCapturingLocation(true);
      const locationData = await getCurrentLocation();
      
      setLocation({
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });
      toast({
        title: "Location captured",
        description: `Lat: ${locationData.latitude.toFixed(6)}, Lng: ${locationData.longitude.toFixed(6)}`
      });
    } catch (error: any) {
      console.error('Error capturing location:', error);
      
      let errorMessage = "Failed to capture location";
      
      if (error?.message?.includes('permission denied')) {
        errorMessage = "Location permission denied. Please enable location access in your device settings.";
      } else if (error?.code === 1) {
        errorMessage = "Location permission denied. Please enable location access.";
      } else if (error?.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS/internet connection.";
      } else if (error?.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setCapturingLocation(false);
    }
  };

  const onSubmit = async (data: DoctorFormData) => {
    try {
      setLoading(true);
      
      const doctorData = {
        ...data,
        monthly_target: Number(data.monthly_target) || 0,
        assigned_mr_id: profile?.role === 'admin' ? null : profile?.id,
        created_by: profile?.id,
        photo_url: photoUrl,
        phone: data.phone || null,
        location: location || null,
        birthday: data.birthday || null,
        anniversary: data.anniversary || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        notes: data.notes || null,
        address: data.address || null,
        prescribing_preferences: data.prescribing_preferences ? JSON.parse(data.prescribing_preferences) : {},
      };

      let doctorId = doctor?.id;
      if (doctor) {
        const { error } = await supabase
          .from('doctors')
          .update(doctorData)
          .eq('id', doctor.id);
          
        if (error) throw error;
        toast({ title: "Doctor updated successfully" });
      } else {
        const { data: inserted, error } = await supabase
          .from('doctors')
          .insert([doctorData])
          .select('id')
          .single();
          
        if (error) throw error;
        doctorId = inserted?.id;
        toast({ title: "Doctor added successfully" });
      }

      // Sync area assignments for this doctor (current MR scope)
      if (doctorId && profile?.id && profile?.role !== 'admin') {
        const { data: existing } = await supabase
          .from('area_doctor_visits')
          .select('area_id')
          .eq('doctor_id', doctorId)
          .eq('created_by', profile.id);
        const existingIds = new Set((existing || []).map((v: any) => v.area_id));
        const toAdd = selectedAreaIds.filter(id => !existingIds.has(id));

        if (toAdd.length > 0) {
          await supabase.from('area_doctor_visits').insert(
            toAdd.map(area_id => ({
              area_id,
              doctor_id: doctorId,
              created_by: profile.id,
            }))
          );
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving doctor:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save doctor", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{doctor ? 'Edit Doctor' : 'Add New Doctor'}</CardTitle>
        <CardDescription>
          {doctor ? 'Update doctor information' : 'Enter doctor details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Doctor's full name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty *</Label>
              <Input
                id="specialty"
                {...register('specialty', { required: 'Specialty is required' })}
                placeholder="e.g., Cardiology, Neurology"
              />
              {errors.specialty && (
                <p className="text-sm text-destructive">{errors.specialty.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area *</Label>
              <Input
                id="area"
                {...register('area', { required: 'Area is required' })}
                placeholder="Hospital/clinic location"
              />
              {errors.area && (
                <p className="text-sm text-destructive">{errors.area.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter mobile number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="territory">Territory</Label>
              <Input
                id="territory"
                {...register('territory')}
                placeholder="Sales territory"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_target">Monthly Target (₹)</Label>
              <Input
                id="monthly_target"
                type="number"
                step="0.01"
                {...register('monthly_target')}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                {...register('birthday')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary">Anniversary</Label>
              <Input
                id="anniversary"
                type="date"
                {...register('anniversary')}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                {...register('tags')}
                placeholder="e.g., VIP, High Prescriber, Cardiologist"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes about the doctor..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                {...register('address')}
                placeholder="Clinic / hospital address"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>


            <div className="space-y-2 md:col-span-2">
              <Label>Doctor Location *</Label>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCaptureLocation}
                  disabled={capturingLocation}
                  className="flex-1"
                >
                  {capturingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Capturing...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      {location ? 'Update Location' : 'Capture Current Location'}
                    </>
                  )}
                </Button>
                {location && (
                  <div className="text-xs text-muted-foreground">
                    📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Location is required for proximity-based call tracking (200m range)
              </p>
            </div>

            {profile?.role !== 'admin' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Assign to Areas (Area Wise Doctor Visits)</Label>
                <p className="text-xs text-muted-foreground">
                  Select areas to assign this doctor. To remove an area assignment, request deletion from the Area Wise Doctor Visits page (admin approval required).
                </p>
                {areas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No areas available. Create areas first.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {areas.map(area => (
                      <label key={area.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedAreaIds.includes(area.id)}
                          onCheckedChange={() => toggleArea(area.id)}
                        />
                        <span>{area.area_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <PhotoUpload
                value={photoUrl || undefined}
                onChange={setPhotoUrl}
                label="Doctor Photo"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {doctor ? 'Update' : 'Add'} Doctor
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DoctorForm;