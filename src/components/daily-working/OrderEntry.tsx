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

interface DistributorProduct {
  product_id: string;
  product_name: string;
  ptr: number;
  available_qty: number;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  price: number;
  available_qty: number;
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
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDistributors();
  }, []);

  useEffect(() => {
    if (selectedDistributor) {
      fetchDistributorProducts(selectedDistributor);
    } else {
      setOrderItems([]);
    }
  }, [selectedDistributor]);

  const fetchDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('Distributors')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching distributors:', error);
      toast({
        title: "Error",
        description: "Failed to load distributors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDistributorProducts = async (distributorId: string) => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('distributor_products')
        .select(`
          product_id,
          ptr,
          quantity,
          products (
            id,
            name
          )
        `)
        .eq('distributor_id', distributorId);

      if (error) throw error;

      const items: OrderItem[] = (data || []).map(item => ({
        product_id: item.product_id,
        product_name: (item.products as any)?.name || 'Unknown Product',
        price: item.ptr,
        available_qty: item.quantity,
        order_qty: 0
      }));

      setOrderItems(items);
    } catch (error) {
      console.error('Error fetching distributor products:', error);
      toast({
        title: "Error",
        description: "Failed to load distributor products",
        variant: "destructive"
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const updateOrderQuantity = (productId: string, qty: number) => {
    setOrderItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, order_qty: Math.max(0, Math.min(qty, item.available_qty)) }
          : item
      )
    );
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + (item.order_qty * item.price), 0);
  };

  const handleDone = async () => {
    const ordersToPlace = orderItems.filter(item => item.order_qty > 0);
    
    // Distributor is only required if orders are being placed
    if (ordersToPlace.length > 0 && !selectedDistributor) {
      toast({
        title: "Distributor required",
        description: "Please select a distributor when placing orders",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      // Get current location
      const { getCurrentLocation } = await import('@/lib/geolocation');
      const location = await getCurrentLocation();
      
      // Check if online
      const { checkNetworkStatus, queueForSync } = await import('@/lib/offline');
      const isOnline = await checkNetworkStatus();
      
      // Only save daily working record and orders if there are orders to place
      if (ordersToPlace.length > 0) {
        // Save daily working record with location
        const dailyWorkingRecord = {
          doctor_id: doctorId,
          mr_id: user?.id!,
          distributor_id: selectedDistributor,
          sample_details: sampleData as any,
          order_details: ordersToPlace as any,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp
          } : null
        };

        if (isOnline) {
          // Save to Supabase
          const { data: dailyWorkingData, error: dailyWorkingError } = await supabase
            .from('daily_working')
            .insert(dailyWorkingRecord)
            .select()
            .single();

          if (dailyWorkingError) throw dailyWorkingError;

          // Create ONE order record
          const orderRecord = {
            doctor_id: doctorId,
            pharmacy_id: selectedDistributor,
            mr_id: user?.id,
            order_date: new Date().toISOString().split('T')[0],
            total_amount: getTotalAmount(),
          };

          const { data: orderResult, error: orderError } = await supabase
            .from('orders')
            .insert(orderRecord)
            .select('id')
            .single();

          if (orderError) throw orderError;

          // Create order_items for each product
          const orderItemRecords = ordersToPlace.map(order => ({
            order_id: orderResult.id,
            product_id: order.product_id,
            quantity: order.order_qty,
            unit_price: order.price,
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemRecords);

          if (itemsError) throw itemsError;

          // Reduce stock from distributor_products
          for (const order of ordersToPlace) {
            const newQty = order.available_qty - order.order_qty;
            const { error: stockError } = await supabase
              .from('distributor_products')
              .update({ quantity: newQty })
              .eq('distributor_id', selectedDistributor)
              .eq('product_id', order.product_id);

            if (stockError) {
              console.error('Error updating distributor stock:', stockError);
            }
          }
        } else {
          // Save for offline sync
          await queueForSync({
            id: `daily_working_${Date.now()}`,
            type: 'daily_working',
            data: dailyWorkingRecord,
            timestamp: Date.now(),
            synced: false
          });

          // Save orders for offline sync
          const orderRecords = ordersToPlace.map(order => ({
            doctor_id: doctorId,
            pharmacy_id: selectedDistributor,
            product_id: order.product_id,
            quantity: order.order_qty,
            unit_price: order.price,
            mr_id: user?.id,
            order_date: new Date().toISOString().split('T')[0]
          }));

          for (const order of orderRecords) {
            await queueForSync({
              id: `order_${Date.now()}_${Math.random()}`,
              type: 'order',
              data: order,
              timestamp: Date.now(),
              synced: false
            });
          }
        }
      }

      toast({
        title: "Success!",
        description: isOnline 
          ? `Daily working completed for ${doctorName}`
          : `Daily working saved offline and will sync when connected`,
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
            <SelectContent className="bg-background border shadow-md z-50 max-h-[200px] overflow-y-auto">
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
        {!selectedDistributor ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select a distributor to view available products
          </div>
        ) : loadingProducts ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        ) : orderItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products available for this distributor
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
              <div>Product Name</div>
              <div className="text-center">PTR</div>
              <div className="text-center">Available</div>
              <div className="text-center">Order Qty</div>
              <div className="text-center">Total</div>
            </div>

            {orderItems.map((item) => (
              <div key={item.product_id} className="grid grid-cols-5 gap-4 items-center py-3 border-b">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">{item.product_name}</span>
                </div>
                
                <div className="text-center font-mono">
                  ₹{item.price.toFixed(2)}
                </div>

                <div className="text-center font-mono text-muted-foreground">
                  {item.available_qty}
                </div>
                
                <div className="flex justify-center">
                  <Input
                    type="number"
                    min="0"
                    max={item.available_qty}
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
          </>
        )}

          {orderItems.length > 0 && (
            <div className="border-t-2 pt-4">
              <div className="grid grid-cols-5 gap-4 font-bold text-lg">
                <div></div>
                <div></div>
                <div></div>
                <div className="text-center">Total:</div>
                <div className="text-center text-primary">
                  ₹{getTotalAmount().toFixed(2)}
                </div>
              </div>
            </div>
          )}
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