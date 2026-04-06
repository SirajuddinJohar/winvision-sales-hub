import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, IndianRupee, Trash2, Calendar, FileText } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface PurchaseRow {
  id: string;
  supplier_name: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const Purchases = () => {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState('all');

  // Form state
  const [supplierName, setSupplierName] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    setLoading(true);
    const [purchasesRes, productsRes] = await Promise.all([
      supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
      supabase.from('products').select('id, name, category'),
    ]);
    setPurchases((purchasesRes.data || []) as PurchaseRow[]);
    setProducts((productsRes.data || []) as Product[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!supplierName || !productId || !quantity || !unitCost) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('purchases').insert({
      supplier_name: supplierName,
      product_id: productId,
      quantity: parseInt(quantity),
      unit_cost: parseFloat(unitCost),
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
      created_by: user!.id,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Purchase recorded successfully' });
      resetForm();
      setDialogOpen(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Purchase record removed' });
      fetchData();
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setProductId('');
    setQuantity('');
    setUnitCost('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setNotes('');
  };

  const getProductName = (pid: string) => products.find(p => p.id === pid)?.name || 'Unknown';

  const filteredPurchases = filterMonth === 'all'
    ? purchases
    : purchases.filter(p => p.purchase_date.substring(0, 7) === filterMonth);

  const totalPurchases = filteredPurchases.reduce((s, p) => s + p.total_cost, 0);
  const totalQty = filteredPurchases.reduce((s, p) => s + p.quantity, 0);

  const uniqueMonths = [...new Set(purchases.map(p => p.purchase_date.substring(0, 7)))].sort().reverse();

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader title="Purchases" description="Track product purchases from manufacturers/suppliers" />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Purchase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Purchase</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Supplier Name *</Label>
                <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Enter supplier/manufacturer name" />
              </div>
              <div>
                <Label className="text-xs">Product *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity *</Label>
                  <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" min="1" />
                </div>
                <div>
                  <Label className="text-xs">Unit Cost (₹) *</Label>
                  <Input type="number" value={unitCost} onChange={e => setUnitCost(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                </div>
              </div>
              {quantity && unitCost && (
                <div className="p-2 rounded bg-primary/10 text-sm font-medium text-center">
                  Total: {formatCurrency(parseInt(quantity || '0') * parseFloat(unitCost || '0'))}
                </div>
              )}
              <div>
                <Label className="text-xs">Purchase Date *</Label>
                <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Invoice Number</Label>
                <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-XXXX" />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Save Purchase'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Cost</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(totalPurchases)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Qty</span>
            </div>
            <p className="text-lg font-bold">{totalQty}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Records</span>
            </div>
            <p className="text-lg font-bold">{filteredPurchases.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {uniqueMonths.map(m => (
              <SelectItem key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No purchase records found. Click "Add Purchase" to start tracking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Supplier</TableHead>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Unit Cost</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Invoice</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{new Date(p.purchase_date).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-medium">{p.supplier_name}</TableCell>
                      <TableCell className="text-xs">{getProductName(p.product_id)}</TableCell>
                      <TableCell className="text-xs text-right">{p.quantity}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(p.unit_cost)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatCurrency(p.total_cost)}</TableCell>
                      <TableCell className="text-xs">
                        {p.invoice_number ? <Badge variant="outline" className="text-[10px]">{p.invoice_number}</Badge> : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Purchases;
