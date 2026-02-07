import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { IndianRupee, Package, Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface Incentive {
  id: string;
  order_id: string;
  order_amount: number;
  incentive_percentage: number;
  incentive_amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  notes?: string;
  order?: {
    order_date: string;
    product?: {
      name: string;
    };
  };
}

interface IncentiveListProps {
  doctorId: string;
  refreshTrigger: number;
}

const IncentiveList = ({ doctorId, refreshTrigger }: IncentiveListProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    fetchIncentives();
  }, [doctorId, refreshTrigger]);

  const fetchIncentives = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('doctor_incentives')
        .select(`
          id,
          order_id,
          order_amount,
          incentive_percentage,
          incentive_amount,
          status,
          created_at,
          paid_at,
          notes,
          orders:order_id (
            order_date,
            products:product_id (
              name
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map(item => ({
        ...item,
        order: item.orders ? {
          order_date: (item.orders as any).order_date,
          product: (item.orders as any).products
        } : undefined
      }));

      setIncentives(transformedData);
    } catch (error) {
      console.error('Error fetching incentives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (incentiveId: string, newStatus: string) => {
    try {
      setUpdatingId(incentiveId);
      
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.paid_by = profile?.id;
      }

      const { error } = await supabase
        .from('doctor_incentives')
        .update(updateData)
        .eq('id', incentiveId);

      if (error) throw error;

      toast({ title: `Status updated to ${newStatus}` });
      fetchIncentives();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setUpdatingId(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] md:text-xs">Paid</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] md:text-xs">Approved</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] md:text-xs">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
          <Skeleton className="h-5 md:h-6 w-32 md:w-40" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 md:h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-2 md:pb-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
            <IndianRupee className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <CardTitle className="text-sm md:text-lg">Incentive History</CardTitle>
          <Badge variant="outline" className="ml-auto text-[10px] md:text-xs">
            {incentives.length} records
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
        {incentives.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <IndianRupee className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <p className="text-xs md:text-sm text-muted-foreground">
              No incentives recorded yet
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Incentives will appear here when orders are placed for this doctor
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs py-2 md:py-3">Date</TableHead>
                  <TableHead className="text-xs py-2 md:py-3">Product</TableHead>
                  <TableHead className="text-xs py-2 md:py-3 text-right">Order Amt</TableHead>
                  <TableHead className="text-xs py-2 md:py-3 text-center">%</TableHead>
                  <TableHead className="text-xs py-2 md:py-3 text-right">Incentive</TableHead>
                  <TableHead className="text-xs py-2 md:py-3">Status</TableHead>
                  {isAdmin && <TableHead className="text-xs py-2 md:py-3">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {incentives.map((incentive) => (
                  <TableRow key={incentive.id}>
                    <TableCell className="text-xs py-2 md:py-3">
                      {incentive.order?.order_date 
                        ? new Date(incentive.order.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : new Date(incentive.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      }
                    </TableCell>
                    <TableCell className="text-xs py-2 md:py-3 max-w-[100px] truncate">
                      {incentive.order?.product?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs py-2 md:py-3 text-right font-medium">
                      {formatCurrency(incentive.order_amount)}
                    </TableCell>
                    <TableCell className="text-xs py-2 md:py-3 text-center">
                      {incentive.incentive_percentage}%
                    </TableCell>
                    <TableCell className="text-xs py-2 md:py-3 text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(incentive.incentive_amount)}
                    </TableCell>
                    <TableCell className="text-xs py-2 md:py-3">
                      {getStatusBadge(incentive.status)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-xs py-2 md:py-3">
                        {updatingId === incentive.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Select
                            value={incentive.status}
                            onValueChange={(value) => handleStatusChange(incentive.id, value)}
                          >
                            <SelectTrigger className="h-7 md:h-8 w-20 md:w-24 text-[10px] md:text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
                              <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncentiveList;
