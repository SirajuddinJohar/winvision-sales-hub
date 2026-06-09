import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCreateReminder, ReminderSource } from '@/hooks/useReminders';
import { supabase } from '@/integrations/supabase/client';
import { useRoleAccess } from '@/hooks/useRoleAccess';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ReminderForm = ({ open, onOpenChange }: Props) => {
  const { isAdmin } = useRoleAccess();
  const [source, setSource] = useState<ReminderSource>('custom');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [entityType, setEntityType] = useState<'doctor' | 'pharmacy' | 'none'>('none');
  const [entityId, setEntityId] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [doctors, setDoctors] = useState<{id: string; name: string}[]>([]);
  const [pharmacies, setPharmacies] = useState<{id: string; name: string}[]>([]);
  const [mrs, setMrs] = useState<{id: string; name: string}[]>([]);

  const create = useCreateReminder();

  useEffect(() => {
    if (!open) return;
    supabase.from('doctors').select('id,name').order('name').limit(500).then(({data}) => setDoctors(data || []));
    supabase.from('pharmacies').select('id,name').order('name').limit(500).then(({data}) => setPharmacies(data || []));
    if (isAdmin) {
      supabase.from('user_roles').select('user_id, users:user_id(id,name)').eq('role', 'mr').then(({data}) => {
        const list = (data || []).map((r: any) => ({ id: r.users?.id, name: r.users?.name })).filter(u => u.id);
        setMrs(list);
      });
    }
  }, [open, isAdmin]);

  const today = new Date(); today.setHours(0,0,0,0);
  const max = source === 'next_call' ? new Date(today.getTime() + 30*86400000) : new Date(today.getTime() + 365*86400000);

  const reset = () => {
    setSource('custom'); setTitle(''); setNote(''); setDate(undefined); setTime('09:00'); setEntityType('none'); setEntityId(''); setAssigneeId('');
  };

  const save = async () => {
    if (!title || !date) return;
    const link = entityType === 'doctor' && entityId ? `/dashboard/doctors/${entityId}`
      : entityType === 'pharmacy' && entityId ? `/dashboard/pharmacies` : null;
    await create.mutateAsync({
      source, title, note: note || null,
      remind_date: format(date, 'yyyy-MM-dd'), remind_time: time,
      entity_type: entityType, entity_id: entityId || null, link,
      user_id: isAdmin && assigneeId ? assigneeId : undefined,
    });
    reset(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Reminder</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={source} onValueChange={(v: ReminderSource) => setSource(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="next_call">Next call (max 30 days)</SelectItem>
                <SelectItem value="payment">Payment follow-up</SelectItem>
                <SelectItem value="order_followup">Order follow-up</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Visit Dr. Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Target</Label>
              <Select value={entityType} onValueChange={(v: any) => { setEntityType(v); setEntityId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {entityType !== 'none' && (
              <div>
                <Label>{entityType === 'doctor' ? 'Doctor' : 'Pharmacy'}</Label>
                <Select value={entityId} onValueChange={setEntityId}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {(entityType === 'doctor' ? doctors : pharmacies).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start', !date && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {date ? format(date, 'PP') : 'Pick'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < today || d > max} initialFocus className={cn('p-3 pointer-events-auto')} /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!title || !date || create.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderForm;
