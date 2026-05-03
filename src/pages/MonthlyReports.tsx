import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Target as TargetIcon, TrendingUp, ShoppingCart, IndianRupee,
  Stethoscope, Building2, Receipt, Package,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

const CALLS_PER_DAY_TARGET = 8;

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

interface DoctorRow { id: string; name: string }
interface OrderRow { id: string; order_date: string; total_amount: number | null; doctor_id: string | null }
interface DailyRow { work_date: string; doctor_id: string | null; distributor_id: string | null; sample_details: any }
interface ExpenseRow { amount: number | null; expense_date: string }
interface TourDayRow { date: number; is_holiday: boolean | null; is_weekly_off: boolean | null }

const MonthlyReports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [loading, setLoading] = useState(false);

  const [targetValue, setTargetValue] = useState(0);
  const [achievedValue, setAchievedValue] = useState(0);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [tourDays, setTourDays] = useState<TourDayRow[]>([]);
  const [doctorMap, setDoctorMap] = useState<Record<string, string>>({});

  const monthStart = useMemo(() => `${year}-${String(month).padStart(2,'0')}-01`, [year, month]);
  const monthEnd = useMemo(() => {
    const d = new Date(year, month, 0); // last day
    return `${year}-${String(month).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  useEffect(() => {
    if (!user) return;
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [targetsRes, ordersRes, dailyRes, expensesRes, planRes] = await Promise.all([
        supabase
          .from('targets')
          .select('target_value, achieved_value, target_month, target_type')
          .eq('mr_id', user.id)
          .eq('target_type', 'mr')
          .gte('target_month', monthStart)
          .lte('target_month', monthEnd),
        supabase
          .from('orders')
          .select('id, order_date, total_amount, doctor_id')
          .eq('mr_id', user.id)
          .gte('order_date', monthStart)
          .lte('order_date', monthEnd),
        supabase
          .from('daily_working')
          .select('work_date, doctor_id, distributor_id, sample_details')
          .eq('mr_id', user.id)
          .gte('work_date', monthStart)
          .lte('work_date', monthEnd),
        supabase
          .from('expenses')
          .select('amount, expense_date')
          .eq('mr_id', user.id)
          .gte('expense_date', monthStart)
          .lte('expense_date', monthEnd),
        supabase
          .from('tour_plans')
          .select('id, status, tour_plan_days(date, is_holiday, is_weekly_off)')
          .eq('user_id', user.id)
          .eq('month', month)
          .eq('year', year)
          .maybeSingle(),
      ]);

      if (targetsRes.error) throw targetsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (dailyRes.error) throw dailyRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const tSum = (targetsRes.data || []).reduce((s, r: any) => s + Number(r.target_value || 0), 0);
      const aSum = (targetsRes.data || []).reduce((s, r: any) => s + Number(r.achieved_value || 0), 0);
      setTargetValue(tSum);
      setAchievedValue(aSum);
      setOrders((ordersRes.data || []) as any);
      setDailyRows((dailyRes.data || []) as any);
      setExpenses((expensesRes.data || []) as any);
      const planDays = (planRes.data as any)?.tour_plan_days || [];
      setTourDays(planDays as any);

      // doctor names for top-doctor table
      const docIds = Array.from(new Set((ordersRes.data || []).map((o: any) => o.doctor_id).filter(Boolean))) as string[];
      if (docIds.length) {
        const { data: docs } = await supabase.from('doctors').select('id, name').in('id', docIds);
        const map: Record<string, string> = {};
        (docs || []).forEach((d: any) => { map[d.id] = d.name; });
        setDoctorMap(map);
      } else {
        setDoctorMap({});
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to load monthly data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Derived metrics
  const ordersCount = orders.length;
  const orderValue = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const doctorCalls = dailyRows.filter(r => r.doctor_id).length;
  const distributorVisits = dailyRows.filter(r => r.distributor_id).length;
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const samplesTotal = dailyRows.reduce((s, r) => {
    const arr = Array.isArray(r.sample_details) ? r.sample_details : [];
    return s + arr.reduce((ss: number, item: any) => ss + Number(item?.quantity || 0), 0);
  }, 0);

  const workingDaysFromPlan = tourDays.filter(d => !d.is_holiday && !d.is_weekly_off).length;
  const expectedCalls = (workingDaysFromPlan || daysInMonth) * CALLS_PER_DAY_TARGET;
  const expectedOrders = workingDaysFromPlan || Math.round(daysInMonth * 0.7);
  const achievementPct = targetValue > 0 ? Math.min(100, (achievedValue / targetValue) * 100) : 0;
  const callsPct = expectedCalls > 0 ? Math.min(100, (doctorCalls / expectedCalls) * 100) : 0;
  const ordersPct = expectedOrders > 0 ? Math.min(100, (ordersCount / expectedOrders) * 100) : 0;

  // Daily orders chart
  const dailyChart = useMemo(() => {
    const arr = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      orders: 0,
      value: 0,
    }));
    orders.forEach(o => {
      const d = new Date(o.order_date).getDate();
      if (arr[d - 1]) {
        arr[d - 1].orders += 1;
        arr[d - 1].value += Number(o.total_amount || 0);
      }
    });
    return arr;
  }, [orders, daysInMonth]);

  // Cumulative achieved vs proportional target
  const cumulativeChart = useMemo(() => {
    let cum = 0;
    return dailyChart.map((d) => {
      cum += d.value;
      const linearTarget = targetValue * (d.day / daysInMonth);
      return { day: d.day, achieved: Math.round(cum), target: Math.round(linearTarget) };
    });
  }, [dailyChart, targetValue, daysInMonth]);

  // Top doctors
  const topDoctors = useMemo(() => {
    const grouped: Record<string, { value: number; count: number }> = {};
    orders.forEach(o => {
      const id = o.doctor_id || 'unknown';
      if (!grouped[id]) grouped[id] = { value: 0, count: 0 };
      grouped[id].value += Number(o.total_amount || 0);
      grouped[id].count += 1;
    });
    return Object.entries(grouped)
      .map(([id, v]) => ({ id, name: doctorMap[id] || (id === 'unknown' ? '—' : 'Unknown'), ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [orders, doctorMap]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const KpiCard = ({ icon: Icon, label, value, sub, progress }: any) => (
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
          <p className="text-lg md:text-2xl font-bold text-foreground truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3">
          <Progress value={progress} className="h-2" />
          <p className="text-[11px] text-muted-foreground mt-1">{progress.toFixed(0)}%</p>
        </div>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Monthly Reports" description="Your monthly performance at a glance" />

      <div className="px-3 py-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Filters */}
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
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <KpiCard icon={TargetIcon} label="Monthly Target" value={fmtINR(targetValue)} />
              <KpiCard
                icon={TrendingUp}
                label="Achieved"
                value={fmtINR(achievedValue)}
                sub={`${achievementPct.toFixed(0)}% of target`}
                progress={achievementPct}
              />
              <KpiCard icon={ShoppingCart} label="Orders Placed" value={ordersCount} sub={`${expectedOrders} expected`} progress={ordersPct} />
              <KpiCard icon={IndianRupee} label="Order Value" value={fmtINR(orderValue)} />
              <KpiCard icon={Stethoscope} label="Doctor Calls" value={doctorCalls} sub={`${expectedCalls} expected`} progress={callsPct} />
              <KpiCard icon={Building2} label="Distributor Visits" value={distributorVisits} />
              <KpiCard icon={Package} label="Samples Given" value={samplesTotal} />
              <KpiCard icon={Receipt} label="Expenses" value={fmtINR(expensesTotal)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card className="p-4">
                <h3 className="text-base md:text-lg font-semibold mb-3">Daily Orders</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RTooltip />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-base md:text-lg font-semibold mb-3">Achievement Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cumulativeChart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RTooltip formatter={(v: any) => fmtINR(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="achieved" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="text-base md:text-lg font-semibold mb-3">Top Doctors (by Order Value)</h3>
              {topDoctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders this month yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topDoctors.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.name}</TableCell>
                          <TableCell className="text-right">{d.count}</TableCell>
                          <TableCell className="text-right">{fmtINR(d.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyReports;
