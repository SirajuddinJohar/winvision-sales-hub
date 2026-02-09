import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface OrderFormData {
  doctor_id: string;
  distributor_id: string;
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
  const [distributors, setDistributors] = useState<any[]>([]);
  
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [productOpen, setProductOpen] = useState<number | null>(null);

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

        // Fetch distributors
        const { data: distributorsData } = await supabase
          .from('Distributors')
          .select('id, name, address')
          .order('name');

        setDoctors(doctorsData || []);
        setProducts(productsData || []);
        setDistributors(distributorsData || []);
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
      if (!data.distributor_id) {
        toast({ 
          title: "Error", 
          description: "Please select a distributor", 
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

      // Get doctor's incentive percentage (only if doctor selected)
      let incentivePercentage = 30;
      if (data.doctor_id) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('incentive_percentage')
          .eq('id', data.doctor_id)
          .single();
        incentivePercentage = doctorData?.incentive_percentage ?? 30;
      }

      // Create multiple orders - one for each product
      for (const product of validProducts) {
        const orderTotal = Number(product.quantity) * Number(product.unit_price);
        
        const orderData: any = {
          pharmacy_id: data.distributor_id,
          product_id: product.product_id,
          quantity: Number(product.quantity),
          unit_price: Number(product.unit_price),
          order_date: data.order_date,
          mr_id: profile?.id,
        };

        // Only include doctor_id if selected
        if (data.doctor_id) {
          orderData.doctor_id = data.doctor_id;
        }

        const { data: orderResult, error: orderError } = await supabase
          .from('orders')
          .insert([orderData])
          .select('id')
          .single();

        if (orderError) {
          console.error('Order creation error:', orderError);
          throw orderError;
        }

        // Create incentive record only if doctor is selected
        if (orderResult && data.doctor_id) {
          const incentiveAmount = (orderTotal * incentivePercentage) / 100;
          
          const { error: incentiveError } = await supabase
            .from('doctor_incentives')
            .insert([{
              doctor_id: data.doctor_id,
              order_id: orderResult.id,
              order_amount: orderTotal,
              incentive_percentage: incentivePercentage,
              incentive_amount: incentiveAmount,
              status: 'pending'
            }]);

          if (incentiveError) {
            console.error('Incentive creation error:', incentiveError);
          }
        }
      }
      
      toast({ title: "Orders placed successfully" });
      onSuccess();
    } catch (error: any) {
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

  const getSelectedDoctorName = () => {
    const doctor = doctors.find(d => d.id === selectedDoctor);
    return doctor ? `${doctor.name} - ${doctor.specialty}` : '';
  };

  const getSelectedProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} - ₹${product.price}` : '';
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Place New Order</CardTitle>
        <CardDescription>
          Create a new order with multiple products for a doctor and distributor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Doctor (Optional)</Label>
              <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={doctorOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedDoctor ? getSelectedDoctorName() : "Search doctor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search doctor..." />
                    <CommandList>
                      <CommandEmpty>No doctor found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setSelectedDoctor('');
                            setValue('doctor_id', '');
                            setDoctorOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedDoctor ? "opacity-100" : "opacity-0"
                            )}
                          />
                          No Doctor (Pharmacy Order)
                        </CommandItem>
                        {doctors.map((doctor) => (
                          <CommandItem
                            key={doctor.id}
                            value={`${doctor.name} ${doctor.specialty}`}
                            onSelect={() => {
                              setSelectedDoctor(doctor.id);
                              setValue('doctor_id', doctor.id);
                              setDoctorOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDoctor === doctor.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {doctor.name} - {doctor.specialty}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributor_id">Distributor *</Label>
              <Select 
                onValueChange={(value) => setValue('distributor_id', value)} 
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select distributor" />
                </SelectTrigger>
                <SelectContent>
                  {distributors.map((distributor) => (
                    <SelectItem key={distributor.id} value={distributor.id}>
                      {distributor.name}
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
                    <Popover open={productOpen === index} onOpenChange={(open) => setProductOpen(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          {watchedProducts[index]?.product_id 
                            ? getSelectedProductName(watchedProducts[index].product_id) 
                            : "Search product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {products.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.category}`}
                                  onSelect={() => {
                                    setValue(`products.${index}.product_id`, product.id);
                                    handleProductChange(product.id, index);
                                    setProductOpen(null);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      watchedProducts[index]?.product_id === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {product.name} - ₹{product.price} ({product.category})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
