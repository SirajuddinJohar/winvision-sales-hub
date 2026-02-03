import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface EditRequest {
  id: string;
  tour_plan_id: string;
  user_id: string;
  request_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  admin_remarks?: string;
  users: {
    name: string;
    email: string;
  };
  tour_plans: {
    month: number;
    year: number;
  };
}

const TourPlanRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EditRequest | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [loading, setLoading] = useState(true);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tour_plan_edit_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching requests', variant: 'destructive' });
      setRequests([]);
    } else {
      // Fetch user and tour plan data separately
      const enrichedData = await Promise.all(
        (data || []).map(async (request) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', request.user_id)
            .single();
          
          const { data: planData } = await supabase
            .from('tour_plans')
            .select('month, year')
            .eq('id', request.tour_plan_id)
            .single();
          
          return {
            ...request,
            users: userData || { name: 'Unknown', email: 'unknown@example.com' },
            tour_plans: planData || { month: 1, year: 2025 }
          };
        })
      );
      setRequests(enrichedData as any);
    }
    setLoading(false);
  };

  const handleOpenModal = (request: EditRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminRemarks('');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;

    const updates: any = {
      status: actionType === 'approve' ? 'approved' : 'rejected',
      admin_id: user?.id,
      admin_remarks: adminRemarks,
      admin_response_at: new Date().toISOString()
    };

    const { error: requestError } = await supabase
      .from('tour_plan_edit_requests')
      .update(updates)
      .eq('id', selectedRequest.id);

    if (requestError) {
      toast({ title: 'Error updating request', variant: 'destructive' });
      return;
    }

    // If approved, unlock the tour plan
    if (actionType === 'approve') {
      // Set edit window until 12:00 AM (midnight) of the next day
      const editUntil = new Date();
      editUntil.setDate(editUntil.getDate() + 1);
      editUntil.setHours(0, 0, 0, 0);
      
      const { error: planError } = await supabase
        .from('tour_plans')
        .update({ 
          status: 'approved',
          locked_at: null,
          edit_until: editUntil.toISOString()
        })
        .eq('id', selectedRequest.tour_plan_id);

      if (planError) {
        toast({ title: 'Error unlocking plan', variant: 'destructive' });
        return;
      }
    }

    toast({ 
      title: `Request ${actionType === 'approve' ? 'approved' : 'rejected'}`,
      description: actionType === 'approve' ? 'User can now edit their plan' : 'Request has been rejected'
    });

    setIsModalOpen(false);
    fetchRequests();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-[10px] md:text-xs">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 text-[10px] md:text-xs">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 text-[10px] md:text-xs">Rejected</Badge>;
      default:
        return <Badge className="text-[10px] md:text-xs">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Tour Plan Edit Requests" description="Manage edit requests from users" />
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Tour Plan Edit Requests" description="Manage edit requests from users" />
      
      <div className="px-3 py-2 md:px-4 md:py-6">
        <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs md:text-sm">User</TableHead>
                  <TableHead className="text-xs md:text-sm">Month/Year</TableHead>
                  <TableHead className="text-xs md:text-sm">Requested At</TableHead>
                  <TableHead className="text-xs md:text-sm">Status</TableHead>
                  <TableHead className="text-xs md:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6 md:py-8 text-xs md:text-sm">
                      No edit requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="py-2 md:py-4">
                        <div className="font-medium text-sm md:text-base">{request.users.name}</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">{request.users.email}</div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-2 md:py-4">
                        {monthNames[request.tour_plans.month - 1]} {request.tour_plans.year}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-2 md:py-4">
                        {format(new Date(request.requested_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="py-2 md:py-4">
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell className="py-2 md:py-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-1 md:gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenModal(request, 'approve')}
                              className="bg-green-600 hover:bg-green-700 h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenModal(request, 'reject')}
                              className="h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.status !== 'pending' && request.admin_remarks && (
                          <div className="text-[10px] md:text-sm text-muted-foreground">
                            {request.admin_remarks}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">
              {actionType === 'approve' ? 'Approve Edit Request' : 'Reject Edit Request'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 md:space-y-4">
            {selectedRequest && (
              <div className="bg-muted p-2 md:p-3 rounded-lg">
                <div className="text-xs md:text-sm">
                  <strong>User:</strong> {selectedRequest.users.name}
                </div>
                <div className="text-xs md:text-sm">
                  <strong>Period:</strong> {monthNames[selectedRequest.tour_plans.month - 1]} {selectedRequest.tour_plans.year}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs md:text-sm">Admin Remarks</Label>
              <Textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Add remarks for this decision..."
                rows={4}
                className="text-sm mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} size="sm" className="h-9 text-xs md:text-sm">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className={`h-9 text-xs md:text-sm ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
              size="sm"
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TourPlanRequests;