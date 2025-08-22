import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface ProductItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OrderFormData {
  doctor_id: string;
  pharmacy_id: string;
  order_date: string;
  products: ProductItem[];
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

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<OrderFormData>({
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      products: [{ product_id: '', quantity: 1, unit_price: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products'
  });

  const watchedProducts = watch('products');
  const totalAmount = watchedProducts.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);

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
      
      // Validate required fields
      if (!data.doctor_id) {
        toast({ 
          title: "Error", 
          description: "Please select a doctor", 
          variant: "destructive" 
        });
        return;
      }

      if (!data.pharmacy_id) {
        toast({ 
          title: "Error", 
          description: "Please select a pharmacy", 
          variant: "destructive" 
        });
        return;
      }

      // Validate that all products have been selected
      const validProducts = data.products.filter(p => p.product_id && p.quantity > 0);
      if (validProducts.length === 0) {
        toast({ 
          title: "Error", 
          description: "Please add at least one product", 
          variant: "destructive" 
        });
        return;
      }

      // Create multiple orders - one for each product
      const orderPromises = validProducts.map(product => {
        const orderData = {
          doctor_id: data.doctor_id,
          pharmacy_id: data.pharmacy_id,
          product_id: product.product_id,
          quantity: Number(product.quantity),
          unit_price: Number(product.unit_price),
          order_date: data.order_date,
          mr_id: profile?.id,
        };

        return supabase.from('orders').insert([orderData]);
      });

      const results = await Promise.all(orderPromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Order creation errors:', errors);
        throw errors[0].error;
      }
      
      toast({ title: "Orders placed successfully" });
      onSuccess();
    } catch (error) {
      console.error('Error placing order:', error);
      toast({ 
        title: "Error", 
        description: `Failed to place order: ${error.message || 'Please try again.'}`, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string, index: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`products.${index}.unit_price`, product.price);
    }
  };

  const addProduct = () => {
    append({ product_id: '', quantity: 1, unit_price: 0 });
  };

  const removeProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Place New Order</CardTitle>
        <CardDescription>
          Create a new order with multiple products for a doctor and pharmacy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor_id">Doctor *</Label>
              <Select 
                onValueChange={(value) => setValue('doctor_id', value)} 
                required
              >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="pharmacy_id">Pharmacy *</Label>
              <Select 
                onValueChange={(value) => setValue('pharmacy_id', value)} 
                required
              >
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
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Products *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Product</Label>
                    <Select 
                      onValueChange={(value) => {
                        setValue(`products.${index}.product_id`, value);
                        handleProductChange(value, index);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - ₹{product.price} ({product.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`products.${index}.quantity`, { 
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Quantity must be at least 1' }
                      })}
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unit Price (₹)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`products.${index}.unit_price`, { 
                          required: 'Unit price is required',
                          min: { value: 0, message: 'Unit price must be positive' }
                        })}
                        placeholder="0.00"
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeProduct(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show individual product total */}
                {watchedProducts[index]?.quantity && watchedProducts[index]?.unit_price && (
                  <div className="mt-3 pt-3 border-t flex justify-end">
                    <span className="text-sm font-medium">
                      Product Total: ₹{((watchedProducts[index]?.quantity || 0) * (watchedProducts[index]?.unit_price || 0)).toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Order Total */}
          {totalAmount > 0 && (
            <div className="p-4 bg-primary/5 rounded-lg border">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Order Total:</span>
                <span className="text-xl font-bold text-primary">
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