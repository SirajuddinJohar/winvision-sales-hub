import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const CALLS_PER_DAY_TARGET = 8;

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

interface OrderRow { id: string; order_date: string; total_amount: number | null; doctor_id: string | null; mr_id: string }
interface DailyRow { work_date: string; doctor_id: string | null; distributor_id: string | null; sample_details: any; mr_id: string }
interface ExpenseRow { amount: number | null; expense_date: string; mr_id: string }
interface MRRow { id: string; name: string; email: string }

const MonthlyReports = () => {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);

  const [mrList, setMrList] = useState<MRRow[]>([]);
  const [selectedMr, setSelectedMr] = useState<string>('all'); // 'all' or mr_id

  const [targetsRows, setTargetsRows] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [workingDaysByMr, setWorkingDaysByMr] = useState<Record<string, number>>({});

  const monthStart = useMemo(() => `${year}-${String(month).padStart(2,'0')}-01`, [year, month]);
  const monthEnd = useMemo(() => {
    const d = new Date(year, month, 0);
    return `${year}-${String(month).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  // Load MR list for admin
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('role', 'mr')
        .order('name');
      setMrList((data || []) as any);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!user) return;
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month, selectedMr, isAdmin]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const mrFilter = isAdmin ? (selectedMr === 'all' ? null : selectedMr) : user.id;

      let tQ = supabase.from('targets').select('mr_id, target_value, achieved_value, target_month, target_type')
        .eq('target_type', 'mr').gte('target_month', monthStart).lte('target_month', monthEnd);
      let oQ = supabase.from('orders').select('id, order_date, total_amount, doctor_id, mr_id')
        .gte('order_date', monthStart).lte('order_date', monthEnd);
      let dQ = supabase.from('daily_working').select('work_date, doctor_id, distributor_id, sample_details, mr_id')
        .gte('work_date', monthStart).lte('work_date', monthEnd);
      let eQ = supabase.from('expenses').select('amount, expense_date, mr_id')
        .gte('expense_date', monthStart).lte('expense_date', monthEnd);
      let pQ = supabase.from('tour_plans').select('user_id, tour_plan_days(date, is_holiday, is_weekly_off)')
        .eq('month', month).eq('year', year);

      if (mrFilter) {
        tQ = tQ.eq('mr_id', mrFilter);
        oQ = oQ.eq('mr_id', mrFilter);
        dQ = dQ.eq('mr_id', mrFilter);
        eQ = eQ.eq('mr_id', mrFilter);
        pQ = pQ.eq('user_id', mrFilter);
      }

      const [tRes, oRes, dRes, eRes, pRes] = await Promise.all([tQ, oQ, dQ, eQ, pQ]);
      if (tRes.error) throw tRes.error;
      if (oRes.error) throw oRes.error;
      if (dRes.error) throw dRes.error;
      if (eRes.error) throw eRes.error;

      setTargetsRows(tRes.data || []);
      setOrders((oRes.data || []) as any);
      setDailyRows((dRes.data || []) as any);
      setExpenses((eRes.data || []) as any);

      const wdMap: Record<string, number> = {};
      (pRes.data || []).forEach((p: any) => {
        const days = (p.tour_plan_days || []).filter((d: any) => !d.is_holiday && !d.is_weekly_off).length;
        wdMap[p.user_id] = (wdMap[p.user_id] || 0) + days;
      });
      setWorkingDaysByMr(wdMap);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to load monthly data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Build per-MR rows
  const reportRows = useMemo(() => {
    const ids = new Set<string>();
    if (isAdmin && selectedMr === 'all') {
      mrList.forEach(m => ids.add(m.id));
    } else if (isAdmin) {
      ids.add(selectedMr);
    } else if (user) {
      ids.add(user.id);
    }
    targetsRows.forEach(r => ids.add(r.mr_id));
    orders.forEach(r => ids.add(r.mr_id));
    dailyRows.forEach(r => ids.add(r.mr_id));
    expenses.forEach(r => ids.add(r.mr_id));

    const nameOf = (id: string) => {
      const m = mrList.find(x => x.id === id);
      return m?.name || (id === user?.id ? 'You' : id.slice(0, 8));
    };

    return Array.from(ids).map(id => {
      const tgt = targetsRows.filter(r => r.mr_id === id).reduce((s, r: any) => s + Number(r.target_value || 0), 0);
      const ach = targetsRows.filter(r => r.mr_id === id).reduce((s, r: any) => s + Number(r.achieved_value || 0), 0);
      const oList = orders.filter(o => o.mr_id === id);
      const ordersCount = oList.length;
      const orderValue = oList.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const dList = dailyRows.filter(r => r.mr_id === id);
      const calls = dList.filter(r => r.doctor_id).length;
      const distVisits = dList.filter(r => r.distributor_id).length;
      const samples = dList.reduce((s, r) => {
        const arr = Array.isArray(r.sample_details) ? r.sample_details : [];
        return s + arr.reduce((ss: number, item: any) => ss + Number(item?.quantity || 0), 0);
      }, 0);
      const exp = expenses.filter(e => e.mr_id === id).reduce((s, e) => s + Number(e.amount || 0), 0);
      const wd = workingDaysByMr[id] || 0;
      const expectedCalls = (wd || daysInMonth) * CALLS_PER_DAY_TARGET;
      const expectedOrders = wd || Math.round(daysInMonth * 0.7);
      const achPct = tgt > 0 ? (ach / tgt) * 100 : 0;
      return {
        id, name: nameOf(id), target: tgt, achieved: ach, achPct,
        ordersCount, orderValue, expectedOrders,
        calls, expectedCalls, distVisits, samples, expenses: exp,
        workingDays: wd,
      };
    }).sort((a, b) => b.orderValue - a.orderValue);
  }, [targetsRows, orders, dailyRows, expenses, workingDaysByMr, mrList, isAdmin, selectedMr, user, daysInMonth]);

  // Totals row
  const totals = useMemo(() => {
    return reportRows.reduce((acc, r) => ({
      target: acc.target + r.target,
      achieved: acc.achieved + r.achieved,
      ordersCount: acc.ordersCount + r.ordersCount,
      orderValue: acc.orderValue + r.orderValue,
      expectedOrders: acc.expectedOrders + r.expectedOrders,
      calls: acc.calls + r.calls,
      expectedCalls: acc.expectedCalls + r.expectedCalls,
      distVisits: acc.distVisits + r.distVisits,
      samples: acc.samples + r.samples,
      expenses: acc.expenses + r.expenses,
      workingDays: acc.workingDays + r.workingDays,
    }), { target: 0, achieved: 0, ordersCount: 0, orderValue: 0, expectedOrders: 0, calls: 0, expectedCalls: 0, distVisits: 0, samples: 0, expenses: 0, workingDays: 0 });
  }, [reportRows]);

  const totalAchPct = totals.target > 0 ? (totals.achieved / totals.target) * 100 : 0;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Monthly Reports" description="Monthly performance summary in table format" />

      <div className="px-3 py-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        <Card className="p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Month</span>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">MR</span>
                <Select value={selectedMr} onValueChange={setSelectedMr}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MRs</SelectItem>
                    {mrList.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Card className="p-3 md:p-4">
            <h3 className="text-base md:text-lg font-semibold mb-3">
              Monthly Performance — {months[month - 1]} {year}
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(isAdmin && selectedMr === 'all') && <TableHead>MR</TableHead>}
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Achieved</TableHead>
                    <TableHead className="text-right">Achievement %</TableHead>
                    <TableHead className="text-right">Working Days</TableHead>
                    <TableHead className="text-right">Calls (Done / Expected)</TableHead>
                    <TableHead className="text-right">Orders (Done / Expected)</TableHead>
                    <TableHead className="text-right">Order Value</TableHead>
                    <TableHead className="text-right">Distributor Visits</TableHead>
                    <TableHead className="text-right">Samples</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin && selectedMr === 'all' ? 11 : 10} className="text-center text-muted-foreground py-6">
                        No data for this month.
                      </TableCell>
                    </TableRow>
                  ) : reportRows.map(r => (
                    <TableRow key={r.id}>
                      {(isAdmin && selectedMr === 'all') && <TableCell className="font-medium">{r.name}</TableCell>}
                      <TableCell className="text-right">{fmtINR(r.target)}</TableCell>
                      <TableCell className="text-right">{fmtINR(r.achieved)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 min-w-[120px]">
                          <Progress value={Math.min(100, r.achPct)} className="h-2 w-16" />
                          <span className="text-xs">{r.achPct.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{r.workingDays || '—'}</TableCell>
                      <TableCell className="text-right">{r.calls} / {r.expectedCalls}</TableCell>
                      <TableCell className="text-right">{r.ordersCount} / {r.expectedOrders}</TableCell>
                      <TableCell className="text-right">{fmtINR(r.orderValue)}</TableCell>
                      <TableCell className="text-right">{r.distVisits}</TableCell>
                      <TableCell className="text-right">{r.samples}</TableCell>
                      <TableCell className="text-right">{fmtINR(r.expenses)}</TableCell>
                    </TableRow>
                  ))}
                  {reportRows.length > 1 && (
                    <TableRow className="bg-muted/40 font-semibold">
                      {(isAdmin && selectedMr === 'all') && <TableCell>Grand Total</TableCell>}
                      <TableCell className="text-right">{fmtINR(totals.target)}</TableCell>
                      <TableCell className="text-right">{fmtINR(totals.achieved)}</TableCell>
                      <TableCell className="text-right">{totalAchPct.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{totals.workingDays || '—'}</TableCell>
                      <TableCell className="text-right">{totals.calls} / {totals.expectedCalls}</TableCell>
                      <TableCell className="text-right">{totals.ordersCount} / {totals.expectedOrders}</TableCell>
                      <TableCell className="text-right">{fmtINR(totals.orderValue)}</TableCell>
                      <TableCell className="text-right">{totals.distVisits}</TableCell>
                      <TableCell className="text-right">{totals.samples}</TableCell>
                      <TableCell className="text-right">{fmtINR(totals.expenses)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MonthlyReports;
