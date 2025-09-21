import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  stock: number;
}

interface SampleItem {
  product_id: string;
  product_name: string;
  current_stock: number;
  qty_given: number;
}

interface SampleEntryProps {
  doctorName: string;
  onNext: (sampleData: SampleItem[]) => void;
  onBack: () => void;
}

const SampleEntry = ({ doctorName, onNext, onBack }: SampleEntryProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sampleItems, setSampleItems] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSampleProducts();
  }, []);

  const fetchSampleProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock')
        .eq('product_type', 'sample')
        .order('name');

      if (error) throw error;

      const items: SampleItem[] = (data || []).map(product => ({
        product_id: product.id,
        product_name: product.name,
        current_stock: product.stock,
        qty_given: 0
      }));

      setProducts(data || []);
      setSampleItems(items);
    } catch (error) {
      console.error('Error fetching sample products:', error);
      toast({
        title: "Error",
        description: "Failed to load sample products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: string, qty: number) => {
    setSampleItems(prev => 
      prev.map(item => 
        item.product_id === productId 
          ? { ...item, qty_given: Math.max(0, Math.min(qty, item.current_stock)) }
          : item
      )
    );
  };

  const handleNext = async () => {
    const samplesGiven = sampleItems.filter(item => item.qty_given > 0);
    
    try {
      // Update stock levels in database only for samples that were given
      if (samplesGiven.length > 0) {
        for (const sample of samplesGiven) {
          const newStock = sample.current_stock - sample.qty_given;
          
          const { error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', sample.product_id);

          if (error) throw error;
        }
      }

      // Always proceed to next step, regardless of whether samples were given
      onNext(sampleItems);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error", 
        description: "Failed to update stock levels",
        variant: "destructive"
      });
      // Still proceed to next step even if stock update fails
      onNext(sampleItems);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
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
          Sample Entry - {doctorName}
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 font-semibold text-sm text-muted-foreground border-b pb-2">
            <div>Sample Product</div>
            <div>Current Stock</div>
            <div>Qty Given</div>
            <div>Remaining Stock</div>
          </div>

          {sampleItems.map((item) => (
            <div key={item.product_id} className="grid grid-cols-4 gap-4 items-center py-3 border-b">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium">{item.product_name}</span>
              </div>
              
              <div className="text-center font-mono">
                {item.current_stock}
              </div>
              
              <div className="flex justify-center">
                <Input
                  type="number"
                  min="0"
                  max={item.current_stock}
                  value={item.qty_given}
                  onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                  className="w-20 text-center"
                />
              </div>
              
              <div className="text-center font-mono font-semibold">
                {item.current_stock - item.qty_given}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          ← Back
        </Button>
        <Button onClick={handleNext} className="bg-green-600 hover:bg-green-700">
          Next →
        </Button>
      </div>
    </div>
  );
};

export default SampleEntry;