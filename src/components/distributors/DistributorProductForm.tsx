import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface DistributorProductFormData {
  product_id: string;
  quantity: number;
  ptr: number;
}

interface DistributorProductFormProps {
  distributorId: string;
  product?: {
    id: string;
    product_id: string;
    quantity: number;
    ptr: number;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const DistributorProductForm = ({ 
  distributorId, 
  product, 
  onSuccess, 
  onCancel 
}: DistributorProductFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(product?.product_id || '');

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<DistributorProductFormData>({
    defaultValues: {
      product_id: product?.product_id || '',
      quantity: product?.quantity || 0,
      ptr: product?.ptr || 0,
    }
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load products", 
        variant: "destructive" 
      });
    }
  };

  const onSubmit = async (data: DistributorProductFormData) => {
    setLoading(true);
    try {
      const productData = {
        distributor_id: distributorId,
        product_id: selectedProductId,
        quantity: Number(data.quantity),
        ptr: Number(data.ptr),
      };

      if (product) {
        const { error } = await supabase
          .from('distributor_products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('distributor_products')
          .insert(productData);

        if (error) throw error;
        toast({ title: "Product added successfully" });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save product", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {product ? 'Edit Product' : 'Add Product'}
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="product_id">Product *</Label>
          <Select
            value={selectedProductId}
            onValueChange={(value) => {
              setSelectedProductId(value);
              setValue('product_id', value);
            }}
            disabled={!!product}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((prod) => (
                <SelectItem key={prod.id} value={prod.id}>
                  {prod.name} - {prod.category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-sm text-destructive mt-1">Product is required</p>
          )}
        </div>

        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            {...register('quantity', { 
              required: 'Quantity is required',
              min: { value: 0, message: 'Quantity must be positive' }
            })}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive mt-1">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="ptr">PTR (Price To Retailer) *</Label>
          <Input
            id="ptr"
            type="number"
            step="0.01"
            min="0"
            {...register('ptr', { 
              required: 'PTR is required',
              min: { value: 0, message: 'PTR must be positive' }
            })}
          />
          {errors.ptr && (
            <p className="text-sm text-destructive mt-1">{errors.ptr.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
};

export default DistributorProductForm;
