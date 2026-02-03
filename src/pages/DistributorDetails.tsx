import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Edit, Trash2, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PageHeader from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DistributorProductForm from '@/components/distributors/DistributorProductForm';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  city: string;
  address: string;
}

interface DistributorProduct {
  id: string;
  distributor_id: string;
  product_id: string;
  quantity: number;
  ptr: number;
  products: {
    name: string;
    category: string;
  };
}

const DistributorDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [products, setProducts] = useState<DistributorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DistributorProduct | null>(null);

  useEffect(() => {
    if (id) {
      fetchDistributor();
      fetchProducts();
    }
  }, [id]);

  const fetchDistributor = async () => {
    try {
      const { data, error } = await supabase
        .from('Distributors')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDistributor(data);
    } catch (error) {
      console.error('Error fetching distributor:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load distributor details", 
        variant: "destructive" 
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('distributor_products')
        .select(`
          *,
          products (
            name,
            category
          )
        `)
        .eq('distributor_id', id)
        .order('products(name)');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product: DistributorProduct) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product?')) return;

    try {
      const { error } = await supabase
        .from('distributor_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({ title: "Product removed successfully" });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to remove product", 
        variant: "destructive" 
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6 p-3 md:p-6">
        <Skeleton className="h-16 md:h-20 w-full" />
        <Skeleton className="h-72 md:h-96 w-full" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <p className="text-muted-foreground mb-4 text-xs md:text-sm">Distributor not found</p>
        <Button onClick={() => navigate('/dashboard/distributors')} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
          <ArrowLeft className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          Back to Distributors
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title={distributor.name}
        description={`${distributor.city} - ${distributor.contact_person} (${distributor.phone})`}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        <div className="flex justify-between items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/dashboard/distributors')} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
            <ArrowLeft className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            Back
          </Button>
          {profile?.role === 'admin' && (
            <Button onClick={handleAddProduct} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
              <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Add Product
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 md:py-8">
              <Package className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
              <p className="text-muted-foreground text-xs md:text-sm">No products available</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Product Name</TableHead>
                      <TableHead className="text-xs md:text-sm">Category</TableHead>
                      <TableHead className="text-xs md:text-sm text-right">Quantity</TableHead>
                      <TableHead className="text-xs md:text-sm text-right">PTR</TableHead>
                      {profile?.role === 'admin' && (
                        <TableHead className="text-xs md:text-sm text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">
                          {product.products.name}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{product.products.category}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right py-2 md:py-4">{product.quantity}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right py-2 md:py-4">
                          {formatCurrency(product.ptr)}
                        </TableCell>
                        {profile?.role === 'admin' && (
                          <TableCell className="text-right py-2 md:py-4">
                            <div className="flex justify-end gap-1 md:gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-[90vw] md:max-w-2xl">
            <DistributorProductForm
              distributorId={id!}
              product={editingProduct}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DistributorDetails;