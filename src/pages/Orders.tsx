import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Package, Calendar, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
}

const Orders = () => {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
          )
        `)
        .order('order_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedOrders = (data || []).map(order => ({
        ...order,
        product: order.products,
        doctor: order.doctors,
        pharmacy: order.pharmacies
      }));
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all orders
          </p>
        </div>
        {profile?.role === 'admin' && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        )}
      </div>

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
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;