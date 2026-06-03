import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateReminder } from '@/hooks/useReminders';

interface Props {
  doctorId?: string;
  pharmacyId?: string;
  entityName: string;
  defaultTitle?: string;
  source?: 'next_call' | 'payment' | 'order_followup' | 'custom';
  link?: string;
  triggerLabel?: string;
  triggerSize?: 'sm' | 'default';
  triggerVariant?: 'default' | 'outline' | 'ghost' | 'secondary';
  onDone?: () => void;
}

const QUICK_DAYS = [1, 3, 7, 15, 30];

const NextCallPicker = ({
  doctorId, pharmacyId, entityName, defaultTitle, source = 'next_call', link,
  triggerLabel = 'Set next call', triggerSize = 'sm', triggerVariant = 'outline', onDone,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  const create = useCreateReminder();

  const today = new Date(); today.setHours(0,0,0,0);
  const max = addDays(today, 30);

  const pick = (days: number) => setDate(addDays(today, days));

  const save = async () => {
    if (!date) return;
    await create.mutateAsync({
      source,
      title: defaultTitle || `Next call: ${entityName}`,
      note: note || null,
      remind_date: format(date, 'yyyy-MM-dd'),
      entity_type: doctorId ? 'doctor' : pharmacyId ? 'pharmacy' : 'none',
      entity_id: doctorId || pharmacyId || null,
      link: link || null,
    });
    setOpen(false); setDate(undefined); setNote('');
    onDone?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant} className="gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Remind me about <b>{entityName}</b> in:</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_DAYS.map(d => (
                <Button key={d} size="sm" variant={date && Math.round((date.getTime()-today.getTime())/86400000)===d ? 'default' : 'outline'} onClick={() => pick(d)}>
                  {d === 1 ? 'Tomorrow' : `+${d}d`}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Or pick date (max 30 days)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('w-full justify-start mt-1.5', !date && 'text-muted-foreground')}>
                  <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate}
                  disabled={(d) => d < today || d > max}
                  initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="mt-1" placeholder="e.g. Follow up on Lubrikey order" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={!date || create.isPending}>Save reminder</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NextCallPicker;
