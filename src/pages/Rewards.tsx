import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Gift, Plus, Trophy, Loader2, Check, X, Package as PackageIcon } from 'lucide-react';

type Beneficiary = 'pharmacy' | 'doctor';
type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

interface Campaign {
  id: string;
  name: string;
  product_id: string;
  target_quantity: number;
  reward_description: string;
  reward_image_url: string | null;
  beneficiary_type: Beneficiary;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface Claim {
  id: string;
  campaign_id: string;
  beneficiary_type: Beneficiary;
  pharmacy_id: string | null;
  doctor_id: string | null;
  mr_id: string | null;
  achieved_quantity: number;
  status: ClaimStatus;
  admin_notes: string | null;
  delivery_notes: string | null;
  created_at: string;
}

const statusColor: Record<ClaimStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  approved: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400',
  delivered: 'bg-green-500/10 text-green-700 dark:text-green-400',
};

const Rewards = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [pharmacies, setPharmacies] = useState<Record<string, string>>({});
  const [doctors, setDoctors] = useState<Record<string, string>>({});
  const [orderTotals, setOrderTotals] = useState<Record<string, Record<string, number>>>({}); // campaignId -> beneficiaryId -> qty
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Campaign form state
  const [form, setForm] = useState({
    name: '',
    product_id: '',
    target_quantity: 100,
    reward_description: '',
    reward_image_url: '',
    beneficiary_type: 'pharmacy' as Beneficiary,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  const loadAll = async () => {
    setLoading(true);
    const [campaignsRes, claimsRes, productsRes, pharmaciesRes, doctorsRes] = await Promise.all([
      supabase.from('reward_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('reward_claims').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name').order('name'),
      supabase.from('pharmacies').select('id, name'),
      supabase.from('doctors').select('id, name'),
    ]);
    setCampaigns((campaignsRes.data || []) as Campaign[]);
    setClaims((claimsRes.data || []) as Claim[]);
    setProducts(productsRes.data || []);
    setPharmacies(Object.fromEntries((pharmaciesRes.data || []).map((p: any) => [p.id, p.name])));
    setDoctors(Object.fromEntries((doctorsRes.data || []).map((d: any) => [d.id, d.name])));

    // load order_items quantities per active campaign
    const totals: Record<string, Record<string, number>> = {};
    for (const c of (campaignsRes.data || []) as Campaign[]) {
      if (!c.is_active) continue;
      const { data } = await supabase
        .from('order_items')
        .select('quantity, order_id, orders!inner(pharmacy_id, doctor_id, order_date)')
        .eq('product_id', c.product_id)
        .gte('orders.order_date', c.start_date)
        .lte('orders.order_date', c.end_date || '2099-12-31');
      const map: Record<string, number> = {};
      for (const row of (data || []) as any[]) {
        const bid = c.beneficiary_type === 'pharmacy' ? row.orders?.pharmacy_id : row.orders?.doctor_id;
        if (!bid) continue;
        map[bid] = (map[bid] || 0) + (row.quantity || 0);
      }
      totals[c.id] = map;
    }
    setOrderTotals(totals);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const productName = (id: string) => products.find(p => p.id === id)?.name || '—';
  const beneficiaryName = (claim: Claim) =>
    claim.beneficiary_type === 'pharmacy'
      ? pharmacies[claim.pharmacy_id || ''] || '—'
      : doctors[claim.doctor_id || ''] || '—';

  const handleCreateCampaign = async () => {
    if (!form.name || !form.product_id || !form.reward_description) {
      toast({ title: 'Missing fields', description: 'Name, product and reward are required', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('reward_campaigns').insert({
      name: form.name,
      product_id: form.product_id,
      target_quantity: Number(form.target_quantity),
      reward_description: form.reward_description,
      reward_image_url: form.reward_image_url || null,
      beneficiary_type: form.beneficiary_type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      created_by: profile?.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Campaign created 🎁' });
    setDialogOpen(false);
    setForm({ ...form, name: '', reward_description: '', reward_image_url: '' });
    loadAll();
  };

  const toggleCampaign = async (c: Campaign) => {
    const { error } = await supabase.from('reward_campaigns').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    loadAll();
  };

  const updateClaim = async (id: string, status: ClaimStatus, extra: Partial<Claim> = {}) => {
    const payload: any = { status, ...extra };
    if (status === 'approved') { payload.approved_by = profile?.id; payload.approved_at = new Date().toISOString(); }
    if (status === 'delivered') { payload.delivered_at = new Date().toISOString(); }
    const { error } = await supabase.from('reward_claims').update(payload).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: `Claim ${status}` });
    loadAll();
  };

  const activeCampaigns = useMemo(() => campaigns.filter(c => c.is_active), [campaigns]);

  const leaderboard = useMemo(() => {
    const map: Record<string, { name: string; type: Beneficiary; count: number }> = {};
    for (const cl of claims.filter(c => c.status === 'delivered' || c.status === 'approved')) {
      const id = cl.pharmacy_id || cl.doctor_id || '';
      if (!id) continue;
      const name = beneficiaryName(cl);
      if (!map[id]) map[id] = { name, type: cl.beneficiary_type, count: 0 };
      map[id].count += 1;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, pharmacies, doctors]);

  return (
    <div>
      <PageHeader title="Rewards & Campaigns" description="Gamify orders with milestone rewards" />

      <div className="px-3 md:px-6">
        <Tabs defaultValue="campaigns">
          <TabsList className="mb-4">
            <TabsTrigger value="campaigns"><Gift className="h-4 w-4 mr-1.5" />Campaigns</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="claims">Claims {claims.filter(c => c.status === 'pending').length > 0 && <Badge className="ml-1.5" variant="destructive">{claims.filter(c => c.status === 'pending').length}</Badge>}</TabsTrigger>
            <TabsTrigger value="leaderboard"><Trophy className="h-4 w-4 mr-1.5" />Leaderboard</TabsTrigger>
          </TabsList>

          {/* CAMPAIGNS */}
          <TabsContent value="campaigns" className="space-y-3">
            {isAdmin && (
              <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Campaign</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Reward Campaign</DialogTitle>
                      <DialogDescription>e.g. Order 200 Lubrikey Drops → win a Trolley</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Campaign Name</Label>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Lubrikey Trolley Offer" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Product</Label>
                          <Select value={form.product_id} onValueChange={v => setForm({ ...form, product_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Target Qty</Label>
                          <Input type="number" min={1} value={form.target_quantity} onChange={e => setForm({ ...form, target_quantity: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <Label>Reward</Label>
                        <Textarea value={form.reward_description} onChange={e => setForm({ ...form, reward_description: e.target.value })} placeholder="Branded trolley + free delivery" rows={2} />
                      </div>
                      <div>
                        <Label>Reward Image URL (optional)</Label>
                        <Input value={form.reward_image_url} onChange={e => setForm({ ...form, reward_image_url: e.target.value })} placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label>Beneficiary</Label>
                          <Select value={form.beneficiary_type} onValueChange={(v: Beneficiary) => setForm({ ...form, beneficiary_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pharmacy">Pharmacy</SelectItem>
                              <SelectItem value="doctor">Doctor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Start</Label>
                          <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                        </div>
                        <div>
                          <Label>End (optional)</Label>
                          <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreateCampaign}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : campaigns.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-40" />
                No campaigns yet. {isAdmin && 'Create one to motivate your customers!'}
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {campaigns.map(c => (
                  <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{c.name}</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {productName(c.product_id)} · {c.target_quantity} qty · {c.beneficiary_type}
                          </CardDescription>
                        </div>
                        {isAdmin && (
                          <Switch checked={c.is_active} onCheckedChange={() => toggleCampaign(c)} />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2 space-y-2">
                      <p className="text-sm">🎁 {c.reward_description}</p>
                      <div className="text-xs text-muted-foreground">
                        {c.start_date} → {c.end_date || 'Ongoing'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROGRESS */}
          <TabsContent value="progress" className="space-y-3">
            {activeCampaigns.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No active campaigns.</CardContent></Card>
            ) : activeCampaigns.map(c => {
              const totals = orderTotals[c.id] || {};
              const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
              return (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription className="text-xs">{productName(c.product_id)} · Target {c.target_quantity}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No orders yet for this campaign.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {entries.slice(0, 10).map(([bid, qty]) => {
                          const pct = Math.min(100, (qty / c.target_quantity) * 100);
                          const name = c.beneficiary_type === 'pharmacy' ? pharmacies[bid] : doctors[bid];
                          return (
                            <div key={bid} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{name || '—'}</span>
                                <span className={qty >= c.target_quantity ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                                  {qty} / {c.target_quantity}
                                </span>
                              </div>
                              <Progress value={pct} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* CLAIMS */}
          <TabsContent value="claims">
            <Card>
              <CardContent className="pt-4">
                {claims.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No claims yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Beneficiary</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Status</TableHead>
                          {isAdmin && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map(cl => {
                          const camp = campaigns.find(c => c.id === cl.campaign_id);
                          return (
                            <TableRow key={cl.id}>
                              <TableCell className="font-medium text-sm">{camp?.name || '—'}</TableCell>
                              <TableCell className="text-sm">{beneficiaryName(cl)}</TableCell>
                              <TableCell className="text-sm">{cl.achieved_quantity}</TableCell>
                              <TableCell>
                                <Badge className={statusColor[cl.status]} variant="outline">{cl.status}</Badge>
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    {cl.status === 'pending' && (
                                      <>
                                        <Button size="sm" variant="outline" onClick={() => updateClaim(cl.id, 'approved')}>
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => updateClaim(cl.id, 'rejected')}>
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    )}
                                    {cl.status === 'approved' && (
                                      <Button size="sm" onClick={() => updateClaim(cl.id, 'delivered')}>
                                        Mark Delivered
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Top Reward Winners</CardTitle>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No rewards earned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((row, i) => (
                      <div key={row.name + i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{row.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{row.type}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{row.count} reward{row.count > 1 ? 's' : ''}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Rewards;
