import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

const isNative = () => Capacitor.isNativePlatform();

const idFromUuid = (uuid: string): number => {
  // Stable positive int31 from uuid
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (h * 31 + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483647;
};

export interface ReminderRow {
  id: string;
  title: string;
  note: string | null;
  remind_date: string;
  remind_time: string;
  link: string | null;
  status: string;
}

export const ensureNotificationPermission = async () => {
  if (!isNative()) return false;
  try {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === 'granted') return true;
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted';
  } catch (e) {
    console.error('notification permission error', e);
    return false;
  }
};

export const scheduleReminder = async (r: ReminderRow) => {
  if (!isNative()) return null;
  const when = new Date(`${r.remind_date}T${r.remind_time || '09:00'}`);
  if (when.getTime() < Date.now()) return null;
  const nid = idFromUuid(r.id);
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: nid,
        title: r.title,
        body: r.note || 'Reminder',
        schedule: { at: when },
        extra: { reminderId: r.id, link: r.link },
      }],
    });
    await supabase.from('reminders').update({ device_notification_id: nid }).eq('id', r.id);
    return nid;
  } catch (e) {
    console.error('schedule failed', e);
    return null;
  }
};

export const cancelReminder = async (id: number | null | undefined) => {
  if (!isNative() || !id) return;
  try { await LocalNotifications.cancel({ notifications: [{ id }] }); } catch (e) { console.error(e); }
};

export const rescheduleAllReminders = async (userId: string) => {
  if (!isNative()) return;
  await ensureNotificationPermission();
  const { data } = await supabase
    .from('reminders')
    .select('id,title,note,remind_date,remind_time,link,status')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('remind_date', new Date().toISOString().slice(0, 10));
  if (!data) return;
  for (const r of data) {
    await scheduleReminder(r as ReminderRow);
  }
};

export const initNotificationTapHandler = (navigate: (path: string) => void) => {
  if (!isNative()) return;
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const link = action.notification?.extra?.link;
    if (link) navigate(link);
  }).catch(() => {});
};
