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

interface DoctorFormData {
  name: string;
  specialty: string;
  area: string;
  territory?: string;
  monthly_target?: number;
  photo_url?: string;
  phone?: string;
  location?: { latitude: number; longitude: number };
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

  const { register, handleSubmit, formState: { errors } } = useForm<DoctorFormData>({
    defaultValues: {
      name: doctor?.name || '',
      specialty: doctor?.specialty || '',
      area: doctor?.area || '',
      territory: doctor?.territory || '',
      monthly_target: doctor?.monthly_target || 0,
      photo_url: doctor?.photo_url || '',
      phone: doctor?.phone || '',
    }
  });

  const handleCaptureLocation = async () => {
    try {
      setCapturingLocation(true);
      const locationData = await getCurrentLocation();
      
      if (locationData) {
        setLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude
        });
        toast({
          title: "Location captured",
          description: `Lat: ${locationData.latitude.toFixed(6)}, Lng: ${locationData.longitude.toFixed(6)}`
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to capture location. Please enable location permissions.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error capturing location:', error);
      toast({
        title: "Error",
        description: "Failed to capture location",
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
      };

      if (doctor) {
        const { error } = await supabase
          .from('doctors')
          .update(doctorData)
          .eq('id', doctor.id);
          
        if (error) throw error;
        toast({ title: "Doctor updated successfully" });
      } else {
        const { error } = await supabase
          .from('doctors')
          .insert([doctorData]);
          
        if (error) throw error;
        toast({ title: "Doctor added successfully" });
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="monthly_target">Monthly Target (₹)</Label>
              <Input
                id="monthly_target"
                type="number"
                step="0.01"
                {...register('monthly_target')}
                placeholder="0.00"
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