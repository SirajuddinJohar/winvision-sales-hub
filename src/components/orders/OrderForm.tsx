import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface OrderFormData {
  doctor_id: string;
  product_id: string;
  pharmacy_id: string;
  quantity: number;
  unit_price: number;
  order_date: string;
}

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const OrderForm = ({ onSuccess, onCancel }: OrderFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<OrderFormData>({
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      quantity: 1,
    }
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unit_price');
  const totalAmount = (quantity || 0) * (unitPrice || 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('id, name, specialty')
          .order('name');

        // Fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, price, category')
          .order('name');

        // Fetch pharmacies
        const { data: pharmaciesData } = await supabase
          .from('pharmacies')
          .select('id, name, address')
          .order('name');

        setDoctors(doctorsData || []);
        setProducts(productsData || []);
        setPharmacies(pharmaciesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: OrderFormData) => {
    try {
      setLoading(true);
      
      const orderData = {
        ...data,
        mr_id: profile?.id,
        quantity: Number(data.quantity),
        unit_price: Number(data.unit_price),
        total_amount: totalAmount,
      };

      const { error } = await supabase
        .from('orders')
        .insert([orderData]);
        
      if (error) throw error;
      
      toast({ title: "Order placed successfully" });
      onSuccess();
    } catch (error) {
      console.error('Error placing order:', error);
      toast({ 
        title: "Error", 
        description: "Failed to place order", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue('unit_price', product.price);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Place New Order</CardTitle>
        <CardDescription>
          Create a new order for a doctor and pharmacy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor_id">Doctor *</Label>
              <Select onValueChange={(value) => setValue('doctor_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctor_id && (
                <p className="text-sm text-destructive">Doctor is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_id">Product *</Label>
              <Select onValueChange={(value) => {
                setValue('product_id', value);
                handleProductChange(value);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - ₹{product.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && (
                <p className="text-sm text-destructive">Product is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pharmacy_id">Pharmacy *</Label>
              <Select onValueChange={(value) => setValue('pharmacy_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.pharmacy_id && (
                <p className="text-sm text-destructive">Pharmacy is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_date">Order Date *</Label>
              <Input
                id="order_date"
                type="date"
                {...register('order_date', { required: 'Order date is required' })}
              />
              {errors.order_date && (
                <p className="text-sm text-destructive">{errors.order_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register('quantity', { 
                  required: 'Quantity is required',
                  min: { value: 1, message: 'Quantity must be at least 1' }
                })}
                placeholder="1"
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price (₹) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                {...register('unit_price', { 
                  required: 'Unit price is required',
                  min: { value: 0, message: 'Unit price must be positive' }
                })}
                placeholder="0.00"
              />
              {errors.unit_price && (
                <p className="text-sm text-destructive">{errors.unit_price.message}</p>
              )}
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="p-4 bg-primary-light rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold text-primary">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Place Order
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default OrderForm;