import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { scheduleReminder, cancelReminder } from '@/lib/deviceNotifications';
import { toast } from 'sonner';

export type ReminderSource = 'birthday' | 'anniversary' | 'next_call' | 'tour_plan' | 'payment' | 'order_followup' | 'custom';
export type ReminderStatus = 'pending' | 'done' | 'dismissed' | 'snoozed';
export type ReminderEntityType = 'doctor' | 'pharmacy' | 'order' | 'none';

export interface Reminder {
  id: string;
  user_id: string;
  created_by: string;
  source: ReminderSource;
  is_auto: boolean;
  title: string;
  note: string | null;
  remind_date: string;
  remind_time: string;
  entity_type: ReminderEntityType;
  entity_id: string | null;
  link: string | null;
  status: ReminderStatus;
  snoozed_until: string | null;
  completed_at: string | null;
  completed_by: string | null;
  device_notification_id: number | null;
  created_at: string;
  updated_at: string;
}

export const useReminders = (filter?: { adminViewAll?: boolean }) => {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return useQuery({
    queryKey: ['reminders', user?.id, filter?.adminViewAll && isAdmin ? 'all' : 'own'],
    queryFn: async () => {
      let q = supabase.from('reminders').select('*').order('remind_date').order('remind_time');
      if (!(filter?.adminViewAll && isAdmin)) {
        q = q.eq('user_id', user!.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Reminder[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
};

export const useCreateReminder = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Reminder> & { title: string; remind_date: string }) => {
      const payload = {
        user_id: input.user_id || user!.id,
        created_by: user!.id,
        source: input.source || 'custom',
        is_auto: false,
        title: input.title,
        note: input.note || null,
        remind_date: input.remind_date,
        remind_time: input.remind_time || '09:00',
        entity_type: input.entity_type || 'none',
        entity_id: input.entity_id || null,
        link: input.link || null,
      };
      const { data, error } = await supabase.from('reminders').insert(payload).select().single();
      if (error) throw error;
      // If admin assigned to a different user, drop an in-app notification so their bell pings immediately.
      if (payload.user_id !== user!.id) {
        await supabase.from('notifications').insert({
          user_id: payload.user_id,
          title: `New reminder: ${payload.title}`,
          message: payload.note || `Scheduled for ${payload.remind_date} ${payload.remind_time}`,
          type: 'info',
          link: payload.link,
        });
      }
      await scheduleReminder(data as any);
      return data as Reminder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder set');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to save reminder'),
  });
};

export const useUpdateReminderStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, snoozeDays, device_notification_id }: { id: string; status: ReminderStatus; snoozeDays?: number; device_notification_id?: number | null }) => {
      const patch: any = { status };
      if (status === 'done') {
        patch.completed_at = new Date().toISOString();
        patch.completed_by = user!.id;
      }
      if (status === 'snoozed' && snoozeDays) {
        const d = new Date();
        d.setDate(d.getDate() + snoozeDays);
        patch.snoozed_until = d.toISOString().slice(0, 10);
        patch.remind_date = patch.snoozed_until;
      }
      const { data, error } = await supabase.from('reminders').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (device_notification_id) await cancelReminder(device_notification_id);
      if (status === 'snoozed') await scheduleReminder(data as any);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reminders'] }),
  });
};
