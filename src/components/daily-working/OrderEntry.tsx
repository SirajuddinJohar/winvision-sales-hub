import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Distributor {
  id: string;
  name: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  order_qty: number;
}

interface SampleItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  qty_given: number;
}

interface OrderEntryProps {
  doctorId: string;
  doctorName: string;
  sampleData: SampleItem[];
  onComplete: () => void;
  onBack: () => void;
}

const OrderEntry = ({ doctorId, doctorName, sampleData, onComplete, onBack }: OrderEntryProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsResult, distributorsResult] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, price')
          .eq('product_type', 'regular')
          .order('name'),
        supabase
          .from('Distributors')
          .select('id, name')
          .order('name')
      ]);

      if (productsResult.error) throw productsResult.error;
      if (distributorsResult.error) throw distributorsResult.error;

      const items: OrderItem[] = (productsResult.data || []).map(product => ({
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        order_qty: 0
      }));

      setProducts(productsResult.data || []);
      setDistributors(distributorsResult.data || []);
      setOrderItems(items);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load products and distributors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderQuantity = (productId: string, qty: number) => {
    setOrderItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, order_qty: Math.max(0, qty) }
          : item
      )
    );
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + (item.order_qty * item.price), 0);
  };

  const handleDone = async () => {
    if (!selectedDistributor) {
      toast({
        title: "Distributor required",
        description: "Please select a distributor to continue",
        variant: "destructive"
      });
      return;
    }

    const ordersToPlace = orderItems.filter(item => item.order_qty > 0);
    
    if (ordersToPlace.length === 0) {
      toast({
        title: "No orders entered",
        description: "Please enter at least one order quantity to continue",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // Save daily working record
      const dailyWorkingRecord = {
        doctor_id: doctorId,
        mr_id: user?.id!,
        distributor_id: selectedDistributor,
        sample_details: sampleData as any,
        order_details: ordersToPlace as any
      };

      const { data: dailyWorkingData, error: dailyWorkingError } = await supabase
        .from('daily_working')
        .insert(dailyWorkingRecord)
        .select()
        .single();

      if (dailyWorkingError) throw dailyWorkingError;

      // Create individual order records
      const orderRecords = ordersToPlace.map(order => ({
        doctor_id: doctorId,
        pharmacy_id: selectedDistributor, // Using distributor as pharmacy for now
        product_id: order.product_id,
        quantity: order.order_qty,
        unit_price: order.price,
        total_amount: order.order_qty * order.price,
        mr_id: user?.id,
        order_date: new Date().toISOString().split('T')[0]
      }));

      const { error: ordersError } = await supabase
        .from('orders')
        .insert(orderRecords);

      if (ordersError) throw ordersError;

      toast({
        title: "Success!",
        description: `Daily working completed for ${doctorName}`,
      });

      onComplete();
    } catch (error) {
      console.error('Error saving daily working:', error);
      toast({
        title: "Error",
        description: "Failed to save daily working record",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Order Entry - {doctorName}
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Distributor *
          </label>
          <Select value={selectedDistributor} onValueChange={setSelectedDistributor}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a distributor..." />
            </SelectTrigger>
            <SelectContent>
              {distributors.map((distributor) => (
                <SelectItem key={distributor.id} value={distributor.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {distributor.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
            <div>Product Name</div>
            <div>Unit Price</div>
            <div>Order Qty</div>
            <div>Total</div>
          </div>

          {orderItems.map((item) => (
            <div key={item.product_id} className="grid grid-cols-4 gap-4 items-center py-3 border-b">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.product_name}</span>
              </div>
              
              <div className="text-center font-mono">
                ₹{item.price.toFixed(2)}
              </div>
              
              <div className="flex justify-center">
                <Input
                  type="number"
                  min="0"
                  value={item.order_qty}
                  onChange={(e) => updateOrderQuantity(item.product_id, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
              </div>
              
              <div className="text-center font-mono font-semibold">
                ₹{(item.order_qty * item.price).toFixed(2)}
              </div>
            </div>
          ))}

          <div className="border-t-2 pt-4">
            <div className="grid grid-cols-4 gap-4 font-bold text-lg">
              <div></div>
              <div></div>
              <div className="text-center">Total Amount:</div>
              <div className="text-center text-primary">
                ₹{getTotalAmount().toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button 
          onClick={handleDone} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? 'Saving...' : 'Done ✓'}
        </Button>
      </div>
    </div>
  );
};

export default OrderEntry;