import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QrCode, CheckCircle2, CameraOff, X } from 'lucide-react';

interface Confirmation {
  id: string;
  asm_id: string;
  scanned_at: string;
  asm_name?: string;
}

const todayISO = () => new Date().toISOString().split('T')[0];

interface Props {
  onConfirmed?: () => void;
}

const JointWorkScanner = ({ onConfirmed }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadConfirmation = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('joint_work_confirmations')
      .select('id, asm_id, scanned_at')
      .eq('mr_id', user.id)
      .eq('work_date', todayISO())
      .order('scanned_at', { ascending: false })
      .maybeSingle();

    if (data) {
      const { data: asm } = await supabase.from('users').select('name').eq('id', data.asm_id).maybeSingle();
      setConfirmation({ ...(data as Confirmation), asm_name: asm?.name || 'Manager' });
    } else {
      setConfirmation(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConfirmation();
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stopScan = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  const handleCode = async (raw: string) => {
    if (!user || busyRef.current) return;
    busyRef.current = true;

    let code = raw.trim();
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.t === 'joint_work' && parsed.code) code = parsed.code;
    } catch {
      /* plain code */
    }

    const { data: session } = await supabase
      .from('joint_work_sessions')
      .select('id, asm_id, work_date, expires_at')
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!session) {
      toast({ title: 'Invalid QR', description: 'This code is not valid or has expired.', variant: 'destructive' });
      busyRef.current = false;
      return;
    }

    const { error } = await supabase.from('joint_work_confirmations').insert({
      session_id: session.id,
      mr_id: user.id,
      asm_id: session.asm_id,
      work_date: session.work_date,
      scanned_at: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: 'Could not confirm',
        description: error.message.includes('duplicate') ? 'Already confirmed for today.' : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Joint work confirmed', description: 'You are marked as working with your manager today.' });
      onConfirmed?.();
    }

    stopScan();
    await loadConfirmation();
    busyRef.current = false;
  };

  const startScan = async () => {
    setScanning(true);
    busyRef.current = false;
    try {
      const reader = new BrowserMultiFormatReader();
      // wait for the video element to mount
      await new Promise((r) => setTimeout(r, 50));
      if (!videoRef.current) throw new Error('No video element');
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) handleCode(result.getText());
      });
    } catch (e: any) {
      setScanning(false);
      toast({
        title: 'Camera unavailable',
        description: e?.message || 'Allow camera access to scan the QR code.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-sm">Joint Work Verification</p>
            <p className="text-[11px] text-muted-foreground">Scan your manager's QR to confirm you are working together</p>
          </div>
        </div>
        {confirmation ? null : scanning ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={stopScan}>
            <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
          </Button>
        ) : (
          <Button size="sm" className="h-8 text-xs" onClick={startScan}>
            <QrCode className="h-3.5 w-3.5 mr-1.5" /> Scan QR
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : confirmation ? (
        <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-2.5 py-2">
          <span className="text-xs flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Working with <span className="font-medium">{confirmation.asm_name}</span>
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {new Date(confirmation.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Badge>
        </div>
      ) : scanning ? (
        <div className="rounded-lg overflow-hidden border bg-black">
          <video ref={videoRef} className="w-full max-h-72 object-cover" muted playsInline />
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <CameraOff className="h-3.5 w-3.5" /> Not verified yet for today.
        </p>
      )}
    </Card>
  );
};

export default JointWorkScanner;
