import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DistributorFormData {
  name: string;
  contact_person: string;
  phone: string;
  city: string;
  address: string;
}

interface DistributorFormProps {
  distributor?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const DistributorForm = ({ distributor, onSuccess, onCancel }: DistributorFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<DistributorFormData>({
    defaultValues: {
      name: distributor?.name || '',
      contact_person: distributor?.contact_person || '',
      phone: distributor?.phone || '',
      city: distributor?.city || '',
      address: distributor?.address || '',
    }
  });

  const onSubmit = async (data: DistributorFormData) => {
    try {
      setLoading(true);
      
      const distributorData = {
        ...data,
        created_by: profile?.id,
      };

      if (distributor) {
        const { error } = await supabase
          .from('Distributors')
          .update(distributorData)
          .eq('id', distributor.id);
          
        if (error) throw error;
        toast({ title: "Distributor updated successfully" });
      } else {
        const { error } = await supabase
          .from('Distributors')
          .insert([distributorData]);
          
        if (error) throw error;
        toast({ title: "Distributor added successfully" });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving distributor:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save distributor", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{distributor ? 'Edit Distributor' : 'Add New Distributor'}</CardTitle>
        <CardDescription>
          {distributor ? 'Update distributor information' : 'Enter distributor details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Distributor Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Distributor name is required' })}
                placeholder="Enter distributor name"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person *</Label>
              <Input
                id="contact_person"
                {...register('contact_person', { required: 'Contact person is required' })}
                placeholder="Contact person name"
              />
              {errors.contact_person && (
                <p className="text-sm text-destructive">{errors.contact_person.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Contact Number *</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone', { 
                  required: 'Contact number is required',
                  pattern: {
                    value: /^\d{10}$/,
                    message: 'Please enter a valid 10-digit phone number'
                  }
                })}
                placeholder="10-digit phone number"
                maxLength={10}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                {...register('city', { required: 'City is required' })}
                placeholder="Enter city name"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                {...register('address', { required: 'Address is required' })}
                placeholder="Enter complete address"
                rows={3}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {distributor ? 'Update' : 'Add'} Distributor
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

export default DistributorForm;