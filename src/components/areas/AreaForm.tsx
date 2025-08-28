import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';

interface AreaFormData {
  area_name: string;
  from_location: string;
  to_location: string;
  distance: number;
}

interface AreaFormProps {
  onBack: () => void;
}

const AreaForm = ({ onBack }: AreaFormProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AreaFormData>();

  const onSubmit = async (data: AreaFormData) => {
    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('areas')
        .insert([{
          area_name: data.area_name,
          from_location: data.from_location,
          to_location: data.to_location,
          distance: Number(data.distance)
        }]);
        
      if (error) throw error;
      
      toast({ 
        title: "Area Added Successfully ✅",
        description: "The area has been saved to the database"
      });
      
      reset();
      onBack();
    } catch (error) {
      console.error('Error adding area:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add area", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expenses
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Area</h1>
          <p className="text-muted-foreground">Add a new working area with travel details</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Area Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="area_name">Area Name *</Label>
              <Input
                id="area_name"
                type="text"
                {...register('area_name', { required: 'Area name is required' })}
                placeholder="e.g., Central Business District"
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
                  placeholder="e.g., Client Site"
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
              <Button type="button" variant="outline" onClick={onBack}>
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