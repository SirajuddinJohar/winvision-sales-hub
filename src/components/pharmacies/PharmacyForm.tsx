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

interface PharmacyFormData {
  name: string;
  contact_person: string;
  dl_number_part1: string;
  dl_number_part2: string;
  phone: string;
  city: string;
  address: string;
  gstin?: string;
}

interface PharmacyFormProps {
  pharmacy?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PharmacyForm = ({ pharmacy, onSuccess, onCancel }: PharmacyFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<PharmacyFormData>({
    defaultValues: {
      name: pharmacy?.name || '',
      contact_person: pharmacy?.contact_person || '',
      dl_number_part1: pharmacy?.dl_number_part1 || '',
      dl_number_part2: pharmacy?.dl_number_part2 || '',
      phone: pharmacy?.phone || '',
      city: pharmacy?.city || '',
      address: pharmacy?.address || '',
      gstin: pharmacy?.gstin || '',
    }
  });

  const onSubmit = async (data: PharmacyFormData) => {
    try {
      setLoading(true);
      
      const pharmacyData = {
        ...data,
        created_by: profile?.id,
      };

      if (pharmacy) {
        const { error } = await supabase
          .from('pharmacies')
          .update(pharmacyData)
          .eq('id', pharmacy.id);
          
        if (error) throw error;
        toast({ title: "Pharmacy updated successfully" });
      } else {
        const { error } = await supabase
          .from('pharmacies')
          .insert([pharmacyData]);
          
        if (error) throw error;
        toast({ title: "Pharmacy added successfully" });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving pharmacy:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save pharmacy", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{pharmacy ? 'Edit Pharmacy' : 'Add New Pharmacy'}</CardTitle>
        <CardDescription>
          {pharmacy ? 'Update pharmacy information' : 'Enter pharmacy details'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pharmacy Name *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Pharmacy name is required' })}
                placeholder="Enter pharmacy name"
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
              <Label htmlFor="dl_number_part1">DL Number - Part 1 *</Label>
              <Input
                id="dl_number_part1"
                {...register('dl_number_part1', { required: 'DL Number Part 1 is required' })}
                placeholder="e.g., MH-AKO-8925"
              />
              {errors.dl_number_part1 && (
                <p className="text-sm text-destructive">{errors.dl_number_part1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dl_number_part2">DL Number - Part 2 *</Label>
              <Input
                id="dl_number_part2"
                type="number"
                {...register('dl_number_part2', { 
                  required: 'DL Number Part 2 is required',
                  pattern: {
                    value: /^\d+$/,
                    message: 'Only numeric values allowed'
                  }
                })}
                placeholder="Enter numeric part"
              />
              {errors.dl_number_part2 && (
                <p className="text-sm text-destructive">{errors.dl_number_part2.message}</p>
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="gstin">GSTIN (Optional)</Label>
              <Input
                id="gstin"
                {...register('gstin')}
                placeholder="Enter GSTIN if available"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pharmacy ? 'Update' : 'Add'} Pharmacy
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

export default PharmacyForm;