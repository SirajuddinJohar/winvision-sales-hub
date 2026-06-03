import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Bell, Cake, Heart, Phone, Map, IndianRupee, ShoppingCart, Check, X, Clock, ExternalLink, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useReminders, useUpdateReminderStatus, Reminder, ReminderSource } from '@/hooks/useReminders';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import ReminderForm from '@/components/reminders/ReminderForm';

const ICONS: Record<ReminderSource, any> = {
  birthday: Cake, anniversary: Heart, next_call: Phone, tour_plan: Map,
  payment: IndianRupee, order_followup: ShoppingCart, custom: Bell,
};

const Reminders = () => {
  const { isAdmin } = useRoleAccess();
  const [adminAll, setAdminAll] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const { data: reminders = [], isLoading } = useReminders({ adminViewAll: adminAll });
  const update = useUpdateReminderStatus();
  const navigate = useNavigate();

  const buckets = useMemo(() => {
    const today: Reminder[] = [], upcoming: Reminder[] = [], overdue: Reminder[] = [], done: Reminder[] = [];
    const todayStr = new Date().toISOString().slice(0,10);
    const in7 = new Date(); in7.setDate(in7.getDate()+7);
    for (const r of reminders) {
      if (r.status === 'done' || r.status === 'dismissed') { done.push(r); continue; }
      const d = parseISO(r.remind_date);
      if (r.remind_date === todayStr) today.push(r);
      else if (isPast(d) && !isToday(d)) overdue.push(r);
      else if (d <= in7) upcoming.push(r);
      else upcoming.push(r);
    }
    return { today, upcoming, overdue, done };
  }, [reminders]);

  const Row = ({ r }: { r: Reminder }) => {
    const Icon = ICONS[r.source] || Bell;
    const overdue = !isToday(parseISO(r.remind_date)) && isPast(parseISO(r.remind_date));
    return (
      <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
        <div className={`p-2 rounded-lg ${overdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${overdue ? 'text-destructive' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{r.title}</h4>
            <Badge variant="outline" className="text-[10px]">{r.source.replace('_', ' ')}</Badge>
            {r.is_auto && <Badge variant="secondary" className="text-[10px]">auto</Badge>}
          </div>
          {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
          <p className="text-[11px] text-muted-foreground mt-1">
            {format(parseISO(r.remind_date), 'PP')} {r.remind_time?.slice(0,5)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {r.link && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(r.link!)}><ExternalLink className="h-3.5 w-3.5" /></Button>
          )}
          {r.status === 'pending' && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => update.mutate({ id: r.id, status: 'done', device_notification_id: r.device_notification_id })} title="Mark done"><Check className="h-3.5 w-3.5" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" title="Snooze"><Clock className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: 'snoozed', snoozeDays: 1, device_notification_id: r.device_notification_id })}>1 day</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: 'snoozed', snoozeDays: 3, device_notification_id: r.device_notification_id })}>3 days</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: 'snoozed', snoozeDays: 7, device_notification_id: r.device_notification_id })}>7 days</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => update.mutate({ id: r.id, status: 'dismissed', device_notification_id: r.device_notification_id })} title="Dismiss"><X className="h-3.5 w-3.5" /></Button>
            </>
          )}
        </div>
      </div>
    );
  };

  const List = ({ items, empty }: { items: Reminder[]; empty: string }) => {
    if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-16" />)}</div>;
    if (!items.length) return <p className="text-sm text-muted-foreground text-center py-8">{empty}</p>;
    return <div className="space-y-2">{items.map(r => <Row key={r.id} r={r} />)}</div>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Reminders</h1>
          <p className="text-sm text-muted-foreground">Birthdays, follow-ups & next calls</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch id="all" checked={adminAll} onCheckedChange={setAdminAll} />
              <Label htmlFor="all" className="text-xs">All users</Label>
            </div>
          )}
          <Button size="sm" onClick={() => setOpenForm(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <Tabs defaultValue="today">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="today">Today {buckets.today.length>0 && <Badge variant="default" className="ml-1.5 h-4 text-[10px]">{buckets.today.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming {buckets.upcoming.length>0 && <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{buckets.upcoming.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="overdue">Overdue {buckets.overdue.length>0 && <Badge variant="destructive" className="ml-1.5 h-4 text-[10px]">{buckets.overdue.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="done">Done</TabsTrigger>
            </TabsList>
            <TabsContent value="today" className="mt-3"><List items={buckets.today} empty="All clear for today 🎉" /></TabsContent>
            <TabsContent value="upcoming" className="mt-3"><List items={buckets.upcoming} empty="No upcoming reminders" /></TabsContent>
            <TabsContent value="overdue" className="mt-3"><List items={buckets.overdue} empty="Nothing overdue" /></TabsContent>
            <TabsContent value="done" className="mt-3"><List items={buckets.done} empty="No completed reminders" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ReminderForm open={openForm} onOpenChange={setOpenForm} />
    </div>
  );
};

export default Reminders;
