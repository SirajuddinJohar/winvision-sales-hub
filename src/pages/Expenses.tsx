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
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { Plus, Receipt, Calendar, DollarSign, Check, X, Loader2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AreaForm from '@/components/areas/AreaForm';
import PageHeader from '@/components/layout/PageHeader';

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
  area_id?: string;
  travel_allowance?: number;
  other_expenses?: number;
  users?: {
    name: string;
    email: string;
  } | null;
  areas?: {
    area_name: string;
    from_location: string;
    to_location: string;
    distance: number;
  } | null;
}

interface Area {
  id: string;
  area_name: string;
  from_location: string;
  to_location: string;
  distance: number;
}

interface ExpenseFormData {
  expense_date: string;
  area_id: string;
  travel_allowance: number;
  other_expenses: number;
  description: string;
}

const Expenses = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = profile?.role === 'admin';

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<ExpenseFormData>({
    defaultValues: {
      expense_date: new Date().toISOString().split('T')[0],
      travel_allowance: 0,
      other_expenses: 0,
    }
  });

  useEffect(() => {
    fetchExpenses();
    fetchAreas();
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
          ),
          areas:area_id (
            area_name,
            from_location,
            to_location,
            distance
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
          : null,
        areas: expense.areas && typeof expense.areas === 'object' && !Array.isArray(expense.areas) 
          ? expense.areas 
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

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('area_name');

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast({ 
        title: "Error", 
        description: "Failed to fetch areas", 
        variant: "destructive" 
      });
    }
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      setSubmitting(true);
      
      const totalAmount = Number(data.travel_allowance) + Number(data.other_expenses);
      
      const expenseData = {
        expense_date: data.expense_date,
        area_id: data.area_id,
        travel_allowance: Number(data.travel_allowance),
        other_expenses: Number(data.other_expenses),
        amount: totalAmount,
        expense_type: 'travel_and_other',
        description: data.description,
        mr_id: profile?.id,
      };

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData]);
        
      if (error) throw error;
      
      toast({ 
        title: "Expense Added Successfully ✅", 
        description: "Your expense has been submitted for approval." 
      });
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

  if (showAreaForm) {
    return (
      <AreaForm 
        onBack={() => {
          setShowAreaForm(false);
          fetchAreas();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="Expenses" 
        description={isAdmin ? 'Manage expense approvals and reports' : 'Track your expense submissions'}
      />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {!isAdmin && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowAreaForm(true)} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
              <MapPin className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Add Area
            </Button>
            <Button onClick={() => setShowForm(!showForm)} size="sm" className="h-9 md:h-10 text-xs md:text-sm">
              <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Add Expense
            </Button>
          </div>
        )}

      {showForm && !isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Submit your travel and other expenses for approval</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Expense Date *</Label>
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
                  <Label htmlFor="area_id">Today Working Area *</Label>
                  <Controller
                    name="area_id"
                    control={control}
                    rules={{ required: 'Please select a working area' }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select working area" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              {area.area_name} ({area.from_location} → {area.to_location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.area_id && (
                    <p className="text-sm text-destructive">{errors.area_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="travel_allowance">Travel Allowance (TA) Amount (₹) *</Label>
                  <Input
                    id="travel_allowance"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('travel_allowance', { 
                      required: 'Travel allowance is required',
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    placeholder="0.00"
                  />
                  {errors.travel_allowance && (
                    <p className="text-sm text-destructive">{errors.travel_allowance.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="other_expenses">Other Expenses Amount (₹) *</Label>
                  <Input
                    id="other_expenses"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('other_expenses', { 
                      required: 'Other expenses amount is required',
                      min: { value: 0, message: 'Amount must be positive' }
                    })}
                    placeholder="0.00"
                  />
                  {errors.other_expenses && (
                    <p className="text-sm text-destructive">{errors.other_expenses.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Brief description of the expenses"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Expense
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
                      {expense.areas && (
                        <Badge variant="outline" className="ml-2">
                          {expense.areas.area_name}
                        </Badge>
                      )}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {expense.travel_allowance && expense.travel_allowance > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">TA: {formatCurrency(expense.travel_allowance)}</span>
                    </div>
                  )}
                  
                  {expense.other_expenses && expense.other_expenses > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Others: {formatCurrency(expense.other_expenses)}</span>
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    Submitted: {new Date(expense.created_at).toLocaleDateString()}
                  </div>
                </div>

                {expense.areas && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Working Area: {expense.areas.area_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.areas.from_location} → {expense.areas.to_location} ({expense.areas.distance} km)
                    </p>
                  </div>
                )}

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
    </div>
  );
};

export default Expenses;