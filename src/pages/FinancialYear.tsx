import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Award,
  Calendar,
  Star,
  BarChart3,
} from 'lucide-react';

const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const FULL_MONTH_NAMES = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

function getFYOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  const options = [];
  for (let y = fyStartYear; y >= fyStartYear - 4; y--) {
    options.push({ label: `${y}-${String(y + 1).slice(2)}`, value: y });
  }
  return options;
}

function getFYRange(startYear: number) {
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface OrderRow {
  id: string;
  total_amount: number | null;
  order_date: string | null;
  product_id: string;
  quantity: number;
  mr_id: string;
  doctor_id: string | null;
}

interface ExpenseRow {
  id: string;
  amount: number;
  expense_date: string;
  expense_type: string;
  mr_id: string;
  status: string | null;
}

interface PurchaseRow {
  id: string;
  total_cost: number;
  purchase_date: string;
  product_id: string;
  quantity: number;
  supplier_name: string;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
}

interface DoctorRow {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  role: string | null;
}

const FinancialYear = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [fyYear, setFyYear] = useState<number>(getFYOptions()[0].value);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [prevYearOrders, setPrevYearOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'admin';
  const fyOptions = getFYOptions();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, fyYear]);

  const fetchData = async () => {
    setLoading(true);
    const range = getFYRange(fyYear);
    const prevRange = getFYRange(fyYear - 1);

    const [ordersRes, expensesRes, purchasesRes, productsRes, doctorsRes, usersRes, prevOrdersRes] = await Promise.all([
      supabase.from('orders').select('id, total_amount, order_date, product_id, quantity, mr_id, doctor_id')
        .gte('order_date', range.from).lte('order_date', range.to),
      supabase.from('expenses').select('id, amount, expense_date, expense_type, mr_id, status')
        .gte('expense_date', range.from).lte('expense_date', range.to),
      isAdmin
        ? supabase.from('purchases').select('id, total_cost, purchase_date, product_id, quantity, supplier_name')
            .gte('purchase_date', range.from).lte('purchase_date', range.to)
        : Promise.resolve({ data: [] }),
      supabase.from('products').select('id, name, category'),
      supabase.from('doctors').select('id, name'),
      isAdmin ? supabase.from('users').select('id, name, role') : Promise.resolve({ data: [] }),
      supabase.from('orders').select('id, total_amount, order_date, product_id, quantity, mr_id, doctor_id')
        .gte('order_date', prevRange.from).lte('order_date', prevRange.to),
    ]);

    setOrders((ordersRes.data || []) as OrderRow[]);
    setExpenses((expensesRes.data || []) as ExpenseRow[]);
    setPurchases((purchasesRes.data || []) as PurchaseRow[]);
    setProducts((productsRes.data || []) as ProductRow[]);
    setDoctors((doctorsRes.data || []) as DoctorRow[]);
    setUsers((usersRes.data || []) as UserRow[]);
    setPrevYearOrders((prevOrdersRes.data || []) as OrderRow[]);
    setLoading(false);
  };

  // Calculations
  const totalSales = useMemo(() => orders.reduce((s, o) => s + (o.total_amount || 0), 0), [orders]);
  const totalExpenses = useMemo(() => expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalPurchases = useMemo(() => purchases.reduce((s, p) => s + p.total_cost, 0), [purchases]);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const totalOrders = orders.length;
  const totalQty = useMemo(() => orders.reduce((s, o) => s + o.quantity, 0), [orders]);
  const prevYearSales = useMemo(() => prevYearOrders.reduce((s, o) => s + (o.total_amount || 0), 0), [prevYearOrders]);
  const growthPercent = prevYearSales > 0 ? ((totalSales - prevYearSales) / prevYearSales) * 100 : 0;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const data = MONTH_NAMES.map((m, i) => {
      const monthNum = i < 9 ? i + 4 : i - 8; // Apr=4, ..., Dec=12, Jan=1, Feb=2, Mar=3
      const year = monthNum >= 4 ? fyYear : fyYear + 1;
      const monthOrders = orders.filter(o => {
        if (!o.order_date) return false;
        const d = new Date(o.order_date);
        return d.getMonth() + 1 === monthNum && d.getFullYear() === year;
      });
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() + 1 === monthNum && d.getFullYear() === year && e.status === 'approved';
      });
      const sales = monthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
      const exp = monthExpenses.reduce((s, e) => s + e.amount, 0);
      return { month: m, fullMonth: FULL_MONTH_NAMES[i], sales, expenses: exp, profit: sales - exp, orders: monthOrders.length, qty: monthOrders.reduce((s, o) => s + o.quantity, 0) };
    });
    return data;
  }, [orders, expenses, fyYear]);

  // Product performance
  const productData = useMemo(() => {
    const productMap = new Map<string, { qty: number; revenue: number }>();
    orders.forEach(o => {
      const existing = productMap.get(o.product_id) || { qty: 0, revenue: 0 };
      existing.qty += o.quantity;
      existing.revenue += o.total_amount || 0;
      productMap.set(o.product_id, existing);
    });
    const result = Array.from(productMap.entries()).map(([pid, data]) => {
      const product = products.find(p => p.id === pid);
      return { name: product?.name || 'Unknown', category: product?.category || '', ...data, share: totalSales > 0 ? (data.revenue / totalSales) * 100 : 0 };
    }).sort((a, b) => b.revenue - a.revenue);
    return result;
  }, [orders, products, totalSales]);

  // MR performance (admin only)
  const mrData = useMemo(() => {
    if (!isAdmin) return [];
    const mrMap = new Map<string, { orders: number; sales: number }>();
    orders.forEach(o => {
      const existing = mrMap.get(o.mr_id) || { orders: 0, sales: 0 };
      existing.orders += 1;
      existing.sales += o.total_amount || 0;
      mrMap.set(o.mr_id, existing);
    });
    return Array.from(mrMap.entries()).map(([mrId, data]) => {
      const u = users.find(u => u.id === mrId);
      return { name: u?.name || 'Unknown', ...data };
    }).sort((a, b) => b.sales - a.sales);
  }, [orders, users, isAdmin]);

  // Doctor activity
  const doctorData = useMemo(() => {
    const docMap = new Map<string, number>();
    orders.forEach(o => {
      if (o.doctor_id) {
        docMap.set(o.doctor_id, (docMap.get(o.doctor_id) || 0) + (o.total_amount || 0));
      }
    });
    return Array.from(docMap.entries()).map(([did, amount]) => {
      const doc = doctors.find(d => d.id === did);
      return { name: doc?.name || 'Unknown', amount, share: totalSales > 0 ? (amount / totalSales) * 100 : 0 };
    }).sort((a, b) => b.amount - a.amount);
  }, [orders, doctors, totalSales]);

  // Expense by type
  const expenseByType = useMemo(() => {
    const typeMap = new Map<string, number>();
    expenses.filter(e => e.status === 'approved').forEach(e => {
      typeMap.set(e.expense_type, (typeMap.get(e.expense_type) || 0) + e.amount);
    });
    return Array.from(typeMap.entries()).map(([type, amount]) => ({ type, amount })).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Key highlights
  const highlights = useMemo(() => {
    const topProduct = productData[0]?.name || 'N/A';
    const bestMR = mrData[0]?.name || (profile?.name || 'N/A');
    const highestMonth = [...monthlyData].sort((a, b) => b.sales - a.sales)[0]?.fullMonth || 'N/A';
    const biggestExpense = expenseByType[0]?.type || 'N/A';
    return { topProduct, bestMR, highestMonth, biggestExpense };
  }, [productData, mrData, monthlyData, expenseByType, profile]);

  const chartConfig = {
    sales: { label: 'Sales', color: 'hsl(var(--primary))' },
    expenses: { label: 'Expenses', color: 'hsl(var(--destructive))' },
    profit: { label: 'Profit', color: 'hsl(142 70% 45%)' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-3 md:p-6">
        <PageHeader title="Financial Year Report" description="Loading..." />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader title="Financial Year Report" description="Winvision — Complete yearly overview" />
        <Select value={String(fyYear)} onValueChange={(v) => setFyYear(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fyOptions.map(opt => (
              <SelectItem key={opt.value} value={String(opt.value)}>FY {opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cover Info */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Winvision</h2>
              <p className="text-sm text-muted-foreground">Financial Year {fyYear}–{String(fyYear + 1).slice(2)} • Prepared by {profile?.name}</p>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date().toLocaleDateString('en-IN')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-primary/10"><ShoppingCart className="h-4 w-4 text-primary" /></div>
              <span className="text-xs text-muted-foreground">Total Sales</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{formatCurrency(totalSales)}</p>
            <p className="text-[10px] text-muted-foreground">{totalOrders} orders • {totalQty} qty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-destructive/10"><Receipt className="h-4 w-4 text-destructive" /></div>
              <span className="text-xs text-muted-foreground">Total Expenses</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{formatCurrency(totalExpenses)}</p>
            <p className="text-[10px] text-muted-foreground">{expenses.filter(e => e.status === 'approved').length} approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? 'bg-green-100' : 'bg-destructive/10'}`}>
                {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </div>
              <span className="text-xs text-muted-foreground">Net Profit</span>
            </div>
            <p className={`text-lg md:text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(netProfit)}</p>
            <p className="text-[10px] text-muted-foreground">{totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${growthPercent >= 0 ? 'bg-green-100' : 'bg-destructive/10'}`}>
                {growthPercent >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
              </div>
              <span className="text-xs text-muted-foreground">YoY Growth</span>
            </div>
            <p className={`text-lg md:text-xl font-bold ${growthPercent >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">vs FY {fyYear - 1}–{String(fyYear).slice(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-0">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Monthly Sales vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          <ChartContainer config={chartConfig} className="h-[200px] md:h-[280px] w-full">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tabs for detailed sections */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="w-full flex overflow-x-auto">
          <TabsTrigger value="monthly" className="flex-1 text-xs">Monthly</TabsTrigger>
          <TabsTrigger value="products" className="flex-1 text-xs">Products</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 text-xs">Expenses</TabsTrigger>
          {isAdmin && <TabsTrigger value="mr" className="flex-1 text-xs">MR</TabsTrigger>}
          <TabsTrigger value="doctors" className="flex-1 text-xs">Doctors</TabsTrigger>
        </TabsList>

        {/* Monthly Breakdown */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Monthly Breakdown (Apr–Mar)</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Month</TableHead>
                      <TableHead className="text-xs text-right">Sales</TableHead>
                      <TableHead className="text-xs text-right">Expenses</TableHead>
                      <TableHead className="text-xs text-right">Profit</TableHead>
                      <TableHead className="text-xs text-right">Orders</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell className="text-xs font-medium">{m.fullMonth}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(m.sales)}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(m.expenses)}</TableCell>
                        <TableCell className={`text-xs text-right font-medium ${m.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(m.profit)}</TableCell>
                        <TableCell className="text-xs text-right">{m.orders}</TableCell>
                        <TableCell className="text-xs text-right">{m.qty}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(totalSales)}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(totalExpenses)}</TableCell>
                      <TableCell className={`text-xs text-right ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(netProfit)}</TableCell>
                      <TableCell className="text-xs text-right">{totalOrders}</TableCell>
                      <TableCell className="text-xs text-right">{totalQty}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Performance */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Product Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Product</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                      <TableHead className="text-xs text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productData.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No product sales this FY</TableCell></TableRow>
                    ) : productData.map((p, i) => (
                      <TableRow key={p.name}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs text-right">{p.qty}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(p.revenue)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Progress value={p.share} className="w-12 h-1.5" />
                            <span>{p.share.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Breakdown */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseByType.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No approved expenses this FY</TableCell></TableRow>
                    ) : expenseByType.map((e) => (
                      <TableRow key={e.type}>
                        <TableCell className="text-xs font-medium capitalize">{e.type}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(e.amount)}</TableCell>
                        <TableCell className="text-xs text-right">{totalExpenses > 0 ? ((e.amount / totalExpenses) * 100).toFixed(1) : 0}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(totalExpenses)}</TableCell>
                      <TableCell className="text-xs text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MR Performance (Admin only) */}
        {isAdmin && (
          <TabsContent value="mr">
            <Card>
              <CardHeader className="p-3 md:p-4 pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> MR Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-2">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">MR Name</TableHead>
                        <TableHead className="text-xs text-right">Orders</TableHead>
                        <TableHead className="text-xs text-right">Sales Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mrData.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No MR data</TableCell></TableRow>
                      ) : mrData.map((m, i) => (
                        <TableRow key={m.name}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs font-medium">{m.name}</TableCell>
                          <TableCell className="text-xs text-right">{m.orders}</TableCell>
                          <TableCell className="text-xs text-right">{formatCurrency(m.sales)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Doctor Activity */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader className="p-3 md:p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Doctor Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Doctor</TableHead>
                      <TableHead className="text-xs text-right">Business</TableHead>
                      <TableHead className="text-xs text-right">Activity %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorData.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">No doctor activity this FY</TableCell></TableRow>
                    ) : doctorData.slice(0, 20).map((d, i) => (
                      <TableRow key={d.name + i}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{d.name}</TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(d.amount)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Progress value={d.share} className="w-12 h-1.5" />
                            <span>{d.share.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* P&L Statement */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Total Revenue (Sales)</span>
              <span className="text-sm font-bold">{formatCurrency(totalSales)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm">Total Expenses</span>
              <span className="text-sm font-bold text-destructive">- {formatCurrency(totalExpenses)}</span>
            </div>
            <div className={`flex justify-between items-center py-3 rounded-lg px-3 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="text-sm font-bold">{netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
              <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(Math.abs(netProfit))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Highlights */}
      <Card className="bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Key Highlights</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 rounded-lg bg-card border">
              <p className="text-[10px] text-muted-foreground">🏆 Top Product</p>
              <p className="text-xs font-bold truncate">{highlights.topProduct}</p>
            </div>
            <div className="p-2 rounded-lg bg-card border">
              <p className="text-[10px] text-muted-foreground">⭐ Best MR</p>
              <p className="text-xs font-bold truncate">{highlights.bestMR}</p>
            </div>
            <div className="p-2 rounded-lg bg-card border">
              <p className="text-[10px] text-muted-foreground">📈 Best Month</p>
              <p className="text-xs font-bold truncate">{highlights.highestMonth}</p>
            </div>
            <div className="p-2 rounded-lg bg-card border">
              <p className="text-[10px] text-muted-foreground">💸 Biggest Expense</p>
              <p className="text-xs font-bold truncate capitalize">{highlights.biggestExpense}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialYear;
