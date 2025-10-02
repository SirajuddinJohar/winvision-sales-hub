import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Calendar, DollarSign, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import OrderForm from '@/components/orders/OrderForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

interface Order {
  id: string;
  order_date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  product: {
    name: string;
    category: string;
  };
  doctor: {
    name: string;
    specialty: string;
  };
  pharmacy: {
    name: string;
    address: string;
  };
  mr?: {
    name: string;
    email: string;
  };
}

const Orders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
          quantity,
          unit_price,
          total_amount,
          products:product_id (
            name,
            category
          ),
          doctors:doctor_id (
            name,
            specialty
          ),
          pharmacies:pharmacy_id (
            name,
            address
          ),
          users:mr_id (
            name,
            email
          )
        `)
        .order('order_date', { ascending: false });

      // Apply filters if admin
      if (isAdmin) {
        if (filters.dateFrom) {
          query = query.gte('order_date', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('order_date', filters.dateTo);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      let transformedOrders = (data || []).map(order => ({
        ...order,
        product: order.products,
        doctor: order.doctors,
        pharmacy: order.pharmacies,
        mr: order.users
      }));

      // Apply client-side filters for names (since we can't easily filter on nested fields)
      if (isAdmin && filters.doctor) {
        transformedOrders = transformedOrders.filter(order => 
          order.doctor?.name?.toLowerCase().includes(filters.doctor.toLowerCase())
        );
      }
      if (isAdmin && filters.pharmacy) {
        transformedOrders = transformedOrders.filter(order => 
          order.pharmacy?.name?.toLowerCase().includes(filters.pharmacy.toLowerCase())
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

  const handleFormCancel = () => {
    setShowForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

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
      <PageHeader 
        title="Orders" 
        description="Manage and track all orders"
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  placeholder="Filter by doctor..."
                  value={filters.doctor}
                  onChange={(e) => setFilters(prev => ({ ...prev, doctor: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  placeholder="Filter by pharmacy..."
                  value={filters.pharmacy}
                  onChange={(e) => setFilters(prev => ({ ...prev, pharmacy: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="From date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Input
                  type="date"
                  placeholder="To date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={fetchOrders}>Apply Filters</Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({ doctor: '', pharmacy: '', dateFrom: '', dateTo: '' });
                  fetchOrders();
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {order.product?.name || 'Product Name'}
                    </CardTitle>
                    <CardDescription>
                      {order.product?.category || 'Category'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {formatCurrency(order.total_amount)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(order.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Qty: {order.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {formatCurrency(order.unit_price)} per unit
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Doctor</p>
                    <p className="text-sm text-muted-foreground">
                      {order.doctor?.name || 'N/A'} - {order.doctor?.specialty || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pharmacy</p>
                    <p className="text-sm text-muted-foreground">
                      {order.pharmacy?.name || 'N/A'}
                    </p>
                  </div>
                  {isAdmin && order.mr && (
                    <div>
                      <p className="text-sm font-medium">Medical Rep</p>
                      <p className="text-sm text-muted-foreground">
                        {order.mr?.name} ({order.mr?.email})
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <OrderForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default Orders;