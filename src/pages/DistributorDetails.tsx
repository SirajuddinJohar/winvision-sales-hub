import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, Package, TrendingUp, Receipt } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DistributorProductForm from '@/components/distributors/DistributorProductForm';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  city: string;
  address: string;
}

interface DistributorProduct {
  id: string;
  distributor_id: string;
  product_id: string;
  quantity: number;
  ptr: number;
  products: { name: string; category: string };
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  scheme: string | null;
  products: { name: string } | null;
}

interface OrderRow {
  id: string;
  order_date: string;
  total_amount: number;
  doctor_id: string | null;
  pharmacy_id: string;
  doctors: { name: string } | null;
  order_items: OrderItem[];
}

const DistributorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [products, setProducts] = useState<DistributorProduct[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [monthlyByDist, setMonthlyByDist] = useState<{ id: string; name: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DistributorProduct | null>(null);

  useEffect(() => {
    if (id) {
      Promise.all([fetchDistributor(), fetchProducts(), fetchOrders(), fetchMonthlyAll()]).finally(
        () => setLoading(false)
      );
    }
  }, [id]);

  const fetchDistributor = async () => {
    const { data, error } = await supabase.from('Distributors').select('*').eq('id', id).single();
    if (error) {
      toast({ title: 'Error', description: 'Failed to load distributor', variant: 'destructive' });
      return;
    }
    setDistributor(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('distributor_products')
      .select(`*, products (name, category)`)
      .eq('distributor_id', id)
      .order('products(name)');
    setProducts(data || []);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_date, total_amount, doctor_id, pharmacy_id,
        doctors:doctor_id ( name ),
        order_items ( id, product_id, quantity, unit_price, total_amount, scheme, products:product_id ( name ) )
      `)
      .eq('pharmacy_id', id)
      .order('order_date', { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setOrders((data as any) || []);
  };

  const fetchMonthlyAll = async () => {
    const start = new Date();
    start.setDate(1);
    const startStr = start.toISOString().split('T')[0];
    const [{ data: dists }, { data: ords }] = await Promise.all([
      supabase.from('Distributors').select('id, name'),
      supabase.from('orders').select('pharmacy_id, total_amount').gte('order_date', startStr),
    ]);
    const totals: Record<string, number> = {};
    (ords || []).forEach((o: any) => {
      totals[o.pharmacy_id] = (totals[o.pharmacy_id] || 0) + Number(o.total_amount || 0);
    });
    const rows = (dists || [])
      .map((d: any) => ({ id: d.id, name: d.name, total: totals[d.id] || 0 }))
      .sort((a, b) => b.total - a.total);
    setMonthlyByDist(rows);
  };

  const handleAddProduct = () => { setEditingProduct(null); setShowForm(true); };
  const handleEditProduct = (p: DistributorProduct) => { setEditingProduct(p); setShowForm(true); };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product?')) return;
    const { error } = await supabase.from('distributor_products').delete().eq('id', productId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove product', variant: 'destructive' });
      return;
    }
    toast({ title: 'Product removed successfully' });
    fetchProducts();
  };

  const handleFormSuccess = () => { setShowForm(false); setEditingProduct(null); fetchProducts(); };
  const handleFormCancel = () => { setShowForm(false); setEditingProduct(null); };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

  const monthLabel = useMemo(
    () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    []
  );

  const ordersTotal = useMemo(
    () => orders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    [orders]
  );

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6 p-3 md:p-6">
        <Skeleton className="h-16 md:h-20 w-full" />
        <Skeleton className="h-72 md:h-96 w-full" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <p className="text-muted-foreground mb-4 text-xs md:text-sm">Distributor not found</p>
        <Button onClick={() => navigate('/dashboard/distributors')} size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={distributor.name}
        description={`${distributor.city} - ${distributor.contact_person} (${distributor.phone})`}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex justify-between items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/distributors')} size="sm" className="h-9 text-xs md:text-sm">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />Back
          </Button>
          {profile?.role === 'admin' && (
            <Button onClick={handleAddProduct} size="sm" className="h-9 text-xs md:text-sm">
              <Plus className="mr-1 h-3.5 w-3.5" />Add Product
            </Button>
          )}
        </div>

        {/* Monthly sale of all stockists */}
        <Card>
          <CardHeader className="p-3 md:p-4 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Monthly Sale by Stockist — {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Stockist</TableHead>
                    <TableHead className="text-xs text-right">Total Sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyByDist.map((r) => (
                    <TableRow
                      key={r.id}
                      className={r.id === id ? 'bg-primary/5 font-medium cursor-pointer' : 'cursor-pointer'}
                      onClick={() => r.id !== id && navigate(`/dashboard/distributors/${r.id}`)}
                    >
                      <TableCell className="text-xs md:text-sm py-2">
                        {r.name} {r.id === id && <Badge variant="secondary" className="ml-1 text-[10px]">current</Badge>}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-2 text-right">{formatCurrency(r.total)}</TableCell>
                    </TableRow>
                  ))}
                  {monthlyByDist.length === 0 && (
                    <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-3">No data</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="text-xs md:text-sm">Grand Total</TableCell>
                    <TableCell className="text-xs md:text-sm text-right">
                      {formatCurrency(monthlyByDist.reduce((s, r) => s + r.total, 0))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="sales" className="text-xs md:text-sm">Sales</TabsTrigger>
            <TabsTrigger value="products" className="text-xs md:text-sm">Products</TabsTrigger>
          </TabsList>

          {/* Sales tab - orders to this distributor */}
          <TabsContent value="sales" className="space-y-3 mt-3">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <Receipt className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-xs md:text-sm">No sales recorded for this distributor</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="p-3 md:p-4 flex items-center justify-between">
                    <span className="text-xs md:text-sm text-muted-foreground">Total Sales ({orders.length} orders)</span>
                    <span className="text-sm md:text-lg font-bold">{formatCurrency(ordersTotal)}</span>
                  </CardContent>
                </Card>

                {orders.map((order) => {
                  const orderQty = order.order_items.reduce((s, i) => s + (i.quantity || 0), 0);
                  return (
                    <Card key={order.id}>
                      <CardHeader className="p-3 pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm md:text-base">
                              {order.doctors?.name || 'Direct Retail'}
                            </CardTitle>
                            <p className="text-[11px] md:text-xs text-muted-foreground">
                              {new Date(order.order_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {formatCurrency(Number(order.total_amount || 0))}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Product</TableHead>
                                <TableHead className="text-xs text-right">Qty</TableHead>
                                <TableHead className="text-xs text-right">Free</TableHead>
                                <TableHead className="text-xs text-right">Rate</TableHead>
                                <TableHead className="text-xs text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.order_items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-xs md:text-sm py-2">{item.products?.name || '—'}</TableCell>
                                  <TableCell className="text-xs md:text-sm py-2 text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-xs md:text-sm py-2 text-right">{item.scheme || '-'}</TableCell>
                                  <TableCell className="text-xs md:text-sm py-2 text-right">{formatCurrency(Number(item.unit_price || 0))}</TableCell>
                                  <TableCell className="text-xs md:text-sm py-2 text-right">{formatCurrency(Number(item.total_amount || 0))}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell className="text-xs md:text-sm">Total</TableCell>
                                <TableCell className="text-xs md:text-sm text-right">{orderQty}</TableCell>
                                <TableCell />
                                <TableCell />
                                <TableCell className="text-xs md:text-sm text-right font-bold">
                                  {formatCurrency(Number(order.total_amount || 0))}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Products tab */}
          <TabsContent value="products" className="mt-3">
            {products.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6 md:py-8">
                  <Package className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-xs md:text-sm">No products available</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs md:text-sm">Product Name</TableHead>
                          <TableHead className="text-xs md:text-sm">Category</TableHead>
                          <TableHead className="text-xs md:text-sm text-right">Quantity</TableHead>
                          <TableHead className="text-xs md:text-sm text-right">PTR</TableHead>
                          {profile?.role === 'admin' && (
                            <TableHead className="text-xs md:text-sm text-right">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium text-xs md:text-sm py-2">{product.products.name}</TableCell>
                            <TableCell className="text-xs md:text-sm py-2">{product.products.category}</TableCell>
                            <TableCell className="text-xs md:text-sm text-right py-2">{product.quantity}</TableCell>
                            <TableCell className="text-xs md:text-sm text-right py-2">{formatCurrency(product.ptr)}</TableCell>
                            {profile?.role === 'admin' && (
                              <TableCell className="text-right py-2">
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)} className="h-8 w-8 p-0">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)} className="h-8 w-8 p-0">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[90vw] md:max-w-2xl">
            <DistributorProductForm
              distributorId={id!}
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DistributorDetails;
