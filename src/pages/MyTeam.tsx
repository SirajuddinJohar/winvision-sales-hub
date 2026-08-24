import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingCart, Receipt, ClipboardList, IndianRupee } from 'lucide-react';
import JointWorkQR from '@/components/team/JointWorkQR';


const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const monthOptions = () => {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return out;
};

const MyTeam = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const months = useMemo(monthOptions, []);
  const [month, setMonth] = useState(months[0].value);
  const [asmFilter, setAsmFilter] = useState<string>('all');

  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  const { data: asms = [] } = useQuery({
    queryKey: ['asm-list'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'asm');
      const ids = (roles || []).map((r: any) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from('users').select('id, name').in('id', ids);
      return data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-team', profile?.id, isAdmin, asmFilter, month],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data: allLinks } = await supabase.from('mr_asm_assignments').select('mr_id, asm_id');
      const links = allLinks || [];

      let mrIds: string[] = [];
      if (isAdmin) {
        const { data: mrRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'mr');
        const allMrIds = (mrRoles || []).map((r: any) => r.user_id);
        if (asmFilter === 'all') mrIds = allMrIds;
        else if (asmFilter === 'unassigned') mrIds = allMrIds.filter((id) => !links.some((l: any) => l.mr_id === id));
        else mrIds = links.filter((l: any) => l.asm_id === asmFilter).map((l: any) => l.mr_id);
      } else {
        mrIds = links.filter((l: any) => l.asm_id === profile!.id).map((l: any) => l.mr_id);
      }
      if (!mrIds.length) return { members: [] as any[] };

      const [{ data: users }, { data: orders }, { data: expenses }, { data: working }, { data: targets }, { data: joint }] =
        await Promise.all([
          supabase.from('users').select('id, name, email').in('id', mrIds),
          supabase.from('orders').select('mr_id, total_amount, order_date').in('mr_id', mrIds).gte('order_date', start).lte('order_date', end),
          supabase.from('expenses').select('mr_id, amount, status, expense_date').in('mr_id', mrIds).gte('expense_date', start).lte('expense_date', end),
          supabase.from('daily_working').select('mr_id, work_date, doctor_id').in('mr_id', mrIds).gte('work_date', start).lte('work_date', end),
          supabase.from('targets').select('mr_id, target_value, achieved_value, target_month').in('mr_id', mrIds).eq('target_month', start),
          supabase.from('joint_work_confirmations').select('mr_id, work_date').in('mr_id', mrIds).gte('work_date', start).lte('work_date', end),
        ]);

      const today = new Date().toISOString().slice(0, 10);

      const members = (users || []).map((u: any) => {
        const sales = (orders || []).filter((o: any) => o.mr_id === u.id).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
        const orderCount = (orders || []).filter((o: any) => o.mr_id === u.id).length;
        const exp = (expenses || []).filter((e: any) => e.mr_id === u.id).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const calls = (working || []).filter((w: any) => w.mr_id === u.id);
        const lastActivity = calls.map((c: any) => c.work_date).sort().pop();
        const tgt = (targets || []).filter((t: any) => t.mr_id === u.id).reduce((s: number, t: any) => s + Number(t.target_value || 0), 0);
        const jointRows = (joint || []).filter((j: any) => j.mr_id === u.id);
        return {
          ...u,
          asmId: links.find((l: any) => l.mr_id === u.id)?.asm_id,
          sales,
          orderCount,
          expenses: exp,
          calls: calls.length,
          workingDays: new Set(calls.map((c: any) => c.work_date)).size,
          target: tgt,
          achievement: tgt > 0 ? (sales / tgt) * 100 : 0,
          lastActivity,
          jointDays: new Set(jointRows.map((j: any) => j.work_date)).size,
          jointToday: jointRows.some((j: any) => j.work_date === today),
        };
      });

      members.sort((a, b) => b.sales - a.sales);
      return { members };
    },
  });


  const members = data?.members || [];
  const totals = members.reduce(
    (acc, m) => ({
      sales: acc.sales + m.sales,
      calls: acc.calls + m.calls,
      expenses: acc.expenses + m.expenses,
      orders: acc.orders + m.orderCount,
    }),
    { sales: 0, calls: 0, expenses: 0, orders: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> My Team</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Activity of all MRs grouped under their ASM.' : 'Activity of the MRs reporting to you.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Select value={asmFilter} onValueChange={setAsmFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All ASMs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All MRs</SelectItem>
                <SelectItem value="unassigned">Unassigned MRs</SelectItem>

                {asms.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isAdmin && <JointWorkQR />}



      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Team Size</p>
          <p className="text-xl font-bold">{members.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Team Sales</p>
          <p className="text-xl font-bold">{fmtINR(totals.sales)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Doctor Calls</p>
          <p className="text-xl font-bold">{totals.calls}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Expenses</p>
          <p className="text-xl font-bold">{fmtINR(totals.expenses)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> MR Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No MRs assigned yet. {isAdmin ? 'Assign MRs to an ASM from User Management.' : 'Ask your admin to assign MRs to you.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MR</TableHead>
                    {isAdmin && <TableHead>Reports To</TableHead>}

                    <TableHead className="text-right">Working Days</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Ach %</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.email}</div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs">
                          {asms.find((a: any) => a.id === m.asmId)?.name || <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                      )}

                      <TableCell className="text-right">{m.workingDays}</TableCell>
                      <TableCell className="text-right">{m.calls}</TableCell>
                      <TableCell className="text-right">{m.orderCount}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtINR(m.sales)}</TableCell>
                      <TableCell className="text-right">{m.target ? fmtINR(m.target) : '—'}</TableCell>
                      <TableCell className="text-right">
                        {m.target ? (
                          <Badge variant={m.achievement >= 100 ? 'default' : m.achievement >= 60 ? 'secondary' : 'destructive'}>
                            {m.achievement.toFixed(0)}%
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{fmtINR(m.expenses)}</TableCell>
                      <TableCell className="text-xs">
                        {m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('en-IN') : 'No activity'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTeam;
