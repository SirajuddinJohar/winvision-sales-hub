import { supabase } from '@/integrations/supabase/client';

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  type: 'tour_plan' | 'expense' | 'target' | 'assignment' | 'order' | 'info';
  link?: string;
}

export const createNotification = async ({ userId, title, message, type, link }: NotificationParams) => {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link,
    });

  if (error) {
    console.error('Error creating notification:', error);
  }
};

// Notify all admins
export const notifyAdmins = async (title: string, message: string, type: NotificationParams['type'], link?: string) => {
  const { data: adminRoles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (error || !adminRoles) {
    console.error('Error fetching admins:', error);
    return;
  }

  const notifications = adminRoles.map(role => ({
    user_id: role.user_id,
    title,
    message,
    type,
    link,
  }));

  if (notifications.length > 0) {
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating admin notifications:', insertError);
    }
  }
};
