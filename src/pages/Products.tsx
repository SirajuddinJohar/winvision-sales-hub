import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, DollarSign, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  created_at: string;
}

interface ProductFormData {
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

const Products = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ProductFormData>();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch products", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      setSubmitting(true);
      
      const productData = {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
          
        if (error) throw error;
        toast({ title: "Product updated successfully" });
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
          
        if (error) throw error;
        toast({ title: "Product added successfully" });
      }
      
      reset();
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save product", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('category', product.category);
    setValue('price', product.price);
    setValue('stock', product.stock);
    setValue('description', product.description);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({ title: "Product deleted successfully" });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to delete product", 
        variant: "destructive" 
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive" className="text-[10px] md:text-xs">Out of Stock</Badge>;
    if (stock < 10) return <Badge variant="secondary" className="text-[10px] md:text-xs">Low Stock</Badge>;
    return <Badge className="bg-green-500 text-[10px] md:text-xs">In Stock</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-6 md:h-8 w-24 md:w-32 mb-2" />
            <Skeleton className="h-4 md:h-5 w-48 md:w-64" />
          </div>
          <Skeleton className="h-9 md:h-10 w-24 md:w-32" />
        </div>
        <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 md:h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Products" 
        description={isAdmin ? 'Manage your product catalog' : 'View available products'}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {isAdmin && (
          <div className="flex justify-end">
            <Button 
              size="sm"
              className="h-9 md:h-10 text-xs md:text-sm"
              onClick={() => {
                setEditingProduct(null);
                reset();
                setShowForm(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" />
              Add Product
            </Button>
          </div>
        )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {editingProduct ? 'Update product information' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="name" className="text-xs md:text-sm">Product Name *</Label>
              <Input
                id="name"
                className="h-9 md:h-10 text-sm"
                {...register('name', { required: 'Product name is required' })}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="category" className="text-xs md:text-sm">Category *</Label>
              <Input
                id="category"
                className="h-9 md:h-10 text-sm"
                {...register('category', { required: 'Category is required' })}
                placeholder="e.g., Tablets, Syrup, Injection"
              />
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="price" className="text-xs md:text-sm">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-9 md:h-10 text-sm"
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="stock" className="text-xs md:text-sm">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  className="h-9 md:h-10 text-sm"
                  {...register('stock', { 
                    required: 'Stock quantity is required',
                    min: { value: 0, message: 'Stock must be non-negative' }
                  })}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="text-xs text-destructive">{errors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5 md:space-y-2">
              <Label htmlFor="description" className="text-xs md:text-sm">Description</Label>
              <Textarea
                id="description"
                className="text-sm"
                {...register('description')}
                placeholder="Product description"
                rows={3}
              />
            </div>

            <div className="flex gap-2 md:gap-3 pt-3 md:pt-4">
              <Button type="submit" size="sm" className="h-9 md:h-10 text-xs md:text-sm" disabled={submitting}>
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-9 md:h-10 text-xs md:text-sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-6 md:py-8">
            <Package className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <p className="text-sm md:text-base text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2.5 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                      <Package className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm md:text-lg">{product.name}</CardTitle>
                      <CardDescription className="text-xs md:text-sm">{product.category}</CardDescription>
                    </div>
                  </div>
                  {getStockBadge(product.stock)}
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="text-base md:text-lg font-semibold">{formatCurrency(product.price)}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] md:text-xs">Stock: {product.stock}</Badge>
                </div>

                {product.description && (
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}

                {isAdmin && (
                  <div className="flex gap-2 pt-2 md:pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 md:h-9 text-xs"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 md:h-9 text-xs"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="mr-1.5 h-3 w-3 md:h-4 md:w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Products;
