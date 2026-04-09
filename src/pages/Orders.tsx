import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Package, Calendar, DollarSign, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import OrderForm from '@/components/orders/OrderForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  scheme: string | null;
  product?: { name: string; category: string };
}

interface Order {
  id: string;
  order_date: string;
  total_amount: number | null;
  doctor?: { name: string; specialty: string } | null;
  pharmacy?: { name: string; address: string } | null;
  mr?: { name: string; email: string } | null;
  items: OrderItem[];
}

const Orders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    doctor: '',
    pharmacy: '',
    dateFrom: '',
    dateTo: '',
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchOrders();
  }, [profile]);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          doctors:doctor_id (name, specialty),
          pharmacies:pharmacy_id (name, address),
          users:mr_id (name, email)
        `)
        .order('order_date', { ascending: false });

      if (isAdmin) {
        if (filters.dateFrom) query = query.gte('order_date', filters.dateFrom);
        if (filters.dateTo) query = query.lte('order_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch all order_items for these orders
      const orderIds = (data || []).map(o => o.id);
      let items: any[] = [];
      if (orderIds.length > 0) {
        // Fetch in batches if needed (Supabase IN limit)
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`id, order_id, product_id, quantity, unit_price, total_amount, scheme, products:product_id (name, category)`)
          .in('order_id', orderIds);
        if (!itemsError) items = itemsData || [];
      }

      let transformedOrders: Order[] = (data || []).map((order: any) => ({
        id: order.id,
        order_date: order.order_date,
        total_amount: order.total_amount,
        doctor: order.doctors,
        pharmacy: order.pharmacies,
        mr: order.users,
        items: items
          .filter((i: any) => i.order_id === order.id)
          .map((i: any) => ({
            ...i,
            product: i.products,
          })),
      }));

      // Client-side name filters
      if (isAdmin && filters.doctor) {
        transformedOrders = transformedOrders.filter(o =>
          o.doctor?.name?.toLowerCase().includes(filters.doctor.toLowerCase())
        );
      }
      if (isAdmin && filters.pharmacy) {
        transformedOrders = transformedOrders.filter(o =>
          o.pharmacy?.name?.toLowerCase().includes(filters.pharmacy.toLowerCase())
        );
      }

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchOrders();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Orders" description="Manage and track all orders" />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex justify-end">
          <Button size="sm" className="h-8 md:h-10 text-xs md:text-sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            New Order
          </Button>
        </div>

        {isAdmin && (
          <Card className="mb-3 md:mb-6">
            <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                <Input placeholder="Filter by doctor..." value={filters.doctor}
                  onChange={(e) => setFilters(prev => ({ ...prev, doctor: e.target.value }))}
                  className="h-8 md:h-10 text-xs md:text-sm" />
                <Input placeholder="Filter by pharmacy..." value={filters.pharmacy}
                  onChange={(e) => setFilters(prev => ({ ...prev, pharmacy: e.target.value }))}
                  className="h-8 md:h-10 text-xs md:text-sm" />
                <Input type="date" value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="h-8 md:h-10 text-xs md:text-sm" />
                <Input type="date" value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="h-8 md:h-10 text-xs md:text-sm" />
              </div>
              <div className="flex gap-2 mt-3 md:mt-4">
                <Button size="sm" className="h-8 md:h-10 text-xs md:text-sm" onClick={fetchOrders}>Apply Filters</Button>
                <Button variant="outline" size="sm" className="h-8 md:h-10 text-xs md:text-sm"
                  onClick={() => { setFilters({ doctor: '', pharmacy: '', dateFrom: '', dateTo: '' }); fetchOrders(); }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 md:py-8">
              <Package className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
              <p className="text-sm md:text-base text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 md:gap-4">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              const itemCount = order.items.length;
              return (
                <Card key={order.id}>
                  <CardHeader className="p-3 md:p-6 pb-2 md:pb-4 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm md:text-lg flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary shrink-0" />
                          Order #{order.id.slice(0, 8)}
                          <Badge variant="outline" className="text-[10px] md:text-xs">
                            {itemCount} {itemCount === 1 ? 'product' : 'products'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs md:text-sm mt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(order.order_date).toLocaleDateString('en-IN')}
                            {order.pharmacy?.name && <> • {order.pharmacy.name}</>}
                            {order.doctor?.name && <> • Dr. {order.doctor.name}</>}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs md:text-sm">
                          {formatCurrency(order.total_amount || 0)}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-5 gap-2 p-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                          <div className="col-span-2">Product</div>
                          <div className="text-center">Qty</div>
                          <div className="text-center">Scheme</div>
                          <div className="text-right">Amount</div>
                        </div>
                        {order.items.map((item) => (
                          <div key={item.id} className="grid grid-cols-5 gap-2 p-2 border-t text-xs md:text-sm">
                            <div className="col-span-2 font-medium truncate">
                              {item.product?.name || 'Unknown'}
                            </div>
                            <div className="text-center">{item.quantity}</div>
                            <div className="text-center text-primary">{item.scheme || '-'}</div>
                            <div className="text-right font-mono">{formatCurrency(item.total_amount || 0)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                        {order.doctor?.name && (
                          <div>
                            <p className="text-xs md:text-sm font-medium">Doctor</p>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {order.doctor.name} - {order.doctor?.specialty || 'N/A'}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs md:text-sm font-medium">Pharmacy</p>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {order.pharmacy?.name || 'N/A'}
                          </p>
                        </div>
                        {isAdmin && order.mr && (
                          <div>
                            <p className="text-xs md:text-sm font-medium">Medical Rep</p>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {order.mr?.name} ({order.mr?.email})
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <OrderForm onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Orders;