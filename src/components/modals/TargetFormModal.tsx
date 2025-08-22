import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
}

interface TargetFormData {
  target_value: number;
  target_month: string;
  doctor_id?: string;
}

interface TargetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: Doctor[];
  onSuccess: () => void;
}

const TargetFormModal = ({ open, onOpenChange, doctors, onSuccess }: TargetFormModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TargetFormData>({
    defaultValues: {
      target_month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    }
  });

  const selectedDoctorId = watch('doctor_id');

  const onSubmit = async (data: TargetFormData) => {
    try {
      setSubmitting(true);
      
      const targetData = {
        target_value: Number(data.target_value),
        target_month: data.target_month + '-01', // Convert YYYY-MM to YYYY-MM-01
        doctor_id: data.doctor_id || null,
        mr_id: profile?.id,
        achieved_value: 0,
      };

      const { error } = await supabase
        .from('targets')
        .insert([targetData]);
        
      if (error) throw error;
      
      toast({ title: "Target set successfully" });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error setting target:', error);
      toast({ 
        title: "Error", 
        description: "Failed to set target", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set New Target</DialogTitle>
          <DialogDescription>
            Set a sales target for yourself or for a specific doctor
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target_month">Target Month *</Label>
            <Input
              id="target_month"
              type="month"
              {...register('target_month', { required: 'Target month is required' })}
            />
            {errors.target_month && (
              <p className="text-sm text-destructive">{errors.target_month.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_value">Target Amount (₹) *</Label>
            <Input
              id="target_value"
              type="number"
              step="0.01"
              min="0"
              {...register('target_value', { 
                required: 'Target amount is required',
                min: { value: 0, message: 'Target amount must be positive' }
              })}
              placeholder="100000.00"
            />
            {errors.target_value && (
              <p className="text-sm text-destructive">{errors.target_value.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctor_id">Doctor (Optional)</Label>
            <Select onValueChange={(value) => setValue('doctor_id', value === 'general' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor or general target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Target (All Doctors)</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Target
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TargetFormModal;