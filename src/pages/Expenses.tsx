import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Calendar, DollarSign, Check, X, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Expense {
  id: string;
  expense_date: string;
  expense_type: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  mr_id: string;
  users?: {
    name: string;
    email: string;
  } | null;
}

interface ExpenseFormData {
  expense_date: string;
  expense_type: string;
  amount: number;
  description: string;
}

const Expenses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ExpenseFormData>({
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
    }
  });

  useEffect(() => {
    fetchExpenses();
  }, [profile]);

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          users:mr_id (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match our interface
      const transformedExpenses = (data || []).map(expense => ({
        ...expense,
        users: expense.users && typeof expense.users === 'object' && !Array.isArray(expense.users) 
          ? expense.users 
          : null
      }));

      setExpenses(transformedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch expenses", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setSubmitting(true);
      
      const expenseData = {
        ...data,
        mr_id: profile?.id,
        amount: Number(data.amount),
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData]);
        
      if (error) throw error;
      
      toast({ title: "Expense added successfully" });
      reset();
      setShowForm(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast({ 
        title: "Error", 
        description: "Failed to add expense", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status,
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast({ 
        title: `Expense ${status}`, 
        description: `The expense has been ${status}` 
      });
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update expense", 
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expenses</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage expense approvals and reports' : 'Track your expense submissions'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </div>

      {showForm && !isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Submit your expense for approval</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    {...register('expense_date', { required: 'Date is required' })}
                  />
                  {errors.expense_date && (
                    <p className="text-sm text-destructive">{errors.expense_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense_type">Category *</Label>
                  <Select onValueChange={(value) => register('expense_type').onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="meals">Meals</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="medical_samples">Medical Samples</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.expense_type && (
                    <p className="text-sm text-destructive">Category is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('amount', { 
                      required: 'Amount is required',
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Brief description of the expense"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Expense
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {expenses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expenses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {expenses.map((expense) => (
            <Card key={expense.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      {expense.expense_type.replace('_', ' ').toUpperCase()}
                    </CardTitle>
            <CardDescription>
              {isAdmin && expense.users ? `${expense.users.name} (${expense.users.email})` : 'Your expense'}
            </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(expense.status)}
                    <Badge variant="outline" className="text-lg font-semibold">
                      {formatCurrency(expense.amount)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatCurrency(expense.amount)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(expense.created_at).toLocaleDateString()}
                  </div>
                </div>

                {expense.description && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">{expense.description}</p>
                  </div>
                )}

                {isAdmin && expense.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleApproval(expense.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApproval(expense.id, 'rejected')}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                {expense.approved_at && (
                  <div className="pt-4 border-t text-xs text-muted-foreground">
                    {expense.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                    {new Date(expense.approved_at).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Expenses;