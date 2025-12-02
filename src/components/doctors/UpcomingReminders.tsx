import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Heart, Gift } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  birthday?: string;
  anniversary?: string;
}

interface Reminder {
  doctor: Doctor;
  type: 'birthday' | 'anniversary';
  date: string;
  daysUntil: number;
}

const UpcomingReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, name, specialty, birthday, anniversary');

      if (error) throw error;

      const today = new Date();
      const upcomingReminders: Reminder[] = [];

      (data || []).forEach((doctor) => {
        if (doctor.birthday) {
          const birthday = new Date(doctor.birthday);
          birthday.setFullYear(today.getFullYear());
          const diffTime = birthday.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0 && daysUntil <= 30) {
            upcomingReminders.push({
              doctor,
              type: 'birthday',
              date: doctor.birthday,
              daysUntil
            });
          }
        }

        if (doctor.anniversary) {
          const anniversary = new Date(doctor.anniversary);
          anniversary.setFullYear(today.getFullYear());
          const diffTime = anniversary.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0 && daysUntil <= 30) {
            upcomingReminders.push({
              doctor,
              type: 'anniversary',
              date: doctor.anniversary,
              daysUntil
            });
          }
        }
      });

      // Sort by days until event
      upcomingReminders.sort((a, b) => a.daysUntil - b.daysUntil);
      setReminders(upcomingReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Reminders
          {reminders.length > 0 && (
            <Badge variant="default" className="ml-auto">
              {reminders.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming birthdays or anniversaries in the next 30 days
          </p>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder, idx) => (
              <div
                key={`${reminder.doctor.id}-${reminder.type}-${idx}`}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${reminder.type === 'birthday' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                    {reminder.type === 'birthday' ? (
                      <Gift className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Heart className="h-4 w-4 text-pink-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{reminder.doctor.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {reminder.type === 'birthday' ? 'Birthday' : 'Anniversary'} • {reminder.doctor.specialty}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={reminder.daysUntil <= 7 ? 'default' : 'secondary'}>
                    {reminder.daysUntil === 0 ? 'Today!' : 
                     reminder.daysUntil === 1 ? 'Tomorrow' : 
                     `${reminder.daysUntil} days`}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(reminder.date).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingReminders;