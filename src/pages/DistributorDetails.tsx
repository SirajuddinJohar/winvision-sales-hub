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
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground mb-4">Distributor not found</p>
        <Button onClick={() => navigate('/dashboard/distributors')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
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
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate('/dashboard/distributors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {profile?.role === 'admin' && (
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products available</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">PTR</TableHead>
                    {profile?.role === 'admin' && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.products.name}
                      </TableCell>
                      <TableCell>{product.products.category}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.ptr)}
                      </TableCell>
                      {profile?.role === 'admin' && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
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
