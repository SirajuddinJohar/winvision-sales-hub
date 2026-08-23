import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QrCode, RefreshCw, CheckCircle2, Users } from 'lucide-react';

interface Session {
  id: string;
  code: string;
  work_date: string;
  expires_at: string;
}

interface Scan {
  id: string;
  mr_id: string;
  scanned_at: string;
  mr_name?: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const JointWorkQR = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('joint_work_sessions')
      .select('id, code, work_date, expires_at')
      .eq('asm_id', user.id)
      .eq('work_date', todayISO())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .maybeSingle();
    setSession(data as Session | null);
    setLoading(false);
  };

  const loadScans = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('joint_work_confirmations')
      .select('id, mr_id, scanned_at')
      .eq('asm_id', user.id)
      .eq('work_date', todayISO())
      .order('scanned_at', { ascending: false });

    const rows = (data || []) as Scan[];
    if (rows.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', rows.map((r) => r.mr_id));
      const byId = new Map((users || []).map((u: any) => [u.id, u.name]));
      setScans(rows.map((r) => ({ ...r, mr_name: byId.get(r.mr_id) || 'MR' })));
    } else {
      setScans([]);
    }
  };

  useEffect(() => {
    loadSession();
    loadScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('joint-work-scans')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'joint_work_confirmations', filter: `asm_id=eq.${user.id}` },
        () => loadScans()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const generate = async () => {
    if (!user) return;
    const code = crypto.randomUUID().replace(/-/g, '');
    const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('joint_work_sessions')
      .insert({ asm_id: user.id, code, work_date: todayISO(), expires_at: expires })
      .select('id, code, work_date, expires_at')
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Could not generate QR code', variant: 'destructive' });
      return;
    }
    setSession(data as Session);
    toast({ title: 'QR Ready', description: 'Ask your MR to scan this code' });
  };

  const qrValue = session ? JSON.stringify({ t: 'joint_work', code: session.code }) : '';

  return (
    <Card className="p-3 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <div>
            <p className="font-semibold text-sm md:text-base">Joint Work QR</p>
            <p className="text-[11px] md:text-xs text-muted-foreground">
              MRs scan this to mark that they are working with you today
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={session ? generate : generate} className="h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          {session ? 'New Code' : 'Generate'}
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : session ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="bg-white p-3 rounded-lg border">
            <QRCodeCanvas value={qrValue} size={190} includeMargin={false} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Valid till {new Date(session.expires_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No active code for today. Tap Generate to show your QR.
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Users className="h-3.5 w-3.5" /> Working with you today ({scans.length})
        </div>
        {scans.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No MR has scanned yet.</p>
        ) : (
          scans.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border px-2.5 py-1.5">
              <span className="text-xs flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                {s.mr_name}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {new Date(s.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default JointWorkQR;
