import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';

interface AreaFormData {
  area_name: string;
  from_location: string;
  to_location: string;
  distance: number;
}

interface AreaFormProps {
  onClose: () => void;
  onSave: () => void;
}

const AreaForm = ({ onClose, onSave }: AreaFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset 
  } = useForm<AreaFormData>();

  const onSubmit = async (data: AreaFormData) => {
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('areas')
        .insert([{
          ...data,
          distance: Number(data.distance),
          created_by: user?.id
        }]);
        
      if (error) throw error;
      
      toast({ 
        title: "Area Added Successfully ✅", 
        description: "The area has been saved to your list." 
      });
      
      reset();
      onSave();
    } catch (error) {
      console.error('Error adding area:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add area. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Area</h1>
          <p className="text-muted-foreground">Create a new working area for expense tracking</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Area Details
          </CardTitle>
          <CardDescription>Enter the details of your working area</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area_name">Area Name *</Label>
              <Input
                id="area_name"
                type="text"
                {...register('area_name', { required: 'Area name is required' })}
                placeholder="e.g., Downtown Medical District"
              />
              {errors.area_name && (
                <p className="text-sm text-destructive">{errors.area_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="from_location">From *</Label>
                <Input
                  id="from_location"
                  type="text"
                  {...register('from_location', { required: 'From location is required' })}
                  placeholder="e.g., Main Office"
                />
                {errors.from_location && (
                  <p className="text-sm text-destructive">{errors.from_location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="to_location">To *</Label>
                <Input
                  id="to_location"
                  type="text"
                  {...register('to_location', { required: 'To location is required' })}
                  placeholder="e.g., Client Location"
                />
                {errors.to_location && (
                  <p className="text-sm text-destructive">{errors.to_location.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distance (Km) *</Label>
              <Input
                id="distance"
                type="number"
                step="0.1"
                min="0"
                {...register('distance', { 
                  required: 'Distance is required',
                  min: { value: 0, message: 'Distance must be positive' }
                })}
                placeholder="0.0"
              />
              {errors.distance && (
                <p className="text-sm text-destructive">{errors.distance.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Area
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AreaForm;