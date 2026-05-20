import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Gift, Package, Download, ArrowUpDown } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

interface ProductRow {
  product_id: string;
  name: string;
  category: string;
  salesQty: number;
  schemeQty: number;
  sampleQty: number;
}

interface MRRow {
  mr_id: string;
  name: string;
  salesQty: number;
  schemeQty: number;
  sampleQty: number;
}

/**
 * Parse a scheme string like "10+2", "10 + 2", or plain "2" into free qty.
 * baseQty is the ordered quantity (the "10" side); we return only the free qty.
 */
function parseSchemeFreeQty(scheme: string | null | undefined): number {
  if (!scheme) return 0;
  const s = String(scheme).trim();
  if (!s) return 0;
  const plus = s.match(/(\d+)\s*\+\s*(\d+)/);
  if (plus) return Number(plus[2]) || 0;
  const single = s.match(/^(\d+)$/);
  if (single) return Number(single[1]) || 0;
  return 0;
}

const ProductAnalytics = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<{ id: string; name: string; category: string }[]>([]);
  const [mrs, setMrs] = useState<{ id: string; name: string }[]>([]);
  const [selectedMr, setSelectedMr] = useState<string>('all');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [sampleRecords, setSampleRecords] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<'name' | 'salesQty' | 'schemeQty' | 'sampleQty' | 'total'>('total');

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);
  const monthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  }, []);
  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    []
  );

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMr]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Load products
      const prodRes = await supabase.from('products').select('id, name, category').order('name');
      setProducts(prodRes.data || []);

      // Load MRs (admin only)
      if (isAdmin) {
        const mrRes = await supabase.from('users').select('id, name, role').eq('role', 'mr').order('name');
        setMrs((mrRes.data || []).map((u: any) => ({ id: u.id, name: u.name })));
      }

      // Orders in current month
      let ordersQuery = supabase
        .from('orders')
        .select('id, mr_id, order_date')
        .gte('order_date', monthStart)
        .lte('order_date', monthEnd);
      if (isAdmin && selectedMr !== 'all') ordersQuery = ordersQuery.eq('mr_id', selectedMr);
      const ordersRes = await ordersQuery;
      const orderIds = (ordersRes.data || []).map((o: any) => o.id);
      const orderMrMap = new Map<string, string>(
        (ordersRes.data || []).map((o: any) => [o.id, o.mr_id])
      );

      // Order items for those orders
      let items: any[] = [];
      if (orderIds.length > 0) {
        const itemsRes = await supabase
          .from('order_items')
          .select('order_id, product_id, quantity, scheme')
          .in('order_id', orderIds);
        items = (itemsRes.data || []).map((i: any) => ({
          ...i,
          mr_id: orderMrMap.get(i.order_id),
        }));
      }
      setOrderItems(items);

      // Sample records (daily_working in current month)
      let dwQuery = supabase
        .from('daily_working')
        .select('mr_id, sample_details, work_date')
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd);
      if (isAdmin && selectedMr !== 'all') dwQuery = dwQuery.eq('mr_id', selectedMr);
      const dwRes = await dwQuery;
      setSampleRecords(dwRes.data || []);
    } catch (err) {
      console.error('ProductAnalytics fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate per product
  const productRows: ProductRow[] = useMemo(() => {
    const map = new Map<string, ProductRow>();
    const ensure = (pid: string) => {
      if (!map.has(pid)) {
        const p = products.find(p => p.id === pid);
        map.set(pid, {
          product_id: pid,
          name: p?.name || 'Unknown product',
          category: p?.category || '-',
          salesQty: 0,
          schemeQty: 0,
          sampleQty: 0,
        });
      }
      return map.get(pid)!;
    };

    for (const it of orderItems) {
      if (!it.product_id) continue;
      const row = ensure(it.product_id);
      row.salesQty += Number(it.quantity || 0);
      row.schemeQty += parseSchemeFreeQty(it.scheme);
    }

    for (const r of sampleRecords) {
      const arr = Array.isArray(r.sample_details) ? r.sample_details : [];
      for (const s of arr) {
        const pid = s?.product_id;
        const qty = Number(s?.quantity || 0);
        if (!pid || !qty) continue;
        const row = ensure(pid);
        row.sampleQty += qty;
      }
    }

    return Array.from(map.values());
  }, [orderItems, sampleRecords, products]);

  const mrRows: MRRow[] = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, MRRow>();
    const ensure = (mid: string) => {
      if (!map.has(mid)) {
        const m = mrs.find(x => x.id === mid);
        map.set(mid, {
          mr_id: mid,
          name: m?.name || 'Unknown MR',
          salesQty: 0,
          schemeQty: 0,
          sampleQty: 0,
        });
      }
      return map.get(mid)!;
    };

    for (const it of orderItems) {
      if (!it.mr_id) continue;
      const row = ensure(it.mr_id);
      row.salesQty += Number(it.quantity || 0);
      row.schemeQty += parseSchemeFreeQty(it.scheme);
    }
    for (const r of sampleRecords) {
      if (!r.mr_id) continue;
      const arr = Array.isArray(r.sample_details) ? r.sample_details : [];
      const total = arr.reduce((s: number, x: any) => s + Number(x?.quantity || 0), 0);
      if (total > 0) ensure(r.mr_id).sampleQty += total;
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.salesQty + b.schemeQty + b.sampleQty) - (a.salesQty + a.schemeQty + a.sampleQty)
    );
  }, [orderItems, sampleRecords, mrs, isAdmin]);

  const sortedProductRows = useMemo(() => {
    const arr = [...productRows];
    arr.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'total')
        return (b.salesQty + b.schemeQty + b.sampleQty) - (a.salesQty + a.schemeQty + a.sampleQty);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return arr;
  }, [productRows, sortKey]);

  const totals = useMemo(() => {
    return productRows.reduce(
      (acc, r) => ({
        sales: acc.sales + r.salesQty,
        scheme: acc.scheme + r.schemeQty,
        sample: acc.sample + r.sampleQty,
      }),
      { sales: 0, scheme: 0, sample: 0 }
    );
  }, [productRows]);

  const exportCSV = () => {
    const header = ['Product', 'Category', 'Sales Qty', 'Scheme Qty', 'Sample Qty', 'Total Movement'];
    const lines = [header.join(',')];
    for (const r of sortedProductRows) {
      const total = r.salesQty + r.schemeQty + r.sampleQty;
      lines.push(
        [
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.category.replace(/"/g, '""')}"`,
          r.salesQty,
          r.schemeQty,
          r.sampleQty,
          total,
        ].join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-analytics-${monthLabel.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Product Analytics"
        description={`Sales, Scheme & Sample movement — ${monthLabel}`}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:p-4 flex flex-col md:flex-row gap-2.5 md:gap-4 md:items-end">
            {isAdmin && (
              <div className="flex-1 space-y-1.5">
                <label className="text-xs md:text-sm font-medium">Filter by MR</label>
                <Select value={selectedMr} onValueChange={setSelectedMr}>
                  <SelectTrigger className="h-9 md:h-10 text-sm">
                    <SelectValue placeholder="All MRs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MRs</SelectItem>
                    {mrs.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV} className="h-9 md:h-10 text-xs md:text-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card>
            <CardContent className="p-3 md:p-4 flex items-center gap-2.5">
              <div className="p-1.5 md:p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Sales Qty</p>
                <p className="text-base md:text-2xl font-bold">{totals.sales}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 flex items-center gap-2.5">
              <div className="p-1.5 md:p-2 rounded-lg bg-orange-500/10">
                <Gift className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Scheme Qty</p>
                <p className="text-base md:text-2xl font-bold">{totals.scheme}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 flex items-center gap-2.5">
              <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Sample Qty</p>
                <p className="text-base md:text-2xl font-bold">{totals.sample}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product table */}
        <Card>
          <CardHeader className="p-3 md:p-4 pb-2">
            <CardTitle className="text-base md:text-lg">Per Product</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : sortedProductRows.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                No product movement for {monthLabel}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs cursor-pointer" onClick={() => setSortKey('name')}>
                        Product <ArrowUpDown className="inline h-3 w-3" />
                      </TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right cursor-pointer" onClick={() => setSortKey('salesQty')}>
                        Sales <ArrowUpDown className="inline h-3 w-3" />
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer" onClick={() => setSortKey('schemeQty')}>
                        Scheme <ArrowUpDown className="inline h-3 w-3" />
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer" onClick={() => setSortKey('sampleQty')}>
                        Sample <ArrowUpDown className="inline h-3 w-3" />
                      </TableHead>
                      <TableHead className="text-xs text-right cursor-pointer" onClick={() => setSortKey('total')}>
                        Total <ArrowUpDown className="inline h-3 w-3" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProductRows.map(r => (
                      <TableRow key={r.product_id}>
                        <TableCell className="text-xs md:text-sm font-medium">{r.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.category}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right text-green-600 font-semibold">{r.salesQty}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right text-orange-600 font-semibold">{r.schemeQty}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right text-blue-600 font-semibold">{r.sampleQty}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right font-bold">
                          {r.salesQty + r.schemeQty + r.sampleQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per MR breakdown (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-base md:text-lg">Per MR Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : mrRows.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                  No MR activity for {monthLabel}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">MR Name</TableHead>
                        <TableHead className="text-xs text-right">Sales Qty</TableHead>
                        <TableHead className="text-xs text-right">Scheme Qty</TableHead>
                        <TableHead className="text-xs text-right">Sample Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mrRows.map(r => (
                        <TableRow key={r.mr_id}>
                          <TableCell className="text-xs md:text-sm font-medium">{r.name}</TableCell>
                          <TableCell className="text-xs md:text-sm text-right text-green-600 font-semibold">{r.salesQty}</TableCell>
                          <TableCell className="text-xs md:text-sm text-right text-orange-600 font-semibold">{r.schemeQty}</TableCell>
                          <TableCell className="text-xs md:text-sm text-right text-blue-600 font-semibold">{r.sampleQty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductAnalytics;
