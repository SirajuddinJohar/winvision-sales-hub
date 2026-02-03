import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRoleAccess } from '@/hooks/useRoleAccess';

interface ExpenseReport {
  date: string;
  expenseType: string;
  amount: number;
  travelAllowance: number;
  otherExpenses: number;
  description: string | null;
  status: string;
  areaName?: string;
  mrName?: string;
  mrEmail?: string;
}

interface MROption {
  id: string;
  name: string;
  email: string;
}

const ExpensesReports = () => {
  const { user } = useAuth();
  const { isAdmin } = useRoleAccess();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedMrId, setSelectedMrId] = useState<string>('all');
  const [mrsList, setMrsList] = useState<MROption[]>([]);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ amount: 0, travelAllowance: 0, otherExpenses: 0 });

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  useEffect(() => {
    if (isAdmin) {
      fetchMRs();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedYear && selectedMonth) {
      fetchExpenseReports();
    }
  }, [selectedYear, selectedMonth, selectedMrId, user]);

  const fetchMRs = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'mr')
        .order('name');

      if (error) throw error;
      setMrsList(data || []);
    } catch (error) {
      console.error('Error fetching MRs:', error);
      toast({
        title: "Error",
        description: "Failed to load MRs list",
        variant: "destructive"
      });
    }
  };

  const fetchExpenseReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);

      let query = supabase
        .from('expenses')
        .select('*, areas(area_name), users!expenses_mr_id_fkey(name, email)')
        .gte('expense_date', format(startDate, 'yyyy-MM-dd'))
        .lte('expense_date', format(endDate, 'yyyy-MM-dd'))
        .order('expense_date', { ascending: false });

      // Apply MR filter based on role and selection
      if (isAdmin && selectedMrId !== 'all') {
        query = query.eq('mr_id', selectedMrId);
      } else if (!isAdmin) {
        query = query.eq('mr_id', user.id);
      }

      const { data: expenses, error } = await query;

      if (error) throw error;

      const formattedReports: ExpenseReport[] = (expenses || []).map(expense => ({
        date: expense.expense_date,
        expenseType: expense.expense_type,
        amount: Number(expense.amount),
        travelAllowance: Number(expense.travel_allowance || 0),
        otherExpenses: Number(expense.other_expenses || 0),
        description: expense.description,
        status: expense.status,
        areaName: expense.areas?.area_name,
        mrName: expense.users?.name,
        mrEmail: expense.users?.email
      }));

      setReports(formattedReports);

      // Calculate totals
      const totalAmount = formattedReports.reduce((sum, r) => sum + r.amount, 0);
      const totalTravel = formattedReports.reduce((sum, r) => sum + r.travelAllowance, 0);
      const totalOther = formattedReports.reduce((sum, r) => sum + r.otherExpenses, 0);
      setTotals({
        amount: totalAmount,
        travelAllowance: totalTravel,
        otherExpenses: totalOther
      });

    } catch (error) {
      console.error('Error fetching expense reports:', error);
      toast({
        title: "Error",
        description: "Failed to load expense reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Expenses Reports" description={isAdmin ? "View and analyze expense reports" : "View your monthly expense reports"} />
      <div className="px-3 py-2 md:p-6 space-y-3 md:space-y-6">
        {/* Grand Total Display - Admin Only */}
        {isAdmin && !loading && reports.length > 0 && (
          <Card className="p-3 md:p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2 font-medium">Total Expenses</p>
              <p className="text-2xl md:text-4xl font-bold text-primary">{formatCurrency(totals.amount)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1 md:mt-2">
                {selectedMrId === 'all' ? 'All MRs' : mrsList.find(mr => mr.id === selectedMrId)?.name}
                {' • '}
                {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-3 md:p-6">
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-2 md:gap-4`}>
            <div>
              <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div>
                <label className="text-xs md:text-sm font-medium mb-1 md:mb-2 block">Select MR</label>
                <Select value={selectedMrId} onValueChange={setSelectedMrId}>
                  <SelectTrigger className="h-9 md:h-10 text-sm">
                    <SelectValue placeholder="Select MR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MRs</SelectItem>
                    {mrsList.map(mr => (
                      <SelectItem key={mr.id} value={mr.id}>
                        {mr.name} ({mr.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Summary Cards */}
        {!loading && reports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <Card className="p-3 md:p-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Total Amount</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(totals.amount)}</p>
              </div>
            </Card>
            <Card className="p-3 md:p-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Travel Allowance</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(totals.travelAllowance)}</p>
              </div>
            </Card>
            <Card className="p-3 md:p-6">
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Other Expenses</p>
                <p className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(totals.otherExpenses)}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Reports Table */}
        <Card>
          {loading ? (
            <div className="p-3 md:p-6 space-y-3 md:space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 md:h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Date</TableHead>
                    {isAdmin && selectedMrId === 'all' && <TableHead className="text-xs md:text-sm">MR Name</TableHead>}
                    <TableHead className="text-xs md:text-sm">Type</TableHead>
                    <TableHead className="text-xs md:text-sm">Area</TableHead>
                    <TableHead className="text-xs md:text-sm text-right">Amount</TableHead>
                    <TableHead className="text-xs md:text-sm text-right">Travel</TableHead>
                    <TableHead className="text-xs md:text-sm text-right">Other</TableHead>
                    <TableHead className="text-xs md:text-sm">Description</TableHead>
                    <TableHead className="text-xs md:text-sm">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length > 0 ? (
                    reports.map((report, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{format(new Date(report.date), 'dd MMM yyyy')}</TableCell>
                        {isAdmin && selectedMrId === 'all' && (
                          <TableCell className="font-medium py-2 md:py-4">
                            <div>
                              <p className="text-xs md:text-sm">{report.mrName}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground">{report.mrEmail}</p>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium capitalize text-xs md:text-sm py-2 md:py-4">{report.expenseType}</TableCell>
                        <TableCell className="text-xs md:text-sm py-2 md:py-4">{report.areaName || '-'}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right py-2 md:py-4">{formatCurrency(report.amount)}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right py-2 md:py-4">{formatCurrency(report.travelAllowance)}</TableCell>
                        <TableCell className="text-xs md:text-sm text-right py-2 md:py-4">{formatCurrency(report.otherExpenses)}</TableCell>
                        <TableCell className="max-w-[150px] md:max-w-[200px] truncate text-xs md:text-sm py-2 md:py-4">{report.description || '-'}</TableCell>
                        <TableCell className="py-2 md:py-4">
                          <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs ${
                            report.status === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : report.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin && selectedMrId === 'all' ? 9 : 8} className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
                        No expense reports found for the selected period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExpensesReports;