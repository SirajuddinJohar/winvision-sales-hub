import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, IndianRupee, Trash2, Calendar, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  category: string;
}

interface PurchaseItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface PurchaseBill {
  id: string;
  supplier_name: string;
  purchase_date: string;
  invoice_number: string | null;
  notes: string | null;
  gst_amount: number;
  transport_amount: number;
  created_at: string;
  items: PurchaseItem[];
}

interface LineItem {
  product_id: string;
  quantity: string;
  unit_cost: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

const Purchases = () => {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [supplierName, setSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [gstAmount, setGstAmount] = useState('');
  const [transportAmount, setTransportAmount] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ product_id: '', quantity: '', unit_cost: '' }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchData = async () => {
    setLoading(true);
    const [purchasesRes, itemsRes, productsRes] = await Promise.all([
      supabase.from('purchases').select('id, supplier_name, purchase_date, invoice_number, notes, gst_amount, transport_amount, created_at').order('purchase_date', { ascending: false }),
      supabase.from('purchase_items').select('id, purchase_id, product_id, quantity, unit_cost, total_cost'),
      supabase.from('products').select('id, name, category'),
    ]);

    const allItems = (itemsRes.data || []) as (PurchaseItem & { purchase_id: string })[];
    const bills: PurchaseBill[] = ((purchasesRes.data || []) as any[]).map(p => ({
      ...p,
      items: allItems.filter(i => i.purchase_id === p.id),
    }));

    setPurchases(bills);
    setProducts((productsRes.data || []) as Product[]);
    setLoading(false);
  };

  const getBillTotal = (bill: PurchaseBill) => {
    const itemsTotal = bill.items.reduce((s, i) => s + (i.total_cost || 0), 0);
    return itemsTotal + (bill.gst_amount || 0) + (bill.transport_amount || 0);
  };

  const handleAddLine = () => {
    setLineItems(prev => [...prev, { product_id: '', quantity: '', unit_cost: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const getFormTotal = () => {
    const itemsTotal = lineItems.reduce((s, item) => s + (parseInt(item.quantity || '0') * parseFloat(item.unit_cost || '0')), 0);
    return itemsTotal + parseFloat(gstAmount || '0') + parseFloat(transportAmount || '0');
  };

  const handleSubmit = async () => {
    if (!supplierName) {
      toast({ title: 'Error', description: 'Please enter supplier name', variant: 'destructive' });
      return;
    }
    const validLines = lineItems.filter(l => l.product_id && l.quantity && l.unit_cost);
    if (validLines.length === 0) {
      toast({ title: 'Error', description: 'Add at least one product with quantity and cost', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    // Create purchase bill
    const { data: billData, error: billError } = await supabase.from('purchases').insert({
      supplier_name: supplierName,
      product_id: validLines[0].product_id, // legacy field
      quantity: validLines.reduce((s, l) => s + parseInt(l.quantity), 0),
      unit_cost: 0,
      purchase_date: purchaseDate,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
      gst_amount: parseFloat(gstAmount || '0'),
      transport_amount: parseFloat(transportAmount || '0'),
      created_by: user!.id,
    }).select('id').single();

    if (billError) {
      toast({ title: 'Error', description: billError.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Insert line items
    const items = validLines.map(l => ({
      purchase_id: billData.id,
      product_id: l.product_id,
      quantity: parseInt(l.quantity),
      unit_cost: parseFloat(l.unit_cost),
    }));

    const { error: itemsError } = await supabase.from('purchase_items').insert(items);
    if (itemsError) {
      toast({ title: 'Error', description: itemsError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Purchase bill saved successfully' });
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
      toast({ title: 'Deleted', description: 'Purchase bill removed' });
      fetchData();
    }
  };

  const resetForm = () => {
    setSupplierName('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setNotes('');
    setGstAmount('');
    setTransportAmount('');
    setLineItems([{ product_id: '', quantity: '', unit_cost: '' }]);
  };

  const getProductName = (pid: string) => products.find(p => p.id === pid)?.name || 'Unknown';

  const filteredPurchases = filterMonth === 'all'
    ? purchases
    : purchases.filter(p => p.purchase_date.substring(0, 7) === filterMonth);

  const totalAmount = filteredPurchases.reduce((s, p) => s + getBillTotal(p), 0);
  const totalItems = filteredPurchases.reduce((s, p) => s + p.items.length, 0);

  const uniqueMonths = [...new Set(purchases.map(p => p.purchase_date.substring(0, 7)))].sort().reverse();

  return (
    <div className="min-h-screen bg-background p-3 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader title="Purchases" description="Track product purchases from manufacturers/suppliers" />
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Purchase Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Purchase Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {/* Bill Details */}
              <div>
                <Label className="text-xs">Supplier / Manufacturer *</Label>
                <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Enter supplier name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Purchase Date *</Label>
                  <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Invoice Number</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-XXXX" />
                </div>
              </div>

              {/* Product Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Products *</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleAddLine}>
                    <Plus className="h-3 w-3" /> Add Product
                  </Button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-2.5 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                      {lineItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveLine(idx)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Select value={item.product_id} onValueChange={v => updateLine(idx, 'product_id', v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.category})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input type="number" className="h-8 text-xs" value={item.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} placeholder="0" min="1" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Unit Cost (₹)</Label>
                        <Input type="number" className="h-8 text-xs" value={item.unit_cost} onChange={e => updateLine(idx, 'unit_cost', e.target.value)} placeholder="0.00" min="0" step="0.01" />
                      </div>
                    </div>
                    {item.quantity && item.unit_cost && (
                      <div className="text-right text-xs text-muted-foreground">
                        Subtotal: {formatCurrency(parseInt(item.quantity || '0') * parseFloat(item.unit_cost || '0'))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* GST & Transport */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">GST Amount (₹)</Label>
                  <Input type="number" value={gstAmount} onChange={e => setGstAmount(e.target.value)} placeholder="0" min="0" step="0.01" />
                </div>
                <div>
                  <Label className="text-xs">Transport (₹)</Label>
                  <Input type="number" value={transportAmount} onChange={e => setTransportAmount(e.target.value)} placeholder="0" min="0" step="0.01" />
                </div>
              </div>

              {/* Grand Total */}
              {getFormTotal() > 0 && (
                <div className="p-2.5 rounded-lg bg-primary/10 text-center space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Items: {formatCurrency(lineItems.reduce((s, l) => s + parseInt(l.quantity || '0') * parseFloat(l.unit_cost || '0'), 0))}
                    {gstAmount ? ` + GST: ${formatCurrency(parseFloat(gstAmount))}` : ''}
                    {transportAmount ? ` + Transport: ${formatCurrency(parseFloat(transportAmount))}` : ''}
                  </div>
                  <div className="text-sm font-bold">Grand Total: {formatCurrency(getFormTotal())}</div>
                </div>
              )}

              <div>
                <Label className="text-xs">Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" rows={2} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? 'Saving...' : 'Save Purchase Bill'}
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
            <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Products</span>
            </div>
            <p className="text-lg font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Bills</span>
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

      {/* Purchases List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No purchase bills found. Click "Add Purchase Bill" to start tracking.
            </div>
          ) : (
            <div className="divide-y">
              {filteredPurchases.map(bill => (
                <div key={bill.id}>
                  {/* Bill Header Row */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                  >
                    {expandedId === bill.id ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{bill.supplier_name}</span>
                        {bill.invoice_number && <Badge variant="outline" className="text-[10px]">{bill.invoice_number}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(bill.purchase_date).toLocaleDateString('en-IN')} · {bill.items.length} product{bill.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">{formatCurrency(getBillTotal(bill))}</div>
                      {(bill.gst_amount > 0 || bill.transport_amount > 0) && (
                        <div className="text-[10px] text-muted-foreground">
                          {bill.gst_amount > 0 && `GST: ${formatCurrency(bill.gst_amount)}`}
                          {bill.gst_amount > 0 && bill.transport_amount > 0 && ' · '}
                          {bill.transport_amount > 0 && `Trans: ${formatCurrency(bill.transport_amount)}`}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(bill.id); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  {/* Expanded Items */}
                  {expandedId === bill.id && (
                    <div className="px-3 pb-3 bg-muted/20">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Product</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Unit Cost</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bill.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs">{getProductName(item.product_id)}</TableCell>
                              <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(item.unit_cost)}</TableCell>
                              <TableCell className="text-xs text-right font-medium">{formatCurrency(item.total_cost)}</TableCell>
                            </TableRow>
                          ))}
                          {bill.gst_amount > 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-xs text-right text-muted-foreground">GST</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(bill.gst_amount)}</TableCell>
                            </TableRow>
                          )}
                          {bill.transport_amount > 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-xs text-right text-muted-foreground">Transport</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(bill.transport_amount)}</TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableCell colSpan={3} className="text-xs text-right font-bold">Grand Total</TableCell>
                            <TableCell className="text-xs text-right font-bold">{formatCurrency(getBillTotal(bill))}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      {bill.notes && <p className="text-xs text-muted-foreground mt-2 px-1">📝 {bill.notes}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Purchases;
