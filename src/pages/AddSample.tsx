import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, FlaskConical, Loader2, History } from 'lucide-react';
import { logStockChange } from '@/lib/stockHistory';
import { format } from 'date-fns';

const AddSample = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Fetch products (samples only)
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['sample-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_type', 'sample')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Sale products only — used as the SOURCE catalog when adding a sample.
  // We exclude product_type='sample' so picking here never surfaces a sample row.
  const { data: saleProducts, isLoading: saleProductsLoading } = useQuery({
    queryKey: ['sale-products-for-sample'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .neq('product_type', 'sample')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Audit history for sample stock
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['sample-stock-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_stock_history')
        .select('*')
        .eq('product_type', 'sample')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !quantity) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProduct = saleProducts?.find(p => p.id === productId);

      if (!selectedProduct) {
        toast.error('Product not found');
        return;
      }

      const qty = parseInt(quantity);

      // Samples are kept as SEPARATE rows from sale products.
      const { data: existingSamples } = await supabase
        .from('products')
        .select('*')
        .eq('product_type', 'sample')
        .eq('name', selectedProduct.name);

      const existingSample = existingSamples?.[0];

      if (existingSample) {
        const prevStock = existingSample.stock || 0;
        const newStock = prevStock + qty;
        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', existingSample.id);
        if (error) throw error;

        await logStockChange({
          product_id: existingSample.id,
          product_name: existingSample.name,
          product_type: 'sample',
          change_type: 'added',
          quantity_change: qty,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: 'Sample stock topped up via Add Sample',
        });
      } else {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert({
            name: selectedProduct.name,
            category: selectedProduct.category,
            price: selectedProduct.price,
            description: selectedProduct.description,
            product_type: 'sample',
            stock: qty,
          })
          .select()
          .single();
        if (error) throw error;

        await logStockChange({
          product_id: inserted.id,
          product_name: inserted.name,
          product_type: 'sample',
          change_type: 'created',
          quantity_change: qty,
          previous_stock: 0,
          new_stock: qty,
          reason: 'New sample product created',
        });
      }

      toast.success('Sample added successfully');
      setProductId('');
      setQuantity('');
      queryClient.invalidateQueries({ queryKey: ['sample-products'] });
      queryClient.invalidateQueries({ queryKey: ['sale-products-for-sample'] });
      queryClient.invalidateQueries({ queryKey: ['sample-stock-history'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add sample');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Add Sample" description="Manage product samples" />
      
      <div className="px-3 py-2 md:px-4 md:py-8 space-y-3 md:space-y-6">
        {/* Add Sample Form */}
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              Add New Sample
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="product" className="text-xs md:text-sm">Product</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="h-9 md:h-10 text-sm">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {product.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:space-y-2">
                  <Label htmlFor="quantity" className="text-xs md:text-sm">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2 animate-spin" />}
                Add Sample
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Samples List */}
        <Card>
          <CardHeader className="p-3 pb-2 md:p-6 md:pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FlaskConical className="h-4 w-4 md:h-5 md:w-5" />
              Sample Products
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            {productsLoading ? (
              <div className="flex justify-center py-6 md:py-8">
                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
              </div>
            ) : products && products.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Product Name</TableHead>
                      <TableHead className="text-xs md:text-sm">Category</TableHead>
                      <TableHead className="text-xs md:text-sm">Stock</TableHead>
                      <TableHead className="text-xs md:text-sm">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">{product.name}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{product.category}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{product.stock || 0}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">₹{product.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-sm">
                No sample products found. Add a sample above to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddSample;