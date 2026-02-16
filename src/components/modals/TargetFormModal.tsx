import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/lib/notifications';
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

interface MR {
  id: string;
  name: string;
  email: string;
}

interface TargetFormData {
  target_value: number;
  target_month: string;
  target_type: 'mr' | 'doctor';
  doctor_id?: string;
  mr_id?: string;
}

interface TargetFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctors: Doctor[];
  mrs?: MR[];
  onSuccess: () => void;
}

const TargetFormModal = ({ open, onOpenChange, doctors, mrs, onSuccess }: TargetFormModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TargetFormData>({
    defaultValues: {
      target_month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
      target_type: profile?.role === 'admin' ? 'mr' : 'doctor',
    }
  });

  const selectedTargetType = watch('target_type');
  const selectedDoctorId = watch('doctor_id');
  const selectedMrId = watch('mr_id');

  const onSubmit = async (data: TargetFormData) => {
    try {
      setSubmitting(true);
      
      const targetData = {
        target_value: Number(data.target_value),
        target_month: data.target_month + '-01', // Convert YYYY-MM to YYYY-MM-01
        target_type: data.target_type,
        doctor_id: data.target_type === 'doctor' ? (data.doctor_id || null) : null,
        mr_id: data.target_type === 'mr' ? data.mr_id : profile?.id,
        created_by: profile?.id,
      };

      const { error } = await supabase
        .from('targets')
        .insert([targetData]);
        
      if (error) throw error;
      
      // Notify MR when admin assigns target
      if (profile?.role === 'admin' && data.target_type === 'mr' && data.mr_id) {
        const targetMonth = new Date(data.target_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        createNotification({
          userId: data.mr_id,
          title: 'New Target Assigned 🎯',
          message: `Admin assigned you a monthly target of ₹${Number(data.target_value).toLocaleString('en-IN')} for ${targetMonth}`,
          type: 'target',
          link: '/dashboard/targets'
        });
      }
      
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
            {profile?.role === 'admin' 
              ? 'Set monthly targets for MRs or doctor targets' 
              : 'Set sales targets for your assigned doctors'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {profile?.role === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="target_type">Target Type *</Label>
              <Select onValueChange={(value: 'mr' | 'doctor') => setValue('target_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mr">MR Monthly Target</SelectItem>
                  <SelectItem value="doctor">Doctor Target</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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

          {selectedTargetType === 'mr' && profile?.role === 'admin' && (
            <div className="space-y-2">
              <Label htmlFor="mr_id">Medical Representative *</Label>
              <Select onValueChange={(value) => setValue('mr_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select MR" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
                  {mrs?.map((mr) => (
                    <SelectItem key={mr.id} value={mr.id}>
                      {mr.name} ({mr.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mr_id && (
                <p className="text-sm text-destructive">Please select an MR</p>
              )}
            </div>
          )}

          {selectedTargetType === 'doctor' && (
            <div className="space-y-2">
              <Label htmlFor="doctor_id">Doctor (Optional)</Label>
              <Select onValueChange={(value) => setValue('doctor_id', value === 'general' ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor or general target" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
                  <SelectItem value="general">General Target (All Doctors)</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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