import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  IndianRupee, Plus, Pencil, Trash2, Check, X, Clock, CheckCircle2, Loader2, Wallet, Ban, Eye,
} from 'lucide-react';

interface MRUser { id: string; name: string; email: string }
interface DoctorOpt { id: string; name: string; assigned_mr_id: string | null; incentive_percentage: number | null }
interface OrderOpt { id: string; order_date: string; total_amount: number | null; doctor_id: string | null }

interface IncentiveRow {
  id: string;
  doctor_id: string;
  order_id: string;
  order_amount: number;
  incentive_percentage: number;
  incentive_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  doctor?: { name: string; assigned_mr_id: string | null } | null;
  order?: { order_date: string; mr_id: string | null } | null;
}

interface AdvanceRow {
  id: string;
  doctor_id: string;
  amount: number;
  given_date: string;
  notes: string | null;
  status: string;
  settled_at: string | null;
  created_at: string;
  doctor?: { name: string } | null;
}

const AdvanceStatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    active: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    settled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-muted text-muted-foreground',
  };
  return <Badge className={`${map[status] || ''} text-[10px] md:text-xs capitalize`}>{status}</Badge>;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <Badge className={`${map[status] || ''} text-[10px] md:text-xs capitalize`}>{status}</Badge>;
};

const Incentives = () => {
  const { profile } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<IncentiveRow[]>([]);
  const [mrs, setMrs] = useState<MRUser[]>([]);
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);
  const [orders, setOrders] = useState<OrderOpt[]>([]);

  const [selectedMr, setSelectedMr] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    doctor_id: '',
    order_id: '',
    order_amount: '',
    incentive_percentage: '30',
    incentive_amount: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Advance incentives state
  const [advances, setAdvances] = useState<AdvanceRow[]>([]);
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    doctor_id: '',
    amount: '',
    given_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [detailAdvance, setDetailAdvance] = useState<AdvanceRow | null>(null);

  useEffect(() => {
    fetchAll();
  }, [profile?.id, isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Incentives with related doctor + order
      const { data: incData, error: incErr } = await supabase
        .from('doctor_incentives')
        .select(`
          id, doctor_id, order_id, order_amount, incentive_percentage,
          incentive_amount, status, notes, created_at, paid_at,
          doctors:doctor_id ( name, assigned_mr_id ),
          orders:order_id ( order_date, mr_id )
        `)
        .order('created_at', { ascending: false });
      if (incErr) throw incErr;
      const mapped = (incData || []).map((r: any) => ({
        ...r,
        doctor: r.doctors,
        order: r.orders,
      })) as IncentiveRow[];
      setRows(mapped);

      // Doctors (RLS scopes for MR)
      const { data: docs } = await supabase
        .from('doctors')
        .select('id, name, assigned_mr_id, incentive_percentage')
        .order('name');
      setDoctors(docs || []);

      // Orders (recent for selection)
      const { data: ords } = await supabase
        .from('orders')
        .select('id, order_date, total_amount, doctor_id')
        .not('doctor_id', 'is', null)
        .order('order_date', { ascending: false })
        .limit(500);
      setOrders(ords || []);

      // Advance incentives with doctor names
      const { data: advData, error: advErr } = await supabase
        .from('doctor_advance_incentives')
        .select('id, doctor_id, amount, given_date, notes, status, settled_at, created_at, doctors:doctor_id ( name )')
        .order('created_at', { ascending: false });
      if (advErr) throw advErr;
      setAdvances((advData || []).map((a: any) => ({ ...a, doctor: a.doctors })) as AdvanceRow[]);

      // MR list (admin only)
      if (isAdmin) {
        const { data: u } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('role', 'mr')
          .order('name');
        setMrs((u as any) || []);
      }
    } catch (e: any) {
      console.error('Incentives fetch error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to load incentives', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (isAdmin && selectedMr !== 'all') {
        const mrId = r.order?.mr_id || r.doctor?.assigned_mr_id;
        if (mrId !== selectedMr) return false;
      }
      return true;
    });
  }, [rows, statusFilter, selectedMr, isAdmin]);

  const summary = useMemo(() => {
    const s = { total: 0, pending: 0, approved: 0, paid: 0, rejected: 0, count: filtered.length };
    filtered.forEach((r) => {
      s.total += Number(r.incentive_amount || 0);
      if (r.status === 'pending') s.pending += Number(r.incentive_amount || 0);
      if (r.status === 'approved') s.approved += Number(r.incentive_amount || 0);
      if (r.status === 'paid') s.paid += Number(r.incentive_amount || 0);
      if (r.status === 'rejected') s.rejected += Number(r.incentive_amount || 0);
    });
    return s;
  }, [filtered]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ doctor_id: '', order_id: '', order_amount: '', incentive_percentage: '30', incentive_amount: '', notes: '' });
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (r: IncentiveRow) => {
    setEditingId(r.id);
    setForm({
      doctor_id: r.doctor_id,
      order_id: r.order_id,
      order_amount: String(r.order_amount),
      incentive_percentage: String(r.incentive_percentage),
      incentive_amount: String(r.incentive_amount),
      notes: r.notes || '',
    });
    setDialogOpen(true);
  };

  // Auto-calc incentive when amount/percentage change
  useEffect(() => {
    const amt = parseFloat(form.order_amount);
    const pct = parseFloat(form.incentive_percentage);
    if (!isNaN(amt) && !isNaN(pct)) {
      setForm((f) => ({ ...f, incentive_amount: ((amt * pct) / 100).toFixed(2) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.order_amount, form.incentive_percentage]);

  const handleDoctorChange = (docId: string) => {
    const d = doctors.find((x) => x.id === docId);
    setForm((f) => ({
      ...f,
      doctor_id: docId,
      incentive_percentage: d?.incentive_percentage ? String(d.incentive_percentage) : f.incentive_percentage,
      order_id: '',
    }));
  };

  const handleOrderChange = (orderId: string) => {
    const o = orders.find((x) => x.id === orderId);
    setForm((f) => ({
      ...f,
      order_id: orderId,
      order_amount: o?.total_amount != null ? String(o.total_amount) : f.order_amount,
    }));
  };

  const orderOptionsForDoctor = useMemo(
    () => orders.filter((o) => !form.doctor_id || o.doctor_id === form.doctor_id),
    [orders, form.doctor_id]
  );

  const handleSave = async () => {
    if (!form.doctor_id || !form.order_id || !form.order_amount || !form.incentive_amount) {
      toast({ title: 'Missing fields', description: 'Doctor, order, amount and incentive are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        doctor_id: form.doctor_id,
        order_id: form.order_id,
        order_amount: Number(form.order_amount),
        incentive_percentage: Number(form.incentive_percentage),
        incentive_amount: Number(form.incentive_amount),
        notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('doctor_incentives').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Incentive updated' });
      } else {
        const { error } = await supabase.from('doctor_incentives').insert({ ...payload, status: 'pending' });
        if (error) throw error;
        toast({ title: 'Incentive created' });
      }
      setDialogOpen(false);
      resetForm();
      fetchAll();
    } catch (e: any) {
      console.error('Save incentive error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('doctor_incentives').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Incentive deleted' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
    }
  };

  const handleStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const update: any = { status };
      if (status === 'paid') {
        update.paid_at = new Date().toISOString();
        update.paid_by = profile?.id;
      }
      const { error } = await supabase.from('doctor_incentives').update(update).eq('id', id);
      if (error) throw error;
      toast({ title: `Marked as ${status}` });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Status update failed', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const advanceRecovered = (a: AdvanceRow) =>
    rows
      .filter((r) => r.doctor_id === a.doctor_id && (r.status === 'approved' || r.status === 'paid') && new Date(r.created_at) >= new Date(a.created_at))
      .reduce((s, r) => s + Number(r.incentive_amount || 0), 0);

  const openAdvanceCreate = () => {
    setAdvanceForm({ doctor_id: '', amount: '', given_date: new Date().toISOString().split('T')[0], notes: '' });
    setAdvanceDialogOpen(true);
  };

  const handleSaveAdvance = async () => {
    if (!advanceForm.doctor_id || !advanceForm.amount || Number(advanceForm.amount) <= 0) {
      toast({ title: 'Missing fields', description: 'Doctor and a positive amount are required', variant: 'destructive' });
      return;
    }
    setSavingAdvance(true);
    try {
      const { error } = await supabase.from('doctor_advance_incentives').insert({
        doctor_id: advanceForm.doctor_id,
        amount: Number(advanceForm.amount),
        given_date: advanceForm.given_date || new Date().toISOString().split('T')[0],
        notes: advanceForm.notes || null,
        created_by: profile?.id,
        status: 'active',
      });
      if (error) throw error;
      toast({ title: 'Advance recorded', description: "Recovery starts as this doctor's incentives are approved." });
      setAdvanceDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save advance', variant: 'destructive' });
    } finally {
      setSavingAdvance(false);
    }
  };

  const handleAdvanceStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('doctor_advance_incentives').update({
        status,
        settled_at: status === 'settled' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
      toast({ title: `Advance marked ${status}` });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Update failed', variant: 'destructive' });
    }
  };

  const handleDeleteAdvance = async (id: string) => {
    try {
      const { error } = await supabase.from('doctor_advance_incentives').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Advance deleted' });
      fetchAll();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Delete failed', variant: 'destructive' });
    }
  };

  const salesRows = detailAdvance
    ? rows.filter((r) => r.doctor_id === detailAdvance.doctor_id && (r.status === 'approved' || r.status === 'paid') && new Date(r.created_at) >= new Date(detailAdvance.created_at))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Incentives" />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                  <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
                  <p className="text-sm md:text-lg font-bold">{formatCurrency(summary.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Pending</p>
                  <p className="text-sm md:text-lg font-bold">{formatCurrency(summary.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Approved</p>
                  <p className="text-sm md:text-lg font-bold">{formatCurrency(summary.approved)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Paid</p>
                  <p className="text-sm md:text-lg font-bold">{formatCurrency(summary.paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Incentives */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm md:text-lg">Advanced Incentives</CardTitle>
              {isAdmin && (
                <Button size="sm" className="h-8 md:h-9 text-xs" onClick={openAdvanceCreate}>
                  <Wallet className="h-3.5 w-3.5 mr-1" /> Give Advance
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {advances.length === 0 ? (
              <div className="text-center py-6">
                <Wallet className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
                  No advances given yet. Give an advance to a doctor, then their approved incentives are recovered against it automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs py-2">Date</TableHead>
                      <TableHead className="text-xs py-2">Doctor</TableHead>
                      <TableHead className="text-xs py-2 text-right">Advance</TableHead>
                      <TableHead className="text-xs py-2 text-right">Recovered</TableHead>
                      <TableHead className="text-xs py-2 text-right">Balance</TableHead>
                      <TableHead className="text-xs py-2">Status</TableHead>
                      <TableHead className="text-xs py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.map((a) => {
                      const recovered = advanceRecovered(a);
                      const balance = Math.max(0, Number(a.amount) - recovered);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs py-2 whitespace-nowrap">
                            {new Date(a.given_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-xs py-2 max-w-[140px] truncate">{a.doctor?.name || '—'}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-medium">{formatCurrency(Number(a.amount))}</TableCell>
                          <TableCell className="text-xs py-2 text-right">{formatCurrency(recovered)}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-bold text-primary">{formatCurrency(balance)}</TableCell>
                          <TableCell className="text-xs py-2"><AdvanceStatusBadge status={a.status} /></TableCell>
                          <TableCell className="text-xs py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailAdvance(a)} aria-label="View recovery">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {isAdmin && a.status === 'active' && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] text-green-600" onClick={() => handleAdvanceStatus(a.id, 'settled')}>
                                    <CheckCircle2 className="h-3 w-3 mr-0.5" />Settle
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] text-red-600" onClick={() => handleAdvanceStatus(a.id, 'cancelled')}>
                                    <Ban className="h-3 w-3 mr-0.5" />Cancel
                                  </Button>
                                </>
                              )}
                              {isAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete advance?</AlertDialogTitle>
                                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteAdvance(a.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters + Add */}
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
              <CardTitle className="text-sm md:text-lg">Incentive History</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Select value={selectedMr} onValueChange={setSelectedMr}>
                    <SelectTrigger className="h-8 md:h-9 w-[150px] md:w-[180px] text-xs">
                      <SelectValue placeholder="Select MR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All MRs</SelectItem>
                      {mrs.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 md:h-9 w-[130px] md:w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                    <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 md:h-9 text-xs" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingId ? 'Edit Incentive' : 'New Incentive'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Doctor</Label>
                        <Select value={form.doctor_id} onValueChange={handleDoctorChange}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                          <SelectContent className="max-h-[240px]">
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Order</Label>
                        <Select value={form.order_id} onValueChange={handleOrderChange} disabled={!form.doctor_id}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder={form.doctor_id ? 'Select order' : 'Select doctor first'} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[240px]">
                            {orderOptionsForDoctor.map((o) => (
                              <SelectItem key={o.id} value={o.id} className="text-xs">
                                {new Date(o.order_date).toLocaleDateString('en-IN')} — {formatCurrency(Number(o.total_amount || 0))}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Order Amt</Label>
                          <Input type="number" value={form.order_amount} onChange={(e) => setForm({ ...form, order_amount: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">%</Label>
                          <Input type="number" value={form.incentive_percentage} onChange={(e) => setForm({ ...form, incentive_percentage: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Incentive</Label>
                          <Input type="number" value={form.incentive_amount} onChange={(e) => setForm({ ...form, incentive_amount: e.target.value })} className="h-9 text-xs" />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-xs" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                        {editingId ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <IndianRupee className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-xs md:text-sm text-muted-foreground">No incentives found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 md:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs py-2">Date</TableHead>
                      <TableHead className="text-xs py-2">Doctor</TableHead>
                      <TableHead className="text-xs py-2">Type</TableHead>
                      <TableHead className="text-xs py-2 text-right">Order Amt</TableHead>
                      <TableHead className="text-xs py-2 text-center">%</TableHead>
                      <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                      <TableHead className="text-xs py-2">Status</TableHead>
                      <TableHead className="text-xs py-2 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs py-2 whitespace-nowrap">
                          {new Date(r.order?.order_date || r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-xs py-2 max-w-[140px] truncate">{r.doctor?.name || '—'}</TableCell>
                        <TableCell className="text-xs py-2">Doctor Order</TableCell>
                        <TableCell className="text-xs py-2 text-right">{formatCurrency(r.order_amount)}</TableCell>
                        <TableCell className="text-xs py-2 text-center">{r.incentive_percentage}%</TableCell>
                        <TableCell className="text-xs py-2 text-right font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(r.incentive_amount)}
                        </TableCell>
                        <TableCell className="text-xs py-2"><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs py-2">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && r.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]"
                                  disabled={updatingId === r.id}
                                  onClick={() => handleStatus(r.id, 'approved')}>
                                  <Check className="h-3 w-3 mr-0.5" />Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] text-red-600"
                                  disabled={updatingId === r.id}
                                  onClick={() => handleStatus(r.id, 'rejected')}>
                                  <X className="h-3 w-3 mr-0.5" />Reject
                                </Button>
                              </>
                            )}
                            {isAdmin && r.status === 'approved' && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] text-green-600"
                                disabled={updatingId === r.id}
                                onClick={() => handleStatus(r.id, 'paid')}>
                                <CheckCircle2 className="h-3 w-3 mr-0.5" />Pay
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete incentive?</AlertDialogTitle>
                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(r.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advance recovery detail dialog */}
        <Dialog open={!!detailAdvance} onOpenChange={(o) => { if (!o) setDetailAdvance(null); }}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm md:text-base">{detailAdvance?.doctor?.name || 'Doctor'} — Advance Recovery</DialogTitle>
            </DialogHeader>
            {detailAdvance && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Advance {formatCurrency(Number(detailAdvance.amount))} given on{' '}
                  {new Date(detailAdvance.given_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
                  Showing this doctor's approved sales incentives recorded after the advance.
                </p>
                {salesRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No approved incentives for this doctor since the advance yet.
                  </p>
                ) : (
                  <div className="rounded-md border divide-y">
                    {salesRows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">
                            {new Date(r.order?.order_date || r.created_at).toLocaleDateString('en-IN')} — {formatCurrency(r.order_amount)} sale
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{r.incentive_percentage}%</span>
                            <StatusBadge status={r.status} />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(r.incentive_amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-2.5 py-2 bg-muted/50">
                      <span className="text-xs font-semibold">Total recovered</span>
                      <span className="text-xs font-bold">{formatCurrency(advanceRecovered(detailAdvance))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Give Advance dialog */}
        <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Give Advance Incentive</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Doctor</Label>
                <Select value={advanceForm.doctor_id} onValueChange={(v) => setAdvanceForm({ ...advanceForm, doctor_id: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Advance Amount</Label>
                  <Input type="number" min="1" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} className="h-9 text-xs" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Given Date</Label>
                  <Input type="date" value={advanceForm.given_date} onChange={(e) => setAdvanceForm({ ...advanceForm, given_date: e.target.value })} className="h-9 text-xs" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea rows={2} value={advanceForm.notes} onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })} className="text-xs" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                The advance is recovered automatically as this doctor's incentives are approved from future sales.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setAdvanceDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveAdvance} disabled={savingAdvance}>
                {savingAdvance && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Give Advance
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Incentives;
